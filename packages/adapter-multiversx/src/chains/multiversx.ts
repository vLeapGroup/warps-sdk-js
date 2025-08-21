import { WarpChain } from '@vleap/warps'
import { createMultiversxAdapter } from './common'

export const ChainNameMultiversx: WarpChain = 'multiversx'

export const getMultiversxAdapter = createMultiversxAdapter(ChainNameMultiversx, 'mvx', {
  mainnet: {
    name: ChainNameMultiversx,
    displayName: 'MultiversX',
    chainId: '1',
    blockTime: 6000,
    addressHrp: 'erd',
    defaultApiUrl: 'https://api.multiversx.com',
    nativeToken: 'EGLD',
  },
  testnet: {
    name: ChainNameMultiversx,
    displayName: 'MultiversX Testnet',
    chainId: 'T',
    blockTime: 6000,
    addressHrp: 'erd',
    defaultApiUrl: 'https://testnet-api.multiversx.com',
    nativeToken: 'EGLD',
  },
  devnet: {
    name: ChainNameMultiversx,
    displayName: 'MultiversX Devnet',
    chainId: 'D',
    blockTime: 6000,
    addressHrp: 'erd',
    defaultApiUrl: 'https://devnet-api.multiversx.com',
    nativeToken: 'EGLD',
  },
})
