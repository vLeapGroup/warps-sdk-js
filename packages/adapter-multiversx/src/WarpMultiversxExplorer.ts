import { AdapterWarpExplorer, WarpChainInfo } from '@vleap/warps'

export class WarpMultiversxExplorer implements AdapterWarpExplorer {
  constructor(private readonly chainInfo: WarpChainInfo) {}

  getAccountUrl(address: string): string {
    return `${this.chainInfo.explorerUrl}/accounts/${address}`
  }

  getTransactionUrl(hash: string): string {
    return `${this.chainInfo.explorerUrl}/transactions/${hash}`
  }
}
