import { Address, Mnemonic, NetworkEntrypoint } from '@multiversx/sdk-core'
import {
  AdapterWarpWallet,
  CacheTtl,
  getWarpWalletMnemonicFromConfig,
  getWarpWalletPrivateKeyFromConfig,
  initializeWalletCache,
  WalletProvider,
  WarpAdapterGenericTransaction,
  WarpCache,
  WarpChainInfo,
  WarpClientConfig,
} from '@vleap/warps'
import { getMultiversxEntrypoint } from './helpers/general'
import { MnemonicWalletProvider } from './providers/MnemonicWalletProvider'
import { PrivateKeyWalletProvider } from './providers/PrivateKeyWalletProvider'

export class WarpMultiversxWallet implements AdapterWarpWallet {
  private entry: NetworkEntrypoint
  private cache: WarpCache
  private walletProvider: WalletProvider | null
  private cachedAddress: string | null = null
  private cachedPublicKey: string | null = null

  constructor(
    private config: WarpClientConfig,
    private chain: WarpChainInfo,
    walletProvider?: WalletProvider
  ) {
    this.entry = getMultiversxEntrypoint(chain, config.env, config)
    this.cache = new WarpCache(config.cache?.type)
    this.walletProvider = walletProvider || this.createDefaultProvider()
    this.initializeCache()
  }

  private createDefaultProvider(): WalletProvider | null {
    const privateKey = getWarpWalletPrivateKeyFromConfig(this.config, this.chain.name)
    if (privateKey) {
      return new PrivateKeyWalletProvider(this.config, this.chain)
    }

    const mnemonic = getWarpWalletMnemonicFromConfig(this.config, this.chain.name)
    if (mnemonic) {
      return new MnemonicWalletProvider(this.config, this.chain)
    }

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

    if (this.walletProvider instanceof PrivateKeyWalletProvider || this.walletProvider instanceof MnemonicWalletProvider) {
      const account = this.walletProvider.getAccountInstance()
      if (tx.nonce === 0n) {
        const nonceOnNetwork = await this.entry.recallAccountNonce(account.address)
        const nonceInCache = this.cache.get<number>(`nonce:${account.address.toBech32()}`) || 0
        const highestNonce = BigInt(Math.max(nonceInCache, Number(nonceOnNetwork)))
        tx.nonce = highestNonce
      }
    } else if (tx.nonce === 0n && this.cachedAddress) {
      const address = Address.newFromBech32(this.cachedAddress)
      const nonceOnNetwork = await this.entry.recallAccountNonce(address)
      const nonceInCache = this.cache.get<number>(`nonce:${this.cachedAddress}`) || 0
      const highestNonce = BigInt(Math.max(nonceInCache, Number(nonceOnNetwork)))
      tx.nonce = highestNonce
    }

    const signedTx = await this.walletProvider.signTransaction(tx)

    if (this.walletProvider instanceof PrivateKeyWalletProvider || this.walletProvider instanceof MnemonicWalletProvider) {
      const account = this.walletProvider.getAccountInstance()
      const newNonce = Number(account.nonce) + 1
      this.cache.set(`nonce:${account.address.toBech32()}`, newNonce, CacheTtl.OneMinute)
    } else if (this.cachedAddress) {
      const currentNonce = tx.nonce ? Number(tx.nonce) : 0
      this.cache.set(`nonce:${this.cachedAddress}`, currentNonce + 1, CacheTtl.OneMinute)
    }

    return signedTx
  }

  async signTransactions(txs: WarpAdapterGenericTransaction[]): Promise<WarpAdapterGenericTransaction[]> {
    return Promise.all(txs.map(async (tx) => this.signTransaction(tx)))
  }

  async signMessage(message: string): Promise<string> {
    if (!this.walletProvider) throw new Error('No wallet provider available')
    return await this.walletProvider.signMessage(message)
  }

  async sendTransactions(txs: WarpAdapterGenericTransaction[]): Promise<string[]> {
    return Promise.all(txs.map(async (tx) => this.sendTransaction(tx)))
  }

  async sendTransaction(tx: WarpAdapterGenericTransaction): Promise<string> {
    if (!tx || typeof tx !== 'object') throw new Error('Invalid transaction object')
    if (!tx.signature) throw new Error('Transaction must be signed before sending')
    return await this.entry.sendTransaction(tx)
  }

  create(mnemonic: string): { address: string; privateKey: string; mnemonic: string } {
    const mnemonicObj = Mnemonic.fromString(mnemonic)
    const privateKey = mnemonicObj.deriveKey(0)
    const privateKeyHex = privateKey.hex()
    const pubKey = privateKey.generatePublicKey()
    const address = pubKey.toAddress(this.chain.addressHrp).toBech32()
    return { address, privateKey: privateKeyHex, mnemonic }
  }

  generate(): { address: string; privateKey: string; mnemonic: string } {
    const mnemonic = Mnemonic.generate()
    const mnemonicWords = mnemonic.toString()
    const privateKey = mnemonic.deriveKey(0)
    const privateKeyHex = privateKey.hex()
    const pubKey = privateKey.generatePublicKey()
    const address = pubKey.toAddress(this.chain.addressHrp).toBech32()
    return { address, privateKey: privateKeyHex, mnemonic: mnemonicWords }
  }

  getAddress(): string | null {
    return this.cachedAddress
  }

  getPublicKey(): string | null {
    return this.cachedPublicKey
  }
}
