import { ChainEnv, WarpActionInputPosition, WarpActionInputSource, WarpActionInputType } from './types'

export const Config = {
  ProtocolNameWarp: 'warp',
  ProtocolNameBrand: 'warp-brand',

  LatestProtocolVersion: '0.5.0',

  LatestWarpSchemaUrl: 'https://raw.githubusercontent.com/vLeapGroup/warps-specs/refs/heads/main/schemas/v0.5.0.schema.json',
  LatestBrandSchemaUrl: 'https://raw.githubusercontent.com/vLeapGroup/warps-specs/refs/heads/main/schemas/brand/v0.1.0.schema.json',

  DefaultClientUrl: (env: ChainEnv) => {
    if (env === 'devnet') return 'https://devnet.usewarp.to'
    if (env === 'testnet') return 'https://testnet.usewarp.to'
    return 'https://usewarp.to'
  },

  SuperClientUrls: ['https://usewarp.to', 'https://testnet.usewarp.to', 'https://devnet.usewarp.to'],

  Chain: {
    ApiUrl: (env: ChainEnv) => {
      if (env === 'devnet') return 'https://devnet-api.multiversx.com'
      if (env === 'testnet') return 'https://testnet-api.multiversx.com'
      return 'https://api.multiversx.com'
    },
  },

  Registry: {
    Contract: (env: ChainEnv) => {
      if (env === 'devnet') return 'erd1qqqqqqqqqqqqqpgqje2f99vr6r7sk54thg03c9suzcvwr4nfl3tsfkdl36'
      if (env === 'testnet') return '####'
      return 'erd1qqqqqqqqqqqqqpgq3mrpj3u6q7tejv6d7eqhnyd27n9v5c5tl3ts08mffe'
    },
  },

  AvailableActionInputSources: ['field', 'query'] as WarpActionInputSource[],

  AvailableActionInputTypes: ['string', 'uint8', 'uint16', 'uint32', 'uint64', 'biguint', 'boolean', 'address'] as WarpActionInputType[],

  AvailableActionInputPositions: [
    'value',
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
  ] as WarpActionInputPosition[],
}
