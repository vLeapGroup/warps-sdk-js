import { AdapterFactory, WarpChain } from '@vleap/warps'
import { createEvmAdapter } from './common'

const ChainName: WarpChain = 'arbitrum'

export const getArbitrumAdapter: AdapterFactory = createEvmAdapter(ChainName, 'arb', {
  devnet: {
    name: ChainName,
    displayName: 'Arbitrum Devnet',
    chainId: '421614',
    blockTime: 1000,
    addressHrp: '0x',
    apiUrl: 'https://sepolia-rollup.arbitrum.io/rpc',
    nativeToken: 'ETH',
  },
  testnet: {
    name: ChainName,
    displayName: 'Arbitrum Testnet',
    chainId: '421613',
    blockTime: 1000,
    addressHrp: '0x',
    apiUrl: 'https://goerli-rollup.arbitrum.io/rpc',
    nativeToken: 'ETH',
  },
  mainnet: {
    name: ChainName,
    displayName: 'Arbitrum',
    chainId: '42161',
    blockTime: 1000,
    addressHrp: '0x',
    apiUrl: 'https://arb1.arbitrum.io/rpc',
    nativeToken: 'ETH',
  },
})
