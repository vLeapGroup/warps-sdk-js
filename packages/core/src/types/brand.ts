export type WarpBrand = {
  protocol: string
  name: string
  description: string
  logo: string
  urls?: WarpBrandUrls
  colors?: WarpBrandColors
  cta?: WarpBrandCta
  meta?: WarpBrandMeta
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

export type WarpBrandMeta = {
  hash: string
  creator: string
  createdAt: string
}
