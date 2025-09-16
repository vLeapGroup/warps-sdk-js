import * as bip39 from '@scure/bip39'
import {
  AdapterWarpWallet,
  getProviderUrl,
  getWarpWalletAddressFromConfig,
  getWarpWalletPrivateKeyFromConfig,
  WarpAdapterGenericTransaction,
  WarpChainInfo,
  WarpClientConfig,
  WarpWalletDetails,
} from '@vleap/warps'
import { stringToUint8Array, uint8ArrayToHex } from './helpers'
import { getConfiguredFastsetClient } from './helpers/general'
import { FastsetClient } from './sdk'
import { ed } from './sdk/ed25519-setup'
import { Transaction } from './sdk/types'

export class WarpFastsetWallet implements AdapterWarpWallet {
  private client: FastsetClient
  private privateKey: string

  constructor(
    private config: WarpClientConfig,
    private chain: WarpChainInfo
  ) {
    this.client = getConfiguredFastsetClient(this.config, this.chain)

    const privateKey = getWarpWalletPrivateKeyFromConfig(this.config, this.chain.name)
    if (!privateKey) throw new Error('Wallet not initialized - no private key provided')
    this.privateKey = privateKey
  }

  async signTransaction(tx: WarpAdapterGenericTransaction): Promise<WarpAdapterGenericTransaction> {
    const msg = Transaction.serialize(tx)
    const msgBytes = msg.toBytes()
    const prefix = new TextEncoder().encode('Transaction::')
    const dataToSign = new Uint8Array(prefix.length + msgBytes.length)
    dataToSign.set(prefix, 0)
    dataToSign.set(msgBytes, prefix.length)
    const signature = ed.sign(dataToSign, this.privateKey)
    return { ...tx, signature: uint8ArrayToHex(signature) }
  }

  async signMessage(message: string): Promise<string> {
    const messageBytes = stringToUint8Array(message)
    const signature = ed.sign(messageBytes, this.privateKey)
    return uint8ArrayToHex(signature)
  }

  async sendTransaction(tx: WarpAdapterGenericTransaction): Promise<string> {
    // Convert hex signature back to Uint8Array for the JSON-RPC request
    const signatureBytes = stringToUint8Array(tx.signature as string)

    // Create transaction object without signature (signature is sent separately)
    const { signature, ...transactionWithoutSignature } = tx

    const submitTxReq = {
      transaction: transactionWithoutSignature,
      signature: signatureBytes,
    }

    const proxyUrl = getProviderUrl(this.config, this.chain.name, this.config.env, this.chain.defaultApiUrl)
    const response = await this.client.request(proxyUrl, 'set_proxy_submitTransaction', submitTxReq)

    if (response.error) throw new Error(`JSON-RPC error ${response.error.code}: ${response.error.message}`)
    console.log('submitTransaction response', response.result)
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
    const privateKey = ed.utils.randomPrivateKey()
    const publicKey = ed.getPublicKey(privateKey)
    const address = FastsetClient.encodeBech32Address(publicKey)
    return { address, privateKey: uint8ArrayToHex(privateKey), mnemonic: null }
  }

  getAddress(): string | null {
    return getWarpWalletAddressFromConfig(this.config, this.chain.name)
  }
}
