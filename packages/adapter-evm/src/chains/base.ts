import { AdapterFactory, WarpChainAsset, WarpChainName } from '@vleap/warps'
import { createEvmAdapter } from './common'

export const NativeTokenBase: WarpChainAsset = {
  chain: WarpChainName.Base,
  identifier: 'ETH',
  name: 'Ether',
  symbol: 'ETH',
  decimals: 18,
  logoUrl: 'https://joai.ai/images/tokens/eth.svg',
}

export const getBaseAdapter: AdapterFactory = createEvmAdapter(WarpChainName.Base, {
  mainnet: {
    name: WarpChainName.Base,
    displayName: 'Base',
    chainId: '8453',
    blockTime: 2000,
    addressHrp: '0x',
    defaultApiUrl: 'https://mainnet.base.org',
    logoUrl: 'https://joai.ai/images/chains/base.svg',
    nativeToken: NativeTokenBase,
  },
  testnet: {
    name: WarpChainName.Base,
    displayName: 'Base Sepolia',
    chainId: '84532',
    blockTime: 2000,
    addressHrp: '0x',
    defaultApiUrl: 'https://sepolia.base.org',
    logoUrl: 'https://joai.ai/images/chains/base.svg',
    nativeToken: NativeTokenBase,
  },
  devnet: {
    name: WarpChainName.Base,
    displayName: 'Base Sepolia',
    chainId: '84532',
    blockTime: 2000,
    addressHrp: '0x',
    defaultApiUrl: 'https://sepolia.base.org',
    logoUrl: 'https://joai.ai/images/chains/base.svg',
    nativeToken: NativeTokenBase,
  },
})
