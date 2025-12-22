import { Account, Message, Mnemonic, Transaction } from '@multiversx/sdk-core'
import {
  getWarpWalletAddressFromConfig,
  getWarpWalletMnemonicFromConfig,
  WalletProvider,
  WarpChainInfo,
  WarpClientConfig,
  WarpWalletDetails,
} from '@vleap/warps'

export class MnemonicWalletProvider implements WalletProvider {
  private account: Account | null = null

  constructor(
    private config: WarpClientConfig,
    private chain: WarpChainInfo
  ) {}

  async getAddress(): Promise<string | null> {
    const address = getWarpWalletAddressFromConfig(this.config, this.chain.name)
    if (address) return address

    try {
      const account = this.getAccount()
      return account.address.toBech32()
    } catch {
      return null
    }
  }

  async getPublicKey(): Promise<string | null> {
    try {
      const account = this.getAccount()
      const pubKey = account.publicKey
      return pubKey.hex()
    } catch {
      return null
    }
  }

  async signTransaction(tx: Transaction): Promise<Transaction> {
    const account = this.getAccount()
    // signTransaction signs the transaction in place and returns the signature
    await account.signTransaction(tx)
    return tx
  }

  async signMessage(message: string): Promise<string> {
    const account = this.getAccount()
    const messageData = new TextEncoder().encode(message)
    const signature = await account.signMessage(new Message({ data: messageData }))
    return Buffer.from(signature).toString('hex')
  }

  getAccountInstance(): Account {
    return this.getAccount()
  }

  create(mnemonic: string): WarpWalletDetails {
    const mnemonicObj = Mnemonic.fromString(mnemonic)
    const privateKey = mnemonicObj.deriveKey(0)
    const privateKeyHex = privateKey.hex()
    const pubKey = privateKey.generatePublicKey()
    const address = pubKey.toAddress(this.chain.addressHrp).toBech32()
    return {
      provider: 'mnemonic',
      address,
      privateKey: privateKeyHex,
      mnemonic,
    }
  }

  generate(): WarpWalletDetails {
    const mnemonic = Mnemonic.generate()
    const mnemonicWords = mnemonic.toString()
    const privateKey = mnemonic.deriveKey(0)
    const privateKeyHex = privateKey.hex()
    const pubKey = privateKey.generatePublicKey()
    const address = pubKey.toAddress(this.chain.addressHrp).toBech32()
    return {
      provider: 'mnemonic',
      address,
      privateKey: privateKeyHex,
      mnemonic: mnemonicWords,
    }
  }

  private getAccount(): Account {
    if (this.account) return this.account

    const mnemonic = getWarpWalletMnemonicFromConfig(this.config, this.chain.name)
    if (!mnemonic) throw new Error('No mnemonic provided')

    const mnemonicObj = Mnemonic.fromString(mnemonic)
    const secretKey = mnemonicObj.deriveKey(0)
    this.account = new Account(secretKey)
    return this.account
  }
}
