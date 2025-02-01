import { WarpConfig, WarpSearchHit, WarpSearchResult } from './types'

export class WarpIndex {
  constructor(private config: WarpConfig) {}

  async search(query: string): Promise<WarpSearchHit[]> {
    if (!this.config.indexUrl) throw new Error('WarpIndex: Index URL is not set')
    try {
      const res = await fetch(this.config.indexUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.indexApiKey}`,
        },
        body: JSON.stringify({ [this.config.indexSearchParamName || 'search']: query }),
      })

      if (!res.ok) {
        throw new Error(`WarpIndex: search failed with status ${res.status}`)
      }

      const data = (await res.json()) as WarpSearchResult

      return data.hits
    } catch (error) {
      console.error('WarpIndex: Error searching for warps: ', error)
      throw error
    }
  }
}
