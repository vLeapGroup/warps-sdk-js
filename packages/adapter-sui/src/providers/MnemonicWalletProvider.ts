import { WalletProvider, WarpWalletDetails, WarpWalletProvider } from '@vleap/warps'
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519'
import { getWarpWalletAddressFromConfig, getWarpWalletMnemonicFromConfig, WarpChainInfo, WarpClientConfig } from '@vleap/warps'
import * as bip39 from '@scure/bip39'
import { wordlist } from '@scure/bip39/wordlists/english.js'

export class MnemonicWalletProvider implements WalletProvider {
  static readonly PROVIDER_NAME: WarpWalletProvider = 'mnemonic'
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

  async create(mnemonic: string): Promise<WarpWalletDetails> {
    const keypair = Ed25519Keypair.deriveKeypair(mnemonic.trim())
    const address = keypair.getPublicKey().toSuiAddress()
    return {
      provider: MnemonicWalletProvider.PROVIDER_NAME,
      address,
      privateKey: null,
      mnemonic,
    }
  }

  async generate(): Promise<WarpWalletDetails> {
    const mnemonic = bip39.generateMnemonic(wordlist)
    const keypair = Ed25519Keypair.deriveKeypair(mnemonic.trim())
    const address = keypair.getPublicKey().toSuiAddress()
    return {
      provider: MnemonicWalletProvider.PROVIDER_NAME,
      address,
      privateKey: null,
      mnemonic,
    }
  }

  private getKeypair(): Ed25519Keypair {
    if (this.keypair) return this.keypair

    const mnemonic = getWarpWalletMnemonicFromConfig(this.config, this.chain.name)
    if (!mnemonic) throw new Error('No mnemonic provided')

    this.keypair = Ed25519Keypair.deriveKeypair(mnemonic.trim())
    return this.keypair
  }
}
