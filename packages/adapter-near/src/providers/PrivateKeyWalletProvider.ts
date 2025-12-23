import { WalletProvider, WarpWalletDetails, WarpWalletProvider } from '@vleap/warps'
import { keyToImplicitAddress } from '@near-js/crypto'
import { getWarpWalletAddressFromConfig, getWarpWalletPrivateKeyFromConfig, WarpChainInfo, WarpClientConfig } from '@vleap/warps'
import bs58 from 'bs58'
import { KeyPair } from 'near-api-js'

export class PrivateKeyWalletProvider implements WalletProvider {
  static readonly PROVIDER_NAME: WarpWalletProvider = 'privateKey'
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
    throw new Error('PrivateKeyWalletProvider does not support creating wallets from mnemonics. Use MnemonicWalletProvider instead.')
  }

  generate(): WarpWalletDetails {
    const keyPair = KeyPair.fromRandom('ed25519')
    const publicKey = keyPair.getPublicKey()
    const accountId = keyToImplicitAddress(publicKey.toString())
    return {
      provider: PrivateKeyWalletProvider.PROVIDER_NAME,
      address: accountId,
      privateKey: keyPair.toString(),
      mnemonic: null,
    }
  }

  private getKeyPair(): KeyPair {
    if (this.keypair) return this.keypair

    const privateKey = getWarpWalletPrivateKeyFromConfig(this.config, this.chain.name)
    if (!privateKey) throw new Error('No private key provided')

    try {
      return KeyPair.fromString(privateKey as any)
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Invalid private key format: ${error.message}`)
      }
      throw new Error('Invalid private key format')
    }
  }
}
