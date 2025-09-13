import {
  AdapterWarpWallet,
  getWarpWalletAddressFromConfig,
  WarpAdapterGenericTransaction,
  WarpChainInfo,
  WarpClientConfig,
  WarpWalletDetails,
} from '@vleap/warps'
import { getConfiguredFastsetClient } from './helpers'
import { FastsetClient } from './sdk/FastsetClient'
import { Transaction } from './sdk/Transaction'
import { Wallet } from './sdk/Wallet'
import { ed } from './sdk/ed25519-setup'

export class WarpFastsetWallet implements AdapterWarpWallet {
  private wallet: Wallet | null = null
  private client: FastsetClient

  constructor(
    private config: WarpClientConfig,
    private chain: WarpChainInfo
  ) {
    this.client = getConfiguredFastsetClient(config, chain)
    this.initializeWallet()
  }

  private initializeWallet() {
    const wallets = this.config.user?.wallets
    if (!wallets) return

    const walletConfig = wallets[this.chain.name]
    if (!walletConfig) return

    if (typeof walletConfig === 'object' && 'privateKey' in walletConfig) {
      const privateKey = walletConfig.privateKey
      if (privateKey && typeof privateKey === 'string') {
        this.wallet = new Wallet(privateKey)
      }
    }
  }

  async signTransaction(tx: WarpAdapterGenericTransaction): Promise<WarpAdapterGenericTransaction> {
    if (!this.wallet) throw new Error('Wallet not initialized - no private key provided')
    if (!tx || typeof tx !== 'object') throw new Error('Invalid transaction object')

    const transaction = tx as Transaction
    const transactionData = transaction.toTransaction()
    const serializedTx = this.serializeTransaction(transactionData)
    const signature = await ed.sign(serializedTx, (this.wallet as any).privateKey)

    return { ...tx, signature }
  }

  async signMessage(message: string): Promise<string> {
    if (!this.wallet) throw new Error('Wallet not initialized - no private key provided')

    const messageBytes = new TextEncoder().encode(message)
    const signature = await ed.sign(messageBytes, (this.wallet as any).privateKey)
    return Buffer.from(signature).toString('hex')
  }

  async sendTransaction(tx: WarpAdapterGenericTransaction): Promise<string> {
    if (!tx || typeof tx !== 'object') throw new Error('Invalid transaction object')
    if (!tx.signature) throw new Error('Transaction must be signed before sending')
    if (!this.wallet) throw new Error('Wallet not initialized - no private key provided')

    const transaction = tx as Transaction
    const fastsetTx = transaction.toTransaction()

    const transactionData = {
      sender: Array.from(fastsetTx.sender),
      recipient: fastsetTx.recipient,
      nonce: fastsetTx.nonce,
      timestamp_nanos: fastsetTx.timestamp_nanos.toString(),
      claim: fastsetTx.claim,
    }

    const serializedTx = this.serializeTransaction(transactionData)
    const signature = await ed.sign(serializedTx, (this.wallet as any).privateKey)
    const result = await this.client.submitTransaction(transactionData, signature)
    return result.transaction_hash || result.hash || 'transaction-sent'
  }

  create(mnemonic: string): WarpWalletDetails {
    const wallet = new Wallet(mnemonic)
    return {
      address: wallet.toBech32(),
      privateKey: (wallet as any).privateKey.toString('hex'),
      mnemonic,
    }
  }

  generate(): WarpWalletDetails {
    const wallet = Wallet.generateNew()
    return { address: wallet.toBech32(), privateKey: (wallet as any).privateKey.toString('hex'), mnemonic: null }
  }

  getAddress(): string | null {
    return getWarpWalletAddressFromConfig(this.config, this.chain.name)
  }

  private serializeTransaction(tx: any): Uint8Array {
    const encoder = new TextEncoder()
    const serialized = JSON.stringify(tx, Object.keys(tx).sort())
    return encoder.encode(serialized)
  }
}
