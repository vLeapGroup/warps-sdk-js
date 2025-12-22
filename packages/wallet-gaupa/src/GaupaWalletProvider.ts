import { Transaction } from '@multiversx/sdk-core'
import { WalletProvider, WalletProviderFactory, WarpChainInfo, WarpClientConfig, WarpWalletDetails } from '@vleap/warps'

export interface GaupaWalletProviderConfig {
  apiKey: string
}

export const createGaupaWalletProvider = (gaupaConfig: GaupaWalletProviderConfig): WalletProviderFactory => {
  return (config: WarpClientConfig, chain: WarpChainInfo) => {
    return new GaupaWalletProvider(config, chain, gaupaConfig)
  }
}

export class GaupaWalletProvider implements WalletProvider {
  constructor(
    private readonly config: WarpClientConfig,
    private readonly chain: WarpChainInfo,
    private readonly gaupaConfig: GaupaWalletProviderConfig
  ) {}

  async getAddress(): Promise<string | null> {
    // const providerId = getWarpWalletProviderIdFromConfig(this.config, 'multiversx')
    // TODO: Implement
    throw new Error('GaupaWalletProvider: getAddress not yet implemented')
  }

  async getPublicKey(): Promise<string | null> {
    // TODO: Implement
    throw new Error('GaupaWalletProvider: getPublicKey not yet implemented')
  }

  async signTransaction(tx: Transaction): Promise<Transaction> {
    // TODO: Implement
    throw new Error('GaupaWalletProvider: signTransaction not yet implemented')
  }

  async signMessage(message: string): Promise<string> {
    // TODO: Implement
    throw new Error('GaupaWalletProvider: signMessage not yet implemented')
  }

  create(mnemonic: string): WarpWalletDetails {
    throw new Error('GaupaWalletProvider: create not yet implemented - Gaupa SDK in private beta')
  }

  generate(): WarpWalletDetails {
    throw new Error('GaupaWalletProvider: generate not yet implemented - Gaupa SDK in private beta')
  }
}
