import { AdapterFactory, WarpChainAsset, WarpChainName } from '@vleap/warps'
import { createEvmAdapter } from './common'

export const NativeTokenSomi: WarpChainAsset = {
  chain: WarpChainName.Somnia,
  identifier: 'SOMI',
  symbol: 'SOMI',
  name: 'Somnia',
  decimals: 18,
  logoUrl: 'https://vleap.ai/images/tokens/somnia.svg',
}

export const NativeTokenStt: WarpChainAsset = {
  chain: WarpChainName.Somnia,
  identifier: 'STT',
  symbol: 'STT',
  name: 'Somnia Testnet Token',
  decimals: 18,
  logoUrl: 'https://vleap.ai/images/tokens/somnia.svg',
}

export const getSomniaAdapter: AdapterFactory = createEvmAdapter(WarpChainName.Somnia, 'eth', {
  mainnet: {
    name: WarpChainName.Somnia,
    displayName: 'Somnia Mainnet',
    chainId: '5031',
    blockTime: 100,
    addressHrp: '0x',
    defaultApiUrl: 'https://api.infra.mainnet.somnia.network/',
    nativeToken: NativeTokenSomi,
  },
  testnet: {
    name: WarpChainName.Somnia,
    displayName: 'Somnia Testnet',
    chainId: '50312',
    blockTime: 100,
    addressHrp: '0x',
    defaultApiUrl: 'https://dream-rpc.somnia.network/',
    nativeToken: NativeTokenStt,
  },
  devnet: {
    name: WarpChainName.Somnia,
    displayName: 'Somnia Testnet',
    chainId: '50312',
    blockTime: 100,
    addressHrp: '0x',
    defaultApiUrl: 'https://dream-rpc.somnia.network',
    nativeToken: NativeTokenStt,
  },
})
