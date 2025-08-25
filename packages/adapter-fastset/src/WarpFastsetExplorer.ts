import { AdapterWarpExplorer, WarpChainInfo, WarpClientConfig } from '@vleap/warps'

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
    return `${this.explorerUrl}/transaction/${hash}`
  }

  getAssetUrl(identifier: string): string {
    return `${this.explorerUrl}/asset/${identifier}`
  }

  getContractUrl(address: string): string {
    return `${this.explorerUrl}/account/${address}`
  }
}
