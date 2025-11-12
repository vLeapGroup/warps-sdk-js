import { WarpSuiResults } from './WarpSuiResults'

describe('WarpSuiResults', () => {
  const config = { env: 'devnet' as const }
  const chain = {
    name: 'sui',
    displayName: 'Sui',
    chainId: '1',
    blockTime: 3000,
    addressHrp: '0x',
    defaultApiUrl: 'https://fullnode.devnet.sui.io',
    logoUrl: 'https://example.com/sui-chain-logo.png',
    nativeToken: {
      chain: 'sui',
      identifier: 'SUI',
      name: 'Sui',
      symbol: 'SUI',
      decimals: 9,
      logoUrl: 'https://example.com/sui-logo.png',
    },
  }
  const results = new WarpSuiResults(config, chain)

  it('should extract contract results', async () => {
    const warp = { results: { foo: 'out.foo' }, actions: [{ inputs: [] }] } as any
    const tx = { returnValues: { foo: 'string:bar' }, effects: { status: { status: 'success' } }, digest: '0xabc' }
    const res = await results.extractContractResults(warp, 1, tx, [])
    expect(res.values.string).toEqual(['string:bar'])
    expect(res.values.native).toEqual(['string:bar'])
    expect(res.results.foo).toBe('string:bar')
  })

  it('should extract query results', async () => {
    const warp = { results: { bar: 'out.bar' }, actions: [{ inputs: [] }] } as any
    const values = [{ bar: 'string:baz' }]
    const res = await results.extractQueryResults(warp, values, 1, [])
    expect(res.values.string).toEqual(['[object Object]'])
    expect(res.values.native).toEqual([{ bar: 'string:baz' }])
    expect(res.results.bar).toBe('string:baz')
  })
})
