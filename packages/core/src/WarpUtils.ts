import { DevnetEntrypoint, MainnetEntrypoint, NetworkEntrypoint, TestnetEntrypoint } from '@multiversx/sdk-core'
import { Config } from './config'
import { WarpConstants } from './constants'
import { getMainChainInfo, replacePlaceholders } from './helpers/general'
import {
  ChainEnv,
  ChainInfo,
  Warp,
  WarpConfig,
  WarpContractAction,
  WarpExecutionNextInfo,
  WarpExecutionResults,
  WarpIdType,
  WarpQueryAction,
  WarpTransferAction,
} from './types'
import { WarpRegistry } from './WarpRegistry'

const URL_PREFIX = 'https://'
const VAR_SOURCE_QUERY = 'query'
const VAR_SOURCE_ENV = 'env'

export class WarpUtils {
  static prepareVars(warp: Warp, config: WarpConfig): Warp {
    if (!warp?.vars) return warp
    let modifiable = JSON.stringify(warp)

    const modify = (placeholder: string, value: string | number) => {
      modifiable = modifiable.replace(new RegExp(`{{${placeholder.toUpperCase()}}}`, 'g'), value.toString())
    }

    Object.entries(warp.vars).forEach(([placeholder, value]) => {
      if (typeof value !== 'string') {
        modify(placeholder, value)
        return
      }

      if (value.startsWith(`${VAR_SOURCE_QUERY}:`)) {
        if (!config.currentUrl) throw new Error('WarpUtils: currentUrl config is required to prepare vars')
        const queryParamName = value.split(`${VAR_SOURCE_QUERY}:`)[1]
        const queryParamValue = new URL(config.currentUrl).searchParams.get(queryParamName)
        if (queryParamValue) modify(placeholder, queryParamValue)
      } else if (value.startsWith(`${VAR_SOURCE_ENV}:`)) {
        const envVarName = value.split(`${VAR_SOURCE_ENV}:`)[1]
        const envVarValue = config.vars?.[envVarName]
        if (envVarValue) modify(placeholder, envVarValue)
      } else if (value === WarpConstants.Source.UserWallet && config.user?.wallet) {
        modify(placeholder, config.user.wallet)
      } else {
        modify(placeholder, value)
      }
    })

    return JSON.parse(modifiable)
  }

  static getInfoFromPrefixedIdentifier(prefixedIdentifier: string): { type: WarpIdType; id: string } | null {
    const decodedIdentifier = decodeURIComponent(prefixedIdentifier)
    const normalizedParam = decodedIdentifier.includes(WarpConstants.IdentifierParamSeparator)
      ? decodedIdentifier
      : `${WarpConstants.IdentifierType.Alias}${WarpConstants.IdentifierParamSeparator}${decodedIdentifier}`

    const [idType, id] = normalizedParam.split(WarpConstants.IdentifierParamSeparator)
    return { type: idType as WarpIdType, id }
  }

  static getNextInfo(warp: Warp, actionIndex: number, results: WarpExecutionResults, config: WarpConfig): WarpExecutionNextInfo | null {
    const next = (warp.actions?.[actionIndex] as { next?: string })?.next || warp.next || null
    if (!next) return null
    if (next.startsWith(UrlPrefixDeterminer)) return { identifier: null, url: next }

    const [baseIdentifier, queryWithPlaceholders] = next.split('?')
    const query = queryWithPlaceholders ? replacePlaceholders(queryWithPlaceholders, { ...warp.vars, ...results }) : null
    const params = new URLSearchParams(query || '')
    const currentUrl = new URL(config.currentUrl || Config.DefaultClientUrl(config.env))
    currentUrl.searchParams.forEach((value, key) => params.set(key, value))

    const identifier = params.toString() ? `${baseIdentifier}?${params.toString()}` : baseIdentifier
    const url = new URL(config.clientUrl || Config.DefaultClientUrl(config.env))
    url.searchParams.set('warp', identifier)

    return { identifier, url: url.toString().replace(/\/\?/, '?') }
  }

  static async getChainInfoForAction(
    action: WarpTransferAction | WarpContractAction | WarpQueryAction,
    config: WarpConfig
  ): Promise<ChainInfo> {
    if (!action.chain) return getMainChainInfo(config)
    const chainInfo = await new WarpRegistry(config).getChainInfo(action.chain)
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
