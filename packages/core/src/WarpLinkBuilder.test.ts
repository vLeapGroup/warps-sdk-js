import { WarpInitConfig } from './types'
import { WarpLinkBuilder } from './WarpLinkBuilder'

const Config: WarpInitConfig = {
  env: 'devnet',
  clientUrl: 'https://anyclient.com',
}

describe('build', () => {
  it('builds a link with hash', () => {
    const link = new WarpLinkBuilder(Config).build('hash', '123')
    expect(link).toBe('https://anyclient.com?warp=hash%3A123')
  })

  it('builds a link with alias', () => {
    const link = new WarpLinkBuilder(Config).build('alias', 'mywarp')
    expect(link).toBe('https://anyclient.com?warp=mywarp')
  })

  it('builds a link with alias for super client', () => {
    Config.clientUrl = 'https://devnet.usewarp.to'
    const link = new WarpLinkBuilder(Config).build('alias', 'mywarp')
    expect(link).toBe('https://devnet.usewarp.to/mywarp')
  })
})
