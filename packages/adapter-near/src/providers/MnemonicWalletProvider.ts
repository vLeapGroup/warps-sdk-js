import { WalletProvider, WarpWalletDetails, WarpWalletProvider } from '@vleap/warps'
import { keyToImplicitAddress } from '@near-js/crypto'
import * as bip39 from '@scure/bip39'
import { wordlist } from '@scure/bip39/wordlists/english.js'
import { getWarpWalletAddressFromConfig, getWarpWalletMnemonicFromConfig, WarpChainInfo, WarpClientConfig } from '@vleap/warps'
import bs58 from 'bs58'
import { KeyPair } from 'near-api-js'

export class MnemonicWalletProvider implements WalletProvider {
  static readonly PROVIDER_NAME: WarpWalletProvider = 'mnemonic'
  private keypair: KeyPair | null = null

  constructor(
    private config: WarpClientConfig,
    private chain: WarpChainInfo
  ) {}

  async getAddress(): Promise<string | null> {
    const address = getWarpWalletAddressFromConfig(this.config, this.chain.name)
    if (address) return address

    try {
      const keypair = this.getKeyPair()
      const publicKey = keypair.getPublicKey()
      return keyToImplicitAddress(publicKey.toString())
    } catch {
      return null
    }
  }

  async getPublicKey(): Promise<string | null> {
    try {
      const keypair = this.getKeyPair()
      const publicKey = keypair.getPublicKey()
      return publicKey.toString()
    } catch {
      return null
    }
  }

  async signTransaction(tx: any): Promise<any> {
    const keypair = this.getKeyPair()
    // Near transactions are signed via the account, not the keypair directly
    return tx
  }

  async signMessage(message: string): Promise<string> {
    const keypair = this.getKeyPair()
    const messageBytes = new TextEncoder().encode(message)
    const signature = keypair.sign(messageBytes)
    return bs58.encode(signature.signature)
  }

  getKeyPairInstance(): KeyPair {
    return this.getKeyPair()
  }

  create(mnemonic: string): WarpWalletDetails {
    const seed = bip39.mnemonicToSeedSync(mnemonic)
    const secretKey = seed.slice(0, 32)
    const keyPair = KeyPair.fromString(bs58.encode(secretKey))
    const publicKey = keyPair.getPublicKey()
    const accountId = keyToImplicitAddress(publicKey.toString())
    return {
      provider: MnemonicWalletProvider.PROVIDER_NAME,
      address: accountId,
      privateKey: null,
      mnemonic,
    }
  }

  generate(): WarpWalletDetails {
    const mnemonic = bip39.generateMnemonic(wordlist)
    const seed = bip39.mnemonicToSeedSync(mnemonic)
    const secretKey = seed.slice(0, 32)
    const keyPair = KeyPair.fromString(bs58.encode(secretKey))
    const publicKey = keyPair.getPublicKey()
    const accountId = keyToImplicitAddress(publicKey.toString())
    return {
      provider: MnemonicWalletProvider.PROVIDER_NAME,
      address: accountId,
      privateKey: null,
      mnemonic,
    }
  }

  private getKeyPair(): KeyPair {
    if (this.keypair) return this.keypair

    const mnemonic = getWarpWalletMnemonicFromConfig(this.config, this.chain.name)
    if (!mnemonic) throw new Error('No mnemonic provided')

    const seed = bip39.mnemonicToSeedSync(mnemonic)
    const secretKey = seed.slice(0, 32)
    this.keypair = KeyPair.fromString(bs58.encode(secretKey))
    return this.keypair
  }
}
