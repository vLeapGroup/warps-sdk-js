import { AdapterWarpExplorer, WarpChainInfo } from '@vleap/warps'

export class WarpSuiExplorer implements AdapterWarpExplorer {
  constructor(private readonly chainInfo: WarpChainInfo) {}

  getAccountUrl(address: string): string {
    return `${this.chainInfo.explorerUrl}/account/${address}`
  }

  getTransactionUrl(hash: string): string {
    return `${this.chainInfo.explorerUrl}/txblock/${hash}`
  }
}
