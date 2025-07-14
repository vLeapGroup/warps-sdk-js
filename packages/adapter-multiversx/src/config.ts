import { WarpChainEnv } from '@vleap/warps'

export const getMultiversxRegistryAddress = (env: WarpChainEnv) => {
  if (env === 'devnet') return 'erd1qqqqqqqqqqqqqpgqje2f99vr6r7sk54thg03c9suzcvwr4nfl3tsfkdl36'
  if (env === 'testnet') return '####'
  return 'erd1qqqqqqqqqqqqqpgq3mrpj3u6q7tejv6d7eqhnyd27n9v5c5tl3ts08mffe'
}
