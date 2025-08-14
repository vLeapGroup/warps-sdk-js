import { WarpChain } from '@vleap/warps'
import { createMultiversxAdapter } from './common'

const ChainName: WarpChain = 'multiversx'

export const getMultiversxAdapter = createMultiversxAdapter(ChainName, 'mvx', {
  mainnet: {
    name: ChainName,
    displayName: 'MultiversX',
    chainId: '1',
    blockTime: 6000,
    addressHrp: 'erd',
    apiUrl: 'https://api.multiversx.com',
    nativeToken: 'EGLD',
  },
  testnet: {
    name: ChainName,
    displayName: 'MultiversX Testnet',
    chainId: 'T',
    blockTime: 6000,
    addressHrp: 'erd',
    apiUrl: 'https://testnet-api.multiversx.com',
    nativeToken: 'EGLD',
  },
  devnet: {
    name: ChainName,
    displayName: 'MultiversX Devnet',
    chainId: 'D',
    blockTime: 6000,
    addressHrp: 'erd',
    apiUrl: 'https://devnet-api.multiversx.com',
    nativeToken: 'EGLD',
  },
})
