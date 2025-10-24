import { WarpText } from './i18n'
import { WarpMeta } from './warp'

export type WarpBrand = {
  protocol: string
  name: WarpText
  description: WarpText
  logo: string
  urls?: WarpBrandUrls
  colors?: WarpBrandColors
  cta?: WarpBrandCta
  meta?: WarpMeta
}

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
