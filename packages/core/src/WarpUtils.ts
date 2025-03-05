import { ApiNetworkProvider } from '@multiversx/sdk-core/out'
import { Config } from './config'
import { WarpConstants } from './constants'
import { Warp, WarpConfig, WarpIdType } from './types'
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
      : `${WarpConstants.DefaultIdentifierType}${WarpConstants.IdentifierParamSeparator}${decodedIdentifier}`

    const [idType, id] = normalizedParam.split(WarpConstants.IdentifierParamSeparator)

    return { type: idType as WarpIdType, id }
  }

  static getNextStepUrl(warp: Warp, config: WarpConfig): string | null {
    if (!warp?.next) return null
    if (warp.next.startsWith(UrlPrefixDeterminer)) {
      return warp.next
    } else {
      const warpLink = new WarpLink(config)
      const identifierInfo = WarpUtils.getInfoFromPrefixedIdentifier(warp.next)
      if (!identifierInfo) return null
      return warpLink.build(identifierInfo.type, identifierInfo.id)
    }
  }

  static getConfiguredChainApi(config: WarpConfig): ApiNetworkProvider {
    const apiUrl = config.chainApiUrl || Config.Chain.ApiUrl(config.env)
    if (!apiUrl) throw new Error('WarpUtils: Chain API URL not configured')
    return new ApiNetworkProvider(apiUrl, { timeout: 30_000, clientName: 'warp-sdk' })
  }
}
