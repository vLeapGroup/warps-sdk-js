import { WarpChainEnv } from './types/general'
import { WarpExecutionResults } from './types/results'
import { Warp, WarpConfig } from './types/warp'
import { WarpInterpolator } from './WarpInterpolator'
import { WarpUtils } from './WarpUtils'

const testConfig: WarpConfig = {
  env: 'devnet' as WarpChainEnv,
  clientUrl: 'https://anyclient.com',
  currentUrl: 'https://anyclient.com',
  vars: {},
  user: undefined,
}

describe('applyVars', () => {
  it('replaces placeholders with values', () => {
    const config = { ...testConfig }
    const warp: Warp = {
      description: 'You are {{AGE}} years old',
      vars: {
        AGE: 10,
      },
    } as any

    const actual = WarpInterpolator.applyVars(config, warp)

    expect(actual.description).toBe('You are 10 years old')
  })

  it('replaces vars with env vars from config', () => {
    const config = { ...testConfig, vars: { AGE: 10 } }
    const warp: Warp = {
      title: 'Age: {{AGE}}',
      description: 'You are {{AGE}} years old',
      vars: {
        AGE: 'env:AGE',
      },
    } as any

    const actual = WarpInterpolator.applyVars(config, warp)

    expect(actual.title).toBe('Age: 10')
    expect(actual.description).toBe('You are 10 years old')
  })

  it('replaces vars with query params from the current url', () => {
    const config = { ...testConfig, currentUrl: 'https://anyclient.com?age=10' }
    const warp: Warp = {
      title: 'Age: {{AGE}}',
      description: 'You are {{AGE}} years old',
      vars: {
        AGE: 'query:age',
      },
    } as any

    const actual = WarpInterpolator.applyVars(config, warp)

    expect(actual.title).toBe('Age: 10')
    expect(actual.description).toBe('You are 10 years old')
  })

  it('replaces var with user wallet', () => {
    const config = { ...testConfig, user: { wallet: 'erd123456789' } }
    const warp: Warp = {
      title: 'Age: {{AGE}}',
      description: 'You are {{AGE}} years old',
      vars: {
        AGE: 'user:wallet',
      },
    } as any

    const actual = WarpInterpolator.applyVars(config, warp)

    expect(actual.title).toBe('Age: erd123456789')
    expect(actual.description).toBe('You are erd123456789 years old')
  })
})

describe('getNextInfo', () => {
  it('returns info for an alias', () => {
    const warp: Warp = { next: 'mywarp' } as any
    const result = WarpUtils.getNextInfo(testConfig, warp, 1, {})
    expect(result?.[0].identifier).toBe('mywarp')
    expect(result?.[0].url).toBe('https://anyclient.com?warp=mywarp')
  })

  it('returns info for a prefixed alias', () => {
    const warp: Warp = { next: 'alias:mywarp' } as any
    const result = WarpUtils.getNextInfo(testConfig, warp, 1, {})
    expect(result?.[0].identifier).toBe('alias:mywarp')
    expect(result?.[0].url).toBe('https://anyclient.com?warp=mywarp')
  })

  it('returns info for a super client', () => {
    const config = { ...testConfig, clientUrl: 'https://usewarp.to', currentUrl: 'https://usewarp.to' }
    const warp: Warp = { next: 'mywarp?param1=value1&param2=value2' } as any
    const result = WarpUtils.getNextInfo(config, warp, 1, {})
    expect(result?.[0].identifier).toBe('mywarp?param1=value1&param2=value2')
    expect(result?.[0].url).toBe('https://usewarp.to/mywarp?param1=value1&param2=value2')
  })

  it('returns an url for a prefixed hash', () => {
    const warp: Warp = { next: 'hash:123' } as any
    const result = WarpUtils.getNextInfo(testConfig, warp, 1, {})
    expect(result?.[0].identifier).toBe('hash:123')
    expect(result?.[0].url).toBe('https://anyclient.com?warp=hash%3A123')
  })

  it('returns an external url as is', () => {
    const warp: Warp = { next: 'https://example.com' } as any
    const result = WarpUtils.getNextInfo(testConfig, warp, 1, {})
    expect(result).toEqual([{ identifier: null, url: 'https://example.com' }])
  })

  it('returns null when warp has no next step', () => {
    const warp: Warp = { next: undefined } as any
    const result = WarpUtils.getNextInfo(testConfig, warp, 1, {})
    expect(result).toBeNull()
  })

  it('keeps url params as part of the identifier', () => {
    const warp: Warp = { next: 'mywarp?param1=value1&param2=value2' } as any
    const result = WarpUtils.getNextInfo(testConfig, warp, 1, {})
    expect(result?.[0].identifier).toBe('mywarp?param1=value1&param2=value2')
    expect(result?.[0].url).toBe('https://anyclient.com?warp=mywarp&param1=value1&param2=value2')
  })

  it('returns empty array when array-based next link has empty results array', () => {
    const warp: Warp = {
      next: 'mywarp?address={{DELEGATIONS[].address}}',
      results: {
        DELEGATIONS: [],
      },
    } as any
    const results = warp.results as WarpExecutionResults
    const result = WarpUtils.getNextInfo(testConfig, warp, 1, results)
    expect(result).toEqual([])
  })

  it('handles array-based next links with object fields', () => {
    const warp: Warp = {
      next: 'mywarp?address={{DELEGATIONS[].address}}',
      results: {
        DELEGATIONS: [{ address: 'ABC' }, { address: 'DEF' }],
      },
    } as any
    const results = warp.results as WarpExecutionResults
    const result = WarpUtils.getNextInfo(testConfig, warp, 1, results)
    expect(result).toEqual([
      { identifier: 'mywarp?address=ABC', url: 'https://anyclient.com?warp=mywarp&address=ABC' },
      { identifier: 'mywarp?address=DEF', url: 'https://anyclient.com?warp=mywarp&address=DEF' },
    ])
  })

  it('handles array-based next links with simple values', () => {
    const warp: Warp = {
      next: 'mywarp?value={{VALUES[]}}',
      results: {
        VALUES: ['A', 'B', 'C'],
      },
    } as any
    const results = warp.results as WarpExecutionResults
    const result = WarpUtils.getNextInfo(testConfig, warp, 1, results)
    expect(result).toEqual([
      { identifier: 'mywarp?value=A', url: 'https://anyclient.com?warp=mywarp&value=A' },
      { identifier: 'mywarp?value=B', url: 'https://anyclient.com?warp=mywarp&value=B' },
      { identifier: 'mywarp?value=C', url: 'https://anyclient.com?warp=mywarp&value=C' },
    ])
  })

  it('handles array-based next links with non-array results', () => {
    const warp: Warp = {
      next: 'mywarp?value={{SINGLE_VALUE[]}}',
      results: {
        SINGLE_VALUE: 'A',
      },
    } as any
    const results = warp.results as WarpExecutionResults
    const result = WarpUtils.getNextInfo(testConfig, warp, 1, results)
    expect(result).toEqual([{ identifier: 'mywarp?value=A', url: 'https://anyclient.com?warp=mywarp&value=A' }])
  })

  it('handles array-based next links with null values', () => {
    const warp: Warp = {
      next: 'mywarp?value={{VALUES[].field}}',
      results: {
        VALUES: [{ field: 'A' }, { field: null }, { field: 'C' }],
      },
    } as any
    const results = warp.results as WarpExecutionResults
    const result = WarpUtils.getNextInfo(testConfig, warp, 1, results)
    expect(result).toEqual([
      { identifier: 'mywarp?value=A', url: 'https://anyclient.com?warp=mywarp&value=A' },
      { identifier: 'mywarp?value=C', url: 'https://anyclient.com?warp=mywarp&value=C' },
    ])
  })

  it('handles multiple array placeholders in same next link', () => {
    const warp: Warp = {
      next: 'stake-distribution?user={{STAKERS[].user}}&amount={{STAKERS[].amount}}',
      results: {
        BASE_DATA: [
          { contract: 'A', value: 100 },
          { contract: 'B', value: 200 },
        ],
        STAKERS: [
          { user: 'alice', amount: 150 },
          { user: 'bob', amount: 250 },
        ],
      },
    } as any
    const results = warp.results as WarpExecutionResults
    const result = WarpUtils.getNextInfo(testConfig, warp, 1, results)
    expect(result).toEqual([
      {
        identifier: 'stake-distribution?user=alice&amount=150',
        url: 'https://anyclient.com?warp=stake-distribution&user=alice&amount=150',
      },
      {
        identifier: 'stake-distribution?user=bob&amount=250',
        url: 'https://anyclient.com?warp=stake-distribution&user=bob&amount=250',
      },
    ])
  })
})
