import { Transaction } from '@multiversx/sdk-core'
import {
  getWarpWalletProviderIdFromConfigOrFail,
  WalletProvider,
  WarpChainInfo,
  WarpClientConfig,
  WarpWalletDetails,
  WarpWalletProvider,
} from '@vleap/warps'
import { ProviderConfig } from './types'

export class GaupaWalletProvider implements WalletProvider {
  static readonly PROVIDER_NAME: WarpWalletProvider = 'gaupa'
  constructor(
    private readonly config: WarpClientConfig,
    private readonly chain: WarpChainInfo,
    private readonly gaupaConfig: ProviderConfig
  ) {}

  async getAddress(): Promise<string | null> {
    const _providerId = getWarpWalletProviderIdFromConfigOrFail(this.config, this.chain.name)

    // TODO: Implement
    throw new Error('GaupaWalletProvider: getAddress not yet implemented')
  }

  async getPublicKey(): Promise<string | null> {
    const _providerId = getWarpWalletProviderIdFromConfigOrFail(this.config, this.chain.name)

    // TODO: Implement
    throw new Error('GaupaWalletProvider: getPublicKey not yet implemented')
  }

  async signTransaction(tx: Transaction): Promise<Transaction> {
    const _providerId = getWarpWalletProviderIdFromConfigOrFail(this.config, this.chain.name)

    // TODO: Implement
    throw new Error('GaupaWalletProvider: signTransaction not yet implemented')
  }

  async signMessage(message: string): Promise<string> {
    const _providerId = getWarpWalletProviderIdFromConfigOrFail(this.config, this.chain.name)

    // TODO: Implement
    throw new Error('GaupaWalletProvider: signMessage not yet implemented')
  }

  create(mnemonic: string): WarpWalletDetails {
    // TODO: Implement
    throw new Error('GaupaWalletProvider: create not yet implemented')

    const providerId = 'TODO'
    const address = 'TODO'

    return { provider: GaupaWalletProvider.PROVIDER_NAME, address, providerId }
  }

  generate(): WarpWalletDetails {
    // TODO: Implement
    throw new Error('GaupaWalletProvider: generate not yet implemented')

    const providerId = 'TODO'
    const address = 'TODO'

    return { provider: GaupaWalletProvider.PROVIDER_NAME, address, providerId }
  }
}
