import { DevnetEntrypoint, MainnetEntrypoint, NetworkEntrypoint, TestnetEntrypoint } from '@multiversx/sdk-core'
import { WarpConstants } from './constants'
import { getMainChainInfo, replacePlaceholders } from './helpers/general'
import { ChainEnv, ChainInfo, Warp, WarpAction, WarpConfig, WarpExecutionNextInfo, WarpExecutionResults, WarpIdType } from './types'
import { CacheTtl } from './WarpCache'
import { WarpLink } from './WarpLink'
import { WarpRegistry } from './WarpRegistry'

const URL_PREFIX = 'https://'

export class WarpUtils {
  static getInfoFromPrefixedIdentifier(
    prefixedIdentifier: string
  ): { type: WarpIdType; identifier: string; identifierBase: string } | null {
    const decodedIdentifier = decodeURIComponent(prefixedIdentifier)
    const normalizedParam = decodedIdentifier.includes(WarpConstants.IdentifierParamSeparator)
      ? decodedIdentifier
      : `${WarpConstants.IdentifierType.Alias}${WarpConstants.IdentifierParamSeparator}${decodedIdentifier}`

    const [idType, identifier] = normalizedParam.split(WarpConstants.IdentifierParamSeparator)
    const identifierBase = identifier.split('?')[0]

    return { type: idType as WarpIdType, identifier, identifierBase }
  }

  static getNextInfo(config: WarpConfig, warp: Warp, actionIndex: number, results: WarpExecutionResults): WarpExecutionNextInfo | null {
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

    // Only support one array placeholder per next link
    const placeholder = arrayPlaceholders[0]
    if (!placeholder) return []
    const resultNameMatch = placeholder.match(/{{([^[]+)\[\]/)
    const resultName = resultNameMatch ? resultNameMatch[1] : null
    if (!resultName || results[resultName] === undefined) return []

    const resultArray = Array.isArray(results[resultName]) ? results[resultName] : [results[resultName]]
    if (resultArray.length === 0) return []

    // Extract field path, e.g. .contract
    const fieldPathMatch = placeholder.match(/\[\](\.[^}]+)?}}/)
    const fieldPath = fieldPathMatch ? fieldPathMatch[1] || '' : ''
    const exactPlaceholderRegex = new RegExp(`{{${resultName}\\[\\]${fieldPath.replace('.', '\.')}}}`, 'g')

    const nextLinks = resultArray
      .map((item) => {
        const mainValue = fieldPath ? this.getNestedValue(item, fieldPath.slice(1)) : item
        if (mainValue === undefined || mainValue === null) return null
        const replacedQuery = queryWithPlaceholders.replace(exactPlaceholderRegex, mainValue)
        if (replacedQuery.includes('{{') || replacedQuery.includes('}}')) return null
        const identifier = replacedQuery ? `${baseIdentifier}?${replacedQuery}` : baseIdentifier
        return { identifier, url: this.buildNextUrl(identifier, config) }
      })
      .filter((link): link is NonNullable<typeof link> => link !== null)

    return nextLinks
  }

  private static buildNextUrl(identifier: string, config: WarpConfig): string {
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

  static async getChainInfoForAction(config: WarpConfig, action: WarpAction): Promise<ChainInfo> {
    if (!action.chain) return getMainChainInfo(config)
    const chainInfo = await new WarpRegistry(config).getChainInfo(action.chain, { ttl: CacheTtl.OneWeek })
    if (!chainInfo) throw new Error(`WarpActionExecutor: Chain info not found for ${action.chain}`)
    return chainInfo
  }

  static getChainEntrypoint(chainInfo: ChainInfo, env: ChainEnv): NetworkEntrypoint {
    const clientName = 'warp-sdk'
    const kind = 'api'
    if (env === 'devnet') return new DevnetEntrypoint(chainInfo.apiUrl, kind, clientName)
    if (env === 'testnet') return new TestnetEntrypoint(chainInfo.apiUrl, kind, clientName)
    return new MainnetEntrypoint(chainInfo.apiUrl, kind, clientName)
  }
}
