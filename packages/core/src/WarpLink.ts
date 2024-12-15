import QRCodeStyling from 'qr-code-styling'
import { Config } from './config'
import { Brand, RegistryInfo, Warp, WarpConfig, WarpIdType } from './types'
import { WarpBuilder } from './WarpBuilder'
import { WarpRegistry } from './WarpRegistry'

type DetectionResult = {
  match: boolean
  warp: Warp | null
  registryInfo: RegistryInfo | null
  brand: Brand | null
}

const IdParamName = 'warp'
const IdParamSeparator = ':'
const DefaultIdType = 'alias'

// Example Link (Transaction Hash as ID): https://usewarp.to/to?warp=hash%3A<MYHASH>
// Example Link (Alias as ID): https://usewarp.to/to?warp=alias%3A<MYALIAS>
export class WarpLink {
  constructor(private config: WarpConfig) {
    this.config = config
  }

  async detect(url: string): Promise<DetectionResult> {
    const idResult = this.extractIdentifierInfoFromUrl(url)

    if (!idResult) {
      return { match: false, warp: null, registryInfo: null, brand: null }
    }

    const { type, id } = idResult
    const builder = new WarpBuilder(this.config)
    const registry = new WarpRegistry(this.config)
    let warp: Warp | null = null
    let registryInfo: RegistryInfo | null = null
    let brand: Brand | null = null

    if (type === 'hash') {
      warp = await builder.createFromTransactionHash(id)
      try {
        const { registryInfo: ri, brand: bi } = await registry.getInfoByHash(id)
        registryInfo = ri
        brand = bi
      } catch (e) {}
    } else if (type === 'alias') {
      const { registryInfo: ri, brand: bi } = await registry.getInfoByAlias(id)
      registryInfo = ri
      brand = bi
      if (ri) {
        warp = await builder.createFromTransactionHash(ri.hash)
      }
    }

    return warp ? { match: true, warp, registryInfo, brand } : { match: false, warp: null, registryInfo: null, brand: null }
  }

  build(type: WarpIdType, id: string): string {
    const clientUrl = this.config.clientUrl || Config.DefaultClientUrl(this.config.env)
    const encodedValue = type === DefaultIdType ? encodeURIComponent(id) : encodeURIComponent(type + IdParamSeparator + id)
    const superClientUrls = Config.SuperClientUrls(this.config.env)

    return superClientUrls.includes(clientUrl) ? `${clientUrl}/${encodedValue}` : `${clientUrl}?${IdParamName}=${encodedValue}`
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

  getIdentifierInfo(prefixedIdentifier: string): { type: WarpIdType; id: string } | null {
    const normalizedParam = prefixedIdentifier.includes(IdParamSeparator)
      ? prefixedIdentifier
      : `${DefaultIdType}${IdParamSeparator}${prefixedIdentifier}`

    const [idType, id] = normalizedParam.split(IdParamSeparator)

    return { type: idType as WarpIdType, id }
  }

  private extractIdentifierInfoFromUrl(url: string): { type: WarpIdType; id: string } | null {
    const urlObj = new URL(url)
    const superClientUrls = Config.SuperClientUrls(this.config.env)
    const isSuperClient = superClientUrls.includes(urlObj.origin)
    const searchParamValue = urlObj.searchParams.get(IdParamName)
    const value = isSuperClient && !searchParamValue ? urlObj.pathname.split('/')[1] : searchParamValue

    if (!value) {
      return null
    }

    const decodedParam = decodeURIComponent(value)

    return this.getIdentifierInfo(decodedParam)
  }
}
