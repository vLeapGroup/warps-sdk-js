import { WalletProvider, WarpWalletDetails } from '@vleap/warps'
import { ethers } from 'ethers'
import { getWarpWalletPrivateKeyFromConfig, WarpChainInfo, WarpClientConfig } from '@vleap/warps'

export class PrivateKeyWalletProvider implements WalletProvider {
  private wallet: ethers.Wallet | null = null

  constructor(
    private config: WarpClientConfig,
    private chain: WarpChainInfo,
    private rpcProvider: ethers.JsonRpcProvider
  ) {}

  async getAddress(): Promise<string | null> {
    try {
      const wallet = this.getWallet()
      return wallet.address
    } catch {
      return null
    }
  }

  async getPublicKey(): Promise<string | null> {
    try {
      const wallet = this.getWallet()
      const publicKey = wallet.signingKey.publicKey
      return publicKey.startsWith('0x') ? publicKey.slice(2) : publicKey
    } catch {
      return null
    }
  }

  async signTransaction(tx: any): Promise<any> {
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
    return await wallet.signMessage(message)
  }

  getWalletInstance(): ethers.Wallet {
    return this.getWallet()
  }

  create(mnemonic: string): WarpWalletDetails {
    const wallet = ethers.Wallet.fromPhrase(mnemonic)
    return {
      provider: 'privateKey',
      address: wallet.address,
      privateKey: wallet.privateKey,
      mnemonic,
    }
  }

  generate(): WarpWalletDetails {
    const wallet = ethers.Wallet.createRandom()
    return {
      provider: 'privateKey',
      address: wallet.address,
      privateKey: wallet.privateKey,
      mnemonic: wallet.mnemonic?.phrase || null,
    }
  }

  private getWallet(): ethers.Wallet {
    if (this.wallet) return this.wallet

    const privateKey = getWarpWalletPrivateKeyFromConfig(this.config, this.chain.name)
    if (!privateKey) throw new Error('No private key provided')

    this.wallet = new ethers.Wallet(privateKey)
    return this.wallet
  }
}
