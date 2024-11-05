import { ChainEnv } from './types'

export const Config = {
  LatestVersion: '0.1.0',

  Chain: {
    ApiUrl: (env: ChainEnv) => {
      if (env === 'devnet') return 'https://devnet-api.multiversx.com'
      if (env === 'testnet') return 'https://testnet-api.multiversx.com'
      return 'https://api.multiversx.com'
    },
  },

  Registry: {
    Contract: (env: ChainEnv) => {
      if (env === 'devnet') return ''
      if (env === 'testnet') return ''
      return ''
    },
  },
}
