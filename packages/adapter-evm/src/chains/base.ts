import { AdapterFactory, WarpChain } from '@vleap/warps'
import { createEvmAdapter } from './common'

const ChainName: WarpChain = 'base'

export const getBaseAdapter: AdapterFactory = createEvmAdapter(ChainName, 'base', {
  mainnet: {
    name: ChainName,
    displayName: 'Base',
    chainId: '8453',
    blockTime: 2000,
    addressHrp: '0x',
    apiUrl: 'https://mainnet.base.org',
    nativeToken: 'ETH',
  },
  testnet: {
    name: ChainName,
    displayName: 'Base',
    chainId: '84531',
    blockTime: 2000,
    addressHrp: '0x',
    apiUrl: 'https://goerli.base.org',
    nativeToken: 'ETH',
  },
  devnet: {
    name: ChainName,
    displayName: 'Base',
    chainId: '84532',
    blockTime: 2000,
    addressHrp: '0x',
    apiUrl: 'https://sepolia.base.org',
    nativeToken: 'ETH',
  },
})
