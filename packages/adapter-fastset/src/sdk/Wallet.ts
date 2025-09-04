import * as bech32 from 'bech32'
import { ed } from './ed25519-setup'
import { Transaction } from './Transaction'
import { TransactionSigner } from './TransactionSigner'

export interface WalletConfig {
  privateKeyHex: string
}

export interface WalletInfo {
  publicKeyHex: string
  address: string
}

export class Wallet {
  public readonly publicKey: Uint8Array
  public readonly publicKeyHex: string
  private readonly privateKey: Uint8Array

  constructor(privateKeyHex: string) {
    const cleanPrivateKey = privateKeyHex.replace(/^0x/, '')
    this.privateKey = Buffer.from(cleanPrivateKey, 'hex')

    // For now, we'll use a synchronous approach
    this.publicKey = ed.getPublicKey(this.privateKey)
    this.publicKeyHex = Buffer.from(this.publicKey).toString('hex')
  }

  toBech32(): string {
    const words = bech32.bech32m.toWords(this.publicKey)
    return bech32.bech32m.encode('set', words)
  }

  getWalletInfo(): WalletInfo {
    return {
      publicKeyHex: this.publicKeyHex,
      address: this.toBech32(),
    }
  }

  createTransferClaim(recipientAddress: string, amount: bigint, assetType: 'native' | 'set' | 'usdc' | string): any {
    const recipientBytes = Wallet.decodeBech32Address(recipientAddress)

    const assetTypeBytes = new TextEncoder().encode(assetType)
    const userData = new Uint8Array(32)
    userData.set(assetTypeBytes.slice(0, 32))

    return {
      Transfer: {
        recipient: { FastSet: recipientBytes },
        amount: amount.toString(),
        user_data: userData,
      },
    }
  }

  createTransaction(nonce: number, recipient: { FastSet: Uint8Array } | { External: Uint8Array }, claim: any): Transaction {
    return new Transaction(this.publicKey, recipient, nonce, claim)
  }

  async signTransaction(transaction: Transaction): Promise<Uint8Array> {
    const transactionData = transaction.toTransaction()
    return await TransactionSigner.signTransaction(transactionData, this.privateKey)
  }

  static decodeBech32Address(address: string): Uint8Array {
    try {
      const decoded = bech32.bech32m.decode(address)
      return new Uint8Array(bech32.bech32m.fromWords(decoded.words))
    } catch (error) {
      const decoded = bech32.bech32.decode(address)
      return new Uint8Array(bech32.bech32.fromWords(decoded.words))
    }
  }

  static encodeBech32Address(publicKey: Uint8Array): string {
    const words = bech32.bech32m.toWords(publicKey)
    return bech32.bech32m.encode('set', words)
  }

  static fromPrivateKey(privateKeyHex: string): Wallet {
    return new Wallet(privateKeyHex)
  }

  static generateNew(): Wallet {
    const privateKey = ed.utils.randomPrivateKey()
    const privateKeyHex = Buffer.from(privateKey).toString('hex')
    return new Wallet(privateKeyHex)
  }

  static async fromPrivateKeyFile(filePath: string): Promise<Wallet> {
    const fs = await import('fs/promises')
    const privateKeyHex = (await fs.readFile(filePath, 'utf8')).trim()
    return new Wallet(privateKeyHex)
  }
}
