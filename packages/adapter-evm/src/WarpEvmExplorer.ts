import { AdapterWarpExplorer, WarpChain, WarpClientConfig } from '@vleap/warps'
import { EvmExplorers, ExplorerName, ExplorerUrls } from './constants'

export class WarpEvmExplorer implements AdapterWarpExplorer {
  constructor(
    private readonly chain: WarpChain,
    private readonly config: WarpClientConfig
  ) {}

  private getExplorers(): readonly ExplorerName[] {
    const chainExplorers = EvmExplorers[this.chain as keyof typeof EvmExplorers]
    if (!chainExplorers) {
      return ['Default' as ExplorerName]
    }

    const explorers = chainExplorers[this.config.env]
    if (!explorers) {
      return ['Default' as ExplorerName]
    }

    return explorers
  }

  private getPrimaryExplorer(): ExplorerName {
    const explorers = this.getExplorers()
    return explorers[0]
  }

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

    const primaryExplorer = this.getPrimaryExplorer()
    const url = ExplorerUrls[primaryExplorer]
    return url || ExplorerUrls[primaryExplorer]
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
    return this.getExplorers()
  }

  getExplorerByName(name: string): ExplorerName | undefined {
    const explorers = this.getExplorers()
    return explorers.find((explorer) => explorer.toLowerCase() === name.toLowerCase())
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
