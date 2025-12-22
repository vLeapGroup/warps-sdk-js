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
import { hexToUint8Array, stringToUint8Array, uint8ArrayToHex } from './helpers'
import { getConfiguredFastsetClient } from './helpers/general'
import { FastsetClient } from './sdk'
import { ed } from './sdk/ed25519-setup'
import { Transaction } from './sdk/types'

export class WarpFastsetWallet implements AdapterWarpWallet {
  private client: FastsetClient

  constructor(
    private config: WarpClientConfig,
    private chain: WarpChainInfo
  ) {
    this.client = getConfiguredFastsetClient(this.config, this.chain)
  }

  async signTransaction(tx: WarpAdapterGenericTransaction): Promise<WarpAdapterGenericTransaction> {
    const msg = Transaction.serialize(tx)
    const msgBytes = msg.toBytes()
    const prefix = new TextEncoder().encode('Transaction::')
    const dataToSign = new Uint8Array(prefix.length + msgBytes.length)
    dataToSign.set(prefix, 0)
    dataToSign.set(msgBytes, prefix.length)
    const privateKey = getWarpWalletPrivateKeyFromConfig(this.config, this.chain.name)
    if (!privateKey) throw new Error('Wallet not initialized - no private key provided')
    const privateKeyBytes = hexToUint8Array(privateKey)
    const signature = ed.sign(dataToSign, privateKeyBytes)
    return { ...tx, signature }
  }

  async signMessage(message: string): Promise<string> {
    const messageBytes = stringToUint8Array(message)
    const privateKey = getWarpWalletPrivateKeyFromConfig(this.config, this.chain.name)
    if (!privateKey) throw new Error('Wallet not initialized - no private key provided')
    const privateKeyBytes = hexToUint8Array(privateKey)
    const signature = ed.sign(messageBytes, privateKeyBytes)
    return uint8ArrayToHex(signature)
  }

  async signTransactions(txs: WarpAdapterGenericTransaction[]): Promise<WarpAdapterGenericTransaction[]> {
    return Promise.all(txs.map(async (tx) => this.signTransaction(tx)))
  }

  async sendTransaction(tx: WarpAdapterGenericTransaction): Promise<string> {
    const { signature, ...transactionWithoutSignature } = tx
    const _cert = await this.client.submitTransaction(transactionWithoutSignature, signature ?? null)

    return 'TODO'
  }

  async sendTransactions(txs: WarpAdapterGenericTransaction[]): Promise<string[]> {
    return Promise.all(txs.map(async (tx) => this.sendTransaction(tx)))
  }

  create(mnemonic: string): WarpWalletDetails {
    const seed = bip39.mnemonicToSeedSync(mnemonic)
    const privateKey = seed.slice(0, 32) // Use first 32 bytes of seed as private key
    const publicKey = ed.getPublicKey(privateKey)
    const address = FastsetClient.encodeBech32Address(publicKey)
    return { provider: 'privateKey', address, privateKey: uint8ArrayToHex(privateKey), mnemonic }
  }

  generate(): WarpWalletDetails {
    const privateKey = ed.utils.randomSecretKey()
    const publicKey = ed.getPublicKey(privateKey)
    const address = FastsetClient.encodeBech32Address(publicKey)
    return { provider: 'privateKey', address, privateKey: uint8ArrayToHex(privateKey), mnemonic: null }
  }

  getAddress(): string | null {
    return getWarpWalletAddressFromConfig(this.config, this.chain.name)
  }

  getPublicKey(): string | null {
    const privateKey = getWarpWalletPrivateKeyFromConfig(this.config, this.chain.name)
    if (privateKey) {
      const privateKeyBytes = hexToUint8Array(privateKey)
      const publicKey = ed.getPublicKey(privateKeyBytes)
      return uint8ArrayToHex(publicKey)
    }

    const address = getWarpWalletAddressFromConfig(this.config, this.chain.name)
    if (!address) return null

    try {
      const addressBytes = FastsetClient.decodeBech32Address(address)
      return uint8ArrayToHex(addressBytes)
    } catch {
      return null
    }
  }
}
