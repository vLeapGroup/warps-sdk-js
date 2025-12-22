import {
  AdapterWarpWallet,
  getProviderConfig,
  getWarpWalletMnemonicFromConfig,
  getWarpWalletPrivateKeyFromConfig,
  initializeWalletCache,
  WalletProvider,
  WarpAdapterGenericTransaction,
  WarpChainInfo,
  WarpClientConfig,
  WarpWalletDetails,
} from '@vleap/warps'
import { registerExactEvmScheme } from '@x402/evm/exact/client'
import { ethers } from 'ethers'
import { privateKeyToAccount } from 'viem/accounts'
import { SupportedEvmChainIds } from './constants'
import { MnemonicWalletProvider } from './providers/MnemonicWalletProvider'
import { PrivateKeyWalletProvider } from './providers/PrivateKeyWalletProvider'

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

  private createProvider(): WalletProvider | null {
    const privateKey = getWarpWalletPrivateKeyFromConfig(this.config, this.chain.name)
    if (privateKey) return new PrivateKeyWalletProvider(this.config, this.chain, this.provider)

    const mnemonic = getWarpWalletMnemonicFromConfig(this.config, this.chain.name)
    if (mnemonic) return new MnemonicWalletProvider(this.config, this.chain, this.provider)

    return null
  }

  private initializeCache() {
    initializeWalletCache(this.walletProvider).then((cache: { address: string | null; publicKey: string | null }) => {
      this.cachedAddress = cache.address
      this.cachedPublicKey = cache.publicKey
    })
  }

  async signTransaction(tx: WarpAdapterGenericTransaction): Promise<WarpAdapterGenericTransaction> {
    if (!tx || typeof tx !== 'object') throw new Error('Invalid transaction object')
    if (!this.walletProvider) throw new Error('No wallet provider available')
    return await this.walletProvider.signTransaction(tx)
  }

  async signTransactions(txs: WarpAdapterGenericTransaction[]): Promise<WarpAdapterGenericTransaction[]> {
    if (txs.length === 0) return []
    if (!this.walletProvider) throw new Error('No wallet provider available')

    if (this.walletProvider instanceof PrivateKeyWalletProvider || this.walletProvider instanceof MnemonicWalletProvider) {
      const wallet = this.walletProvider.getWalletInstance()
      const address = wallet.address

      if (txs.length > 1) {
        const currentNonce = await this.provider.getTransactionCount(address, 'pending')
        const signedTxs = []
        for (let i = 0; i < txs.length; i++) {
          const tx = { ...txs[i] }
          tx.nonce = currentNonce + i

          if (i > 0) {
            const priorityReduction = BigInt(i * 1000000000)
            const minGasPrice = BigInt(1000000000)

            if (tx.maxFeePerGas && tx.maxPriorityFeePerGas) {
              tx.maxFeePerGas = tx.maxFeePerGas > priorityReduction ? tx.maxFeePerGas - priorityReduction : minGasPrice
              tx.maxPriorityFeePerGas =
                tx.maxPriorityFeePerGas > priorityReduction ? tx.maxPriorityFeePerGas - priorityReduction : minGasPrice
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
    }

    return Promise.all(txs.map(async (tx) => this.signTransaction(tx)))
  }

  async signMessage(message: string): Promise<string> {
    if (!this.walletProvider) throw new Error('No wallet provider available')
    return await this.walletProvider.signMessage(message)
  }

  async sendTransaction(tx: WarpAdapterGenericTransaction): Promise<string> {
    if (!tx || typeof tx !== 'object') throw new Error('Invalid transaction object')
    if (!tx.signature) throw new Error('Transaction must be signed before sending')
    if (!this.walletProvider) throw new Error('No wallet provider available')

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

  create(mnemonic: string): WarpWalletDetails {
    if (!this.walletProvider) throw new Error('No wallet provider available')
    return this.walletProvider.create(mnemonic)
  }

  generate(): WarpWalletDetails {
    if (!this.walletProvider) throw new Error('No wallet provider available')
    return this.walletProvider.generate()
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
}
