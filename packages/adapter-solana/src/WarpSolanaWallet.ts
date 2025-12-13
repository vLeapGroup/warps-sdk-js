import {
  AdapterWarpWallet,
  getProviderConfig,
  getWarpWalletMnemonicFromConfig,
  getWarpWalletPrivateKeyFromConfig,
  WarpAdapterGenericTransaction,
  WarpChainInfo,
  WarpClientConfig,
} from '@vleap/warps'
import { Connection, Keypair, Transaction, VersionedTransaction } from '@solana/web3.js'
import * as bip39 from '@scure/bip39'
import { wordlist } from '@scure/bip39/wordlists/english.js'
import bs58 from 'bs58'

export class WarpSolanaWallet implements AdapterWarpWallet {
  private connection: Connection

  constructor(
    private config: WarpClientConfig,
    private chain: WarpChainInfo
  ) {
    const providerConfig = getProviderConfig(config, chain.name, config.env, chain.defaultApiUrl)
    this.connection = new Connection(providerConfig.url, 'confirmed')
  }

  async signTransaction(tx: WarpAdapterGenericTransaction): Promise<WarpAdapterGenericTransaction> {
    if (!tx || typeof tx !== 'object') throw new Error('Invalid transaction object')

    const keypair = this.getKeypair()

    if (tx instanceof VersionedTransaction) {
      tx.sign([keypair])
      return tx
    }

    if (tx instanceof Transaction) {
      tx.sign(keypair)
      return tx
    }

    if (tx.transaction) {
      if (tx.transaction instanceof Transaction) {
        tx.transaction.sign(keypair)
        return { ...tx, transaction: tx.transaction.serialize() }
      }
      if (typeof tx.transaction === 'object') {
        try {
          const transaction = Transaction.from(tx.transaction)
          transaction.sign(keypair)
          return { ...tx, transaction: transaction.serialize(), signature: transaction.signature }
        } catch {
          throw new Error('Invalid transaction format')
        }
      }
    }

    throw new Error('Invalid transaction format')
  }

  async signTransactions(txs: WarpAdapterGenericTransaction[]): Promise<WarpAdapterGenericTransaction[]> {
    if (txs.length === 0) return []

    const keypair = this.getKeypair()

    return Promise.all(
      txs.map(async (tx) => {
        if (tx instanceof VersionedTransaction) {
          tx.sign([keypair])
          return tx
        }

        if (tx instanceof Transaction) {
          tx.sign(keypair)
          return tx
        }

        if (tx.transaction && typeof tx.transaction === 'object') {
          const transaction = Transaction.from(tx.transaction)
          transaction.sign(keypair)
          return { ...tx, transaction: transaction.serialize() }
        }

        throw new Error('Invalid transaction format')
      })
    )
  }

  async signMessage(message: string): Promise<string> {
    const keypair = this.getKeypair()
    const messageBytes = new TextEncoder().encode(message)
    const nacl = await import('tweetnacl')
    const secretKey = keypair.secretKey
    if (secretKey.length !== 64) {
      throw new Error(`Invalid secret key length: expected 64, got ${secretKey.length}`)
    }
    const privateKeySlice = secretKey.slice(0, 32)
    const privateKeyBytes = new Uint8Array(privateKeySlice)
    if (privateKeyBytes.length !== 32) {
      throw new Error(`Invalid private key length: expected 32, got ${privateKeyBytes.length}`)
    }
    const signature = nacl.sign.detached(messageBytes, privateKeyBytes)
    return bs58.encode(signature)
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

  create(mnemonic: string): { address: string; privateKey: string; mnemonic: string } {
    const seed = bip39.mnemonicToSeedSync(mnemonic)
    const keypair = Keypair.fromSeed(seed.slice(0, 32))
    return {
      address: keypair.publicKey.toBase58(),
      privateKey: bs58.encode(keypair.secretKey),
      mnemonic,
    }
  }

  generate(): { address: string; privateKey: string; mnemonic: string } {
    const keypair = Keypair.generate()
    const entropy = keypair.secretKey.slice(0, 16)
    const mnemonic = bip39.entropyToMnemonic(entropy, wordlist)
    return {
      address: keypair.publicKey.toBase58(),
      privateKey: bs58.encode(keypair.secretKey),
      mnemonic,
    }
  }

  getAddress(): string | null {
    try {
      const keypair = this.getKeypair()
      return keypair.publicKey.toBase58()
    } catch {
      return null
    }
  }

  getPublicKey(): string | null {
    try {
      const keypair = this.getKeypair()
      return keypair.publicKey.toBase58()
    } catch {
      return null
    }
  }

  private getKeypair(): Keypair {
    const privateKey = getWarpWalletPrivateKeyFromConfig(this.config, this.chain.name)
    if (privateKey) {
      try {
        const secretKey = bs58.decode(privateKey)
        if (secretKey.length === 64) {
          return Keypair.fromSecretKey(secretKey)
        } else if (secretKey.length === 32) {
          return Keypair.fromSeed(secretKey)
        } else {
          throw new Error(`Invalid private key length: expected 32 or 64 bytes, got ${secretKey.length}`)
        }
      } catch (error) {
        if (error instanceof Error) {
          throw new Error(`Invalid private key format: ${error.message}`)
        }
        throw new Error('Invalid private key format')
      }
    }

    const mnemonic = getWarpWalletMnemonicFromConfig(this.config, this.chain.name)
    if (mnemonic) {
      const seed = bip39.mnemonicToSeedSync(mnemonic)
      return Keypair.fromSeed(seed.slice(0, 32))
    }

    throw new Error('No private key or mnemonic provided')
  }
}
