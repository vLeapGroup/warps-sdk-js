import { AdapterWarpExplorer, WarpChainInfo } from '@vleap/warps'
import { getEvmExplorerUrl } from './config'

export class WarpEvmExplorer implements AdapterWarpExplorer {
  private readonly chainInfo: WarpChainInfo
  private readonly chainName: string

  constructor(chainInfo: WarpChainInfo, chainName: string = 'ethereum') {
    this.chainInfo = chainInfo
    this.chainName = chainName
  }

  getAccountUrl(address: string): string {
    const baseUrl = this.chainInfo.explorerUrl || getEvmExplorerUrl('mainnet', this.chainName)
    return `${baseUrl}/address/${address}`
  }

  getTransactionUrl(hash: string): string {
    const baseUrl = this.chainInfo.explorerUrl || getEvmExplorerUrl('mainnet', this.chainName)
    return `${baseUrl}/tx/${hash}`
  }
}
