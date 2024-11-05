import { WarpBuilder } from './WarpBuilder'

describe('WarpBuilder', () => {
  it('creates a warp', () => {
    const warp = new WarpBuilder('test').setTitle('test title').setDescription('test description').setPreview('test preview').build()

    expect(warp.title).toBe('test title')
    expect(warp.description).toBe('test description ')
    expect(warp.preview).toBe('test preview')
    expect(warp.actions).toEqual([])
  })
})
