import { AdapterFactory } from '@vleap/warps'
import { createEvmAdapter } from './common'

export const getEthereumAdapter: AdapterFactory = createEvmAdapter('ethereum', 'eth', {
  devnet: {
    displayName: 'Ethereum Devnet',
    chainId: '11155111',
    blockTime: 12000,
    addressHrp: '0x',
    apiUrl: 'https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY',
    nativeToken: 'ETH',
  },
  testnet: {
    displayName: 'Ethereum Testnet',
    chainId: '5',
    blockTime: 12000,
    addressHrp: '0x',
    apiUrl: 'https://eth-goerli.g.alchemy.com/v2/YOUR_API_KEY',
    nativeToken: 'ETH',
  },
  mainnet: {
    displayName: 'Ethereum Mainnet',
    chainId: '1',
    blockTime: 12000,
    addressHrp: '0x',
    apiUrl: 'https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY',
    nativeToken: 'ETH',
  },
})
