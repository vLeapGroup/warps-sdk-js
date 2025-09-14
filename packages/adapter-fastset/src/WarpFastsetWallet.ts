import {
  AdapterWarpWallet,
  getWarpWalletAddressFromConfig,
  WarpAdapterGenericTransaction,
  WarpChainInfo,
  WarpClientConfig,
  WarpWalletDetails,
} from '@vleap/warps'
import { getConfiguredFastsetClient } from './helpers'
import { FastsetClient, Transaction, Wallet } from './sdk'
import { ed } from './sdk/ed25519-setup'

export class WarpFastsetWallet implements AdapterWarpWallet {
  private wallet: Wallet | null = null
  private client: FastsetClient

  constructor(
    private config: WarpClientConfig,
    private chain: WarpChainInfo
  ) {
    this.initializeWallet()
    this.client = getConfiguredFastsetClient(this.config, this.chain)
  }

  private initializeWallet() {
    const walletConfig = this.config.user?.wallets?.[this.chain.name]
    if (walletConfig && typeof walletConfig === 'object' && 'privateKey' in walletConfig && walletConfig.privateKey) {
      this.wallet = new Wallet(walletConfig.privateKey)
    }
  }

  async signTransaction(tx: WarpAdapterGenericTransaction): Promise<WarpAdapterGenericTransaction> {
    if (!this.wallet) throw new Error('Wallet not initialized')
    const transaction = tx as Transaction
    const serializedTx = this.serializeTransaction(transaction.toTransaction())
    const signature = await ed.sign(serializedTx, this.wallet.getPrivateKey())
    return Object.assign(transaction, { signature })
  }

  async signMessage(message: string): Promise<string> {
    if (!this.wallet) throw new Error('Wallet not initialized')
    const signature = await ed.sign(new TextEncoder().encode(message), this.wallet.getPrivateKey())
    return Buffer.from(signature).toString('hex')
  }

  async sendTransaction(tx: WarpAdapterGenericTransaction): Promise<string> {
    if (!this.wallet) throw new Error('Wallet not initialized')
    const transaction = tx as Transaction
    const fastsetTx = transaction.toTransaction()

    const transactionData = {
      sender: fastsetTx.sender,
      recipient: fastsetTx.recipient,
      nonce: fastsetTx.nonce,
      timestamp_nanos: fastsetTx.timestamp_nanos,
      claim: fastsetTx.claim,
    }

    const signature = tx.signature
      ? new Uint8Array(Buffer.from(tx.signature, 'hex'))
      : await ed.sign(this.serializeTransaction(transactionData), this.wallet.getPrivateKey())

    return await this.client.submitTransaction(transactionData, signature)
  }

  create(mnemonic: string): WarpWalletDetails {
    const wallet = new Wallet(mnemonic)
    return { address: wallet.toBech32(), privateKey: Buffer.from(wallet.getPrivateKey()).toString('hex'), mnemonic }
  }

  generate(): WarpWalletDetails {
    const privateKey = ed.utils.randomPrivateKey()
    const wallet = new Wallet(Buffer.from(privateKey).toString('hex'))
    return { address: wallet.toBech32(), privateKey: Buffer.from(privateKey).toString('hex'), mnemonic: null }
  }

  getAddress(): string | null {
    return getWarpWalletAddressFromConfig(this.config, this.chain.name)
  }

  private serializeTransaction(tx: any): Uint8Array {
    const serialized = JSON.stringify(tx, (k, v) => (v instanceof Uint8Array ? Array.from(v) : v))
    return new TextEncoder().encode(serialized)
  }
}
