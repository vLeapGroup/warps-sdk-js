import { ChainAdapterFactory, WarpChainAsset, WarpChainName } from '@vleap/warps'
import { createEvmAdapter } from './common'

export const NativeTokenBase: WarpChainAsset = {
  chain: WarpChainName.Base,
  identifier: 'ETH',
  name: 'Ether',
  symbol: 'ETH',
  decimals: 18,
  logoUrl: {
    light: 'https://raw.githubusercontent.com/JoAiHQ/assets/refs/heads/main/tokens/logos/eth-white.svg',
    dark: 'https://raw.githubusercontent.com/JoAiHQ/assets/refs/heads/main/tokens/logos/eth-black.svg',
  },
}

export const BaseAdapter: ChainAdapterFactory = createEvmAdapter(WarpChainName.Base, {
  mainnet: {
    name: WarpChainName.Base,
    displayName: 'Base',
    chainId: '8453',
    blockTime: 2000,
    addressHrp: '0x',
    defaultApiUrl: 'https://mainnet.base.org',
    logoUrl: {
      light: 'https://raw.githubusercontent.com/JoAiHQ/assets/refs/heads/main/chains/logos/base-white.svg',
      dark: 'https://raw.githubusercontent.com/JoAiHQ/assets/refs/heads/main/chains/logos/base-black.svg',
    },
    nativeToken: NativeTokenBase,
  },
  testnet: {
    name: WarpChainName.Base,
    displayName: 'Base Sepolia',
    chainId: '84532',
    blockTime: 2000,
    addressHrp: '0x',
    defaultApiUrl: 'https://sepolia.base.org',
    logoUrl: {
      light: 'https://raw.githubusercontent.com/JoAiHQ/assets/refs/heads/main/chains/logos/base-white.svg',
      dark: 'https://raw.githubusercontent.com/JoAiHQ/assets/refs/heads/main/chains/logos/base-black.svg',
    },
    nativeToken: NativeTokenBase,
  },
  devnet: {
    name: WarpChainName.Base,
    displayName: 'Base Sepolia',
    chainId: '84532',
    blockTime: 2000,
    addressHrp: '0x',
    defaultApiUrl: 'https://sepolia.base.org',
    logoUrl: {
      light: 'https://raw.githubusercontent.com/JoAiHQ/assets/refs/heads/main/chains/logos/base-white.svg',
      dark: 'https://raw.githubusercontent.com/JoAiHQ/assets/refs/heads/main/chains/logos/base-black.svg',
    },
    nativeToken: NativeTokenBase,
  },
})
