import { ChainEnv } from './types'

export const Config = {
  LatestVersion: '0.1.0',

  Registry: {
    Contract: (env: ChainEnv) => {
      if (env === 'devnet') return ''
      if (env === 'testnet') return ''
      return ''
    },
  },
}
