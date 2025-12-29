import { AdapterWarpExplorer, WarpChainName, WarpClientConfig } from '@vleap/warps'
import { ExplorerName, ExplorerUrls, MultiversxExplorersConfig } from './constants'

export class WarpMultiversxExplorer implements AdapterWarpExplorer {
  constructor(
    private readonly chain: WarpChainName,
    private readonly config: WarpClientConfig
  ) {}

  private getExplorers(): readonly ExplorerName[] {
    const chainExplorers = MultiversxExplorersConfig[this.chain as keyof typeof MultiversxExplorersConfig]
    if (!chainExplorers) {
      return ['multiversx_explorer' as ExplorerName]
    }

    const explorers = chainExplorers[this.config.env as keyof typeof chainExplorers]
    if (!explorers) {
      return ['multiversx_explorer' as ExplorerName]
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

  getAssetUrl(identifier: string, explorer?: ExplorerName): string {
    const baseUrl = this.getExplorerUrlByName(explorer)
    return `${baseUrl}/tokens/${identifier}`
  }

  getContractUrl(address: string, explorer?: ExplorerName): string {
    const baseUrl = this.getExplorerUrlByName(explorer)
    return `${baseUrl}/accounts/${address}`
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
