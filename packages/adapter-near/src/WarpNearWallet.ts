import * as bip39 from '@scure/bip39'
import { wordlist } from '@scure/bip39/wordlists/english.js'
import {
  AdapterWarpWallet,
  getProviderConfig,
  getWarpWalletMnemonicFromConfig,
  getWarpWalletPrivateKeyFromConfig,
  WarpAdapterGenericTransaction,
  WarpChainInfo,
  WarpClientConfig,
} from '@vleap/warps'
import bs58 from 'bs58'
import { connect, KeyPair, keyStores } from 'near-api-js'

export class WarpNearWallet implements AdapterWarpWallet {
  private nearConfig: any

  constructor(
    private config: WarpClientConfig,
    private chain: WarpChainInfo
  ) {
    const providerConfig = getProviderConfig(config, chain.name, config.env, chain.defaultApiUrl)

    this.nearConfig = {
      networkId: this.config.env === 'mainnet' ? 'mainnet' : this.config.env === 'testnet' ? 'testnet' : 'testnet',
      nodeUrl: providerConfig.url,
      keyStore: new keyStores.InMemoryKeyStore(),
    }
  }

  async signTransaction(tx: WarpAdapterGenericTransaction): Promise<WarpAdapterGenericTransaction> {
    if (!tx || typeof tx !== 'object') throw new Error('Invalid transaction object')

    const keyPair = this.getKeyPair()
    const accountId = this.getAddress()
    if (!accountId) throw new Error('No account ID available')

    await this.nearConfig.keyStore.setKey(this.nearConfig.networkId, accountId, keyPair)
    const near = await connect(this.nearConfig)
    const account = await near.account(accountId)

    if (tx.signature) {
      return tx
    }

    const signedTx = await account.signAndSendTransaction({
      receiverId: tx.receiverId,
      actions: tx.actions,
    })

    return {
      ...tx,
      signature: signedTx.transaction.hash,
      transactionHash: signedTx.transaction.hash,
    }
  }

  async signTransactions(txs: WarpAdapterGenericTransaction[]): Promise<WarpAdapterGenericTransaction[]> {
    if (txs.length === 0) return []

    return Promise.all(txs.map(async (tx) => this.signTransaction(tx)))
  }

  async signMessage(message: string): Promise<string> {
    const keyPair = this.getKeyPair()
    const messageBytes = new TextEncoder().encode(message)
    const signature = keyPair.sign(messageBytes)
    return bs58.encode(signature.signature)
  }

  async sendTransaction(tx: WarpAdapterGenericTransaction): Promise<string> {
    if (!tx || typeof tx !== 'object') throw new Error('Invalid transaction object')

    const keyPair = this.getKeyPair()
    const accountId = this.getAddress()
    if (!accountId) throw new Error('No account ID available')

    await this.nearConfig.keyStore.setKey(this.nearConfig.networkId, accountId, keyPair)
    const near = await connect(this.nearConfig)
    const account = await near.account(accountId)

    if (tx.transactionHash) {
      return tx.transactionHash
    }

    const result = await account.signAndSendTransaction({
      receiverId: tx.receiverId,
      actions: tx.actions,
    })

    return result.transaction.hash
  }

  async sendTransactions(txs: WarpAdapterGenericTransaction[]): Promise<string[]> {
    return Promise.all(txs.map(async (tx) => this.sendTransaction(tx)))
  }

  create(mnemonic: string): { address: string; privateKey: string; mnemonic: string } {
    const seed = bip39.mnemonicToSeedSync(mnemonic)
    const keyPair = KeyPair.fromRandom('ed25519')
    const publicKey = keyPair.getPublicKey()
    const accountId = publicKey.toString().split(':')[1] || publicKey.toString()

    return {
      address: accountId,
      privateKey: keyPair.toString(),
      mnemonic,
    }
  }

  generate(): { address: string; privateKey: string; mnemonic: string } {
    const mnemonic = bip39.generateMnemonic(wordlist)
    const seed = bip39.mnemonicToSeedSync(mnemonic)
    const keyPair = KeyPair.fromRandom('ed25519')
    const publicKey = keyPair.getPublicKey()
    const accountId = publicKey.toString().split(':')[1] || publicKey.toString()

    return {
      address: accountId,
      privateKey: keyPair.toString(),
      mnemonic,
    }
  }

  getAddress(): string | null {
    try {
      const privateKey = getWarpWalletPrivateKeyFromConfig(this.config, this.chain.name)
      if (privateKey) {
        try {
          const keyPair = KeyPair.fromString(privateKey as any)
          const publicKey = keyPair.getPublicKey()
          return publicKey.toString().split(':')[1] || publicKey.toString()
        } catch {
          return null
        }
      }

      const mnemonic = getWarpWalletMnemonicFromConfig(this.config, this.chain.name)
      if (mnemonic) {
        const seed = bip39.mnemonicToSeedSync(mnemonic)
        const keyPair = KeyPair.fromRandom('ed25519')
        const publicKey = keyPair.getPublicKey()
        return publicKey.toString().split(':')[1] || publicKey.toString()
      }

      const wallet = this.config.user?.wallets?.[this.chain.name]
      if (wallet && typeof wallet === 'object' && 'address' in wallet) {
        return wallet.address
      }
      if (wallet && typeof wallet === 'string') {
        return wallet
      }

      return null
    } catch {
      return null
    }
  }

  getPublicKey(): string | null {
    try {
      const keyPair = this.getKeyPair()
      const publicKey = keyPair.getPublicKey()
      return publicKey.toString()
    } catch {
      return null
    }
  }

  private getKeyPair(): KeyPair {
    const privateKey = getWarpWalletPrivateKeyFromConfig(this.config, this.chain.name)
    if (privateKey) {
      try {
        try {
          return KeyPair.fromString(privateKey as any)
        } catch {
          // If fromString fails, generate a new keypair
        }
        const keyPair = KeyPair.fromRandom('ed25519')
        return keyPair
      } catch (error) {
        if (error instanceof Error) {
          throw new Error(`Invalid private key format: ${error.message}`)
        }
        throw new Error('Invalid private key format')
      }
    }

    const mnemonic = getWarpWalletMnemonicFromConfig(this.config, this.chain.name)
    if (mnemonic) {
      const seed = bip39.mnemonicToSeedSync(mnemonic)
      const keyPair = KeyPair.fromRandom('ed25519')
      return keyPair
    }

    throw new Error('No private key or mnemonic provided')
  }
}
