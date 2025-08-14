import { createMultiversxAdapter } from './common'

export const getMultiversxAdapter = createMultiversxAdapter('multiversx', 'mvx', {
  mainnet: {
    displayName: 'MultiversX',
    chainId: '1',
    blockTime: 6000,
    addressHrp: 'erd',
    apiUrl: 'https://api.multiversx.com',
    nativeToken: 'EGLD',
  },
  testnet: {
    displayName: 'MultiversX Testnet',
    chainId: 'T',
    blockTime: 6000,
    addressHrp: 'erd',
    apiUrl: 'https://testnet-api.multiversx.com',
    nativeToken: 'EGLD',
  },
  devnet: {
    displayName: 'MultiversX Devnet',
    chainId: 'D',
    blockTime: 6000,
    addressHrp: 'erd',
    apiUrl: 'https://devnet-api.multiversx.com',
    nativeToken: 'EGLD',
  },
})
