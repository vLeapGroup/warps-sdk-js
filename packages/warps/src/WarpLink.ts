import { WarpConfig, WarpConstants, WarpInterpolator, WarpLogger, WarpRegistry, WarpUtils } from '@vleap/warps-core'
import QRCodeStyling from 'qr-code-styling'
import { Brand, Warp, WarpCacheConfig, WarpIdType, WarpInitConfig, WarpRegistryInfo } from './types'
import { WarpBuilder } from './WarpBuilder'

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
export class WarpLink {
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
      : WarpUtils.getInfoFromPrefixedIdentifier(url)

    if (!idResult) {
      return emptyResult
    }

    try {
      const { type, identifierBase } = idResult
      const builder = new WarpBuilder(this.config)
      const registry = new WarpRegistry(this.config)
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

  build(type: WarpIdType, id: string): string {
    const clientUrl = this.config.clientUrl || WarpConfig.DefaultClientUrl(this.config.env)
    const encodedValue =
      type === WarpConstants.IdentifierType.Alias
        ? encodeURIComponent(id)
        : encodeURIComponent(type + WarpConstants.IdentifierParamSeparator + id)

    return WarpConfig.SuperClientUrls.includes(clientUrl)
      ? `${clientUrl}/${encodedValue}`
      : `${clientUrl}?${WarpConstants.IdentifierParamName}=${encodedValue}`
  }

  buildFromPrefixedIdentifier(prefixedIdentifier: string): string {
    const idResult = WarpUtils.getInfoFromPrefixedIdentifier(prefixedIdentifier)
    if (!idResult) return ''
    return this.build(idResult.type, idResult.identifierBase)
  }

  generateQrCode(type: WarpIdType, id: string, size = 512, background = 'white', color = 'black', logoColor = '#23F7DD'): QRCodeStyling {
    const url = this.build(type, id)

    return new QRCodeStyling({
      type: 'svg',
      width: size,
      height: size,
      data: String(url),
      margin: 16,
      qrOptions: { typeNumber: 0, mode: 'Byte', errorCorrectionLevel: 'Q' },
      backgroundOptions: { color: background },
      dotsOptions: { type: 'extra-rounded', color },
      cornersSquareOptions: { type: 'extra-rounded', color },
      cornersDotOptions: { type: 'square', color },
      imageOptions: { hideBackgroundDots: true, imageSize: 0.4, margin: 8 },
      image: `data:image/svg+xml;utf8,<svg width="16" height="16" viewBox="0 0 100 100" fill="${encodeURIComponent(logoColor)}" xmlns="http://www.w3.org/2000/svg"><path d="M54.8383 50.0242L95 28.8232L88.2456 16L51.4717 30.6974C50.5241 31.0764 49.4759 31.0764 48.5283 30.6974L11.7544 16L5 28.8232L45.1616 50.0242L5 71.2255L11.7544 84.0488L48.5283 69.351C49.4759 68.9724 50.5241 68.9724 51.4717 69.351L88.2456 84.0488L95 71.2255L54.8383 50.0242Z"/></svg>`,
    })
  }

  private extractIdentifierInfoFromUrl(url: string): { type: WarpIdType; identifier: string; identifierBase: string } | null {
    const urlObj = new URL(url)
    const isSuperClient = WarpConfig.SuperClientUrls.includes(urlObj.origin)
    const searchParamValue = urlObj.searchParams.get(WarpConstants.IdentifierParamName)
    const value = isSuperClient && !searchParamValue ? urlObj.pathname.split('/')[1] : searchParamValue

    if (!value) {
      return null
    }

    const decodedParam = decodeURIComponent(value)

    return WarpUtils.getInfoFromPrefixedIdentifier(decodedParam)
  }
}
