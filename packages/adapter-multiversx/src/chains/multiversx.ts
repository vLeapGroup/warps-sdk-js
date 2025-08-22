import { WarpChain, WarpChainAsset } from '@vleap/warps'
import { createMultiversxAdapter } from './common'

export const ChainNameMultiversx: WarpChain = 'multiversx'

export const NativeTokenEgld: WarpChainAsset = {
  identifier: 'EGLD',
  name: 'EGLD',
  decimals: 18,
  logoUrl: 'https://vleap.ai/images/tokens/egld.svg',
}

export const getMultiversxAdapter = createMultiversxAdapter(ChainNameMultiversx, 'mvx', {
  mainnet: {
    name: ChainNameMultiversx,
    displayName: 'MultiversX',
    chainId: '1',
    blockTime: 6000,
    addressHrp: 'erd',
    defaultApiUrl: 'https://api.multiversx.com',
    nativeToken: NativeTokenEgld,
  },
  testnet: {
    name: ChainNameMultiversx,
    displayName: 'MultiversX Testnet',
    chainId: 'T',
    blockTime: 6000,
    addressHrp: 'erd',
    defaultApiUrl: 'https://testnet-api.multiversx.com',
    nativeToken: NativeTokenEgld,
  },
  devnet: {
    name: ChainNameMultiversx,
    displayName: 'MultiversX Devnet',
    chainId: 'D',
    blockTime: 6000,
    addressHrp: 'erd',
    defaultApiUrl: 'https://devnet-api.multiversx.com',
    nativeToken: NativeTokenEgld,
  },
})
