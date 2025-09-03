import { WarpChainAsset, WarpChainInfo, WarpChainName } from '@vleap/warps'
import { createMultiversxAdapter } from './common'

export const NativeTokenVibe: WarpChainAsset = {
  chain: WarpChainName.Vibechain,
  identifier: 'VIBE',
  name: 'VIBE',
  symbol: 'VIBE',
  decimals: 18,
  logoUrl: 'https://vleap.ai/images/tokens/vibe.svg',
}

const chainInfo: WarpChainInfo = {
  name: WarpChainName.Vibechain,
  displayName: 'VibeChain',
  chainId: 'V',
  blockTime: 600,
  addressHrp: 'vibe',
  defaultApiUrl: 'https://vibeox-api.multiversx.com',
  nativeToken: NativeTokenVibe,
}

export const getVibechainAdapter = createMultiversxAdapter(WarpChainName.Vibechain, 'vibe', {
  mainnet: chainInfo,
  testnet: chainInfo,
  devnet: chainInfo,
})
