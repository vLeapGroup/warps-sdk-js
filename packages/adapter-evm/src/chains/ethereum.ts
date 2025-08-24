import { AdapterFactory, WarpChainAsset, WarpChainName } from '@vleap/warps'
import { createEvmAdapter } from './common'

export const NativeTokenEth: WarpChainAsset = {
  chain: WarpChainName.Ethereum,
  identifier: 'ETH',
  name: 'ETH',
  decimals: 18,
  logoUrl: 'https://vleap.ai/images/tokens/eth.svg',
}

export const getEthereumAdapter: AdapterFactory = createEvmAdapter(WarpChainName.Ethereum, 'eth', {
  mainnet: {
    name: WarpChainName.Ethereum,
    displayName: 'Ethereum Mainnet',
    chainId: '1',
    blockTime: 12000,
    addressHrp: '0x',
    defaultApiUrl: 'https://ethereum-rpc.publicnode.com',
    nativeToken: NativeTokenEth,
  },
  testnet: {
    name: WarpChainName.Ethereum,
    displayName: 'Ethereum Sepolia',
    chainId: '11155111',
    blockTime: 12000,
    addressHrp: '0x',
    defaultApiUrl: 'https://ethereum-sepolia-rpc.publicnode.com',
    nativeToken: NativeTokenEth,
  },
  devnet: {
    name: WarpChainName.Ethereum,
    displayName: 'Ethereum Sepolia',
    chainId: '11155111',
    blockTime: 12000,
    addressHrp: '0x',
    defaultApiUrl: 'https://ethereum-sepolia-rpc.publicnode.com',
    nativeToken: NativeTokenEth,
  },
})
