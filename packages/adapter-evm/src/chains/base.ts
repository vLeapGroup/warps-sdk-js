import { AdapterFactory, WarpChainAsset, WarpChainName } from '@vleap/warps'
import { createEvmAdapter } from './common'

export const NativeTokenBase: WarpChainAsset = {
  chain: WarpChainName.Base,
  identifier: 'ETH',
  name: 'ETH',
  decimals: 18,
  logoUrl: 'https://vleap.ai/images/tokens/eth.svg',
}

export const getBaseAdapter: AdapterFactory = createEvmAdapter(WarpChainName.Base, 'base', {
  mainnet: {
    name: WarpChainName.Base,
    displayName: 'Base',
    chainId: '8453',
    blockTime: 2000,
    addressHrp: '0x',
    defaultApiUrl: 'https://mainnet.base.org',
    nativeToken: NativeTokenBase,
  },
  testnet: {
    name: WarpChainName.Base,
    displayName: 'Base Sepolia',
    chainId: '84532',
    blockTime: 2000,
    addressHrp: '0x',
    defaultApiUrl: 'https://sepolia.base.org',
    nativeToken: NativeTokenBase,
  },
  devnet: {
    name: WarpChainName.Base,
    displayName: 'Base Sepolia',
    chainId: '84532',
    blockTime: 2000,
    addressHrp: '0x',
    defaultApiUrl: 'https://sepolia.base.org',
    nativeToken: NativeTokenBase,
  },
})
