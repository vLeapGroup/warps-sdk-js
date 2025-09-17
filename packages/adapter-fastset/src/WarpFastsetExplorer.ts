import { AdapterWarpExplorer, WarpChainInfo, WarpClientConfig } from '@vleap/warps'

const HEX_PREFIX = '0x'

export class WarpFastsetExplorer implements AdapterWarpExplorer {
  private readonly explorerUrl = 'https://explorer.fastset.xyz'

  constructor(
    private readonly _chainInfo: WarpChainInfo,
    private readonly _config?: WarpClientConfig
  ) {}

  getAccountUrl(address: string): string {
    return `${this.explorerUrl}/account/${address}`
  }

  getTransactionUrl(hash: string): string {
    return `${this.explorerUrl}/txs/${HEX_PREFIX}${hash}`
  }

  getAssetUrl(identifier: string): string {
    return `${this.explorerUrl}/asset/${HEX_PREFIX}${identifier}`
  }

  getContractUrl(address: string): string {
    return `${this.explorerUrl}/account/${address}`
  }
}
