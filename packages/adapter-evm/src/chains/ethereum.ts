import { AdapterFactory, WarpChain } from '@vleap/warps'
import { createEvmAdapter } from './common'

const ChainName: WarpChain = 'ethereum'

export const getEthereumAdapter: AdapterFactory = createEvmAdapter(ChainName, 'eth', {
  devnet: {
    name: ChainName,
    displayName: 'Ethereum Devnet',
    chainId: '11155111',
    blockTime: 12000,
    addressHrp: '0x',
    apiUrl: 'https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY',
    nativeToken: 'ETH',
  },
  testnet: {
    name: ChainName,
    displayName: 'Ethereum Testnet',
    chainId: '5',
    blockTime: 12000,
    addressHrp: '0x',
    apiUrl: 'https://eth-goerli.g.alchemy.com/v2/YOUR_API_KEY',
    nativeToken: 'ETH',
  },
  mainnet: {
    name: ChainName,
    displayName: 'Ethereum Mainnet',
    chainId: '1',
    blockTime: 12000,
    addressHrp: '0x',
    apiUrl: 'https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY',
    nativeToken: 'ETH',
  },
})
