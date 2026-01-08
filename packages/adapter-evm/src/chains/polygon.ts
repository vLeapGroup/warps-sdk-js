import { ChainAdapterFactory, WarpChainAsset, WarpChainName } from '@joai/warps'
import { createEvmAdapter } from './common'

export const NativeTokenPolygon: WarpChainAsset = {
  chain: WarpChainName.Polygon,
  identifier: 'MATIC',
  symbol: 'MATIC',
  name: 'Polygon',
  decimals: 18,
  logoUrl: {
    light: 'https://raw.githubusercontent.com/JoAiHQ/assets/refs/heads/main/tokens/logos/matic-white.svg',
    dark: 'https://raw.githubusercontent.com/JoAiHQ/assets/refs/heads/main/tokens/logos/matic-black.svg',
  },
}

export const PolygonAdapter: ChainAdapterFactory = createEvmAdapter(WarpChainName.Polygon, {
  mainnet: {
    name: WarpChainName.Polygon,
    displayName: 'Polygon',
    chainId: '137',
    blockTime: 2000,
    addressHrp: '0x',
    defaultApiUrl: 'https://polygon-rpc.com',
    logoUrl: {
      light: 'https://raw.githubusercontent.com/JoAiHQ/assets/refs/heads/main/chains/logos/polygon-white.svg',
      dark: 'https://raw.githubusercontent.com/JoAiHQ/assets/refs/heads/main/chains/logos/polygon-black.svg',
    },
    nativeToken: NativeTokenPolygon,
  },
  testnet: {
    name: WarpChainName.Polygon,
    displayName: 'Polygon Mumbai',
    chainId: '80001',
    blockTime: 2000,
    addressHrp: '0x',
    defaultApiUrl: 'https://rpc.ankr.com/polygon_mumbai',
    logoUrl: {
      light: 'https://raw.githubusercontent.com/JoAiHQ/assets/refs/heads/main/chains/logos/polygon-white.svg',
      dark: 'https://raw.githubusercontent.com/JoAiHQ/assets/refs/heads/main/chains/logos/polygon-black.svg',
    },
    nativeToken: NativeTokenPolygon,
  },
  devnet: {
    name: WarpChainName.Polygon,
    displayName: 'Polygon Mumbai',
    chainId: '80001',
    blockTime: 2000,
    addressHrp: '0x',
    defaultApiUrl: 'https://rpc.ankr.com/polygon_mumbai',
    logoUrl: {
      light: 'https://raw.githubusercontent.com/JoAiHQ/assets/refs/heads/main/chains/logos/polygon-white.svg',
      dark: 'https://raw.githubusercontent.com/JoAiHQ/assets/refs/heads/main/chains/logos/polygon-black.svg',
    },
    nativeToken: NativeTokenPolygon,
  },
})
