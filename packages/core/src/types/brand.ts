import { WarpMeta } from './warp'

export type WarpBrand = {
  protocol: string
  name: string
  description: string
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
  title: string
  description: string
  label: string
  url: string
}
