import { AdapterFactory, WarpChainAsset, WarpChainName } from '@vleap/warps'
import { createEvmAdapter } from './common'

export const NativeTokenSomi: WarpChainAsset = {
  chain: WarpChainName.Somnia,
  identifier: 'SOMI',
  symbol: 'SOMI',
  name: 'Somnia',
  decimals: 18,
  logoUrl: 'https://assets.coingecko.com/coins/images/68061/standard/somniacg.png?1754641117',
}

export const NativeTokenStt: WarpChainAsset = {
  chain: WarpChainName.Somnia,
  identifier: 'STT',
  symbol: 'STT',
  name: 'Somnia Testnet Token',
  decimals: 18,
  logoUrl: 'https://assets.coingecko.com/coins/images/68061/standard/somniacg.png?1754641117',
}

export const getSomniaAdapter: AdapterFactory = createEvmAdapter(WarpChainName.Somnia, 'eth', {
  mainnet: {
    name: WarpChainName.Somnia,
    displayName: 'Somnia Mainnet',
    chainId: '5031',
    blockTime: 100,
    addressHrp: '0x',
    defaultApiUrl: 'https://api.infra.mainnet.somnia.network/',
    logoUrl: 'https://vleap.ai/images/chains/somnia.png',
    nativeToken: NativeTokenSomi,
  },
  testnet: {
    name: WarpChainName.Somnia,
    displayName: 'Somnia Testnet',
    chainId: '50312',
    blockTime: 100,
    addressHrp: '0x',
    defaultApiUrl: 'https://dream-rpc.somnia.network/',
    logoUrl: 'https://vleap.ai/images/chains/somnia.png',
    nativeToken: NativeTokenStt,
  },
  devnet: {
    name: WarpChainName.Somnia,
    displayName: 'Somnia Testnet',
    chainId: '50312',
    blockTime: 100,
    addressHrp: '0x',
    defaultApiUrl: 'https://dream-rpc.somnia.network',
    logoUrl: 'https://vleap.ai/images/chains/somnia.png',
    nativeToken: NativeTokenStt,
  },
})
