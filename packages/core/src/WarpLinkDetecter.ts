import { WarpConstants } from './constants'
import { extractIdentifierInfoFromUrl, findWarpAdapterByPrefix, getWarpInfoFromIdentifier } from './helpers'
import { Adapter, Warp, WarpBrand, WarpCacheConfig, WarpChain, WarpClientConfig, WarpRegistryInfo } from './types'
import { WarpInterpolator } from './WarpInterpolator'
import { WarpLogger } from './WarpLogger'

export type DetectionResult = {
  match: boolean
  url: string
  warp: Warp | null
  chain: WarpChain | null
  registryInfo: WarpRegistryInfo | null
  brand: WarpBrand | null
}

export type DetectionResultFromHtml = {
  match: boolean
  results: {
    url: string
    warp: Warp
  }[]
}

// Example Link (Transaction Hash as ID): https://usewarp.to/to?warp=hash%3A<MYHASH>
// Example Link (Alias as ID): https://usewarp.to/to?warp=alias%3A<MYALIAS>
export class WarpLinkDetecter {
  constructor(
    private config: WarpClientConfig,
    private adapters: Adapter[]
  ) {}

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
    const emptyResult: DetectionResult = { match: false, url, warp: null, chain: null, registryInfo: null, brand: null }

    const idResult = url.startsWith(WarpConstants.HttpProtocolPrefix) ? extractIdentifierInfoFromUrl(url) : getWarpInfoFromIdentifier(url)

    if (!idResult) {
      return emptyResult
    }

    try {
      const { type, identifierBase } = idResult
      let warp: Warp | null = null
      let registryInfo: WarpRegistryInfo | null = null
      let brand: WarpBrand | null = null

      const adapter = findWarpAdapterByPrefix(idResult.chainPrefix, this.adapters)

      if (type === 'hash') {
        warp = await adapter.builder().createFromTransactionHash(identifierBase, cache)
        const result = await adapter.registry.getInfoByHash(identifierBase, cache)
        registryInfo = result.registryInfo
        brand = result.brand
      } else if (type === 'alias') {
        const result = await adapter.registry.getInfoByAlias(identifierBase, cache)
        registryInfo = result.registryInfo
        brand = result.brand
        if (result.registryInfo) {
          warp = await adapter.builder().createFromTransactionHash(result.registryInfo.hash, cache)
        }
      }

      const preparedWarp = warp ? await new WarpInterpolator(this.config, adapter).apply(this.config, warp) : null

      return preparedWarp ? { match: true, url, warp: preparedWarp, chain: adapter.chain, registryInfo, brand } : emptyResult
    } catch (e) {
      WarpLogger.error('Error detecting warp link', e)
      return emptyResult
    }
  }
}
