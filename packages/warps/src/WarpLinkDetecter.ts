import { WarpMultiversxRegistry } from '@vleap/warps-adapter-multiversx'
import {
    Brand,
    Warp,
    WarpCacheConfig,
    WarpConstants,
    WarpInitConfig,
    WarpInterpolator,
    WarpLogger,
    WarpRegistryInfo,
    getWarpInfoFromIdentifier
} from '@vleap/warps-core'
import { WarpBuilder } from './WarpBuilder'

// @ts-ignore: no type declarations for qr-code-styling

type DetectionResult = {
  match: boolean
  url: string
  warp: Warp | null
  registryInfo: WarpRegistryInfo | null
  brand: Brand | null
}

type DetectionResultFromHtml = {
  match: boolean
  results: {
    url: string
    warp: Warp
  }[]
}

// Example Link (Transaction Hash as ID): https://usewarp.to/to?warp=hash%3A<MYHASH>
// Example Link (Alias as ID): https://usewarp.to/to?warp=alias%3A<MYALIAS>
export class WarpLinkDetecter {
  constructor(private config: WarpInitConfig) {
    this.config = config
  }

  isValid(url: string): boolean {
    if (!url.startsWith(WarpConstants.HttpProtocolPrefix)) return false
    const idResult = this.extractIdentifierInfoFromUrl(url)
    return !!idResult
  }

  async detectFromHtml(content: string): Promise<DetectionResultFromHtml> {
    if (!content.length) return { match: false, results: [] }
    const links = [...content.matchAll(/https?:\/\/[^\s"'<>]+/gi)].map((link) => link[0])
    const warpLinks = links.filter((link) => this.isValid(link))
    const detectionReqs = warpLinks.map((link) => this.detect(link))
    const detectionResults = await Promise.all(detectionReqs)
    const validDetections = detectionResults.filter((result) => result.match)
    const hasMatch = validDetections.length > 0
    const results = validDetections.map((result) => ({ url: result.url, warp: result.warp! }))

    return { match: hasMatch, results }
  }

  async detect(url: string, cache?: WarpCacheConfig): Promise<DetectionResult> {
    const emptyResult: DetectionResult = { match: false, url, warp: null, registryInfo: null, brand: null }

    const idResult = url.startsWith(WarpConstants.HttpProtocolPrefix)
      ? this.extractIdentifierInfoFromUrl(url)
      : getWarpInfoFromIdentifier(url)

    if (!idResult) {
      return emptyResult
    }

    try {
      const { type, identifierBase } = idResult
      const builder = new WarpBuilder(this.config)
      const registry = new WarpMultiversxRegistry(this.config)
      let warp: Warp | null = null
      let registryInfo: WarpRegistryInfo | null = null
      let brand: Brand | null = null

      if (type === 'hash') {
        warp = await builder.createFromTransactionHash(identifierBase, cache)
        const result = await registry.getInfoByHash(identifierBase, cache)
        registryInfo = result.registryInfo
        brand = result.brand
      } else if (type === 'alias') {
        const result = await registry.getInfoByAlias(identifierBase, cache)
        registryInfo = result.registryInfo
        brand = result.brand
        if (result.registryInfo) {
          warp = await builder.createFromTransactionHash(result.registryInfo.hash, cache)
        }
      }

      const preparedWarp = warp ? await WarpInterpolator.apply(this.config, warp) : null

      return preparedWarp ? { match: true, url, warp: preparedWarp, registryInfo, brand } : emptyResult
    } catch (e) {
      WarpLogger.error('Error detecting warp link', e)
      return emptyResult
    }
  }
}
