import { Config } from './config'
import { ChainEnv } from './types/general'
import { Warp } from './types/warp'
import { WarpInterpolator } from './WarpInterpolator'

const testConfig = {
  env: 'devnet' as ChainEnv,
  clientUrl: 'https://anyclient.com',
  currentUrl: 'https://anyclient.com',
  vars: {},
  user: undefined,
  chainApiUrl: Config.MainChain.ApiUrl('devnet'),
  chainExplorerUrl: Config.MainChain.ExplorerUrl('devnet'),
  warpSchemaUrl: Config.LatestWarpSchemaUrl,
  brandSchemaUrl: Config.LatestBrandSchemaUrl,
  registryContract: Config.Registry.Contract('devnet'),
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

    const actual = WarpInterpolator.applyVars(warp, config)

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

    const actual = WarpInterpolator.applyVars(warp, config)

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

    const actual = WarpInterpolator.applyVars(warp, config)

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

    const actual = WarpInterpolator.applyVars(warp, config)

    expect(actual.title).toBe('Age: erd123456789')
    expect(actual.description).toBe('You are erd123456789 years old')
  })
})

describe('applyGlobals', () => {
  it('replaces USER_WALLET placeholder with user wallet', () => {
    const config = { ...testConfig, user: { wallet: 'erd1abc' } }
    const warp: Warp = {
      description: 'Wallet: {{USER_WALLET}}',
    } as any
    const actual = WarpInterpolator.applyGlobals(warp, config)
    expect(actual.description).toBe('Wallet: erd1abc')
  })

  it('replaces CHAIN_API placeholder with chain apiUrl', () => {
    const config = { ...testConfig, chain: { apiUrl: 'https://api.example.com' } }
    const warp: Warp = {
      description: 'API: {{CHAIN_API}}',
    } as any
    const actual = WarpInterpolator.applyGlobals(warp, config)
    expect(actual.description).toBe('API: https://api.example.com')
  })

  it('replaces CHAIN_EXPLORER placeholder with chain explorerUrl', () => {
    const config = { ...testConfig, chain: { explorerUrl: 'https://explorer.example.com' } }
    const warp: Warp = {
      description: 'Explorer: {{CHAIN_EXPLORER}}',
    } as any
    const actual = WarpInterpolator.applyGlobals(warp, config)
    expect(actual.description).toBe('Explorer: https://explorer.example.com')
  })

  it('replaces multiple global placeholders', () => {
    const config = {
      ...testConfig,
      user: { wallet: 'erd1abc' },
      chain: { apiUrl: 'https://api.example.com', explorerUrl: 'https://explorer.example.com' },
    }
    const warp: Warp = {
      description: 'Wallet: {{USER_WALLET}}, API: {{CHAIN_API}}, Explorer: {{CHAIN_EXPLORER}}',
    } as any
    const actual = WarpInterpolator.applyGlobals(warp, config)
    expect(actual.description).toBe('Wallet: erd1abc, API: https://api.example.com, Explorer: https://explorer.example.com')
  })

  it('leaves placeholder if value is missing', () => {
    const config = { ...testConfig }
    const warp: Warp = {
      description: 'Wallet: {{USER_WALLET}}',
    } as any
    const actual = WarpInterpolator.applyGlobals(warp, config)
    expect(actual.description).toBe('Wallet: {{USER_WALLET}}')
  })

  it('handles null and undefined config fields', () => {
    const config = { ...testConfig, user: { wallet: undefined }, chain: undefined }
    const warp: Warp = {
      description: 'Wallet: {{USER_WALLET}}, API: {{CHAIN_API}}, Explorer: {{CHAIN_EXPLORER}}',
    } as any
    const actual = WarpInterpolator.applyGlobals(warp, config)
    expect(actual.description).toBe('Wallet: {{USER_WALLET}}, API: {{CHAIN_API}}, Explorer: {{CHAIN_EXPLORER}}')
  })

  it('returns unchanged warp if no placeholders present', () => {
    const config = { ...testConfig, user: { wallet: 'erd1abc' } }
    const warp: Warp = {
      description: 'No placeholders here',
    } as any
    const actual = WarpInterpolator.applyGlobals(warp, config)
    expect(actual.description).toBe('No placeholders here')
  })
})
