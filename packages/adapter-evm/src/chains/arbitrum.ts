import { AdapterFactory } from '@vleap/warps'
import { createEvmAdapter } from './common'

export const getArbitrumAdapter: AdapterFactory = createEvmAdapter('arbitrum', 'arb', {
  devnet: {
    displayName: 'Arbitrum Devnet',
    chainId: '421614',
    blockTime: 1000,
    addressHrp: '0x',
    apiUrl: 'https://sepolia-rollup.arbitrum.io/rpc',
    nativeToken: 'ETH',
  },
  testnet: {
    displayName: 'Arbitrum Testnet',
    chainId: '421613',
    blockTime: 1000,
    addressHrp: '0x',
    apiUrl: 'https://goerli-rollup.arbitrum.io/rpc',
    nativeToken: 'ETH',
  },
  mainnet: {
    displayName: 'Arbitrum',
    chainId: '42161',
    blockTime: 1000,
    addressHrp: '0x',
    apiUrl: 'https://arb1.arbitrum.io/rpc',
    nativeToken: 'ETH',
  },
})
