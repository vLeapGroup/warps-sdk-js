import { WarpConfig } from './types'
import { WarpLink } from './WarpLink'

const Config: WarpConfig = {
  env: 'devnet',
}

describe('WarpLink', () => {
  it('build - creates a link', () => {
    const link = new WarpLink(Config).build('hash', '123')

    expect(link).toBe('https://devnet.xwarp.me/to?xwarp=hash%3A123')
  })
})
