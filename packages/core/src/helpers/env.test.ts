import { WarpConstants } from '../constants'
import { Warp } from '../types'
import { extractWarpSecrets } from './env'

describe('extractWarpSecrets', () => {
  it('should extract multiple environment secrets from warp vars', () => {
    const warp: Warp = {
      protocol: 'warp:1.0',
      name: 'api-warp',
      title: 'API Integration',
      description: 'Connect to external API',
      vars: {
        api_key: `${WarpConstants.Vars.Env}:API_KEY|API key for authentication`,
        base_url: `${WarpConstants.Vars.Env}:BASE_URL`,
        timeout: `${WarpConstants.Vars.Env}:TIMEOUT_MS|Request timeout in milliseconds`,
        debug_mode: 'false',
        retry_count: '3',
      },
      actions: [],
    }

    const result = extractWarpSecrets(warp)
    expect(result).toEqual([
      { key: 'API_KEY', description: 'API key for authentication' },
      { key: 'BASE_URL', description: null },
      { key: 'TIMEOUT_MS', description: 'Request timeout in milliseconds' },
    ])
  })

  it('should extract single environment secret', () => {
    const warp: Warp = {
      protocol: 'warp:1.0',
      name: 'auth-warp',
      title: 'Authentication',
      description: null,
      vars: {
        jwt_secret: `${WarpConstants.Vars.Env}:JWT_SECRET|Secret key for JWT signing`,
      },
      actions: [],
    }

    const result = extractWarpSecrets(warp)
    expect(result).toEqual([{ key: 'JWT_SECRET', description: 'Secret key for JWT signing' }])
  })

  it('should extract environment secret without description', () => {
    const warp: Warp = {
      protocol: 'warp:1.0',
      name: 'simple-auth-warp',
      title: 'Simple Authentication',
      description: null,
      vars: {
        jwt_secret: `${WarpConstants.Vars.Env}:JWT_SECRET`,
      },
      actions: [],
    }

    const result = extractWarpSecrets(warp)
    expect(result).toEqual([{ key: 'JWT_SECRET', description: null }])
  })

  it('should return empty array when no vars property exists', () => {
    const warp: Warp = {
      protocol: 'warp:1.0',
      name: 'simple-warp',
      title: 'Simple Warp',
      description: null,
      actions: [],
    }

    const result = extractWarpSecrets(warp)
    expect(result).toEqual([])
  })

  it('should return empty array when vars is empty object', () => {
    const warp: Warp = {
      protocol: 'warp:1.0',
      name: 'empty-vars-warp',
      title: 'Empty Vars Warp',
      description: null,
      vars: {},
      actions: [],
    }

    const result = extractWarpSecrets(warp)
    expect(result).toEqual([])
  })

  it('should return empty array when vars contain no env secrets', () => {
    const warp: Warp = {
      protocol: 'warp:1.0',
      name: 'no-env-warp',
      title: 'No Environment Vars',
      description: null,
      vars: {
        static_value: 'hardcoded',
        config_flag: 'true',
        max_retries: '5',
      },
      actions: [],
    }

    const result = extractWarpSecrets(warp)
    expect(result).toEqual([])
  })
})
