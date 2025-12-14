import { AdapterFactory, WarpChain, WarpChainAsset, WarpChainName } from '@vleap/warps'
import { createNearAdapter } from './common'

export const NativeTokenNear: WarpChainAsset = {
  chain: 'near' as WarpChainName,
  identifier: 'NEAR',
  symbol: 'NEAR',
  name: 'NEAR',
  decimals: 24,
  logoUrl: 'https://vleap.ai/images/tokens/near.svg',
}

export const getNearAdapter: AdapterFactory = createNearAdapter('near' as WarpChain, {
  mainnet: {
    name: 'near' as WarpChainName,
    displayName: 'NEAR Mainnet',
    chainId: 'mainnet',
    blockTime: 1200,
    addressHrp: '',
    defaultApiUrl: 'https://rpc.mainnet.near.org',
    logoUrl: 'https://vleap.ai/images/chains/near.svg',
    nativeToken: NativeTokenNear,
  },
  testnet: {
    name: 'near' as WarpChainName,
    displayName: 'NEAR Testnet',
    chainId: 'testnet',
    blockTime: 1200,
    addressHrp: '',
    defaultApiUrl: 'https://rpc.testnet.near.org',
    logoUrl: 'https://vleap.ai/images/chains/near.svg',
    nativeToken: NativeTokenNear,
  },
  devnet: {
    name: 'near' as WarpChainName,
    displayName: 'NEAR Devnet',
    chainId: 'testnet',
    blockTime: 1200,
    addressHrp: '',
    defaultApiUrl: 'https://rpc.testnet.near.org',
    logoUrl: 'https://vleap.ai/images/chains/near.svg',
    nativeToken: NativeTokenNear,
  },
})
