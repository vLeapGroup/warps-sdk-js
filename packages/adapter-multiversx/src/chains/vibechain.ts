import { WarpChainAsset, WarpChainInfo, WarpChainName } from '@vleap/warps'
import { createMultiversxAdapter } from './common'

export const NativeTokenVibe: WarpChainAsset = {
  chain: WarpChainName.Vibechain,
  identifier: 'VIBE',
  name: 'VIBE',
  symbol: 'VIBE',
  decimals: 18,
  logoUrl: 'https://raw.githubusercontent.com/JoAiHQ/assets/refs/heads/main/tokens/logos/vibe.svg',
}

const chainInfo: WarpChainInfo = {
  name: WarpChainName.Vibechain,
  displayName: 'VibeChain',
  chainId: 'V',
  blockTime: 600,
  addressHrp: 'vibe',
  defaultApiUrl: 'https://vibeox-api.multiversx.com',
  logoUrl: 'https://raw.githubusercontent.com/JoAiHQ/assets/refs/heads/main/chains/logos/vibechain.svg',
  nativeToken: NativeTokenVibe,
}

export const VibechainAdapter = createMultiversxAdapter(WarpChainName.Vibechain, {
  mainnet: chainInfo,
  testnet: chainInfo,
  devnet: chainInfo,
})
