import { Warp, WarpConfig, WarpExecutionResults } from './types'
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

  it('replaces vars with env vars from config', () => {
    Config.vars = {
      AGE: 10,
    }
    const warp: Warp = {
      title: 'Age: {{AGE}}',
      description: 'You are {{AGE}} years old',
      vars: {
        AGE: 'env:AGE',
      },
    } as any

    const actual = WarpUtils.prepareVars(warp, Config)

    expect(actual.title).toBe('Age: 10')
    expect(actual.description).toBe('You are 10 years old')
  })
})

describe('getNextInfo', () => {
  it('returns info for an alias', () => {
    const warp: Warp = { next: 'mywarp' } as any
    const result = WarpUtils.getNextInfo(warp, 1, {}, Config)

    expect(result?.identifier).toBe('mywarp')
    expect(result?.url).toBe('https://anyclient.com?warp=mywarp')
  })

  it('returns info for a prefixed alias', () => {
    const warp: Warp = { next: 'alias:mywarp' } as any
    const result = WarpUtils.getNextInfo(warp, 1, {}, Config)

    expect(result?.identifier).toBe('alias:mywarp')
    expect(result?.url).toBe('https://anyclient.com?warp=alias%3Amywarp')
  })

  it('returns an url for a prefixed hash', () => {
    const warp: Warp = { next: 'hash:123' } as any
    const result = WarpUtils.getNextInfo(warp, 1, {}, Config)

    expect(result?.identifier).toBe('hash:123')
    expect(result?.url).toBe('https://anyclient.com?warp=hash%3A123')
  })

  it('returns an external url as is', () => {
    const warp: Warp = { next: 'https://example.com' } as any
    const result = WarpUtils.getNextInfo(warp, 1, {}, Config)

    expect(result?.identifier).toBeNull()
    expect(result?.url).toBe('https://example.com')
  })

  it('returns null when warp has no next step', () => {
    const warp: Warp = { next: undefined } as any
    const result = WarpUtils.getNextInfo(warp, 1, {}, Config)

    expect(result).toBeNull()
  })

  it('keeps url params as part of the identifier', () => {
    const warp: Warp = { next: 'mywarp?param1=value1&param2=value2' } as any
    const result = WarpUtils.getNextInfo(warp, 1, {}, Config)

    expect(result?.identifier).toBe('mywarp?param1=value1&param2=value2')
    expect(result?.url).toBe('https://anyclient.com?warp=mywarp%3Fparam1%3Dvalue1%26param2%3Dvalue2')
  })

  it('merges url params from the identifier with the url params from the config', () => {
    Config.currentUrl = 'https://anyclient.com?param3=3&param4=4'

    const warp: Warp = { next: 'mywarp?param1=1&param2=2' } as any
    const result = WarpUtils.getNextInfo(warp, 1, {}, Config)

    expect(result?.identifier).toBe('mywarp?param1=1&param2=2&param3=3&param4=4')
    expect(result?.url).toBe('https://anyclient.com?warp=mywarp%3Fparam1%3D1%26param2%3D2%26param3%3D3%26param4%3D4')
  })

  it('replaces placeholders in the query', () => {
    Config.currentUrl = 'https://anyclient.com'
    const results: WarpExecutionResults = { AGE: 21 }

    const warp: Warp = { next: 'mywarp?age={{AGE}}' } as any
    const result = WarpUtils.getNextInfo(warp, 1, results, Config)

    expect(result?.identifier).toBe('mywarp?age=21')
    expect(result?.url).toBe('https://anyclient.com?warp=mywarp%3Fage%3D21')
  })
})
