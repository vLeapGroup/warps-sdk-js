import * as bip39 from '@scure/bip39'
import { wordlist } from '@scure/bip39/wordlists/english.js'
import { Keypair, Transaction, VersionedTransaction } from '@solana/web3.js'
import {
  getWarpWalletAddressFromConfig,
  getWarpWalletMnemonicFromConfig,
  WalletProvider,
  WarpChainInfo,
  WarpClientConfig,
  WarpWalletDetails,
  WarpWalletProvider,
} from '@vleap/warps'
import bs58 from 'bs58'

export class MnemonicWalletProvider implements WalletProvider {
  static readonly PROVIDER_NAME: WarpWalletProvider = 'mnemonic'
  private keypair: Keypair | null = null

  constructor(
    private config: WarpClientConfig,
    private chain: WarpChainInfo
  ) {}

  async getAddress(): Promise<string | null> {
    const address = getWarpWalletAddressFromConfig(this.config, this.chain.name)
    if (address) return address

    try {
      const keypair = this.getKeypair()
      return keypair.publicKey.toBase58()
    } catch {
      return null
    }
  }

  async getPublicKey(): Promise<string | null> {
    try {
      const keypair = this.getKeypair()
      return keypair.publicKey.toBase58()
    } catch {
      return null
    }
  }

  async signTransaction(tx: any): Promise<any> {
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

  getKeypairInstance(): Keypair {
    return this.getKeypair()
  }

  create(mnemonic: string): WarpWalletDetails {
    const seed = bip39.mnemonicToSeedSync(mnemonic)
    const keypair = Keypair.fromSeed(seed.slice(0, 32))
    return {
      provider: MnemonicWalletProvider.PROVIDER_NAME,
      address: keypair.publicKey.toBase58(),
      privateKey: null,
      mnemonic,
    }
  }

  generate(): WarpWalletDetails {
    const mnemonic = bip39.generateMnemonic(wordlist)
    const seed = bip39.mnemonicToSeedSync(mnemonic)
    const keypair = Keypair.fromSeed(seed.slice(0, 32))
    return {
      provider: MnemonicWalletProvider.PROVIDER_NAME,
      address: keypair.publicKey.toBase58(),
      privateKey: null,
      mnemonic,
    }
  }

  private getKeypair(): Keypair {
    if (this.keypair) return this.keypair

    const mnemonic = getWarpWalletMnemonicFromConfig(this.config, this.chain.name)
    if (!mnemonic) throw new Error('No mnemonic provided')

    const seed = bip39.mnemonicToSeedSync(mnemonic)
    this.keypair = Keypair.fromSeed(seed.slice(0, 32))
    return this.keypair
  }
}
