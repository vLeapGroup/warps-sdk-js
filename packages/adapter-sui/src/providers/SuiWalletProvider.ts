import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519'
import {
  getWarpWalletAddressFromConfig,
  getWarpWalletPrivateKeyFromConfig,
  WalletProvider,
  WarpChainInfo,
  WarpClientConfig,
  WarpWalletDetails,
  WarpWalletProvider,
} from '@vleap/warps'

export class PrivateKeyWalletProvider implements WalletProvider {
  static readonly PROVIDER_NAME: WarpWalletProvider = 'privateKey'
  private keypair: Ed25519Keypair | null = null

  constructor(
    private config: WarpClientConfig,
    private chain: WarpChainInfo
  ) {}

  async getAddress(): Promise<string | null> {
    return getWarpWalletAddressFromConfig(this.config, this.chain.name)
  }

  async getPublicKey(): Promise<string | null> {
    try {
      const keypair = this.getKeypair()
      const publicKey = keypair.getPublicKey()
      return Buffer.from(publicKey.toRawBytes()).toString('hex')
    } catch {
      return null
    }
  }

  async signTransaction(tx: any): Promise<any> {
    const keypair = this.getKeypair()
    const txBytes = new TextEncoder().encode(JSON.stringify(tx))
    const signature = await keypair.signPersonalMessage(txBytes)
    return { ...tx, signature: signature.signature }
  }

  async signMessage(message: string): Promise<string> {
    const keypair = this.getKeypair()
    const messageBytes = new TextEncoder().encode(message)
    const signature = await keypair.signPersonalMessage(messageBytes)
    return signature.signature
  }

  getKeypairInstance(): Ed25519Keypair {
    return this.getKeypair()
  }

  create(mnemonic: string): WarpWalletDetails {
    throw new Error('PrivateKeyWalletProvider does not support creating wallets from mnemonics. Use MnemonicWalletProvider instead.')
  }

  generate(): WarpWalletDetails {
    const keypair = Ed25519Keypair.generate()
    const address = keypair.getPublicKey().toSuiAddress()
    const privateKey = Buffer.from(keypair.getSecretKey()).toString('hex')
    return {
      provider: PrivateKeyWalletProvider.PROVIDER_NAME,
      address,
      privateKey,
      mnemonic: null,
    }
  }

  private getKeypair(): Ed25519Keypair {
    if (this.keypair) return this.keypair

    const privateKey = getWarpWalletPrivateKeyFromConfig(this.config, this.chain.name)
    if (!privateKey) throw new Error('Wallet not initialized - no private key provided')

    try {
      const privateKeyBytes = Buffer.from(privateKey, 'hex')

      if (privateKeyBytes.length === 70) {
        const secretKey32 = new Uint8Array(privateKeyBytes.subarray(1, 33))
        this.keypair = Ed25519Keypair.fromSecretKey(secretKey32)
        return this.keypair
      } else if (privateKeyBytes.length === 32) {
        this.keypair = Ed25519Keypair.fromSecretKey(new Uint8Array(privateKeyBytes))
        return this.keypair
      } else {
        throw new Error(`Unsupported private key length: ${privateKeyBytes.length} bytes`)
      }
    } catch (error) {
      throw error
    }
  }
}
