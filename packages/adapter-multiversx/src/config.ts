import { WarpChainEnv } from '@vleap/warps'
import { ExplorerName, ExplorerUrls, MultiversxExplorersConfig } from './constants'

export const getMultiversxRegistryAddress = (env: WarpChainEnv) => {
  if (env === 'devnet') return 'erd1qqqqqqqqqqqqqpgqje2f99vr6r7sk54thg03c9suzcvwr4nfl3tsfkdl36'
  if (env === 'testnet') throw new Error('Multiversx testnet is not supported')
  return 'erd1qqqqqqqqqqqqqpgq3mrpj3u6q7tejv6d7eqhnyd27n9v5c5tl3ts08mffe'
}

export const getMultiversxExplorers = (chain: string = 'multiversx', env: WarpChainEnv): readonly ExplorerName[] => {
  const chainExplorers = MultiversxExplorersConfig[chain as keyof typeof MultiversxExplorersConfig]
  if (!chainExplorers) {
    throw new Error(`Unsupported MultiversX chain: ${chain}`)
  }

  const explorers = chainExplorers[env as keyof typeof chainExplorers]
  if (!explorers) {
    throw new Error(`Unsupported environment ${env} for chain ${chain}`)
  }

  return explorers
}

export const getPrimaryMultiversxExplorer = (chain: string = 'multiversx', env: WarpChainEnv): ExplorerName => {
  const explorers = getMultiversxExplorers(chain, env)
  return explorers[0]
}

export const getMultiversxExplorerUrl = (env: WarpChainEnv, chain: string = 'multiversx'): string => {
  const primaryExplorer = getPrimaryMultiversxExplorer(chain, env)
  return ExplorerUrls[primaryExplorer]
}

export const getMultiversxExplorerByName = (chain: string = 'multiversx', env: WarpChainEnv, name: string): ExplorerName | undefined => {
  const explorers = getMultiversxExplorers(chain, env)
  return explorers.find((explorer) => explorer.toLowerCase() === name.toLowerCase())
}
