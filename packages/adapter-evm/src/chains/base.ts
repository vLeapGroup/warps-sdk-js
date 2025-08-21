import { AdapterFactory, WarpChain } from '@vleap/warps'
import { createEvmAdapter } from './common'

export const ChainNameBase: WarpChain = 'base'

export const getBaseAdapter: AdapterFactory = createEvmAdapter(ChainNameBase, 'base', {
  mainnet: {
    name: ChainNameBase,
    displayName: 'Base',
    chainId: '8453',
    blockTime: 2000,
    addressHrp: '0x',
    defaultApiUrl: 'https://mainnet.base.org',
    nativeToken: 'ETH',
  },
  testnet: {
    name: ChainNameBase,
    displayName: 'Base Testnet',
    chainId: '84531',
    blockTime: 2000,
    addressHrp: '0x',
    defaultApiUrl: 'https://goerli.base.org',
    nativeToken: 'ETH',
  },
  devnet: {
    name: ChainNameBase,
    displayName: 'Base Devnet',
    chainId: '84532',
    blockTime: 2000,
    addressHrp: '0x',
    defaultApiUrl: 'https://sepolia.base.org',
    nativeToken: 'ETH',
  },
})
