import {
  AdapterWarpWallet,
  getProviderUrl,
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
    const apiUrl = getProviderUrl(config, chain.name, config.env, chain.defaultApiUrl)

    this.provider = new ethers.JsonRpcProvider(apiUrl)
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
