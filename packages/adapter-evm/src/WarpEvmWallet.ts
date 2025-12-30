import {
  AdapterWarpWallet,
  getProviderConfig,
  initializeWalletCache,
  WalletProvider,
  WarpAdapterGenericTransaction,
  WarpChainInfo,
  WarpClientConfig,
  WarpWalletDetails,
  WarpWalletProvider,
} from '@vleap/warps'
import { registerExactEvmScheme } from '@x402/evm/exact/client'
import { ethers } from 'ethers'
import { privateKeyToAccount } from 'viem/accounts'
import { SupportedEvmChainIds } from './constants'
import { MnemonicWalletProvider } from './providers/MnemonicWalletProvider'
import { PrivateKeyWalletProvider } from './providers/PrivateKeyWalletProvider'
import { ReadOnlyWalletProvider } from './providers/ReadOnlyWalletProvider'

export class WarpEvmWallet implements AdapterWarpWallet {
  private provider: ethers.JsonRpcProvider
  private walletProvider: WalletProvider | null
  private cachedAddress: string | null = null
  private cachedPublicKey: string | null = null

  constructor(
    private config: WarpClientConfig,
    private chain: WarpChainInfo
  ) {
    const providerConfig = getProviderConfig(config, chain.name, config.env, chain.defaultApiUrl)
    this.provider = new ethers.JsonRpcProvider(providerConfig.url)
    this.walletProvider = this.createProvider()
    this.initializeCache()
  }

  async signTransaction(tx: WarpAdapterGenericTransaction): Promise<WarpAdapterGenericTransaction> {
    if (!tx || typeof tx !== 'object') throw new Error('Invalid transaction object')
    if (!this.walletProvider) throw new Error('No wallet provider available')
    if (this.walletProvider instanceof ReadOnlyWalletProvider) throw new Error(`Wallet (${this.chain.name}) is read-only`)

    if (tx.nonce === undefined) {
      const address = this.getAddress()
      if (address) {
        tx.nonce = await this.provider.getTransactionCount(address, 'pending')
      }
    }

    const formattedTx = this.needsFormatting() ? this.formatTransaction(tx) : tx
    return await this.walletProvider.signTransaction(formattedTx)
  }

  async signTransactions(txs: WarpAdapterGenericTransaction[]): Promise<WarpAdapterGenericTransaction[]> {
    if (txs.length === 0) return []
    if (!this.walletProvider) throw new Error('No wallet provider available')

    const address = this.getAddress()
    if (!address) throw new Error('No wallet address available')

    if (txs.length > 1) {
      const currentNonce = await this.provider.getTransactionCount(address, 'pending')
      const signedTxs = []
      for (let i = 0; i < txs.length; i++) {
        const tx = { ...txs[i] }
        if (tx.nonce === undefined) {
          tx.nonce = currentNonce + i
        }

        if (i > 0 && (this.walletProvider instanceof PrivateKeyWalletProvider || this.walletProvider instanceof MnemonicWalletProvider)) {
          const priorityReduction = BigInt(i * 1000000000)
          const minGasPrice = BigInt(1000000000)

          if (tx.maxFeePerGas && tx.maxPriorityFeePerGas) {
            tx.maxFeePerGas = tx.maxFeePerGas > priorityReduction ? tx.maxFeePerGas - priorityReduction : minGasPrice
            tx.maxPriorityFeePerGas =
              tx.maxPriorityFeePerGas > priorityReduction ? tx.maxPriorityFeePerGas - priorityReduction : minGasPrice
            if (tx.maxPriorityFeePerGas > tx.maxFeePerGas) {
              tx.maxPriorityFeePerGas = tx.maxFeePerGas
            }
            delete tx.gasPrice
          } else if (tx.gasPrice) {
            tx.gasPrice = tx.gasPrice > priorityReduction ? tx.gasPrice - priorityReduction : minGasPrice
            delete tx.maxFeePerGas
            delete tx.maxPriorityFeePerGas
          }
        }

        signedTxs.push(await this.signTransaction(tx))
      }
      return signedTxs
    }

    const signedTxs = []
    for (const tx of txs) {
      signedTxs.push(await this.signTransaction(tx))
    }
    return signedTxs
  }

  async signMessage(message: string): Promise<string> {
    if (!this.walletProvider) throw new Error('No wallet provider available')
    if (this.walletProvider instanceof ReadOnlyWalletProvider) throw new Error(`Wallet (${this.chain.name}) is read-only`)
    return await this.walletProvider.signMessage(message)
  }

  async sendTransaction(tx: WarpAdapterGenericTransaction): Promise<string> {
    if (!tx || typeof tx !== 'object') throw new Error('Invalid transaction object')
    if (!tx.signature) throw new Error('Transaction must be signed before sending')
    if (!this.walletProvider) throw new Error('No wallet provider available')

    if (typeof tx.signature === 'string' && tx.signature.startsWith('0x')) {
      const txResponse = await this.provider.broadcastTransaction(tx.signature)
      return txResponse.hash
    }

    if (this.walletProvider instanceof PrivateKeyWalletProvider || this.walletProvider instanceof MnemonicWalletProvider) {
      const wallet = this.walletProvider.getWalletInstance()
      const connectedWallet = wallet.connect(this.provider)
      const txResponse = await connectedWallet.sendTransaction(tx as any)
      return txResponse.hash
    }

    throw new Error('Wallet provider does not support sending transactions')
  }

  async sendTransactions(txs: WarpAdapterGenericTransaction[]): Promise<string[]> {
    return Promise.all(txs.map(async (tx) => this.sendTransaction(tx)))
  }

  async importFromMnemonic(mnemonic: string): Promise<WarpWalletDetails> {
    const walletProvider = this.createProviderForOperation('mnemonic')
    return await walletProvider.importFromMnemonic(mnemonic)
  }

  async importFromPrivateKey(privateKey: string): Promise<WarpWalletDetails> {
    const walletProvider = this.createProviderForOperation('privateKey')
    return await walletProvider.importFromPrivateKey(privateKey)
  }

  async export(provider: WarpWalletProvider): Promise<WarpWalletDetails> {
    const walletProvider = this.createProviderForOperation(provider)
    return await walletProvider.export()
  }

  async generate(provider: WarpWalletProvider): Promise<WarpWalletDetails> {
    const walletProvider = this.createProviderForOperation(provider)
    return await walletProvider.generate()
  }

  getAddress(): string | null {
    return this.cachedAddress
  }

  getPublicKey(): string | null {
    return this.cachedPublicKey
  }

  async registerX402Handlers(client: unknown): Promise<Record<string, () => void>> {
    if (!this.walletProvider) throw new Error('No wallet provider available')

    const provider = this.walletProvider as unknown as Record<string, unknown>
    const getInstance = provider.getWalletInstance as (() => ethers.Wallet) | undefined

    if (typeof getInstance !== 'function') throw new Error('Wallet provider does not have getWalletInstance method')

    const wallet = getInstance()
    if (!wallet || !wallet.privateKey) throw new Error('Wallet instance does not have private key')

    const signer = privateKeyToAccount(wallet.privateKey as `0x${string}`)
    const handlers: Record<string, () => void> = {}

    for (const chainId of SupportedEvmChainIds) {
      handlers[`eip155:${chainId}`] = () => {
        registerExactEvmScheme(client as Parameters<typeof registerExactEvmScheme>[0], { signer })
      }
    }

    return handlers
  }

  private createProvider(): WalletProvider | null {
    const wallet = this.config.user?.wallets?.[this.chain.name]
    if (!wallet) return null
    if (typeof wallet === 'string') return new ReadOnlyWalletProvider(this.config, this.chain)
    return this.createProviderForOperation(wallet.provider)
  }

  private initializeCache() {
    initializeWalletCache(this.walletProvider).then((cache: { address: string | null; publicKey: string | null }) => {
      this.cachedAddress = cache.address
      this.cachedPublicKey = cache.publicKey
    })
  }

  private createProviderForOperation(provider: WarpWalletProvider): WalletProvider {
    const customWalletProviders = this.config.walletProviders?.[this.chain.name]
    const providerFactory = customWalletProviders?.[provider]
    if (providerFactory) {
      const walletProvider = providerFactory(this.config, this.chain)
      if (!walletProvider) throw new Error(`Custom wallet provider factory returned null for ${provider}`)
      return walletProvider
    }

    if (provider === 'privateKey') return new PrivateKeyWalletProvider(this.config, this.chain)
    if (provider === 'mnemonic') return new MnemonicWalletProvider(this.config, this.chain)
    throw new Error(`Unsupported wallet provider for ${this.chain.name}: ${provider}`)
  }

  private formatTransaction(tx: WarpAdapterGenericTransaction): WarpAdapterGenericTransaction {
    const formatted: any = {
      ...tx,
      value: this.formatBigInt(tx.value) || '0x0',
      data: tx.data || '0x',
      chainId: typeof tx.chainId === 'number' ? tx.chainId : parseInt(String(tx.chainId || this.chain.chainId)),
    }

    if (tx.gasLimit) formatted.gas = this.formatBigInt(tx.gasLimit)
    if (tx.nonce !== undefined)
      formatted.nonce = typeof tx.nonce === 'number' ? `0x${tx.nonce.toString(16)}` : this.formatBigInt(tx.nonce)

    const hasEip1559Fields = tx.maxFeePerGas !== undefined && tx.maxPriorityFeePerGas !== undefined
    const hasLegacyFields = tx.gasPrice !== undefined && !hasEip1559Fields

    if (hasEip1559Fields) {
      const maxFee = this.parseBigInt(tx.maxFeePerGas)!
      const maxPriorityFee = this.parseBigInt(tx.maxPriorityFeePerGas)!
      const safePriorityFee = this.normalizePriorityFee(maxFee, maxPriorityFee)
      formatted.maxFeePerGas = this.formatBigInt(maxFee)!
      formatted.maxPriorityFeePerGas = this.formatBigInt(safePriorityFee)!
    } else if (hasLegacyFields) {
      const gasPrice = this.parseBigInt(tx.gasPrice)!
      formatted.maxFeePerGas = this.formatBigInt(gasPrice)!
      const priorityFee = (gasPrice * 9n) / 10n
      formatted.maxPriorityFeePerGas = this.formatBigInt(priorityFee > 0n ? priorityFee : 1n)!
    } else {
      const defaultMaxFee = 1000000000n
      formatted.maxFeePerGas = this.formatBigInt(defaultMaxFee)!
      formatted.maxPriorityFeePerGas = this.formatBigInt(defaultMaxFee / 10n)!
    }

    return formatted
  }

  private formatBigInt(value: bigint | string | number | undefined): string | undefined {
    if (value === undefined || value === null) return undefined
    if (typeof value === 'bigint') return `0x${value.toString(16)}`
    if (typeof value === 'string' && value.startsWith('0x')) return value
    return `0x${BigInt(value).toString(16)}`
  }

  private parseBigInt(value: bigint | string | number | undefined): bigint | undefined {
    if (value === undefined || value === null) return undefined
    if (typeof value === 'bigint') return value
    return BigInt(value)
  }

  private normalizePriorityFee(maxFee: bigint, maxPriorityFee: bigint): bigint {
    if (maxPriorityFee <= maxFee) return maxPriorityFee
    const safeFee = maxFee / 10n
    if (safeFee < 1n) return 1n
    if (safeFee > maxFee) return maxFee
    return safeFee
  }

  private needsFormatting(): boolean {
    if (!this.walletProvider) return false
    const providerName = (this.walletProvider as any).constructor?.PROVIDER_NAME
    return providerName === 'coinbase'
  }
}
