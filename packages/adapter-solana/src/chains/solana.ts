import { AdapterFactory, WarpChainAsset } from '@vleap/warps'
import { createSolanaAdapter } from './common'

export const NativeTokenSol: WarpChainAsset = {
  chain: 'solana',
  identifier: 'SOL',
  symbol: 'SOL',
  name: 'Solana',
  decimals: 9,
  logoUrl: 'https://vleap.ai/images/tokens/sol.svg',
}

export const getSolanaAdapter: AdapterFactory = createSolanaAdapter('solana', {
  mainnet: {
    name: 'solana',
    displayName: 'Solana Mainnet',
    chainId: '101',
    blockTime: 400,
    addressHrp: '',
    defaultApiUrl: 'https://api.mainnet-beta.solana.com',
    logoUrl: 'https://vleap.ai/images/chains/solana.svg',
    nativeToken: NativeTokenSol,
  },
  testnet: {
    name: 'solana',
    displayName: 'Solana Testnet',
    chainId: '103',
    blockTime: 400,
    addressHrp: '',
    defaultApiUrl: 'https://api.testnet.solana.com',
    logoUrl: 'https://vleap.ai/images/chains/solana.svg',
    nativeToken: NativeTokenSol,
  },
  devnet: {
    name: 'solana',
    displayName: 'Solana Devnet',
    chainId: '103',
    blockTime: 400,
    addressHrp: '',
    defaultApiUrl: 'https://api.devnet.solana.com',
    logoUrl: 'https://vleap.ai/images/chains/solana.svg',
    nativeToken: NativeTokenSol,
  },
})
