import { AdapterWarpExplorer, WarpChain, WarpClientConfig } from '@vleap/warps'
import { getMultiversxExplorerByName, getMultiversxExplorerUrl, getMultiversxExplorers, getPrimaryMultiversxExplorer } from './config'
import { ExplorerName, ExplorerUrls } from './constants'

export class WarpMultiversxExplorer implements AdapterWarpExplorer {
  constructor(
    private readonly chain: WarpChain,
    private readonly config: WarpClientConfig
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

    const primaryExplorer = getPrimaryMultiversxExplorer(this.chain, this.config.env)
    const url = ExplorerUrls[primaryExplorer]
    return url || getMultiversxExplorerUrl(this.config.env, this.chain)
  }

  getAccountUrl(address: string, explorer?: ExplorerName): string {
    const baseUrl = this.getExplorerUrlByName(explorer)
    return `${baseUrl}/accounts/${address}`
  }

  getTransactionUrl(hash: string, explorer?: ExplorerName): string {
    const baseUrl = this.getExplorerUrlByName(explorer)
    return `${baseUrl}/transactions/${hash}`
  }

  getBlockUrl(blockNumber: string | number, explorer?: ExplorerName): string {
    const baseUrl = this.getExplorerUrlByName(explorer)
    return `${baseUrl}/blocks/${blockNumber}`
  }

  getTokenUrl(tokenAddress: string, explorer?: ExplorerName): string {
    const baseUrl = this.getExplorerUrlByName(explorer)
    return `${baseUrl}/tokens/${tokenAddress}`
  }

  getContractUrl(contractAddress: string, explorer?: ExplorerName): string {
    const baseUrl = this.getExplorerUrlByName(explorer)
    return `${baseUrl}/accounts/${contractAddress}`
  }

  getAllExplorers(): readonly ExplorerName[] {
    try {
      return getMultiversxExplorers(this.chain, this.config.env)
    } catch {
      return ['multiversx_explorer' as ExplorerName]
    }
  }

  getExplorerByName(name: string): ExplorerName | undefined {
    try {
      return getMultiversxExplorerByName(this.chain, this.config.env, name)
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
        urls[explorer] = `${url}/accounts/${address}`
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
        urls[explorer] = `${url}/transactions/${hash}`
      }
    })

    return urls
  }
}
