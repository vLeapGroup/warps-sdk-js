import { AdapterFactory, WarpChain } from '@vleap/warps'
import { createEvmAdapter } from './common'

export const ChainNameArbitrum: WarpChain = 'arbitrum'

export const getArbitrumAdapter: AdapterFactory = createEvmAdapter(ChainNameArbitrum, 'arb', {
  devnet: {
    name: ChainNameArbitrum,
    displayName: 'Arbitrum Devnet',
    chainId: '421614',
    blockTime: 1000,
    addressHrp: '0x',
    defaultApiUrl: 'https://sepolia-rollup.arbitrum.io/rpc',
    nativeToken: 'ETH',
  },
  testnet: {
    name: ChainNameArbitrum,
    displayName: 'Arbitrum Testnet',
    chainId: '421613',
    blockTime: 1000,
    addressHrp: '0x',
    defaultApiUrl: 'https://goerli-rollup.arbitrum.io/rpc',
    nativeToken: 'ETH',
  },
  mainnet: {
    name: ChainNameArbitrum,
    displayName: 'Arbitrum',
    chainId: '42161',
    blockTime: 1000,
    addressHrp: '0x',
    defaultApiUrl: 'https://arb1.arbitrum.io/rpc',
    nativeToken: 'ETH',
  },
})
