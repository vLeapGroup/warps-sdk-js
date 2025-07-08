import { AdapterWarpBuilder, AdapterWarpRegistry } from './adapters'
import { WarpConstants } from './constants'
import { extractIdentifierInfoFromUrl, getWarpInfoFromIdentifier } from './helpers'
import { Warp, WarpBrand, WarpCacheConfig, WarpInitConfig, WarpRegistryInfo } from './types'
import { WarpInterpolator } from './WarpInterpolator'
import { WarpLogger } from './WarpLogger'

type DetectionResult = {
  match: boolean
  url: string
  warp: Warp | null
  registryInfo: WarpRegistryInfo | null
  brand: WarpBrand | null
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
  private registry: AdapterWarpRegistry
  private builder: AdapterWarpBuilder

  constructor(private config: WarpInitConfig) {
    this.registry = new this.config.repository.registry(this.config)
    this.builder = new this.config.repository.builder(this.config)
  }

  isValid(url: string): boolean {
    if (!url.startsWith(WarpConstants.HttpProtocolPrefix)) return false
    const idResult = extractIdentifierInfoFromUrl(url)
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

    const idResult = url.startsWith(WarpConstants.HttpProtocolPrefix) ? extractIdentifierInfoFromUrl(url) : getWarpInfoFromIdentifier(url)

    if (!idResult) {
      return emptyResult
    }

    try {
      const { type, identifierBase } = idResult
      let warp: Warp | null = null
      let registryInfo: WarpRegistryInfo | null = null
      let brand: WarpBrand | null = null

      if (type === 'hash') {
        warp = await this.builder.createFromTransactionHash(identifierBase, cache)
        const result = await this.registry.getInfoByHash(identifierBase, cache)
        registryInfo = result.registryInfo
        brand = result.brand
      } else if (type === 'alias') {
        const result = await this.registry.getInfoByAlias(identifierBase, cache)
        registryInfo = result.registryInfo
        brand = result.brand
        if (result.registryInfo) {
          warp = await this.builder.createFromTransactionHash(result.registryInfo.hash, cache)
        }
      }

      const interpolator = new WarpInterpolator(this.config)
      const preparedWarp = warp ? await interpolator.apply(this.config, warp) : null

      return preparedWarp ? { match: true, url, warp: preparedWarp, registryInfo, brand } : emptyResult
    } catch (e) {
      WarpLogger.error('Error detecting warp link', e)
      return emptyResult
    }
  }
}
