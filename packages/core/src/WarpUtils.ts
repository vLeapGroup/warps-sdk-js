import { Warp, WarpConfig } from './types'
import { WarpLink } from './WarpLink'

const UrlPrefixDeterminer = 'https://'

export class WarpUtils {
  static getNextStepUrl(warp: Warp, config: WarpConfig): string | null {
    if (!warp?.next) return null
    if (warp.next.startsWith(UrlPrefixDeterminer)) {
      return warp.next
    } else {
      const warpLink = new WarpLink(config)
      const identifierInfo = warpLink.getIdentifierInfo(warp.next)
      if (!identifierInfo) return null
      return warpLink.build(identifierInfo.type, identifierInfo.id)
    }
  }
}
