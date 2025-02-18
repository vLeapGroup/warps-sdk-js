import { Warp, WarpConfig } from './types'
import { WarpValidator } from './WarpValidator'

const Config: WarpConfig = {
  env: 'devnet',
  clientUrl: 'https://anyclient.com',
}

describe('WarpValidator', () => {
  it('fails when there is more than one value position action', async () => {
    const warp: Warp = {
      actions: [{ position: 'value' } as any, { position: 'value' } as any],
    } as any

    const validator = new WarpValidator(Config)

    await expect(validator.validate(warp)).rejects.toThrow('only one value position action is allowed')
  })
})
