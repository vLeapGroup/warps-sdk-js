import { AdapterFactory, WarpChain } from '@vleap/warps'
import { createEvmAdapter } from './common'

export const ChainNameEthereum: WarpChain = 'ethereum'

export const getEthereumAdapter: AdapterFactory = createEvmAdapter(ChainNameEthereum, 'eth', {
  devnet: {
    name: ChainNameEthereum,
    displayName: 'Ethereum Devnet',
    chainId: '11155111',
    blockTime: 12000,
    addressHrp: '0x',
    defaultApiUrl: 'https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY',
    nativeToken: 'ETH',
  },
  testnet: {
    name: ChainNameEthereum,
    displayName: 'Ethereum Testnet',
    chainId: '5',
    blockTime: 12000,
    addressHrp: '0x',
    defaultApiUrl: 'https://eth-goerli.g.alchemy.com/v2/YOUR_API_KEY',
    nativeToken: 'ETH',
  },
  mainnet: {
    name: ChainNameEthereum,
    displayName: 'Ethereum Mainnet',
    chainId: '1',
    blockTime: 12000,
    addressHrp: '0x',
    defaultApiUrl: 'https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY',
    nativeToken: 'ETH',
  },
})
