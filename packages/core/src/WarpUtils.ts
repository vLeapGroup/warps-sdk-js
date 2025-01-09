import { DefaultIdentifierType, IdentifierParamSeparator } from './constants'
import { Warp, WarpConfig, WarpIdType } from './types'
import { WarpLink } from './WarpLink'

const UrlPrefixDeterminer = 'https://'

const VarSourceQuery = 'query'

export class WarpUtils {
  static prepareVars(warp: Warp, config: WarpConfig): Warp {
    if (!warp?.vars) return warp
    let modifiable = JSON.stringify(warp)

    const modify = (placeholder: string, value: string) => {
      modifiable = modifiable.replace(new RegExp(`{{${placeholder.toUpperCase()}}}`, 'g'), value)
    }

    Object.entries(warp.vars).forEach(([placeholder, value]) => {
      if (typeof value === 'string' && value.startsWith(`${VarSourceQuery}:`)) {
        if (!config.currentUrl) throw new Error('WarpUtils: currentUrl config is required to prepare vars')
        const queryParamName = value.split(`${VarSourceQuery}:`)[1]
        const queryParamValue = new URL(config.currentUrl).searchParams.get(queryParamName)
        if (queryParamValue) modify(placeholder, queryParamValue)
      } else {
        modify(placeholder, value)
      }
    })

    return JSON.parse(modifiable)
  }

  static getInfoFromPrefixedIdentifier(prefixedIdentifier: string): { type: WarpIdType; id: string } | null {
    const decodedIdentifier = decodeURIComponent(prefixedIdentifier)
    const normalizedParam = decodedIdentifier.includes(IdentifierParamSeparator)
      ? decodedIdentifier
      : `${DefaultIdentifierType}${IdentifierParamSeparator}${decodedIdentifier}`

    const [idType, id] = normalizedParam.split(IdentifierParamSeparator)

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
}
