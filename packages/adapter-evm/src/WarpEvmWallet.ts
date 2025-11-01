import {
  AdapterWarpWallet,
  getProviderConfig,
  getWarpWalletMnemonicFromConfig,
  getWarpWalletPrivateKeyFromConfig,
  WarpAdapterGenericTransaction,
  WarpChainInfo,
  WarpClientConfig,
} from '@vleap/warps'
import { ethers } from 'ethers'

export class WarpEvmWallet implements AdapterWarpWallet {
  private provider: ethers.JsonRpcProvider

  constructor(
    private config: WarpClientConfig,
    private chain: WarpChainInfo
  ) {
    const providerConfig = getProviderConfig(config, chain.name, config.env, chain.defaultApiUrl)
    this.provider = new ethers.JsonRpcProvider(providerConfig.url)
  }

  async signTransaction(tx: WarpAdapterGenericTransaction): Promise<WarpAdapterGenericTransaction> {
    if (!tx || typeof tx !== 'object') throw new Error('Invalid transaction object')

    const wallet = this.getWallet()

    const txRequest = {
      to: tx.to,
      data: tx.data,
      value: tx.value || 0,
      gasLimit: tx.gasLimit,
      maxFeePerGas: tx.maxFeePerGas,
      maxPriorityFeePerGas: tx.maxPriorityFeePerGas,
      nonce: tx.nonce,
      chainId: tx.chainId,
    }

    const signedTx = await wallet.signTransaction(txRequest)
    return { ...tx, signature: signedTx }
  }

  async signTransactions(txs: WarpAdapterGenericTransaction[]): Promise<WarpAdapterGenericTransaction[]> {
    if (txs.length === 0) return []

    // For multiple transactions, set sequential nonces and give earlier transactions higher priority
    if (txs.length > 1) {
      const wallet = this.getWallet()
      const address = wallet.address

      // Get current nonce from blockchain
      const currentNonce = await this.provider.getTransactionCount(address, 'pending')

      const signedTxs = []
      for (let i = 0; i < txs.length; i++) {
        const tx = { ...txs[i] }

        // Set sequential nonce
        tx.nonce = currentNonce + i

        // Give earlier transactions higher gas price for priority
        if (i > 0) {
          const priorityReduction = BigInt(i * 1000000000) // 1 gwei per transaction
          const minGasPrice = BigInt(1000000000) // 1 gwei minimum

          if (tx.maxFeePerGas && tx.maxPriorityFeePerGas) {
            tx.maxFeePerGas = tx.maxFeePerGas > priorityReduction ? tx.maxFeePerGas - priorityReduction : minGasPrice
            tx.maxPriorityFeePerGas =
              tx.maxPriorityFeePerGas > priorityReduction ? tx.maxPriorityFeePerGas - priorityReduction : minGasPrice
            // Remove gasPrice if it exists to avoid EIP-1559 conflict
            delete tx.gasPrice
          } else if (tx.gasPrice) {
            tx.gasPrice = tx.gasPrice > priorityReduction ? tx.gasPrice - priorityReduction : minGasPrice
            // Remove EIP-1559 fields if they exist to avoid conflict
            delete tx.maxFeePerGas
            delete tx.maxPriorityFeePerGas
          }
        }

        const signedTx = await this.signTransaction(tx)
        signedTxs.push(signedTx)
      }

      return signedTxs
    }

    // Single transaction - use existing logic
    return Promise.all(txs.map(async (tx) => this.signTransaction(tx)))
  }

  async signMessage(message: string): Promise<string> {
    const wallet = this.getWallet()
    const signature = await wallet.signMessage(message)

    return signature
  }

  async sendTransaction(tx: WarpAdapterGenericTransaction): Promise<string> {
    if (!tx || typeof tx !== 'object') throw new Error('Invalid transaction object')
    if (!tx.signature) throw new Error('Transaction must be signed before sending')

    const wallet = this.getWallet()
    if (!wallet) throw new Error('Wallet not initialized - no private key provided')

    const connectedWallet = wallet.connect(this.provider)
    const txResponse = await connectedWallet.sendTransaction(tx as any)
    return txResponse.hash
  }

  async sendTransactions(txs: WarpAdapterGenericTransaction[]): Promise<string[]> {
    return Promise.all(txs.map(async (tx) => this.sendTransaction(tx)))
  }

  create(mnemonic: string): { address: string; privateKey: string; mnemonic: string } {
    const wallet = ethers.Wallet.fromPhrase(mnemonic)
    return { address: wallet.address, privateKey: wallet.privateKey, mnemonic }
  }

  generate(): { address: string; privateKey: string; mnemonic: string } {
    const wallet = ethers.Wallet.createRandom()
    return { address: wallet.address, privateKey: wallet.privateKey, mnemonic: wallet.mnemonic?.phrase || '' }
  }

  getAddress(): string | null {
    const wallet = this.getWallet()
    return wallet.address
  }

  private getWallet(): ethers.Wallet {
    const privateKey = getWarpWalletPrivateKeyFromConfig(this.config, this.chain.name)
    if (privateKey) return new ethers.Wallet(privateKey)

    const mnemonic = getWarpWalletMnemonicFromConfig(this.config, this.chain.name)
    if (mnemonic) return ethers.Wallet.fromPhrase(mnemonic) as unknown as ethers.Wallet

    throw new Error('No private key or mnemonic provided')
  }
}
