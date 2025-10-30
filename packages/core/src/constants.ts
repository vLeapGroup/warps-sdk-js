import { InterpolationBag, WarpIdType } from './types'

export enum WarpChainName {
  Multiversx = 'multiversx',
  Vibechain = 'vibechain',
  Sui = 'sui',
  Ethereum = 'ethereum',
  Base = 'base',
  Arbitrum = 'arbitrum',
  Somnia = 'somnia',
  Fastset = 'fastset',
}

export const WarpConstants = {
  HttpProtocolPrefix: 'http',

  IdentifierParamName: 'warp',

  IdentifierParamSeparator: ':',

  IdentifierChainDefault: 'multiversx',

  IdentifierType: {
    Alias: 'alias' as WarpIdType,
    Hash: 'hash' as WarpIdType,
  },

  IdentifierAliasMarker: '@',

  Globals: {
    UserWallet: {
      Placeholder: 'USER_WALLET',
      Accessor: (bag: InterpolationBag) => bag.config.user?.wallets?.[bag.chain.name],
    },
    ChainApiUrl: {
      Placeholder: 'CHAIN_API',
      Accessor: (bag: InterpolationBag) => bag.chain.defaultApiUrl,
    },
    ChainAddressHrp: {
      Placeholder: 'CHAIN_ADDRESS_HRP',
      Accessor: (bag: InterpolationBag) => bag.chain.addressHrp,
    },
  },

  Vars: {
    Query: 'query',
    Env: 'env',
  },

  ArgParamsSeparator: ':',
  ArgCompositeSeparator: '|',
  ArgListSeparator: ',',
  ArgStructSeparator: ';',

  Transform: {
    Prefix: 'transform:',
  },

  Source: {
    UserWallet: 'user:wallet',
  },

  Position: {
    Payload: 'payload:',
  },

  Alerts: {
    TriggerEventPrefix: 'event',
  },
}

export const WarpInputTypes = {
  Option: 'option',
  Vector: 'vector',
  Tuple: 'tuple',
  Struct: 'struct',
  String: 'string',
  Uint8: 'uint8',
  Uint16: 'uint16',
  Uint32: 'uint32',
  Uint64: 'uint64',
  Uint128: 'uint128',
  Uint256: 'uint256',
  Biguint: 'biguint',
  Bool: 'bool',
  Address: 'address',
  Asset: 'asset',
  Hex: 'hex',
}

export const safeWindow = typeof window !== 'undefined' ? window : ({ open: () => {} } as Window)
