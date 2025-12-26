import { ChainAdapterFactory, WarpChain, WarpChainAsset, WarpChainName } from '@vleap/warps'
import { createNearAdapter } from './common'

export const NativeTokenNear: WarpChainAsset = {
  chain: 'near' as WarpChainName,
  identifier: 'NEAR',
  symbol: 'NEAR',
  name: 'NEAR',
  decimals: 24,
  logoUrl: {
    light: 'https://joai.ai/images/tokens/near-white.svg',
    dark: 'https://joai.ai/images/tokens/near-black.svg',
  },
}

export const NearAdapter: ChainAdapterFactory = createNearAdapter('near' as WarpChain, {
  mainnet: {
    name: 'near' as WarpChainName,
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
    name: 'near' as WarpChainName,
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
    name: 'near' as WarpChainName,
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
