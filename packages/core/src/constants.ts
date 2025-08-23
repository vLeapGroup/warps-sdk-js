import { InterpolationBag, WarpIdType } from './types'

export enum WarpChainName {
  Multiversx = 'multiversx',
  Vibechain = 'vibechain',
  Sui = 'sui',
  Ethereum = 'ethereum',
  Base = 'base',
  Arbitrum = 'arbitrum',
  Fastset = 'fastset',
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
      Accessor: (bag: InterpolationBag) => bag.config.user?.wallets?.[bag.chain],
    },
    ChainApiUrl: {
      Placeholder: 'CHAIN_API',
      Accessor: (bag: InterpolationBag) => bag.chainInfo.defaultApiUrl,
    },
    ChainAddressHrp: {
      Placeholder: 'CHAIN_ADDRESS_HRP',
      Accessor: (bag: InterpolationBag) => bag.chainInfo.addressHrp,
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
  Asset: 'asset',
  Hex: 'hex',
}
