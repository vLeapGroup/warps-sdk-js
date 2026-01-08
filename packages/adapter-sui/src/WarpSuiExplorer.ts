import { AdapterWarpExplorer, WarpChainInfo, WarpClientConfig } from '@joai/warps'
import { ExplorerName, ExplorerUrls, SuiExplorersConfig } from './constants'

export class WarpSuiExplorer implements AdapterWarpExplorer {
  constructor(
    private readonly config: WarpClientConfig,
    private readonly chain: WarpChainInfo
  ) {}

  private getExplorers(): readonly ExplorerName[] {
    const chainExplorers = SuiExplorersConfig[this.chain.name as keyof typeof SuiExplorersConfig]
    if (!chainExplorers) {
      return ['suivision' as ExplorerName]
    }

    const explorers = chainExplorers[this.config.env as keyof typeof chainExplorers]
    if (!explorers) {
      return ['suivision' as ExplorerName]
    }

    return explorers
  }

  private getPrimaryExplorer(): ExplorerName {
    const explorers = this.getExplorers()
    return explorers[0]
  }

  private getExplorerUrlByName(explorer?: ExplorerName): string {
    const userPreference = this.config.preferences?.explorers?.[this.chain.name]

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

  getAssetUrl(identifier: string, explorer?: ExplorerName): string {
    const baseUrl = this.getExplorerUrlByName(explorer)
    // Sui explorers use /coin/ for assets
    return `${baseUrl}/coin/${identifier}`
  }

  getContractUrl(address: string, explorer?: ExplorerName): string {
    const baseUrl = this.getExplorerUrlByName(explorer)
    return `${baseUrl}/object/${address}`
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
