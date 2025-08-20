import { WarpChain, WarpChainInfo } from '@vleap/warps'
import { createMultiversxAdapter } from './common'

export const ChainNameVibechain: WarpChain = 'vibechain'

const chainInfo: WarpChainInfo = {
  name: ChainNameVibechain,
  displayName: 'VibeChain',
  chainId: 'V',
  blockTime: 600,
  addressHrp: 'vibe',
  apiUrl: 'https://vibeox-api.multiversx.com',
  nativeToken: 'VIBE',
}

export const getVibechainAdapter = createMultiversxAdapter(ChainNameVibechain, 'vibe', {
  mainnet: chainInfo,
  testnet: chainInfo,
  devnet: chainInfo,
})
