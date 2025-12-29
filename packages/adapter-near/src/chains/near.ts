import { ChainAdapterFactory, WarpChainAsset, WarpChainName } from '@vleap/warps'
import { createNearAdapter } from './common'

export const NativeTokenNear: WarpChainAsset = {
  chain: WarpChainName.Near,
  identifier: 'NEAR',
  symbol: 'NEAR',
  name: 'NEAR',
  decimals: 24,
  logoUrl: {
    light: 'https://joai.ai/images/tokens/near-white.svg',
    dark: 'https://joai.ai/images/tokens/near-black.svg',
  },
}

export const NearAdapter: ChainAdapterFactory = createNearAdapter(WarpChainName.Near, {
  mainnet: {
    name: WarpChainName.Near,
    displayName: 'NEAR Mainnet',
    chainId: 'mainnet',
    blockTime: 1200,
    addressHrp: '',
    defaultApiUrl: 'https://rpc.mainnet.near.org',
    logoUrl: {
      light: 'https://joai.ai/images/chains/near-white.svg',
      dark: 'https://joai.ai/images/chains/near-black.svg',
    },
    nativeToken: NativeTokenNear,
  },
  testnet: {
    name: WarpChainName.Near,
    displayName: 'NEAR Testnet',
    chainId: 'testnet',
    blockTime: 1200,
    addressHrp: '',
    defaultApiUrl: 'https://rpc.testnet.near.org',
    logoUrl: {
      light: 'https://joai.ai/images/chains/near-white.svg',
      dark: 'https://joai.ai/images/chains/near-black.svg',
    },
    nativeToken: NativeTokenNear,
  },
  devnet: {
    name: WarpChainName.Near,
    displayName: 'NEAR Devnet',
    chainId: 'testnet',
    blockTime: 1200,
    addressHrp: '',
    defaultApiUrl: 'https://rpc.testnet.near.org',
    logoUrl: {
      light: 'https://joai.ai/images/chains/near-white.svg',
      dark: 'https://joai.ai/images/chains/near-black.svg',
    },
    nativeToken: NativeTokenNear,
  },
})
