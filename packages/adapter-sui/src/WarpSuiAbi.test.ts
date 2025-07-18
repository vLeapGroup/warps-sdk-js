import { WarpClientConfig } from '@vleap/warps'
import { WarpSuiAbiBuilder } from './WarpSuiAbiBuilder'

describe('WarpSuiAbiBuilder', () => {
  const config: WarpClientConfig = { env: 'devnet', currentUrl: 'https://fullnode.devnet.sui.io:443' }
  const abi = new WarpSuiAbiBuilder(config)

  it('should instantiate WarpSuiAbiBuilder', () => {
    expect(abi).toBeInstanceOf(WarpSuiAbiBuilder)
  })
})
