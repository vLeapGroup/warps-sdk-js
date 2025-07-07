import { WarpSuiAbi } from './WarpSuiAbi'

describe('WarpSuiAbi', () => {
  const url = 'https://fullnode.devnet.sui.io'
  const abi = new WarpSuiAbi(url)

  it('should instantiate WarpSuiAbi', () => {
    expect(abi).toBeInstanceOf(WarpSuiAbi)
  })

  it('should have getModuleAbi and getFunctionAbi methods', () => {
    expect(typeof abi.getModuleAbi).toBe('function')
    expect(typeof abi.getFunctionAbi).toBe('function')
  })
})
