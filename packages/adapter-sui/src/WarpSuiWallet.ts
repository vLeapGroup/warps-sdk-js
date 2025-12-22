import { SuiClient } from '@mysten/sui/client'

import {
  AdapterWarpWallet,
  initializeWalletCache,
  WalletProvider,
  WarpAdapterGenericTransaction,
  WarpChainInfo,
  WarpClientConfig,
  WarpWalletDetails,
} from '@vleap/warps'
import {
  getWarpWalletMnemonicFromConfig,
  getWarpWalletPrivateKeyFromConfig,
} from '@vleap/warps'
import { getConfiguredSuiClient } from './helpers'
import { MnemonicWalletProvider } from './providers/MnemonicWalletProvider'
import { PrivateKeyWalletProvider } from './providers/SuiWalletProvider'

export class WarpSuiWallet implements AdapterWarpWallet {
  private client: SuiClient
  private walletProvider: WalletProvider | null
  private cachedAddress: string | null = null
  private cachedPublicKey: string | null = null

  constructor(
    private config: WarpClientConfig,
    private chain: WarpChainInfo
  ) {
    this.client = getConfiguredSuiClient(config, chain)
    this.walletProvider = this.createProvider()
    this.initializeCache()
  }

  private createProvider(): WalletProvider | null {
    const privateKey = getWarpWalletPrivateKeyFromConfig(this.config, this.chain.name)
    if (privateKey) return new PrivateKeyWalletProvider(this.config, this.chain)

    const mnemonic = getWarpWalletMnemonicFromConfig(this.config, this.chain.name)
    if (mnemonic) return new MnemonicWalletProvider(this.config, this.chain)

    return null
  }

  private initializeCache() {
    initializeWalletCache(this.walletProvider).then((cache: { address: string | null; publicKey: string | null }) => {
      this.cachedAddress = cache.address
      this.cachedPublicKey = cache.publicKey
    })
  }

  async signTransaction(tx: WarpAdapterGenericTransaction): Promise<WarpAdapterGenericTransaction> {
    if (!tx || typeof tx !== 'object') throw new Error('Invalid transaction object')
    if (!this.walletProvider) throw new Error('No wallet provider available')
    return await this.walletProvider.signTransaction(tx)
  }

  async signMessage(message: string): Promise<string> {
    if (!this.walletProvider) throw new Error('No wallet provider available')
    return await this.walletProvider.signMessage(message)
  }

  async signTransactions(txs: WarpAdapterGenericTransaction[]): Promise<WarpAdapterGenericTransaction[]> {
    return Promise.all(txs.map(async (tx) => this.signTransaction(tx)))
  }

  async sendTransaction(tx: WarpAdapterGenericTransaction): Promise<string> {
    if (!tx || typeof tx !== 'object') throw new Error('Invalid transaction object')
    if (!tx.signature) throw new Error('Transaction must be signed before sending')

    if (this.walletProvider instanceof PrivateKeyWalletProvider || this.walletProvider instanceof MnemonicWalletProvider) {
      const result = await this.client.signAndExecuteTransaction({
        transaction: tx,
        signer: this.walletProvider.getKeypairInstance(),
      })
      return result.digest
    }

    throw new Error('Wallet provider does not support sending transactions')
  }

  async sendTransactions(txs: WarpAdapterGenericTransaction[]): Promise<string[]> {
    return Promise.all(txs.map(async (tx) => this.sendTransaction(tx)))
  }

  create(mnemonic: string): WarpWalletDetails {
    if (!this.walletProvider) throw new Error('No wallet provider available')
    return this.walletProvider.create(mnemonic)
  }

  generate(): WarpWalletDetails {
    if (!this.walletProvider) throw new Error('No wallet provider available')
    return this.walletProvider.generate()
  }

  getAddress(): string | null {
    return this.cachedAddress
  }

  getPublicKey(): string | null {
    return this.cachedPublicKey
  }
}
