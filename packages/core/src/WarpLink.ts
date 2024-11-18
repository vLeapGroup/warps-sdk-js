import QRCodeStyling from 'qr-code-styling'
import { Config } from './config'
import { Brand, Warp, WarpConfig, WarpIdType } from './types'
import { WarpBuilder } from './WarpBuilder'
import { WarpRegistry } from './WarpRegistry'

type DetectionResult = {
  match: boolean
  warp: Warp | null
  brand: Brand | null
}

const IdParamName = 'xwarp'
const IdParamSeparator = ':'
const DefaultIdType = 'alias'

// Example Link (Transaction Hash as ID): https://xwarp.me/to?xwarp=hash%3A<MYHASH>
// Example Link (Alias as ID): https://xwarp.me/to?xwarp=alias%3A<MYALIAS>
export class WarpLink {
  constructor(private config: WarpConfig) {
    this.config = config
  }

  async detect(url: string): Promise<DetectionResult> {
    const urlObj = new URL(url)
    const searchParams = urlObj.searchParams
    const param = searchParams.get(IdParamName)

    if (!param) {
      return { match: false, warp: null, brand: null }
    }

    const decodedParam = decodeURIComponent(param)
    const normalizedParam = decodedParam.includes(IdParamSeparator) ? decodedParam : `${DefaultIdType}${IdParamSeparator}${decodedParam}`
    const [idType, id] = normalizedParam.split(IdParamSeparator)

    const builder = new WarpBuilder(this.config)
    const registry = new WarpRegistry(this.config)
    let warp: Warp | null = null
    let brand: Brand | null = null

    if (idType === 'hash') {
      const [warpInfo, { brand: brandInfo }] = await Promise.all([builder.createFromTransactionHash(id), registry.getInfoByHash(id)])
      warp = warpInfo
      brand = brandInfo
    } else if (idType === 'alias') {
      const { warp: warpInfo, brand: brandInfo } = await registry.getInfoByAlias(id)
      if (warpInfo) {
        warp = await builder.createFromTransactionHash(warpInfo.hash)
        brand = brandInfo
      }
    }

    return warp ? { match: true, warp, brand } : { match: false, warp: null, brand: null }
  }

  build(type: WarpIdType, id: string): string {
    const clientUrl = this.config.clientUrl || Config.DefaultClientUrl(this.config.env)

    if (type === DefaultIdType) {
      return `${clientUrl}?${IdParamName}=${encodeURIComponent(id)}`
    }

    return `${clientUrl}?${IdParamName}=${encodeURIComponent(type + IdParamSeparator + id)}`
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
}
