import { WarpSuiResults } from './WarpSuiResults'

describe('WarpSuiResults', () => {
  const config = { currentUrl: 'https://fullnode.devnet.sui.io' } as any
  const results = new WarpSuiResults(config)

  it('should extract contract results', async () => {
    const warp = { results: { foo: 'out.foo' }, actions: [{ inputs: [] }] } as any
    const tx = { returnValues: { foo: 'string:bar' }, effects: { status: { status: 'success' } }, digest: '0xabc' }
    const res = await results.extractContractResults(warp, 1, tx, [])
    expect(res.values).toEqual(['string:bar'])
    expect(res.results.foo).toBe('string:bar')
  })

  it('should extract query results', async () => {
    const warp = { results: { bar: 'out.bar' }, actions: [{ inputs: [] }] } as any
    const values = [{ bar: 'string:baz' }]
    const res = await results.extractQueryResults(warp, values, 1, [])
    expect(res.values).toEqual(values)
    expect(res.results.bar).toBe('string:baz')
  })
})
