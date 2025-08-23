import { AdapterFactory, WarpChainAsset, WarpChainName } from '@vleap/warps'
import { createEvmAdapter } from './common'

export const NativeTokenArb: WarpChainAsset = {
  identifier: 'ARB',
  name: 'ARB',
  decimals: 18,
  logoUrl: 'https://vleap.ai/images/tokens/arb.svg',
}

export const getArbitrumAdapter: AdapterFactory = createEvmAdapter(WarpChainName.Arbitrum, 'arb', {
  mainnet: {
    name: WarpChainName.Arbitrum,
    displayName: 'Arbitrum',
    chainId: '42161',
    blockTime: 1000,
    addressHrp: '0x',
    defaultApiUrl: 'https://arb1.arbitrum.io/rpc',
    nativeToken: NativeTokenArb,
  },
  testnet: {
    name: WarpChainName.Arbitrum,
    displayName: 'Arbitrum Sepolia',
    chainId: '421614',
    blockTime: 1000,
    addressHrp: '0x',
    defaultApiUrl: 'https://sepolia-rollup.arbitrum.io/rpc',
    nativeToken: NativeTokenArb,
  },
  devnet: {
    name: WarpChainName.Arbitrum,
    displayName: 'Arbitrum Sepolia',
    chainId: '421614',
    blockTime: 1000,
    addressHrp: '0x',
    defaultApiUrl: 'https://sepolia-rollup.arbitrum.io/rpc',
    nativeToken: NativeTokenArb,
  },
})
