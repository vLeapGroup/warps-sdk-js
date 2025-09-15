import * as bip39 from '@scure/bip39'
import {
  AdapterWarpWallet,
  getWarpWalletAddressFromConfig,
  getWarpWalletPrivateKeyFromConfig,
  WarpAdapterGenericTransaction,
  WarpChainInfo,
  WarpClientConfig,
  WarpWalletDetails,
} from '@vleap/warps'
import { encoder, hexToUint8Array, stringToUint8Array, uint8ArrayToHex } from './helpers'
import { getConfiguredFastsetClient } from './helpers/general'
import { FastsetClient, Transaction, Wallet } from './sdk'
import { ed } from './sdk/ed25519-setup'

export class WarpFastsetWallet implements AdapterWarpWallet {
  private wallet: Wallet | null = null
  private client: FastsetClient

  constructor(
    private config: WarpClientConfig,
    private chain: WarpChainInfo
  ) {
    const privateKey = getWarpWalletPrivateKeyFromConfig(this.config, this.chain.name)
    if (privateKey) {
      this.wallet = new Wallet(privateKey)
    }
    this.client = getConfiguredFastsetClient(this.config, this.chain)
  }

  async signTransaction(tx: WarpAdapterGenericTransaction): Promise<WarpAdapterGenericTransaction> {
    if (!this.wallet) throw new Error('Wallet not initialized')
    const transaction = tx as Transaction
    const serializedTx = this.serializeTransaction(transaction.toTransaction())
    const signature = await ed.sign(serializedTx, this.wallet.getPrivateKey())
    return Object.assign(transaction, { signature: uint8ArrayToHex(signature) })
  }

  async signMessage(message: string): Promise<string> {
    if (!this.wallet) throw new Error('Wallet not initialized')
    const messageBytes = stringToUint8Array(message)
    const signature = await ed.sign(messageBytes, this.wallet.getPrivateKey())
    return uint8ArrayToHex(signature)
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
      ? hexToUint8Array(tx.signature)
      : await ed.sign(this.serializeTransaction(transactionData), this.wallet.getPrivateKey())

    return await this.client.submitTransaction(transactionData, signature)
  }

  create(mnemonic: string): WarpWalletDetails {
    const seed = bip39.mnemonicToSeedSync(mnemonic)
    const privateKey = seed.slice(0, 32) // Use first 32 bytes of seed as private key
    const wallet = new Wallet(uint8ArrayToHex(privateKey))
    return { address: wallet.toBech32(), privateKey: uint8ArrayToHex(wallet.getPrivateKey()), mnemonic }
  }

  generate(): WarpWalletDetails {
    const privateKey = ed.utils.randomPrivateKey()
    const wallet = new Wallet(uint8ArrayToHex(privateKey))
    return { address: wallet.toBech32(), privateKey: uint8ArrayToHex(wallet.getPrivateKey()), mnemonic: null }
  }

  getAddress(): string | null {
    return getWarpWalletAddressFromConfig(this.config, this.chain.name)
  }

  private serializeTransaction(tx: any): Uint8Array {
    const serialized = JSON.stringify(tx, (k, v) => {
      if (v instanceof Uint8Array) return Array.from(v)
      if (typeof v === 'bigint') return v.toString()
      return v
    })
    return encoder.encode(serialized)
  }
}
