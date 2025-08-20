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
    apiUrl: 'https://api.multiversx.com',
    nativeToken: 'EGLD',
  },
  testnet: {
    name: ChainNameMultiversx,
    displayName: 'MultiversX Testnet',
    chainId: 'T',
    blockTime: 6000,
    addressHrp: 'erd',
    apiUrl: 'https://testnet-api.multiversx.com',
    nativeToken: 'EGLD',
  },
  devnet: {
    name: ChainNameMultiversx,
    displayName: 'MultiversX Devnet',
    chainId: 'D',
    blockTime: 6000,
    addressHrp: 'erd',
    apiUrl: 'https://devnet-api.multiversx.com',
    nativeToken: 'EGLD',
  },
})
