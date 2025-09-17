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

  async sendTransaction(tx: WarpAdapterGenericTransaction): Promise<string> {
    const { signature, ...transactionWithoutSignature } = tx
    const _cert = await this.client.submitTransaction(transactionWithoutSignature, signature)

    return 'TODO'
  }

  create(mnemonic: string): WarpWalletDetails {
    const seed = bip39.mnemonicToSeedSync(mnemonic)
    const privateKey = seed.slice(0, 32) // Use first 32 bytes of seed as private key
    const publicKey = ed.getPublicKey(privateKey)
    const address = FastsetClient.encodeBech32Address(publicKey)
    return { address, privateKey: uint8ArrayToHex(privateKey), mnemonic }
  }

  generate(): WarpWalletDetails {
    // @ts-ignore
    const privateKey = ed.utils.randomPrivateKey()
    const publicKey = ed.getPublicKey(privateKey)
    const address = FastsetClient.encodeBech32Address(publicKey)
    return { address, privateKey: uint8ArrayToHex(privateKey), mnemonic: null }
  }

  getAddress(): string | null {
    return getWarpWalletAddressFromConfig(this.config, this.chain.name)
  }
}
