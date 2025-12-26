import { ChainAdapterFactory, WarpChainAsset, WarpChainName } from '@vleap/warps'
import { createEvmAdapter } from './common'

export const NativeTokenEth: WarpChainAsset = {
  chain: WarpChainName.Ethereum,
  identifier: 'ETH',
  symbol: 'ETH',
  name: 'Ether',
  decimals: 18,
  logoUrl: {
    light: 'https://joai.ai/images/tokens/eth-white.svg',
    dark: 'https://joai.ai/images/tokens/eth-black.svg',
  },
}

export const EthereumAdapter: ChainAdapterFactory = createEvmAdapter(WarpChainName.Ethereum, {
  mainnet: {
    name: WarpChainName.Ethereum,
    displayName: 'Ethereum Mainnet',
    chainId: '1',
    blockTime: 12000,
    addressHrp: '0x',
    defaultApiUrl: 'https://ethereum-rpc.publicnode.com',
    logoUrl: {
      light: 'https://joai.ai/images/chains/ethereum-white.svg',
      dark: 'https://joai.ai/images/chains/ethereum-black.svg',
    },
    nativeToken: NativeTokenEth,
  },
  testnet: {
    name: WarpChainName.Ethereum,
    displayName: 'Ethereum Sepolia',
    chainId: '11155111',
    blockTime: 12000,
    addressHrp: '0x',
    defaultApiUrl: 'https://ethereum-sepolia-rpc.publicnode.com',
    logoUrl: {
      light: 'https://joai.ai/images/chains/ethereum-white.svg',
      dark: 'https://joai.ai/images/chains/ethereum-black.svg',
    },
    nativeToken: NativeTokenEth,
  },
  devnet: {
    name: WarpChainName.Ethereum,
    displayName: 'Ethereum Sepolia',
    chainId: '11155111',
    blockTime: 12000,
    addressHrp: '0x',
    defaultApiUrl: 'https://ethereum-sepolia-rpc.publicnode.com',
    logoUrl: {
      light: 'https://joai.ai/images/chains/ethereum-white.svg',
      dark: 'https://joai.ai/images/chains/ethereum-black.svg',
    },
    nativeToken: NativeTokenEth,
  },
})
