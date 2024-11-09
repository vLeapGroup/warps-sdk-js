import { Config } from './config'
import { Warp, WarpConfig, WarpIdType } from './types'
import { WarpBuilder } from './WarpBuilder'
import { WarpRegistry } from './WarpRegistry'

type DetectionResult = {
  match: boolean
  warp: Warp | null
}

const IdParamName = 'xwarp'
const IdParamSeparator = ':'

// Example Link (Transaction Hash as ID): https://xwarp.me/to?xwarp=hash%3A<MYHASH>
// Example Link (Alias as ID): https://xwarp.me/to?xwarp=alias%3A<MYALIAS>
export class WarpLink {
  constructor(private config: WarpConfig) {
    this.config = config
  }

  build(type: WarpIdType, id: string): string {
    const clientUrl = this.config.clientUrl || Config.DefaultClientUrl(this.config.env)
    return `${clientUrl}?${IdParamName}=${encodeURIComponent(type)}${IdParamSeparator}${encodeURIComponent(id)}`
  }

  async detect(url: string): Promise<DetectionResult> {
    const urlObj = new URL(url)
    const searchParams = urlObj.searchParams
    const param = searchParams.get(IdParamName)

    if (!param) {
      return { match: false, warp: null }
    }

    const [idType, id] = param.split(IdParamSeparator)
    const builder = new WarpBuilder(this.config)
    const registry = new WarpRegistry(this.config)
    let warp: Warp | null = null

    if (idType === 'hash') {
      warp = await builder.createFromTransactionHash(id)
    } else if (idType === 'alias') {
      const hash = await registry.resolveAlias(id)
      if (hash) {
        warp = await builder.createFromTransactionHash(hash)
      }
    }

    return warp ? { match: true, warp } : { match: false, warp: null }
  }
}