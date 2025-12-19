import { SuiClient } from '@mysten/sui/client'
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519'

import {
  AdapterWarpWallet,
  initializeWalletCache,
  WalletProvider,
  WarpAdapterGenericTransaction,
  WarpChainInfo,
  WarpClientConfig,
  WarpWalletDetails,
} from '@vleap/warps'
import { getConfiguredSuiClient } from './helpers'
import { SuiWalletProvider } from './providers/SuiWalletProvider'

export class WarpSuiWallet implements AdapterWarpWallet {
  private client: SuiClient
  private walletProvider: WalletProvider
  private cachedAddress: string | null = null
  private cachedPublicKey: string | null = null

  constructor(
    private config: WarpClientConfig,
    private chain: WarpChainInfo,
    walletProvider?: WalletProvider
  ) {
    this.client = getConfiguredSuiClient(config, chain)
    this.walletProvider = walletProvider || new SuiWalletProvider(config, chain)
    this.initializeCache()
  }

  private initializeCache() {
    initializeWalletCache(this.walletProvider).then((cache: { address: string | null; publicKey: string | null }) => {
      this.cachedAddress = cache.address
      this.cachedPublicKey = cache.publicKey
    })
  }

  async signTransaction(tx: WarpAdapterGenericTransaction): Promise<WarpAdapterGenericTransaction> {
    if (!tx || typeof tx !== 'object') throw new Error('Invalid transaction object')
    return await this.walletProvider.signTransaction(tx)
  }

  async signMessage(message: string): Promise<string> {
    return await this.walletProvider.signMessage(message)
  }

  async signTransactions(txs: WarpAdapterGenericTransaction[]): Promise<WarpAdapterGenericTransaction[]> {
    return Promise.all(txs.map(async (tx) => this.signTransaction(tx)))
  }

  async sendTransaction(tx: WarpAdapterGenericTransaction): Promise<string> {
    if (!tx || typeof tx !== 'object') throw new Error('Invalid transaction object')
    if (!tx.signature) throw new Error('Transaction must be signed before sending')

    if (this.walletProvider instanceof SuiWalletProvider) {
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
    const keypair = Ed25519Keypair.deriveKeypair(mnemonic.trim())
    const address = keypair.getPublicKey().toSuiAddress()
    const privateKey = Buffer.from(keypair.getSecretKey()).toString('hex')
    return { address, privateKey, mnemonic }
  }

  generate(): WarpWalletDetails {
    const keypair = Ed25519Keypair.generate()
    const address = keypair.getPublicKey().toSuiAddress()
    const privateKey = Buffer.from(keypair.getSecretKey()).toString('hex')
    return { address, privateKey, mnemonic: null }
  }

  getAddress(): string | null {
    return this.cachedAddress
  }

  getPublicKey(): string | null {
    return this.cachedPublicKey
  }
}
