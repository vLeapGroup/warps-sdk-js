import { SuiClient } from '@mysten/sui/client'
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519'

import {
  AdapterWarpWallet,
  getWarpWalletAddressFromConfig,
  getWarpWalletPrivateKeyFromConfig,
  WarpAdapterGenericTransaction,
  WarpChainInfo,
  WarpClientConfig,
  WarpWalletDetails,
} from '@vleap/warps'
import { getConfiguredSuiClient } from './helpers'

export class WarpSuiWallet implements AdapterWarpWallet {
  private client: SuiClient

  constructor(
    private config: WarpClientConfig,
    private chain: WarpChainInfo
  ) {
    this.client = getConfiguredSuiClient(config, chain)
  }

  async signTransaction(tx: WarpAdapterGenericTransaction): Promise<WarpAdapterGenericTransaction> {
    if (!tx || typeof tx !== 'object') throw new Error('Invalid transaction object')

    const keypair = this.getKeypairFromConfig()
    const txBytes = new TextEncoder().encode(JSON.stringify(tx))
    const signature = await keypair.signPersonalMessage(txBytes)

    return { ...tx, signature: signature.signature }
  }

  async signMessage(message: string): Promise<string> {
    const keypair = this.getKeypairFromConfig()
    const messageBytes = new TextEncoder().encode(message)
    const signature = await keypair.signPersonalMessage(messageBytes)
    return signature.signature
  }

  async signTransactions(txs: WarpAdapterGenericTransaction[]): Promise<WarpAdapterGenericTransaction[]> {
    return Promise.all(txs.map(async (tx) => this.signTransaction(tx)))
  }

  async sendTransaction(tx: WarpAdapterGenericTransaction): Promise<string> {
    if (!tx || typeof tx !== 'object') throw new Error('Invalid transaction object')
    if (!tx.signature) throw new Error('Transaction must be signed before sending')

    const result = await this.client.signAndExecuteTransaction({
      transaction: tx,
      signer: this.getKeypairFromConfig(),
    })

    return result.digest
  }

  async sendTransactions(txs: WarpAdapterGenericTransaction[]): Promise<string[]> {
    return Promise.all(txs.map(async (tx) => this.sendTransaction(tx)))
  }

  create(mnemonic: string): WarpWalletDetails {
    const keypair = Ed25519Keypair.deriveKeypair(mnemonic.trim())
    const address = keypair.getPublicKey().toSuiAddress()
    const privateKey = Buffer.from(keypair.getSecretKey()).toString('hex')
    return { address, privateKey, mnemonic }
  }

  generate(): WarpWalletDetails {
    const keypair = Ed25519Keypair.generate()
    const address = keypair.getPublicKey().toSuiAddress()
    const privateKey = Buffer.from(keypair.getSecretKey()).toString('hex')
    return { address, privateKey, mnemonic: null }
  }

  getAddress(): string | null {
    return getWarpWalletAddressFromConfig(this.config, this.chain.name)
  }

  private getKeypairFromConfig(): Ed25519Keypair {
    const privateKey = getWarpWalletPrivateKeyFromConfig(this.config, this.chain.name)
    if (!privateKey) throw new Error('Wallet not initialized - no private key provided')

    try {
      const privateKeyBytes = Buffer.from(privateKey, 'hex')

      // The Sui SDK format includes metadata, we need to extract the 32-byte secret key
      // The format is: sui_privkey_1 + 32-byte secret key + additional metadata
      // We need just the 32-byte secret key part
      if (privateKeyBytes.length === 70) {
        // Extract the 32-byte secret key from the middle of the 70-byte format
        // The format is typically: magic(3) + version(1) + key_type(1) + secret_key(32) + checksum(33)
        const secretKey32 = privateKeyBytes.subarray(1, 33) // Skip magic byte, take 32 bytes
        return Ed25519Keypair.fromSecretKey(secretKey32)
      } else if (privateKeyBytes.length === 32) {
        // If it's already 32 bytes, use it directly
        return Ed25519Keypair.fromSecretKey(privateKeyBytes)
      } else {
        throw new Error(`Unsupported private key length: ${privateKeyBytes.length} bytes`)
      }
    } catch (error) {
      throw error
    }
  }
}
