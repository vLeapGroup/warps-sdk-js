import { AdapterWarpExplorer, WarpChainInfo, WarpClientConfig } from '@joai/warps'
import { ExplorerName, SolanaExplorers, SolanaExplorerNames, SolanaExplorerUrls } from './constants'

export class WarpSolanaExplorer implements AdapterWarpExplorer {
  constructor(
    private readonly chain: WarpChainInfo,
    private readonly config: WarpClientConfig
  ) {}

  private getExplorers(): readonly ExplorerName[] {
    const explorers = SolanaExplorerNames[this.config.env]
    if (!explorers) {
      return [SolanaExplorers.SolscanMainnet as ExplorerName]
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
      const url = SolanaExplorerUrls[userPreference as ExplorerName]
      if (url) return url
    }

    if (explorer) {
      const url = SolanaExplorerUrls[explorer]
      if (url) return url
    }

    const primaryExplorer = this.getPrimaryExplorer()
    const url = SolanaExplorerUrls[primaryExplorer]
    return url || SolanaExplorerUrls[primaryExplorer]
  }

  getAccountUrl(address: string, explorer?: ExplorerName): string {
    const baseUrl = this.getExplorerUrlByName(explorer)
    if (baseUrl.includes('?')) {
      const cluster = this.config.env === 'mainnet' ? '' : `&cluster=${this.config.env}`
      return `${baseUrl}/account/${address}${cluster}`
    }
    const cluster = this.config.env === 'mainnet' ? '' : `?cluster=${this.config.env}`
    return `${baseUrl}/account/${address}${cluster}`
  }

  getTransactionUrl(hash: string, explorer?: ExplorerName): string {
    const baseUrl = this.getExplorerUrlByName(explorer)
    if (baseUrl.includes('?')) {
      const cluster = this.config.env === 'mainnet' ? '' : `&cluster=${this.config.env}`
      return `${baseUrl}/tx/${hash}${cluster}`
    }
    const cluster = this.config.env === 'mainnet' ? '' : `?cluster=${this.config.env}`
    return `${baseUrl}/tx/${hash}${cluster}`
  }

  getBlockUrl(blockNumber: string | number, explorer?: ExplorerName): string {
    const baseUrl = this.getExplorerUrlByName(explorer)
    if (baseUrl.includes('?')) {
      const cluster = this.config.env === 'mainnet' ? '' : `&cluster=${this.config.env}`
      return `${baseUrl}/block/${blockNumber}${cluster}`
    }
    const cluster = this.config.env === 'mainnet' ? '' : `?cluster=${this.config.env}`
    return `${baseUrl}/block/${blockNumber}${cluster}`
  }

  getAssetUrl(identifier: string, explorer?: ExplorerName): string {
    const baseUrl = this.getExplorerUrlByName(explorer)
    if (baseUrl.includes('?')) {
      const cluster = this.config.env === 'mainnet' ? '' : `&cluster=${this.config.env}`
      return `${baseUrl}/token/${identifier}${cluster}`
    }
    const cluster = this.config.env === 'mainnet' ? '' : `?cluster=${this.config.env}`
    return `${baseUrl}/token/${identifier}${cluster}`
  }

  getContractUrl(address: string, explorer?: ExplorerName): string {
    const baseUrl = this.getExplorerUrlByName(explorer)
    if (baseUrl.includes('?')) {
      const cluster = this.config.env === 'mainnet' ? '' : `&cluster=${this.config.env}`
      return `${baseUrl}/account/${address}${cluster}`
    }
    const cluster = this.config.env === 'mainnet' ? '' : `?cluster=${this.config.env}`
    return `${baseUrl}/account/${address}${cluster}`
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
    const cluster = this.config.env === 'mainnet' ? '' : `?cluster=${this.config.env}`

    explorers.forEach((explorer) => {
      const url = SolanaExplorerUrls[explorer]
      if (url) {
        urls[explorer] = `${url}/account/${address}${cluster}`
      }
    })

    return urls
  }

  getTransactionUrls(hash: string): Record<ExplorerName, string> {
    const explorers = this.getAllExplorers()
    const urls: Record<ExplorerName, string> = {} as Record<ExplorerName, string>
    const cluster = this.config.env === 'mainnet' ? '' : `?cluster=${this.config.env}`

    explorers.forEach((explorer) => {
      const url = SolanaExplorerUrls[explorer]
      if (url) {
        urls[explorer] = `${url}/tx/${hash}${cluster}`
      }
    })

    return urls
  }

  getAssetUrls(identifier: string): Record<ExplorerName, string> {
    const explorers = this.getAllExplorers()
    const urls: Record<ExplorerName, string> = {} as Record<ExplorerName, string>
    const cluster = this.config.env === 'mainnet' ? '' : `?cluster=${this.config.env}`

    explorers.forEach((explorer) => {
      const url = SolanaExplorerUrls[explorer]
      if (url) {
        urls[explorer] = `${url}/token/${identifier}${cluster}`
      }
    })

    return urls
  }

  getContractUrls(address: string): Record<ExplorerName, string> {
    const explorers = this.getAllExplorers()
    const urls: Record<ExplorerName, string> = {} as Record<ExplorerName, string>
    const cluster = this.config.env === 'mainnet' ? '' : `?cluster=${this.config.env}`

    explorers.forEach((explorer) => {
      const url = SolanaExplorerUrls[explorer]
      if (url) {
        urls[explorer] = `${url}/account/${address}${cluster}`
      }
    })

    return urls
  }

  getBlockUrls(blockNumber: string | number): Record<ExplorerName, string> {
    const explorers = this.getAllExplorers()
    const urls: Record<ExplorerName, string> = {} as Record<ExplorerName, string>
    const cluster = this.config.env === 'mainnet' ? '' : `?cluster=${this.config.env}`

    explorers.forEach((explorer) => {
      const url = SolanaExplorerUrls[explorer]
      if (url) {
        urls[explorer] = `${url}/block/${blockNumber}${cluster}`
      }
    })

    return urls
  }
}
