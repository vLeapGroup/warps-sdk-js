import * as bip39 from '@scure/bip39'
import { wordlist } from '@scure/bip39/wordlists/english'
import { WalletProvider, WarpWalletDetails, WarpWalletProvider } from '@vleap/warps'
import { getWarpWalletMnemonicFromConfig, WarpChainInfo, WarpClientConfig } from '@vleap/warps'
import { uint8ArrayToHex } from '../helpers'
import { FastsetClient } from '../sdk'
import { ed } from '../sdk/ed25519-setup'
import { Transaction } from '../sdk/types'

export class MnemonicWalletProvider implements WalletProvider {
  static readonly PROVIDER_NAME: WarpWalletProvider = 'mnemonic'
  private privateKey: Uint8Array | null = null

  constructor(
    private config: WarpClientConfig,
    private chain: WarpChainInfo
  ) {}

  async getAddress(): Promise<string | null> {
    try {
      const privateKey = this.getPrivateKey()
      const publicKey = ed.getPublicKey(privateKey)
      return FastsetClient.encodeBech32Address(publicKey)
    } catch {
      return null
    }
  }

  async getPublicKey(): Promise<string | null> {
    try {
      const privateKey = this.getPrivateKey()
      const publicKey = ed.getPublicKey(privateKey)
      return uint8ArrayToHex(publicKey)
    } catch {
      return null
    }
  }

  async signTransaction(tx: any): Promise<any> {
    const privateKey = this.getPrivateKey()
    const msg = Transaction.serialize(tx)
    const msgBytes = msg.toBytes()
    const prefix = new TextEncoder().encode('Transaction::')
    const dataToSign = new Uint8Array(prefix.length + msgBytes.length)
    dataToSign.set(prefix, 0)
    dataToSign.set(msgBytes, prefix.length)
    const signature = ed.sign(dataToSign, privateKey)
    return { ...tx, signature }
  }

  async signMessage(message: string): Promise<string> {
    const privateKey = this.getPrivateKey()
    const messageBytes = new TextEncoder().encode(message)
    const signature = ed.sign(messageBytes, privateKey)
    return uint8ArrayToHex(signature)
  }

  create(mnemonic: string): WarpWalletDetails {
    const seed = bip39.mnemonicToSeedSync(mnemonic)
    const privateKey = seed.slice(0, 32)
    const publicKey = ed.getPublicKey(privateKey)
    const address = FastsetClient.encodeBech32Address(publicKey)
    return {
      provider: MnemonicWalletProvider.PROVIDER_NAME,
      address,
      privateKey: null,
      mnemonic,
    }
  }

  generate(): WarpWalletDetails {
    const mnemonic = bip39.generateMnemonic(wordlist)
    const seed = bip39.mnemonicToSeedSync(mnemonic)
    const privateKey = seed.slice(0, 32)
    const publicKey = ed.getPublicKey(privateKey)
    const address = FastsetClient.encodeBech32Address(publicKey)
    return {
      provider: MnemonicWalletProvider.PROVIDER_NAME,
      address,
      privateKey: null,
      mnemonic,
    }
  }

  private getPrivateKey(): Uint8Array {
    if (this.privateKey) return this.privateKey

    const mnemonic = getWarpWalletMnemonicFromConfig(this.config, this.chain.name)
    if (!mnemonic) throw new Error('No mnemonic provided')

    const seed = bip39.mnemonicToSeedSync(mnemonic)
    this.privateKey = seed.slice(0, 32)
    return this.privateKey
  }
}
