import { ChainEnv } from './types'

export const Config = {
  ProtocolName: 'warp',
  LatestVersion: '0.1.0',

  DefaultClientUrl: (env: ChainEnv) => {
    if (env === 'devnet') return 'https://devnet.xwarp.me/to'
    if (env === 'testnet') return '###Not implemented###'
    return 'https://xwarp.me/to'
  },

  Chain: {
    ApiUrl: (env: ChainEnv) => {
      if (env === 'devnet') return 'https://devnet-api.multiversx.com'
      if (env === 'testnet') return 'https://testnet-api.multiversx.com'
      return 'https://api.multiversx.com'
    },
  },

  Registry: {
    Contract: (env: ChainEnv) => {
      if (env === 'devnet') return 'erd1qqqqqqqqqqqqqpgq8h85eq9l3cp40h5s3ujqshj2x775m2wyl3tsl20ltn'
      if (env === 'testnet') return '####'
      return 'erd1qqqqqqqqqqqqqpgq3mrpj3u6q7tejv6d7eqhnyd27n9v5c5tl3ts08mffe'
    },
  },
}
