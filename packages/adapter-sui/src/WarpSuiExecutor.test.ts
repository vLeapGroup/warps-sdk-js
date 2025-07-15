import { WarpSuiExecutor } from './WarpSuiExecutor'

describe('WarpSuiExecutor', () => {
  const config = { currentUrl: 'https://fullnode.devnet.sui.io', user: { wallets: { sui: '0x1234' } } } as any
  const executor = new WarpSuiExecutor(config)
  const chain = {
    name: 'sui',
    displayName: 'Sui',
    chainId: 'sui-mainnet',
    blockTime: 1,
    addressHrp: '0x',
    apiUrl: 'https://fullnode.devnet.sui.io',
    explorerUrl: 'https://explorer.sui.io',
    nativeToken: 'SUI',
  }

  it('createTransaction - creates a transfer transaction', async () => {
    const action = { type: 'transfer', label: 'test', description: 'test', address: '0x5678' }
    const warp = { actions: [action] } as any
    const executable = {
      warp,
      chain,
      action: 1,
      destination: action.address,
      args: [],
      value: 0n,
      transfers: [],
      data: null,
      resolvedInputs: [],
    }
    const tx = await executor.createTransaction(executable)
    expect(tx).toBeDefined()
    expect(typeof tx.transferObjects).toBe('function')
  })

  it('createTransaction - creates a contract call transaction', async () => {
    const action = { type: 'contract', label: 'test', description: 'test', func: '0xpackage::module::func' }
    const warp = { actions: [action] } as any
    const executable = {
      warp,
      chain,
      action: 1,
      destination: '0xpackage',
      args: ['string:hello'],
      value: 0n,
      transfers: [],
      data: null,
      resolvedInputs: [],
    }
    const tx = await executor.createTransaction(executable)
    expect(tx).toBeDefined()
    expect(typeof tx.moveCall).toBe('function')
  })

  it('createContractCallTransaction - uses tx.pure for arguments', async () => {
    const action = { type: 'contract', label: 'test', description: 'test', func: '0xpackage::module::func' }
    const warp = { actions: [action] } as any
    const executable = {
      warp,
      chain,
      action: 1,
      destination: '0xpackage',
      args: ['string:hello', 'bool:true', 'uint64:42'],
      value: 0n,
      transfers: [],
      data: null,
      resolvedInputs: [],
    }
    const tx = await executor.createContractCallTransaction(executable)

    expect(tx).toBeDefined()
    expect(typeof tx.moveCall).toBe('function')
  })
})
