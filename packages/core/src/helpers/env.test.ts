import { WarpConstants } from '../constants'
import { Warp } from '../types'
import { extractWarpEnvKeys } from './env'

describe('extractWarpEnvKeys', () => {
  it('should extract multiple environment keys from warp vars', () => {
    const warp: Warp = {
      protocol: 'warp:1.0',
      name: 'api-warp',
      title: 'API Integration',
      description: 'Connect to external API',
      vars: {
        api_key: `${WarpConstants.Vars.Env}:API_KEY`,
        base_url: `${WarpConstants.Vars.Env}:BASE_URL`,
        timeout: `${WarpConstants.Vars.Env}:TIMEOUT_MS`,
        debug_mode: 'false',
        retry_count: '3',
      },
      actions: [],
    }

    const result = extractWarpEnvKeys(warp)
    expect(result).toEqual(['API_KEY', 'BASE_URL', 'TIMEOUT_MS'])
  })

  it('should extract single environment key', () => {
    const warp: Warp = {
      protocol: 'warp:1.0',
      name: 'auth-warp',
      title: 'Authentication',
      description: null,
      vars: {
        jwt_secret: `${WarpConstants.Vars.Env}:JWT_SECRET`,
      },
      actions: [],
    }

    const result = extractWarpEnvKeys(warp)
    expect(result).toEqual(['JWT_SECRET'])
  })

  it('should return empty array when no vars property exists', () => {
    const warp: Warp = {
      protocol: 'warp:1.0',
      name: 'simple-warp',
      title: 'Simple Warp',
      description: null,
      actions: [],
    }

    const result = extractWarpEnvKeys(warp)
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

    const result = extractWarpEnvKeys(warp)
    expect(result).toEqual([])
  })

  it('should return empty array when vars contain no env keys', () => {
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

    const result = extractWarpEnvKeys(warp)
    expect(result).toEqual([])
  })
})
