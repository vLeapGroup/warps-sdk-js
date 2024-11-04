import { WarpBuilder } from './WarpBuilder'

describe('WarpBuilder', () => {
  it('creates a warp', () => {
    const warp = WarpBuilder.create('test', 'test')
    expect(warp.name).toBe('test')
    expect(warp.description).toBe('test')
    expect(warp.actions).toEqual([])
  })
})
