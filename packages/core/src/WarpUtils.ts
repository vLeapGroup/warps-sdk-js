import { ApiNetworkProvider, DevnetEntrypoint, MainnetEntrypoint, NetworkEntrypoint, TestnetEntrypoint } from '@multiversx/sdk-core'
import { Config } from './config'
import { WarpConstants } from './constants'
import { ChainEnv, ChainInfo, Warp, WarpConfig, WarpIdType } from './types'
import { WarpLink } from './WarpLink'

const UrlPrefixDeterminer = 'https://'

const VarSourceQuery = 'query'
const VarSourceEnv = 'env'

export class WarpUtils {
  static prepareVars(warp: Warp, config: WarpConfig): Warp {
    if (!warp?.vars) return warp
    let modifiable = JSON.stringify(warp)

    const modify = (placeholder: string, value: string | number) => {
      modifiable = modifiable.replace(new RegExp(`{{${placeholder.toUpperCase()}}}`, 'g'), value.toString())
    }

    Object.entries(warp.vars).forEach(([placeholder, value]) => {
      if (typeof value === 'string' && value.startsWith(`${VarSourceQuery}:`)) {
        if (!config.currentUrl) throw new Error('WarpUtils: currentUrl config is required to prepare vars')
        const queryParamName = value.split(`${VarSourceQuery}:`)[1]
        const queryParamValue = new URL(config.currentUrl).searchParams.get(queryParamName)
        if (queryParamValue) modify(placeholder, queryParamValue)
      } else if (typeof value === 'string' && value.startsWith(`${VarSourceEnv}:`)) {
        const envVarName = value.split(`${VarSourceEnv}:`)[1]
        const envVarValue = config.vars?.[envVarName]
        if (envVarValue) modify(placeholder, envVarValue)
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

  static getNextStepUrl(warp: Warp, actionIndex: number, config: WarpConfig): string | null {
    const next = warp.next || (warp.actions?.[actionIndex] as any)?.next || null
    if (!next) return null
    if (next.startsWith(UrlPrefixDeterminer)) {
      return next
    } else {
      const warpLink = new WarpLink(config)
      const identifierInfo = WarpUtils.getInfoFromPrefixedIdentifier(next)
      if (!identifierInfo) return null
      return warpLink.build(identifierInfo.type, identifierInfo.id)
    }
  }

  static getChainEntrypoint(chainInfo: ChainInfo, env: ChainEnv): NetworkEntrypoint {
    const clientName = 'warp-sdk'
    const kind = 'api'
    if (env === 'devnet') return new DevnetEntrypoint(chainInfo.apiUrl, kind, clientName)
    if (env === 'testnet') return new TestnetEntrypoint(chainInfo.apiUrl, kind, clientName)
    return new MainnetEntrypoint(chainInfo.apiUrl, kind, clientName)
  }

  static getConfiguredChainApi(config: WarpConfig): ApiNetworkProvider {
    const apiUrl = config.chainApiUrl || Config.Chain.ApiUrl(config.env)
    if (!apiUrl) throw new Error('WarpUtils: Chain API URL not configured')
    return new ApiNetworkProvider(apiUrl, { timeout: 30_000, clientName: 'warp-sdk' })
  }
}
