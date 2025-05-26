import { WarpConfig } from './types'

export const WarpConstants = {
  HttpProtocolPrefix: 'http',

  IdentifierParamName: 'warp',

  IdentifierParamSeparator: ':',

  IdentifierType: {
    Alias: 'alias',
    Hash: 'hash',
  },

  Source: {
    UserWallet: 'user:wallet',
  },

  Globals: {
    UserWallet: {
      Placeholder: 'USER_WALLET',
      Accessor: (config: WarpConfig) => config.user?.wallet,
    },
    ChainApiUrl: {
      Placeholder: 'CHAIN_API',
      Accessor: (config: WarpConfig) => config.chain?.apiUrl,
    },
    ChainExplorerUrl: {
      Placeholder: 'CHAIN_EXPLORER',
      Accessor: (config: WarpConfig) => config.chain?.explorerUrl,
    },
  },

  Vars: {
    Query: 'query',
    Env: 'env',
  },

  ArgParamsSeparator: ':',
  ArgCompositeSeparator: '|',

  Egld: {
    Identifier: 'EGLD',
    EsdtIdentifier: 'EGLD-000000',
    DisplayName: 'eGold',
    Decimals: 18,
  },
}
