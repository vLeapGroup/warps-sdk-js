import { AdapterWarpExplorer, WarpChain, WarpClientConfig } from '@vleap/warps'
import { getPrimarySuiExplorer, getSuiExplorerByName, getSuiExplorerUrl, getSuiExplorers } from './config'
import { ExplorerName, ExplorerUrls } from './constants'

export class WarpSuiExplorer implements AdapterWarpExplorer {
  constructor(
    private readonly config: WarpClientConfig,
    private readonly chain: WarpChain
  ) {}

  private getExplorerUrlByName(explorer?: ExplorerName): string {
    const userPreference = this.config.preferences?.explorers?.[this.chain]

    if (userPreference && !explorer) {
      const url = ExplorerUrls[userPreference as ExplorerName]
      if (url) return url
    }

    if (explorer) {
      const url = ExplorerUrls[explorer]
      if (url) return url
    }

    const primaryExplorer = getPrimarySuiExplorer(this.chain, this.config.env)
    const url = ExplorerUrls[primaryExplorer]
    return url || getSuiExplorerUrl(this.config.env, this.chain)
  }

  getAccountUrl(address: string, explorer?: ExplorerName): string {
    const baseUrl = this.getExplorerUrlByName(explorer)
    return `${baseUrl}/account/${address}`
  }

  getTransactionUrl(hash: string, explorer?: ExplorerName): string {
    const baseUrl = this.getExplorerUrlByName(explorer)
    return `${baseUrl}/txblock/${hash}`
  }

  getBlockUrl(blockNumber: string | number, explorer?: ExplorerName): string {
    const baseUrl = this.getExplorerUrlByName(explorer)
    return `${baseUrl}/block/${blockNumber}`
  }

  getTokenUrl(tokenAddress: string, explorer?: ExplorerName): string {
    const baseUrl = this.getExplorerUrlByName(explorer)
    return `${baseUrl}/token/${tokenAddress}`
  }

  getContractUrl(contractAddress: string, explorer?: ExplorerName): string {
    const baseUrl = this.getExplorerUrlByName(explorer)
    return `${baseUrl}/object/${contractAddress}`
  }

  getAllExplorers(): readonly ExplorerName[] {
    try {
      return getSuiExplorers(this.chain, this.config.env)
    } catch {
      return ['suivision' as ExplorerName]
    }
  }

  getExplorerByName(name: string): ExplorerName | undefined {
    try {
      return getSuiExplorerByName(this.chain, this.config.env, name)
    } catch {
      return undefined
    }
  }

  getAccountUrls(address: string): Record<ExplorerName, string> {
    const explorers = this.getAllExplorers()
    const urls: Record<ExplorerName, string> = {} as Record<ExplorerName, string>

    explorers.forEach((explorer) => {
      const url = ExplorerUrls[explorer]
      if (url) {
        urls[explorer] = `${url}/account/${address}`
      }
    })

    return urls
  }

  getTransactionUrls(hash: string): Record<ExplorerName, string> {
    const explorers = this.getAllExplorers()
    const urls: Record<ExplorerName, string> = {} as Record<ExplorerName, string>

    explorers.forEach((explorer) => {
      const url = ExplorerUrls[explorer]
      if (url) {
        urls[explorer] = `${url}/txblock/${hash}`
      }
    })

    return urls
  }
}
