export type WarpSearchResult = {
  hits: WarpSearchHit[]
}

export type WarpSearchHit = {
  hash: string
  alias: string
  name: string
  title: string
  description: string
  preview: string
  status: string
  category: string
  featured: boolean
}
