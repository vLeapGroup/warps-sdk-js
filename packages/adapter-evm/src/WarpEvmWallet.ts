import { AdapterWarpWallet, WarpAdapterGenericTransaction, WarpChainInfo, WarpClientConfig } from '@vleap/warps'
import { ethers } from 'ethers'

export class WarpEvmWallet implements AdapterWarpWallet {
  private wallet: ethers.Wallet | null = null
  private provider: ethers.JsonRpcProvider

  constructor(
    private config: WarpClientConfig,
    private chain: WarpChainInfo
  ) {
    this.provider = new ethers.JsonRpcProvider(chain.defaultApiUrl || 'https://rpc.sepolia.org')
  }

  async signTransaction(tx: WarpAdapterGenericTransaction): Promise<WarpAdapterGenericTransaction> {
    if (!this.wallet) {
      throw new Error('Wallet not initialized - no private key provided')
    }

    if (!tx || typeof tx !== 'object') {
      throw new Error('Invalid transaction object')
    }

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

    const signedTx = await this.wallet.signTransaction(txRequest)
    return { ...tx, signature: signedTx }
  }

  async signMessage(message: string): Promise<string> {
    if (!this.wallet) {
      throw new Error('Wallet not initialized - no private key provided')
    }

    return await this.wallet.signMessage(message)
  }

  async sendTransaction(tx: WarpAdapterGenericTransaction): Promise<string> {
    if (!tx || typeof tx !== 'object') {
      throw new Error('Invalid transaction object')
    }

    if (!tx.signature) {
      throw new Error('Transaction must be signed before sending')
    }

    if (!this.wallet) {
      throw new Error('Wallet not initialized - no private key provided')
    }

    const connectedWallet = this.wallet.connect(this.provider)
    const txResponse = await connectedWallet.sendTransaction(tx as any)
    return txResponse.hash
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
    return this.wallet?.address || null
  }
}
