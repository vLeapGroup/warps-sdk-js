import { CdpClient } from '@coinbase/cdp-sdk'
import {
  getWarpWalletAddressFromConfig,
  setWarpWalletInConfig,
  WalletProvider,
  WarpAdapterGenericTransaction,
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
  private cachedEvmAccount: { signTransaction: (tx: unknown) => Promise<unknown> } | null = null

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

  async getAddress(): Promise<string | null> {
    try {
      return (await this.getAccount()).address
    } catch (error) {
      console.error('CoinbaseWalletProvider: Failed to get address', error)
      return null
    }
  }

  async getPublicKey(): Promise<string | null> {
    try {
      return (await this.getAccount()).publicKey ?? null
    } catch (error) {
      console.error('CoinbaseWalletProvider: Failed to get public key', error)
      return null
    }
  }

  async signTransaction(tx: WarpAdapterGenericTransaction): Promise<WarpAdapterGenericTransaction> {
    const formatBigInt = (value: bigint | string | number | undefined): string | undefined => {
      if (value === undefined || value === null) return undefined
      if (typeof value === 'bigint') return `0x${value.toString(16)}`
      if (typeof value === 'string' && value.startsWith('0x')) return value
      if (typeof value === 'string') return `0x${BigInt(value).toString(16)}`
      return `0x${BigInt(value).toString(16)}`
    }

    const hasEip1559Fields = tx.maxFeePerGas !== undefined && tx.maxPriorityFeePerGas !== undefined
    const hasLegacyFields = tx.gasPrice !== undefined && !hasEip1559Fields

    const formatted: any = {
      to: tx.to,
      value: formatBigInt(tx.value) || '0x0',
      data: tx.data || '0x',
      chainId: typeof tx.chainId === 'number' ? tx.chainId : parseInt(String(tx.chainId || this.chain.chainId)),
    }

    if (tx.gasLimit) {
      formatted.gas = formatBigInt(tx.gasLimit)
    }

    if (hasEip1559Fields) {
      const maxFee = typeof tx.maxFeePerGas === 'bigint' ? tx.maxFeePerGas : BigInt(formatBigInt(tx.maxFeePerGas)!)
      const maxPriorityFee =
        typeof tx.maxPriorityFeePerGas === 'bigint' ? tx.maxPriorityFeePerGas : BigInt(formatBigInt(tx.maxPriorityFeePerGas)!)
      formatted.maxFeePerGas = formatBigInt(maxFee)!
      const safePriorityFee = maxPriorityFee < maxFee ? maxPriorityFee : maxFee / 10n
      formatted.maxPriorityFeePerGas = formatBigInt(safePriorityFee)!
    } else if (hasLegacyFields) {
      const gasPriceHex = formatBigInt(tx.gasPrice)!
      const gasPrice = typeof tx.gasPrice === 'bigint' ? tx.gasPrice : BigInt(gasPriceHex)
      formatted.maxFeePerGas = gasPriceHex
      const priorityFee = (gasPrice * 9n) / 10n
      formatted.maxPriorityFeePerGas = formatBigInt(priorityFee > 0n ? priorityFee : 1n)!
    } else {
      const defaultMaxFee = BigInt('1000000000')
      formatted.maxFeePerGas = formatBigInt(defaultMaxFee)!
      formatted.maxPriorityFeePerGas = formatBigInt(defaultMaxFee / 10n)!
    }

    if (tx.nonce !== undefined) {
      formatted.nonce = typeof tx.nonce === 'number' ? `0x${tx.nonce.toString(16)}` : formatBigInt(tx.nonce)
    }

    try {
      const account = await this.getAccount()

      if (this.chain.name === 'solana') {
        const result = await this.client.solana.signTransaction({
          address: account.id,
          transaction: tx as never,
        })

        if ('signedTransaction' in result && result.signedTransaction) {
          return { ...(tx as Record<string, unknown>), signature: String(result.signedTransaction) }
        }
        throw new Error('Coinbase API did not return signed transaction')
      }

      if (!this.cachedEvmAccount) {
        const address = this.getWalletAddress()
        const evmAccount = await this.client.evm.getAccount({ address: address as `0x${string}` })
        if (!('signTransaction' in evmAccount)) {
          throw new Error('CoinbaseWalletProvider: Account object missing signTransaction method. This may be a SDK version issue.')
        }
        this.cachedEvmAccount = { signTransaction: evmAccount.signTransaction as (tx: unknown) => Promise<unknown> }
      }

      const formattedTx = this.formatTransactionForCoinbase(tx)
      const signedTx = await this.cachedEvmAccount.signTransaction(formattedTx)
      return { ...(tx as Record<string, unknown>), signature: signedTx }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      if (errorMessage.includes('signTransaction is not a function')) {
        throw new Error('CoinbaseWalletProvider: Account object missing signTransaction method. This may be a SDK version issue.')
      }
      throw new Error(`CoinbaseWalletProvider: Failed to sign transaction: ${error}`)
    }
  }

  async signMessage(message: string): Promise<string> {
    try {
      const account = await this.getAccount()
      const result =
        this.chain.name === 'solana'
          ? await this.client.solana.signMessage({ address: account.id, message })
          : await this.client.evm.signMessage({ address: account.id as `0x${string}`, message })

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
      const name = this.getAccountName()
      const account =
        this.chain.name === 'solana'
          ? await this.client.solana.importAccount({ privateKey, ...(name && { name }) })
          : await this.client.evm.importAccount({ privateKey: privateKey as `0x${string}`, ...(name && { name }) })

      const walletDetails: WarpWalletDetails = {
        provider: CoinbaseWalletProvider.PROVIDER_NAME,
        address: account.address,
        privateKey,
      }

      setWarpWalletInConfig(this.config, this.chain.name, walletDetails)

      return walletDetails
    } catch (error) {
      throw new Error(`CoinbaseWalletProvider: Failed to import account from private key: ${error}`)
    }
  }

  async export(): Promise<WarpWalletDetails> {
    try {
      const address = this.getWalletAddress()
      const privateKey =
        this.chain.name === 'solana'
          ? await this.client.solana.exportAccount({ address })
          : await this.client.evm.exportAccount({ address: address as `0x${string}` })

      return {
        provider: CoinbaseWalletProvider.PROVIDER_NAME,
        address,
        privateKey,
      }
    } catch (error) {
      throw new Error(`CoinbaseWalletProvider: Failed to export account: ${error}`)
    }
  }

  async generate(): Promise<WarpWalletDetails> {
    try {
      const name = this.getAccountName()
      const account =
        this.chain.name === 'solana' ? await this.client.solana.createAccount({ name }) : await this.client.evm.createAccount({ name })

      const walletDetails: WarpWalletDetails = {
        provider: CoinbaseWalletProvider.PROVIDER_NAME,
        address: account.address,
      }

      setWarpWalletInConfig(this.config, this.chain.name, walletDetails)

      return walletDetails
    } catch (error) {
      throw new Error(`CoinbaseWalletProvider: Failed to generate account: ${error}`)
    }
  }

  private getAccountName(): string | undefined {
    return this.config.user?.id ? `${this.config.user.id}-${this.chain.name}` : undefined
  }

  private getWalletAddress(): string {
    const address = getWarpWalletAddressFromConfig(this.config, this.chain.name)
    if (!address) throw new Error(`CoinbaseWalletProvider: Wallet address not found in config for chain ${this.chain.name}`)
    return address
  }

  private extractPublicKey(account: { address: string; publicKey?: unknown }): string | undefined {
    return account.publicKey as string | undefined
  }

  private async getAccount(): Promise<{ id: string; address: string; publicKey?: string }> {
    if (this.cachedAccount) return this.cachedAccount

    const address = this.getWalletAddress()
    const account =
      this.chain.name === 'solana'
        ? await this.client.solana.getAccount({ address })
        : await this.client.evm.getAccount({ address: address as `0x${string}` })

    const publicKey = this.extractPublicKey(account)
    this.cachedAccount = {
      id: account.address,
      address: account.address,
      ...(publicKey && { publicKey }),
    }

    if (this.chain.name !== 'solana' && 'signTransaction' in account) {
      this.cachedEvmAccount = { signTransaction: account.signTransaction as (tx: unknown) => Promise<unknown> }
    }

    return this.cachedAccount
  }

  private formatTransactionForCoinbase(tx: any): any {
    const formatBigInt = (value: bigint | string | number | undefined): string | undefined => {
      if (value === undefined || value === null) return undefined
      if (typeof value === 'bigint') return `0x${value.toString(16)}`
      if (typeof value === 'string' && value.startsWith('0x')) return value
      if (typeof value === 'string') return `0x${BigInt(value).toString(16)}`
      return `0x${BigInt(value).toString(16)}`
    }

    const hasEip1559Fields = tx.maxFeePerGas !== undefined && tx.maxPriorityFeePerGas !== undefined
    const hasLegacyFields = tx.gasPrice !== undefined && !hasEip1559Fields

    const formatted: any = {
      to: tx.to,
      value: formatBigInt(tx.value) || '0x0',
      data: tx.data || '0x',
      chainId: typeof tx.chainId === 'number' ? tx.chainId : parseInt(String(tx.chainId || this.chain.chainId)),
    }

    if (tx.gasLimit) {
      formatted.gas = formatBigInt(tx.gasLimit)
    }

    if (hasEip1559Fields) {
      const maxFee = typeof tx.maxFeePerGas === 'bigint' ? tx.maxFeePerGas : BigInt(formatBigInt(tx.maxFeePerGas)!)
      const maxPriorityFee =
        typeof tx.maxPriorityFeePerGas === 'bigint' ? tx.maxPriorityFeePerGas : BigInt(formatBigInt(tx.maxPriorityFeePerGas)!)
      formatted.maxFeePerGas = formatBigInt(maxFee)!
      const safePriorityFee = maxPriorityFee < maxFee ? maxPriorityFee : maxFee / 10n
      formatted.maxPriorityFeePerGas = formatBigInt(safePriorityFee)!
    } else if (hasLegacyFields) {
      const gasPriceHex = formatBigInt(tx.gasPrice)!
      const gasPrice = typeof tx.gasPrice === 'bigint' ? tx.gasPrice : BigInt(gasPriceHex)
      formatted.maxFeePerGas = gasPriceHex
      const priorityFee = (gasPrice * 9n) / 10n
      formatted.maxPriorityFeePerGas = formatBigInt(priorityFee > 0n ? priorityFee : 1n)!
    } else {
      const defaultMaxFee = BigInt('1000000000')
      formatted.maxFeePerGas = formatBigInt(defaultMaxFee)!
      formatted.maxPriorityFeePerGas = formatBigInt(defaultMaxFee / 10n)!
    }

    if (tx.nonce !== undefined) {
      formatted.nonce = typeof tx.nonce === 'number' ? `0x${tx.nonce.toString(16)}` : formatBigInt(tx.nonce)
    }

    return formatted
  }
}
