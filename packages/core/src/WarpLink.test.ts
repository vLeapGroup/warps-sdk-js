import { WarpConfig } from './types'
import { WarpLink } from './WarpLink'

const Config: WarpConfig = {
  env: 'devnet',
}

describe('WarpLink', () => {
  it('build - creates a link with hash', () => {
    const link = new WarpLink(Config).build('hash', '123')

    expect(link).toBe('https://devnet.xwarp.me/to?xwarp=hash%3A123')
  })

  it('build - creates a link with alias', () => {
    const link = new WarpLink(Config).build('alias', 'mywarp')

    expect(link).toBe('https://devnet.xwarp.me/to?xwarp=Amywarp')
  })
})
