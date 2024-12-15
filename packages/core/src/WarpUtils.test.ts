import { Warp, WarpConfig } from './types'
import { WarpUtils } from './WarpUtils'

const Config: WarpConfig = {
  env: 'devnet',
  clientUrl: 'https://anyclient.com',
}

describe('getNextStepUrl', () => {
  it('returns an url for an alias', () => {
    const warp: Warp = {
      next: 'alias:mywarp',
    } as any

    const result = WarpUtils.getNextStepUrl(warp, Config)

    expect(result).toBe('https://anyclient.com?warp=mywarp')
  })

  it('returns an url for a hash', () => {
    const warp: Warp = {
      next: 'hash:123',
    } as any

    const result = WarpUtils.getNextStepUrl(warp, Config)

    expect(result).toBe('https://anyclient.com?warp=hash%3A123')
  })

  it('returns an external url as is', () => {
    const warp: Warp = {
      next: 'https://example.com',
    } as any

    const result = WarpUtils.getNextStepUrl(warp, Config)

    expect(result).toBe('https://example.com')
  })

  it('returns null when warp has no next step', () => {
    const warp: Warp = {
      next: undefined,
    } as any

    const result = WarpUtils.getNextStepUrl(warp, Config)

    expect(result).toBeNull()
  })
})
