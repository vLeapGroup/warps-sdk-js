import { Warp, WarpConfig } from './types'
import { WarpUtils } from './WarpUtils'

const Config: WarpConfig = {
  env: 'devnet',
  clientUrl: 'https://anyclient.com',
}

describe('prepareVars', () => {
  it('replaces placeholders with values', () => {
    const warp: Warp = {
      description: 'You are {{AGE}} years old',
      vars: {
        AGE: 10,
      },
    } as any

    const actual = WarpUtils.prepareVars(warp, Config)

    expect(actual.description).toBe('You are 10 years old')
  })

  it('replaces vars with query params', () => {
    Config.currentUrl = 'https://anyclient.com?age=10'
    const warp: Warp = {
      description: 'You are {{AGE}} years old',
      vars: {
        AGE: 'query:age',
      },
    } as any

    const actual = WarpUtils.prepareVars(warp, Config)

    expect(actual.description).toBe('You are 10 years old')
  })
})

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
