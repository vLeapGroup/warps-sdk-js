import { DevnetEntrypoint, MainnetEntrypoint, NetworkEntrypoint, TestnetEntrypoint } from '@multiversx/sdk-core'
import { WarpConstants } from './constants'
import { getMainChainInfo, replacePlaceholders } from './helpers/general'
import {
  Warp,
  WarpAction,
  WarpChain,
  WarpChainEnv,
  WarpChainInfo,
  WarpExecutionNextInfo,
  WarpExecutionResults,
  WarpIdType,
  WarpInitConfig,
} from './types'
import { WarpArgSerializer } from './WarpArgSerializer'
import { CacheTtl } from './WarpCache'
import { WarpLink } from './WarpLink'
import { WarpRegistry } from './WarpRegistry'

const URL_PREFIX = 'https://'

export class WarpUtils {
  static getInfoFromPrefixedIdentifier(
    prefixedIdentifier: string
  ): { type: WarpIdType; identifier: string; identifierBase: string } | null {
    const decodedIdentifier = decodeURIComponent(prefixedIdentifier)

    // Handle prefixed identifier (contains separator)
    if (decodedIdentifier.includes(WarpConstants.IdentifierParamSeparator)) {
      const [idType, identifier] = decodedIdentifier.split(WarpConstants.IdentifierParamSeparator)
      const identifierBase = identifier.split('?')[0]
      return { type: idType as WarpIdType, identifier, identifierBase }
    }

    const identifierBase = decodedIdentifier.split('?')[0]

    // If exactly 64 characters, treat as hash
    if (identifierBase.length === 64) {
      return { type: WarpConstants.IdentifierType.Hash, identifier: decodedIdentifier, identifierBase }
    }

    // Otherwise treat as alias
    return { type: WarpConstants.IdentifierType.Alias, identifier: decodedIdentifier, identifierBase }
  }

  static getNextInfo(config: WarpInitConfig, warp: Warp, actionIndex: number, results: WarpExecutionResults): WarpExecutionNextInfo | null {
    const next = (warp.actions?.[actionIndex] as { next?: string })?.next || warp.next || null
    if (!next) return null
    if (next.startsWith(URL_PREFIX)) return [{ identifier: null, url: next }]

    const [baseIdentifier, queryWithPlaceholders] = next.split('?')
    if (!queryWithPlaceholders) {
      return [{ identifier: baseIdentifier, url: this.buildNextUrl(baseIdentifier, config) }]
    }

    // Find all array placeholders like {{DELEGATIONS[].contract}}
    const arrayPlaceholders = queryWithPlaceholders.match(/{{([^}]+)\[\](\.[^}]+)?}}/g) || []
    if (arrayPlaceholders.length === 0) {
      const query = replacePlaceholders(queryWithPlaceholders, { ...warp.vars, ...results })
      const identifier = query ? `${baseIdentifier}?${query}` : baseIdentifier
      return [{ identifier, url: this.buildNextUrl(identifier, config) }]
    }

    // Support multiple array placeholders that reference the same array
    const placeholder = arrayPlaceholders[0]
    if (!placeholder) return []
    const resultNameMatch = placeholder.match(/{{([^[]+)\[\]/)
    const resultName = resultNameMatch ? resultNameMatch[1] : null
    if (!resultName || results[resultName] === undefined) return []

    const resultArray = Array.isArray(results[resultName]) ? results[resultName] : [results[resultName]]
    if (resultArray.length === 0) return []

    // Create regex patterns for all array placeholders with the same result name
    const arrayRegexes = arrayPlaceholders
      .filter((p) => p.includes(`{{${resultName}[]`))
      .map((p) => {
        const fieldMatch = p.match(/\[\](\.[^}]+)?}}/)
        const field = fieldMatch ? fieldMatch[1] || '' : ''
        return {
          placeholder: p,
          field: field ? field.slice(1) : '', // Remove leading dot if present
          regex: new RegExp(p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
        }
      })

    const nextLinks = resultArray
      .map((item) => {
        let replacedQuery = queryWithPlaceholders

        // Replace all array placeholders for this item
        for (const { regex, field } of arrayRegexes) {
          const value = field ? this.getNestedValue(item, field) : item
          if (value === undefined || value === null) return null
          replacedQuery = replacedQuery.replace(regex, value)
        }

        if (replacedQuery.includes('{{') || replacedQuery.includes('}}')) return null
        const identifier = replacedQuery ? `${baseIdentifier}?${replacedQuery}` : baseIdentifier
        return { identifier, url: this.buildNextUrl(identifier, config) }
      })
      .filter((link): link is NonNullable<typeof link> => link !== null)

    return nextLinks
  }

  private static buildNextUrl(identifier: string, config: WarpInitConfig): string {
    const [rawId, queryString] = identifier.split('?')
    const info = this.getInfoFromPrefixedIdentifier(rawId) || { type: 'alias', identifier: rawId, identifierBase: rawId }
    const warpLink = new WarpLink(config)
    const baseUrl = warpLink.build(info.type, info.identifierBase)
    if (!queryString) return baseUrl

    const url = new URL(baseUrl)
    new URLSearchParams(queryString).forEach((value, key) => url.searchParams.set(key, value))
    return url.toString().replace(/\/\?/, '?')
  }

  private static getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj)
  }

  static async getChainInfoForAction(config: WarpInitConfig, action: WarpAction, inputs?: string[]): Promise<WarpChainInfo> {
    if (inputs) {
      const chainFromInputs = await this.tryGetChainFromInputs(config, action, inputs)
      if (chainFromInputs) return chainFromInputs
    }

    return this.getDefaultChainInfo(config, action)
  }

  private static async tryGetChainFromInputs(config: WarpInitConfig, action: WarpAction, inputs: string[]): Promise<WarpChainInfo | null> {
    const chainPositionIndex = action.inputs?.findIndex((i) => i.position === 'chain')
    if (chainPositionIndex === -1 || chainPositionIndex === undefined) return null

    const chainInput = inputs[chainPositionIndex]
    if (!chainInput) throw new Error('WarpUtils: Chain input not found')

    const serializer = new WarpArgSerializer()
    const chainValue = serializer.stringToNative(chainInput)[1] as WarpChain

    const registry = new WarpRegistry(config)
    const chainInfo = await registry.getChainInfo(chainValue)
    if (!chainInfo) throw new Error(`WarpUtils: Chain info not found for ${chainValue}`)

    return chainInfo
  }

  private static async getDefaultChainInfo(config: WarpInitConfig, action: WarpAction): Promise<WarpChainInfo> {
    if (!action.chain) return getMainChainInfo(config)

    const registry = new WarpRegistry(config)
    const chainInfo = await registry.getChainInfo(action.chain, { ttl: CacheTtl.OneWeek })
    if (!chainInfo) throw new Error(`WarpUtils: Chain info not found for ${action.chain}`)

    return chainInfo
  }

  static getChainEntrypoint(chainInfo: WarpChainInfo, env: WarpChainEnv): NetworkEntrypoint {
    const clientName = 'warp-sdk'
    const kind = 'api'
    if (env === 'devnet') return new DevnetEntrypoint(chainInfo.apiUrl, kind, clientName)
    if (env === 'testnet') return new TestnetEntrypoint(chainInfo.apiUrl, kind, clientName)
    return new MainnetEntrypoint(chainInfo.apiUrl, kind, clientName)
  }
}
