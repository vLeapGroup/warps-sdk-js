import { InterpolationBag, WarpIdType } from './types'

export enum WarpChainName {
  Multiversx = 'multiversx',
  Sui = 'sui',
}

export const WarpConstants = {
  HttpProtocolPrefix: 'http',

  IdentifierParamName: 'warp',

  IdentifierParamSeparator: [':', '.'],
  IdentifierParamSeparatorDefault: '.',

  IdentifierChainDefault: 'mvx',

  IdentifierType: {
    Alias: 'alias' as WarpIdType,
    Hash: 'hash' as WarpIdType,
  },

  Source: {
    UserWallet: 'user:wallet',
  },

  Globals: {
    UserWallet: {
      Placeholder: 'USER_WALLET',
      Accessor: (bag: InterpolationBag) => bag.config.user?.wallets?.[bag.chain.name],
    },
    ChainApiUrl: {
      Placeholder: 'CHAIN_API',
      Accessor: (bag: InterpolationBag) => bag.chain.apiUrl,
    },
    ChainExplorerUrl: {
      Placeholder: 'CHAIN_EXPLORER',
      Accessor: (bag: InterpolationBag) => bag.chain.explorerUrl,
    },
    ChainAddressHrp: {
      Placeholder: 'chain.addressHrp',
      Accessor: (bag: InterpolationBag) => bag.chain.addressHrp,
    },
  },

  Vars: {
    Query: 'query',
    Env: 'env',
  },

  ArgParamsSeparator: ':',
  ArgCompositeSeparator: '|',

  Transform: {
    Prefix: 'transform:',
  },
}

export const WarpInputTypes = {
  Option: 'option',
  Optional: 'optional',
  List: 'list',
  Variadic: 'variadic',
  Composite: 'composite',
  String: 'string',
  U8: 'u8',
  U16: 'u16',
  U32: 'u32',
  U64: 'u64',
  Biguint: 'biguint',
  Boolean: 'boolean',
  Address: 'address',
  Hex: 'hex',
}
