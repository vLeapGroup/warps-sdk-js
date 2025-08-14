import { AdapterFactory } from '@vleap/warps'
import { createEvmAdapter } from './common'

export const getBaseAdapter: AdapterFactory = createEvmAdapter('base', 'base', {
  mainnet: {
    displayName: 'Base',
    chainId: '8453',
    blockTime: 2000,
    addressHrp: '0x',
    apiUrl: 'https://mainnet.base.org',
    nativeToken: 'ETH',
  },
  testnet: {
    displayName: 'Base',
    chainId: '84531',
    blockTime: 2000,
    addressHrp: '0x',
    apiUrl: 'https://goerli.base.org',
    nativeToken: 'ETH',
  },
  devnet: {
    displayName: 'Base',
    chainId: '84532',
    blockTime: 2000,
    addressHrp: '0x',
    apiUrl: 'https://sepolia.base.org',
    nativeToken: 'ETH',
  },
})
