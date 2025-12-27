import { CdpClient } from '@coinbase/cdp-sdk'
import {
  getWarpWalletAddressFromConfig,
  setWarpWalletInConfig,
  WalletProvider,
  WarpChainInfo,
  WarpClientConfig,
  WarpWalletDetails,
  WarpWalletProvider,
} from '@vleap/warps'
import { CoinbaseProviderConfig } from './types'

export class CoinbaseWalletProvider implements WalletProvider {
  static readonly PROVIDER_NAME: WarpWalletProvider = 'coinbase'
  private readonly client: CdpClient
  private cachedAccount: { id: string; address: string; publicKey?: string } | null = null

  constructor(
    private readonly config: WarpClientConfig,
    private readonly chain: WarpChainInfo,
    private readonly coinbaseConfig: CoinbaseProviderConfig
  ) {
    this.client = new CdpClient({
      apiKeyId: coinbaseConfig.apiKeyId,
      apiKeySecret: coinbaseConfig.apiKeySecret,
      walletSecret: coinbaseConfig.walletSecret,
      ...(coinbaseConfig.apiUrl && { apiUrl: coinbaseConfig.apiUrl }),
    })
  }

  private isSolanaChain(): boolean {
    return this.chain.name === 'solana'
  }

  private cachedEvmAccount: any = null
  private cachedSolanaAccount: any = null

  private async getAccount(): Promise<{ id: string; address: string; publicKey?: string }> {
    if (this.cachedAccount) {
      return this.cachedAccount
    }

    const address = getWarpWalletAddressFromConfig(this.config, this.chain.name)
    if (!address) {
      throw new Error(`CoinbaseWalletProvider: Wallet address not found in config for chain ${this.chain.name}`)
    }

    if (this.isSolanaChain()) {
      const account = await this.client.solana.getAccount({ address })
      this.cachedAccount = {
        id: account.address,
        address: account.address,
      }
      this.cachedSolanaAccount = account
    } else {
      const account = await this.client.evm.getAccount({ address: address as `0x${string}` })
      this.cachedAccount = {
        id: account.address,
        address: account.address,
      }
      this.cachedEvmAccount = account
    }

    return this.cachedAccount
  }

  async getAddress(): Promise<string | null> {
    try {
      const account = await this.getAccount()
      return account.address
    } catch (error) {
      console.error('CoinbaseWalletProvider: Failed to get address', error)
      return null
    }
  }

  async getPublicKey(): Promise<string | null> {
    try {
      const account = await this.getAccount()
      return account.publicKey || null
    } catch (error) {
      console.error('CoinbaseWalletProvider: Failed to get public key', error)
      return null
    }
  }

  async signTransaction(tx: any): Promise<any> {
    try {
      const account = await this.getAccount()

      if (this.isSolanaChain()) {
        const result = await this.client.solana.signTransaction({
          address: account.id,
          transaction: tx as any,
        })

        if ('signedTransaction' in result && result.signedTransaction) {
          return { ...tx, signature: result.signedTransaction }
        }
      } else {
        const address = getWarpWalletAddressFromConfig(this.config, this.chain.name)
        if (!address) {
          throw new Error(`CoinbaseWalletProvider: Wallet address not found in config for chain ${this.chain.name}`)
        }

        if (!this.cachedEvmAccount) {
          this.cachedEvmAccount = await this.client.evm.getAccount({ address: address as `0x${string}` })
        }

        const account = this.cachedEvmAccount as any
        const signedTx = await account.signTransaction(tx)
        return { ...tx, signature: signedTx }
      }

      throw new Error('Coinbase API did not return signed transaction')
    } catch (error: any) {
      if (error?.message?.includes('signTransaction is not a function')) {
        throw new Error(`CoinbaseWalletProvider: Account object missing signTransaction method. This may be a SDK version issue.`)
      }
      throw new Error(`CoinbaseWalletProvider: Failed to sign transaction: ${error}`)
    }
  }

  async signMessage(message: string): Promise<string> {
    try {
      const account = await this.getAccount()
      const result = this.isSolanaChain()
        ? await this.client.solana.signMessage({
            address: account.id,
            message,
          })
        : await this.client.evm.signMessage({
            address: account.id as `0x${string}`,
            message,
          })

      if ('signedMessage' in result && result.signedMessage) {
        return String(result.signedMessage)
      }

      throw new Error('Coinbase API did not return signed message')
    } catch (error) {
      throw new Error(`CoinbaseWalletProvider: Failed to sign message: ${error}`)
    }
  }

  async importFromMnemonic(mnemonic: string): Promise<WarpWalletDetails> {
    throw new Error(
      'CoinbaseWalletProvider: importFromMnemonic() is not supported. Use generate() to create a new account via Coinbase API.'
    )
  }

  async importFromPrivateKey(privateKey: string): Promise<WarpWalletDetails> {
    try {
      let account: { address: string; id?: string }

      if (this.isSolanaChain()) {
        account = await this.client.solana.importAccount({
          privateKey: privateKey,
          name: `ImportedAccount-${Date.now()}`,
        })
      } else {
        account = await this.client.evm.importAccount({
          privateKey: privateKey as `0x${string}`,
          name: `ImportedAccount-${Date.now()}`,
        })
      }

      const walletDetails: WarpWalletDetails = {
        provider: CoinbaseWalletProvider.PROVIDER_NAME,
        address: account.address,
        privateKey: privateKey,
        mnemonic: null,
        externalId: account.id || null,
      }

      setWarpWalletInConfig(this.config, this.chain.name, walletDetails)

      return walletDetails
    } catch (error) {
      throw new Error(`CoinbaseWalletProvider: Failed to import account from private key: ${error}`)
    }
  }

  async export(): Promise<WarpWalletDetails> {
    try {
      const address = getWarpWalletAddressFromConfig(this.config, this.chain.name)
      if (!address) {
        throw new Error(`CoinbaseWalletProvider: Wallet address not found in config for chain ${this.chain.name}`)
      }

      let privateKey: string
      if (this.isSolanaChain()) {
        privateKey = await this.client.solana.exportAccount({ address })
      } else {
        privateKey = await this.client.evm.exportAccount({ address: address as `0x${string}` })
      }

      return {
        provider: CoinbaseWalletProvider.PROVIDER_NAME,
        address,
        privateKey,
        mnemonic: null,
        externalId: null,
      }
    } catch (error) {
      throw new Error(`CoinbaseWalletProvider: Failed to export account: ${error}`)
    }
  }

  async generate(): Promise<WarpWalletDetails> {
    try {
      const account = this.isSolanaChain() ? await this.client.solana.createAccount() : await this.client.evm.createAccount()

      return {
        provider: CoinbaseWalletProvider.PROVIDER_NAME,
        address: account.address,
        externalId: null,
        mnemonic: null,
        privateKey: null,
      }
    } catch (error) {
      throw new Error(`CoinbaseWalletProvider: Failed to generate account: ${error}`)
    }
  }
}
