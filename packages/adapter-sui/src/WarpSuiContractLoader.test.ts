import { WarpSuiContractLoader } from './WarpSuiContractLoader'

describe('WarpSuiContractLoader', () => {
  const config = { env: 'devnet' as const }
  const loader = new WarpSuiContractLoader(config)

  it('should instantiate WarpSuiContractLoader', () => {
    expect(loader).toBeInstanceOf(WarpSuiContractLoader)
  })

  it('should have loadModuleAbi and loadFunctionAbi methods', () => {
    expect(typeof loader.loadModuleAbi).toBe('function')
    expect(typeof loader.loadFunctionAbi).toBe('function')
  })
})
