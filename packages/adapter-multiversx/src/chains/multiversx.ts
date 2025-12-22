import { WarpChainAsset, WarpChainName } from '@vleap/warps'
import { createMultiversxAdapter } from './common'

export const NativeTokenEgld: WarpChainAsset = {
  chain: WarpChainName.Multiversx,
  identifier: 'EGLD',
  name: 'eGold',
  symbol: 'EGLD',
  decimals: 18,
  logoUrl: 'https://joai.ai/images/tokens/egld.svg',
}

export const MultiversxAdapter = createMultiversxAdapter(WarpChainName.Multiversx, {
  mainnet: {
    name: WarpChainName.Multiversx,
    displayName: 'MultiversX',
    chainId: '1',
    blockTime: 6000,
    addressHrp: 'erd',
    defaultApiUrl: 'https://api.multiversx.com',
    logoUrl: 'https://joai.ai/images/chains/multiversx.svg',
    nativeToken: NativeTokenEgld,
  },
  testnet: {
    name: WarpChainName.Multiversx,
    displayName: 'MultiversX Testnet',
    chainId: 'T',
    blockTime: 6000,
    addressHrp: 'erd',
    defaultApiUrl: 'https://testnet-api.multiversx.com',
    logoUrl: 'https://joai.ai/images/chains/multiversx.svg',
    nativeToken: NativeTokenEgld,
  },
  devnet: {
    name: WarpChainName.Multiversx,
    displayName: 'MultiversX Devnet',
    chainId: 'D',
    blockTime: 6000,
    addressHrp: 'erd',
    defaultApiUrl: 'https://devnet-api.multiversx.com',
    logoUrl: 'https://joai.ai/images/chains/multiversx.svg',
    nativeToken: NativeTokenEgld,
  },
})
