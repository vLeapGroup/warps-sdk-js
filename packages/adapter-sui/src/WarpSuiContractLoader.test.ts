import { WarpSuiContractLoader } from './WarpSuiContractLoader'

describe('WarpSuiContractLoader', () => {
  const url = 'https://fullnode.devnet.sui.io'
  const loader = new WarpSuiContractLoader(url)

  it('should instantiate WarpSuiContractLoader', () => {
    expect(loader).toBeInstanceOf(WarpSuiContractLoader)
  })

  it('should have loadModuleAbi and loadFunctionAbi methods', () => {
    expect(typeof loader.loadModuleAbi).toBe('function')
    expect(typeof loader.loadFunctionAbi).toBe('function')
  })
})
