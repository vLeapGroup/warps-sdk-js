import { AdapterWarpExplorer, WarpChainInfo, WarpClientConfig } from '@vleap/warps'
import { ExplorerName, NearExplorerNames, NearExplorers, NearExplorerUrls } from './constants'

export class WarpNearExplorer implements AdapterWarpExplorer {
  constructor(
    private readonly chain: WarpChainInfo,
    private readonly config: WarpClientConfig
  ) {}

  private getExplorers(): readonly ExplorerName[] {
    const explorers = NearExplorerNames[this.config.env]
    if (!explorers) {
      return [NearExplorers.NearExplorer as ExplorerName]
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
      const url = NearExplorerUrls[userPreference as ExplorerName]
      if (url) return url
    }

    if (explorer) {
      const url = NearExplorerUrls[explorer]
      if (url) return url
    }

    const primaryExplorer = this.getPrimaryExplorer()
    const url = NearExplorerUrls[primaryExplorer]
    return url || NearExplorerUrls[primaryExplorer]
  }

  getAccountUrl(address: string, explorer?: ExplorerName): string {
    const baseUrl = this.getExplorerUrlByName(explorer)
    const network = this.config.env === 'mainnet' ? '' : `/${this.config.env}`
    return `${baseUrl}${network}/accounts/${address}`
  }

  getTransactionUrl(hash: string, explorer?: ExplorerName): string {
    const baseUrl = this.getExplorerUrlByName(explorer)
    const network = this.config.env === 'mainnet' ? '' : `/${this.config.env}`
    return `${baseUrl}${network}/transactions/${hash}`
  }

  getBlockUrl(blockNumber: string | number, explorer?: ExplorerName): string {
    const baseUrl = this.getExplorerUrlByName(explorer)
    const network = this.config.env === 'mainnet' ? '' : `/${this.config.env}`
    return `${baseUrl}${network}/blocks/${blockNumber}`
  }

  getAssetUrl(identifier: string, explorer?: ExplorerName): string {
    const baseUrl = this.getExplorerUrlByName(explorer)
    const network = this.config.env === 'mainnet' ? '' : `/${this.config.env}`
    return `${baseUrl}${network}/tokens/${identifier}`
  }

  getContractUrl(address: string, explorer?: ExplorerName): string {
    const baseUrl = this.getExplorerUrlByName(explorer)
    const network = this.config.env === 'mainnet' ? '' : `/${this.config.env}`
    return `${baseUrl}${network}/accounts/${address}`
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
    const network = this.config.env === 'mainnet' ? '' : `/${this.config.env}`

    explorers.forEach((explorer) => {
      const url = NearExplorerUrls[explorer]
      if (url) {
        urls[explorer] = `${url}${network}/accounts/${address}`
      }
    })

    return urls
  }

  getTransactionUrls(hash: string): Record<ExplorerName, string> {
    const explorers = this.getAllExplorers()
    const urls: Record<ExplorerName, string> = {} as Record<ExplorerName, string>
    const network = this.config.env === 'mainnet' ? '' : `/${this.config.env}`

    explorers.forEach((explorer) => {
      const url = NearExplorerUrls[explorer]
      if (url) {
        urls[explorer] = `${url}${network}/transactions/${hash}`
      }
    })

    return urls
  }

  getAssetUrls(identifier: string): Record<ExplorerName, string> {
    const explorers = this.getAllExplorers()
    const urls: Record<ExplorerName, string> = {} as Record<ExplorerName, string>
    const network = this.config.env === 'mainnet' ? '' : `/${this.config.env}`

    explorers.forEach((explorer) => {
      const url = NearExplorerUrls[explorer]
      if (url) {
        urls[explorer] = `${url}${network}/tokens/${identifier}`
      }
    })

    return urls
  }

  getContractUrls(address: string): Record<ExplorerName, string> {
    const explorers = this.getAllExplorers()
    const urls: Record<ExplorerName, string> = {} as Record<ExplorerName, string>
    const network = this.config.env === 'mainnet' ? '' : `/${this.config.env}`

    explorers.forEach((explorer) => {
      const url = NearExplorerUrls[explorer]
      if (url) {
        urls[explorer] = `${url}${network}/accounts/${address}`
      }
    })

    return urls
  }

  getBlockUrls(blockNumber: string | number): Record<ExplorerName, string> {
    const explorers = this.getAllExplorers()
    const urls: Record<ExplorerName, string> = {} as Record<ExplorerName, string>
    const network = this.config.env === 'mainnet' ? '' : `/${this.config.env}`

    explorers.forEach((explorer) => {
      const url = NearExplorerUrls[explorer]
      if (url) {
        urls[explorer] = `${url}${network}/blocks/${blockNumber}`
      }
    })

    return urls
  }
}
