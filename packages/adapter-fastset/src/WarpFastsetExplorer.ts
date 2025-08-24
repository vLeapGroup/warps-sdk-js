import { AdapterWarpExplorer, WarpChainInfo, WarpClientConfig } from '@vleap/warps'
import { getFastsetChainConfig } from './config'

export class WarpFastsetExplorer implements AdapterWarpExplorer {
  private readonly explorerUrl: string

  constructor(
    private readonly chainInfo: WarpChainInfo,
    private readonly config?: WarpClientConfig
  ) {
    const chainConfig = getFastsetChainConfig('fastset', config?.env || 'mainnet')
    this.explorerUrl = chainConfig.explorerUrl
  }

  getAccountUrl(address: string): string {
    return `${this.explorerUrl}/address/${address}`
  }

  getTransactionUrl(hash: string): string {
    return `${this.explorerUrl}/tx/${hash}`
  }

  getBlockUrl(blockNumber: string | number): string {
    return `${this.explorerUrl}/block/${blockNumber}`
  }

  getContractUrl(address: string): string {
    return `${this.explorerUrl}/contract/${address}`
  }

  getAssetUrl(identifier: string): string {
    return `${this.explorerUrl}/token/${identifier}`
  }
}
