import { WarpText } from './i18n'
import { WarpMeta } from './warp'

export type WarpBrand = {
  protocol: string
  name: WarpText
  description: WarpText
  logo: WarpBrandLogo
  urls?: WarpBrandUrls
  colors?: WarpBrandColors
  cta?: WarpBrandCta
  meta?: WarpMeta
}

export type WarpBrandLogoThemed = { light: string; dark: string }
export type WarpBrandLogo = string | WarpBrandLogoThemed

export type WarpBrandUrls = {
  web?: string
}

export type WarpBrandColors = {
  primary?: string
  secondary?: string
}

export type WarpBrandCta = {
  title: WarpText
  description: WarpText
  label: WarpText
  url: string
}
