import { AdapterFactory, WarpChain, WarpChainAsset } from '@vleap/warps'
import { createEvmAdapter } from './common'

export const ChainNameArbitrum: WarpChain = 'arbitrum'

export const NativeTokenArb: WarpChainAsset = {
  identifier: 'ARB',
  name: 'ARB',
  decimals: 18,
  logoUrl: 'https://vleap.ai/images/tokens/arb.svg',
}

export const getArbitrumAdapter: AdapterFactory = createEvmAdapter(ChainNameArbitrum, 'arb', {
  devnet: {
    name: ChainNameArbitrum,
    displayName: 'Arbitrum Devnet',
    chainId: '421614',
    blockTime: 1000,
    addressHrp: '0x',
    defaultApiUrl: 'https://sepolia-rollup.arbitrum.io/rpc',
    nativeToken: NativeTokenArb,
  },
  testnet: {
    name: ChainNameArbitrum,
    displayName: 'Arbitrum Testnet',
    chainId: '421613',
    blockTime: 1000,
    addressHrp: '0x',
    defaultApiUrl: 'https://goerli-rollup.arbitrum.io/rpc',
    nativeToken: NativeTokenArb,
  },
  mainnet: {
    name: ChainNameArbitrum,
    displayName: 'Arbitrum',
    chainId: '42161',
    blockTime: 1000,
    addressHrp: '0x',
    defaultApiUrl: 'https://arb1.arbitrum.io/rpc',
    nativeToken: NativeTokenArb,
  },
})
