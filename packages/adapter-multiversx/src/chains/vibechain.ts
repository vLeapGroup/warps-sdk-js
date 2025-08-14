import { WarpChain, WarpChainInfo } from '@vleap/warps'
import { createMultiversxAdapter } from './common'

const ChainName: WarpChain = 'vibechain'

const chainInfo: WarpChainInfo = {
  name: ChainName,
  displayName: 'VibeChain',
  chainId: 'V',
  blockTime: 600,
  addressHrp: 'vibe',
  apiUrl: 'https://vibeox-api.multiversx.com',
  nativeToken: 'VIBE',
}

export const getVibechainAdapter = createMultiversxAdapter(ChainName, 'vibe', {
  mainnet: chainInfo,
  testnet: chainInfo,
  devnet: chainInfo,
})
