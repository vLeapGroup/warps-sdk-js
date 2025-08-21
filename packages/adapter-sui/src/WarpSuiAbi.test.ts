import { WarpChainInfo, WarpClientConfig } from '@vleap/warps'
import { WarpSuiAbiBuilder } from './WarpSuiAbiBuilder'

describe('WarpSuiAbiBuilder', () => {
  const config: WarpClientConfig = { env: 'devnet', currentUrl: 'https://fullnode.devnet.sui.io:443' }
  const chain: WarpChainInfo = {
    name: 'sui',
    displayName: 'Sui Devnet',
    chainId: 'devnet',
    blockTime: 3000,
    addressHrp: 'sui',
    defaultApiUrl: 'https://fullnode.devnet.sui.io',
    nativeToken: 'SUI',
  }
  const abi = new WarpSuiAbiBuilder(config, chain)

  it('should instantiate WarpSuiAbiBuilder', () => {
    expect(abi).toBeInstanceOf(WarpSuiAbiBuilder)
  })
})
