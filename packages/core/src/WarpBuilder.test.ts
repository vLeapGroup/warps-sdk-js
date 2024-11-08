import { WarpConfig } from './types'
import { WarpBuilder } from './WarpBuilder'

const Config: WarpConfig = {
  env: 'devnet',
  userAddress: 'erd1kc7v0lhqu0sclywkgeg4um8ea5nvch9psf2lf8t96j3w622qss8sav2zl8',
}

describe('WarpBuilder', () => {
  it('creates a warp', () => {
    const warp = new WarpBuilder(Config)
      .setName('testname')
      .setTitle('test title')
      .setDescription('test description')
      .setPreview('test preview')
      .build()

    expect(warp.name).toBe('testname')
    expect(warp.title).toBe('test title')
    expect(warp.description).toBe('test description ')
    expect(warp.preview).toBe('test preview')
    expect(warp.actions).toEqual([])
  })
})
