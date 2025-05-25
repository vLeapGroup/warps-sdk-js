import { WarpConfig, WarpSearchHit, WarpSearchResult } from './types'

export class WarpIndex {
  constructor(private config: WarpConfig) {}

  async search(query: string, params?: Record<string, any>, headers?: Record<string, string>): Promise<WarpSearchHit[]> {
    if (!this.config.index?.url) throw new Error('WarpIndex: Index URL is not set')
    try {
      const res = await fetch(this.config.index?.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.index?.apiKey}`,
          ...headers,
        },
        body: JSON.stringify({ [this.config.index?.searchParamName || 'search']: query, ...params }),
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
