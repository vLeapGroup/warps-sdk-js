import { WarpChain, WarpChainAsset, WarpChainInfo } from '@vleap/warps'
import { createMultiversxAdapter } from './common'

export const ChainNameVibechain: WarpChain = 'vibechain'

export const NativeTokenVibe: WarpChainAsset = {
  identifier: 'VIBE',
  name: 'VIBE',
  decimals: 18,
  logoUrl: 'https://vleap.ai/images/tokens/vibe.svg',
}

const chainInfo: WarpChainInfo = {
  name: ChainNameVibechain,
  displayName: 'VibeChain',
  chainId: 'V',
  blockTime: 600,
  addressHrp: 'vibe',
  defaultApiUrl: 'https://vibeox-api.multiversx.com',
  nativeToken: NativeTokenVibe,
}

export const getVibechainAdapter = createMultiversxAdapter(ChainNameVibechain, 'vibe', {
  mainnet: chainInfo,
  testnet: chainInfo,
  devnet: chainInfo,
})
