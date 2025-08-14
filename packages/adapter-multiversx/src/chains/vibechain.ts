import { WarpChainInfo } from '@vleap/warps'
import { createMultiversxAdapter } from './common'

const chainInfo: WarpChainInfo = {
  displayName: 'VibeChain',
  chainId: 'V',
  blockTime: 600,
  addressHrp: 'vibe',
  apiUrl: 'https://vibeox-api.multiversx.com',
  nativeToken: 'VIBE',
}

export const getVibechainAdapter = createMultiversxAdapter('vibechain', 'vibe', {
  mainnet: chainInfo,
  testnet: chainInfo,
  devnet: chainInfo,
})
