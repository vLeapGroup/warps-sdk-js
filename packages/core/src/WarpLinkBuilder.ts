import QRCodeStyling from 'qr-code-styling'
import { WarpConfig } from './config'
import { WarpConstants } from './constants'
import { extractIdentifierInfoFromUrl, getWarpInfoFromIdentifier } from './helpers/identifier'
import { WarpClientConfig, WarpIdType } from './types'

// Example Link (Transaction Hash as ID): https://usewarp.to/to?warp=hash%3A<MYHASH>
// Example Link (Alias as ID): https://usewarp.to/to?warp=alias%3A<MYALIAS>
export class WarpLinkBuilder {
  constructor(private config: WarpClientConfig) {
    this.config = config
  }

  isValid(url: string): boolean {
    if (!url.startsWith(WarpConstants.HttpProtocolPrefix)) return false
    const idResult = extractIdentifierInfoFromUrl(url)
    return !!idResult
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

  buildFromPrefixedIdentifier(identifier: string): string {
    const idResult = getWarpInfoFromIdentifier(identifier)
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
}
