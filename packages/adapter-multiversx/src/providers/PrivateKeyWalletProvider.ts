import { WalletProvider, WarpWalletDetails, WarpWalletProvider } from '@vleap/warps'
import { Account, Message, Mnemonic, Transaction, UserSecretKey } from '@multiversx/sdk-core'
import { getWarpWalletAddressFromConfig, getWarpWalletPrivateKeyFromConfig, WarpChainInfo, WarpClientConfig } from '@vleap/warps'

export class PrivateKeyWalletProvider implements WalletProvider {
  static readonly PROVIDER_NAME: WarpWalletProvider = 'privateKey'
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
      provider: PrivateKeyWalletProvider.PROVIDER_NAME,
      address,
      privateKey: privateKeyHex,
      mnemonic: null,
    }
  }

  generate(): WarpWalletDetails {
    const privateKey = UserSecretKey.generate()
    const privateKeyHex = privateKey.hex()
    const pubKey = privateKey.generatePublicKey()
    const address = pubKey.toAddress(this.chain.addressHrp).toBech32()
    return {
      provider: PrivateKeyWalletProvider.PROVIDER_NAME,
      address,
      privateKey: privateKeyHex,
      mnemonic: null,
    }
  }

  private getAccount(): Account {
    if (this.account) return this.account

    const privateKey = getWarpWalletPrivateKeyFromConfig(this.config, this.chain.name)
    if (!privateKey) throw new Error('No private key provided')

    const isPrivateKeyPem = privateKey.startsWith('-----')
    const secretKey = isPrivateKeyPem ? UserSecretKey.fromPem(privateKey) : UserSecretKey.fromString(privateKey)
    this.account = new Account(secretKey)
    return this.account
  }
}
