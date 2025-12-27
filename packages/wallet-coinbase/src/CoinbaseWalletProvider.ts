import {
  getWarpWalletAddressFromConfig,
  WalletProvider,
  WarpChainInfo,
  WarpClientConfig,
  WarpWalletDetails,
  WarpWalletProvider,
} from '@vleap/warps'
import { CdpClient } from '@coinbase/cdp-sdk'
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


  private isEvmChain(): boolean {
    return this.chain.addressHrp === '0x'
  }

  private async getAccount(): Promise<{ id: string; address: string; publicKey?: string }> {
    if (this.cachedAccount) {
      return this.cachedAccount
    }

    const address = getWarpWalletAddressFromConfig(this.config, this.chain.name)
    if (!address) {
      throw new Error(`CoinbaseWalletProvider: Wallet address not found in config for chain ${this.chain.name}`)
    }

    if (this.isEvmChain()) {
      const account = await this.client.evm.getAccount({ address: address as `0x${string}` })
      this.cachedAccount = {
        id: account.address,
        address: account.address,
      }
    } else {
      const account = await this.client.solana.getAccount({ address })
      this.cachedAccount = {
        id: account.address,
        address: account.address,
      }
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

      if (this.isEvmChain()) {
        const evmAccount = await this.client.evm.getAccount({ address: account.id as `0x${string}` })
        const txRequest: any = {
          to: tx.to,
          data: tx.data || '0x',
          value: tx.value || 0n,
          gasLimit: tx.gasLimit,
          nonce: tx.nonce,
          chainId: tx.chainId,
        }

        if (tx.maxFeePerGas && tx.maxPriorityFeePerGas) {
          txRequest.maxFeePerGas = tx.maxFeePerGas
          txRequest.maxPriorityFeePerGas = tx.maxPriorityFeePerGas
          txRequest.type = 'eip1559'
        } else if (tx.gasPrice) {
          txRequest.gasPrice = tx.gasPrice
          txRequest.type = 'legacy'
        }

        const signedTx = await evmAccount.signTransaction(txRequest)
        return { ...tx, signature: signedTx }
      } else {
        const result = await this.client.solana.signTransaction({
          address: account.id,
          transaction: tx as any,
        })

        if ('signedTransaction' in result && result.signedTransaction) {
          return { ...tx, signature: result.signedTransaction }
        }
      }

      throw new Error('Coinbase API did not return signed transaction')
    } catch (error) {
      throw new Error(`CoinbaseWalletProvider: Failed to sign transaction: ${error}`)
    }
  }

  async signMessage(message: string): Promise<string> {
    try {
      const account = await this.getAccount()
      const result = this.isEvmChain()
        ? await this.client.evm.signMessage({
            address: account.id as `0x${string}`,
            message,
          })
        : await this.client.solana.signMessage({
            address: account.id,
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

  async create(mnemonic: string): Promise<WarpWalletDetails> {
    throw new Error(
      'CoinbaseWalletProvider: create() with mnemonic is not supported. Use generate() to create a new account via Coinbase API.'
    )
  }

  async generate(): Promise<WarpWalletDetails> {
    try {
      const account = this.isEvmChain()
        ? await this.client.evm.createAccount()
        : await this.client.solana.createAccount()

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
