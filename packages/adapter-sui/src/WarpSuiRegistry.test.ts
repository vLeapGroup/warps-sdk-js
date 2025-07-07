import { WarpSuiRegistry } from './WarpSuiRegistry'

describe('WarpSuiRegistry', () => {
  const url = 'https://fullnode.devnet.sui.io'
  const registry = new WarpSuiRegistry(url)

  it('should instantiate WarpSuiRegistry', () => {
    expect(registry).toBeInstanceOf(WarpSuiRegistry)
  })

  it('should have getRegistryObject method', () => {
    expect(typeof registry.getRegistryObject).toBe('function')
  })
})
