/// <reference path="./types.d.ts" />
import { createKeyPairSignerFromBytes } from '@solana/kit'
import { Connection, Keypair, Transaction, VersionedTransaction } from '@solana/web3.js'
import {
  AdapterWarpWallet,
  getProviderConfig,
  initializeWalletCache,
  WalletProvider,
  WarpAdapterGenericTransaction,
  WarpChainInfo,
  WarpClientConfig,
  WarpWalletDetails,
} from '@vleap/warps'
import { registerExactSvmScheme } from '@x402/svm/exact/client'
import { SupportedX402SolanaNetworks } from './constants'
import { MnemonicWalletProvider } from './providers/MnemonicWalletProvider'
import { PrivateKeyWalletProvider } from './providers/PrivateKeyWalletProvider'
import { ReadOnlyWalletProvider } from './providers/ReadOnlyWalletProvider'

export class WarpSolanaWallet implements AdapterWarpWallet {
  private connection: Connection
  private walletProvider: WalletProvider | null
  private cachedAddress: string | null = null
  private cachedPublicKey: string | null = null

  constructor(
    private config: WarpClientConfig,
    private chain: WarpChainInfo
  ) {
    const providerConfig = getProviderConfig(config, chain.name, config.env, chain.defaultApiUrl)
    this.connection = new Connection(providerConfig.url, 'confirmed')
    this.walletProvider = this.createProvider()
    this.initializeCache()
  }

  private createProvider(): WalletProvider | null {
    const wallet = this.config.user?.wallets?.[this.chain.name]
    if (!wallet) return null
    if (typeof wallet === 'string') return new ReadOnlyWalletProvider(this.config, this.chain)

    const customWalletProviders = this.config.walletProviders?.[this.chain.name]
    const providerFactory = customWalletProviders?.[wallet.provider]
    if (providerFactory) return providerFactory(this.config, this.chain)

    if (wallet.provider === 'privateKey') return new PrivateKeyWalletProvider(this.config, this.chain, this.connection)
    if (wallet.provider === 'mnemonic') return new MnemonicWalletProvider(this.config, this.chain, this.connection)
    throw new Error(`Unsupported wallet provider for ${this.chain.name}: ${wallet.provider}`)
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
    if (this.walletProvider instanceof ReadOnlyWalletProvider) throw new Error(`Wallet (${this.chain.name}) is read-only`)
    return await this.walletProvider.signTransaction(tx)
  }

  async signTransactions(txs: WarpAdapterGenericTransaction[]): Promise<WarpAdapterGenericTransaction[]> {
    if (txs.length === 0) return []
    const signedTxs = []
    for (const tx of txs) {
      signedTxs.push(await this.signTransaction(tx))
    }
    return signedTxs
  }

  async signMessage(message: string): Promise<string> {
    if (!this.walletProvider) throw new Error('No wallet provider available')
    if (this.walletProvider instanceof ReadOnlyWalletProvider) throw new Error(`Wallet (${this.chain.name}) is read-only`)
    return await this.walletProvider.signMessage(message)
  }

  async sendTransaction(tx: WarpAdapterGenericTransaction): Promise<string> {
    if (!tx || typeof tx !== 'object') throw new Error('Invalid transaction object')

    let transaction: Transaction | VersionedTransaction

    if (tx instanceof VersionedTransaction) {
      transaction = tx
    } else if (tx instanceof Transaction) {
      transaction = tx
    } else if (tx.transaction) {
      if (tx.transaction instanceof Transaction) {
        transaction = tx.transaction
      } else if (tx.transaction instanceof VersionedTransaction) {
        transaction = tx.transaction
      } else if (typeof tx.transaction === 'object') {
        try {
          transaction = Transaction.from(tx.transaction)
        } catch {
          throw new Error('Invalid transaction format')
        }
      } else if (Buffer.isBuffer(tx.transaction) || typeof tx.transaction === 'string') {
        transaction = Transaction.from(tx.transaction)
      } else {
        throw new Error('Transaction must be signed before sending')
      }
    } else {
      throw new Error('Transaction must be signed before sending')
    }

    const signature = await this.connection.sendRawTransaction(transaction.serialize(), {
      skipPreflight: true,
      maxRetries: 3,
    })

    return signature
  }

  async sendTransactions(txs: WarpAdapterGenericTransaction[]): Promise<string[]> {
    return Promise.all(txs.map(async (tx) => this.sendTransaction(tx)))
  }

  create(mnemonic: string): WarpWalletDetails {
    if (!this.walletProvider) throw new Error('No wallet provider available')
    if (this.walletProvider instanceof ReadOnlyWalletProvider) throw new Error(`Wallet (${this.chain.name}) is read-only`)
    return this.walletProvider.create(mnemonic)
  }

  generate(): WarpWalletDetails {
    if (!this.walletProvider) throw new Error('No wallet provider available')
    if (this.walletProvider instanceof ReadOnlyWalletProvider) throw new Error(`Wallet (${this.chain.name}) is read-only`)
    return this.walletProvider.generate()
  }

  getAddress(): string | null {
    return this.cachedAddress
  }

  getPublicKey(): string | null {
    return this.cachedPublicKey
  }

  async registerX402Handlers(client: unknown): Promise<Record<string, () => void>> {
    if (!this.walletProvider) return {}

    const provider = this.walletProvider as unknown as Record<string, unknown>
    const getKeypair = provider.getKeypairInstance as (() => Keypair) | undefined

    if (typeof getKeypair !== 'function') return {}

    const keypair = getKeypair()
    if (!keypair || !keypair.secretKey) return {}

    const signer = await createKeyPairSignerFromBytes(keypair.secretKey)
    const handlers: Record<string, () => void> = {}

    for (const network of SupportedX402SolanaNetworks) {
      handlers[network] = () => {
        registerExactSvmScheme(client as Parameters<typeof registerExactSvmScheme>[0], { signer })
      }
    }

    return handlers
  }
}
