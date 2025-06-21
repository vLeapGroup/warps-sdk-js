import { WarpConstants } from './constants'
import { WarpActionInputPosition, WarpActionInputSource, WarpActionInputType, WarpChainEnv } from './types'

export const WarpProtocolVersions = {
  Warp: '2.0.1',
  Brand: '0.1.0',
  Abi: '0.1.0',
}

export const WarpConfig = {
  LatestWarpSchemaUrl: `https://raw.githubusercontent.com/vLeapGroup/warps-specs/refs/heads/main/schemas/v${WarpProtocolVersions.Warp}.schema.json`,
  LatestBrandSchemaUrl: `https://raw.githubusercontent.com/vLeapGroup/warps-specs/refs/heads/main/schemas/brand/v${WarpProtocolVersions.Brand}.schema.json`,

  DefaultClientUrl: (env: WarpChainEnv) => {
    if (env === 'devnet') return 'https://devnet.usewarp.to'
    if (env === 'testnet') return 'https://testnet.usewarp.to'
    return 'https://usewarp.to'
  },

  SuperClientUrls: ['https://usewarp.to', 'https://testnet.usewarp.to', 'https://devnet.usewarp.to'],

  MainChain: {
    Name: 'multiversx',
    DisplayName: 'MultiversX',
    ApiUrl: (env: WarpChainEnv) => {
      if (env === 'devnet') return 'https://devnet-api.multiversx.com'
      if (env === 'testnet') return 'https://testnet-api.multiversx.com'
      return 'https://api.multiversx.com'
    },
    ExplorerUrl: (env: WarpChainEnv) => {
      if (env === 'devnet') return 'https://devnet-explorer.multiversx.com'
      if (env === 'testnet') return 'https://testnet-explorer.multiversx.com'
      return 'https://explorer.multiversx.com'
    },
    BlockTime: (env: WarpChainEnv) => {
      if (env === 'devnet') return 6000
      if (env === 'testnet') return 6000
      return 6000
    },
    AddressHrp: 'erd',
    ChainId: (env: WarpChainEnv) => {
      if (env === 'devnet') return 'D'
      if (env === 'testnet') return 'T'
      return '1'
    },
  },

  Registry: {
    Contract: (env: WarpChainEnv) => {
      if (env === 'devnet') return 'erd1qqqqqqqqqqqqqpgqje2f99vr6r7sk54thg03c9suzcvwr4nfl3tsfkdl36'
      if (env === 'testnet') return '####'
      return 'erd1qqqqqqqqqqqqqpgq3mrpj3u6q7tejv6d7eqhnyd27n9v5c5tl3ts08mffe'
    },
  },

  AvailableActionInputSources: ['field', 'query', WarpConstants.Source.UserWallet] as WarpActionInputSource[],

  AvailableActionInputTypes: ['string', 'uint8', 'uint16', 'uint32', 'uint64', 'biguint', 'boolean', 'address'] as WarpActionInputType[],

  AvailableActionInputPositions: [
    'receiver',
    'value',
    'transfer',
    'arg:1',
    'arg:2',
    'arg:3',
    'arg:4',
    'arg:5',
    'arg:6',
    'arg:7',
    'arg:8',
    'arg:9',
    'arg:10',
    'data',
    'ignore',
  ] as WarpActionInputPosition[],
}
