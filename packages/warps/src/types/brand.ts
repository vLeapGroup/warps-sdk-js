export type Brand = {
  protocol: string
  name: string
  description: string
  logo: string
  urls?: BrandUrls
  colors?: BrandColors
  cta?: BrandCta
  meta?: BrandMeta
}

export type BrandUrls = {
  web?: string
}

export type BrandColors = {
  primary?: string
  secondary?: string
}

export type BrandCta = {
  title: string
  description: string
  label: string
  url: string
}

export type BrandMeta = {
  hash: string
  creator: string
  createdAt: string
}
