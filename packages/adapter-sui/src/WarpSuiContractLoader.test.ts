import { WarpSuiContractLoader } from './WarpSuiContractLoader'

describe('WarpSuiContractLoader', () => {
  const config = { env: 'devnet' as const }
  const chain = {
    name: 'sui',
    displayName: 'Sui Devnet',
    chainId: 'devnet',
    blockTime: 3000,
    addressHrp: 'sui',
    defaultApiUrl: 'https://fullnode.devnet.sui.io',
    nativeToken: {
      chain: 'sui',
      identifier: 'SUI',
      name: 'Sui',
      decimals: 9,
      logoUrl: 'https://example.com/sui-logo.png',
    },
  }
  const loader = new WarpSuiContractLoader(config, chain)

  it('should instantiate WarpSuiContractLoader', () => {
    expect(loader).toBeInstanceOf(WarpSuiContractLoader)
  })

  it('should have loadModuleAbi and loadFunctionAbi methods', () => {
    expect(typeof loader.loadModuleAbi).toBe('function')
    expect(typeof loader.loadFunctionAbi).toBe('function')
  })
})
