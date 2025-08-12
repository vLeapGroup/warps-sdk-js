import { AdapterWarpExplorer, WarpChainInfo, WarpClientConfig } from '@vleap/warps'
import { getEvmExplorerByName, getEvmExplorerUrl, getEvmExplorers, getPrimaryEvmExplorer } from './config'
import { ExplorerName, ExplorerUrls } from './constants'

export class WarpEvmExplorer implements AdapterWarpExplorer {
  constructor(
    private readonly chain: WarpChainInfo,
    private readonly config: WarpClientConfig
  ) {}

  private getExplorerUrlByName(explorer?: ExplorerName): string {
    const userPreference = this.chain.preferences?.explorers?.[this.chain.name]

    if (userPreference && !explorer) {
      const url = ExplorerUrls[userPreference as ExplorerName]
      if (url) return url
    }

    if (explorer) {
      const url = ExplorerUrls[explorer]
      if (url) return url
    }

    const primaryExplorer = getPrimaryEvmExplorer(this.chain.name, this.config.env)
    const url = ExplorerUrls[primaryExplorer]
    return url || getEvmExplorerUrl(this.config.env, this.chain.name)
  }

  getAccountUrl(address: string, explorer?: ExplorerName): string {
    const baseUrl = this.getExplorerUrlByName(explorer)
    return `${baseUrl}/address/${address}`
  }

  getTransactionUrl(hash: string, explorer?: ExplorerName): string {
    const baseUrl = this.getExplorerUrlByName(explorer)
    return `${baseUrl}/tx/${hash}`
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
    return `${baseUrl}/address/${contractAddress}`
  }

  getAllExplorers(): readonly ExplorerName[] {
    try {
      return getEvmExplorers(this.chain.name, this.config.env)
    } catch {
      return ['Default' as ExplorerName]
    }
  }

  getExplorerByName(name: string): ExplorerName | undefined {
    try {
      return getEvmExplorerByName(this.chain.name, this.config.env, name)
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
        urls[explorer] = `${url}/address/${address}`
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
        urls[explorer] = `${url}/tx/${hash}`
      }
    })

    return urls
  }
}
