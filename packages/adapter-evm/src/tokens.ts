import { WarpChain, WarpChainAsset, WarpChainEnv } from '@vleap/warps'
import { ArbitrumTokens } from './tokens/arbitrum'
import { ArbitrumSepoliaTokens } from './tokens/arbitrum-sepolia'
import { BaseTokens } from './tokens/base'
import { BaseSepoliaTokens } from './tokens/base-sepolia'
import { EthereumTokens } from './tokens/ethereum'
import { EthereumSepoliaTokens } from './tokens/ethereum-sepolia'

export const KnownTokens: Record<WarpChain, Record<string, WarpChainAsset[]>> = {
  ethereum: {
    mainnet: EthereumTokens,
    testnet: EthereumSepoliaTokens,
    devnet: EthereumSepoliaTokens,
  },
  base: {
    mainnet: BaseTokens,
    testnet: BaseSepoliaTokens,
    devnet: BaseSepoliaTokens,
  },
  arbitrum: {
    mainnet: ArbitrumTokens,
    testnet: ArbitrumSepoliaTokens,
    devnet: ArbitrumSepoliaTokens,
  },
}

export const findKnownTokenById = (chain: WarpChain, env: WarpChainEnv, id: string): WarpChainAsset | null => {
  const chainTokens = KnownTokens[chain]?.[env] || []
  return chainTokens.find((token) => token.identifier === id) || null
}

export const getKnownTokensForChain = (chainName: string, env: string = 'mainnet'): WarpChainAsset[] => {
  return KnownTokens[chainName]?.[env] || []
}
