import { Account, INetworkProvider, Message, Mnemonic, NetworkEntrypoint, UserSecretKey } from '@multiversx/sdk-core'
import {
  AdapterWarpWallet,
  CacheTtl,
  getWarpWalletAddressFromConfig,
  getWarpWalletPrivateKeyFromConfig,
  WarpAdapterGenericTransaction,
  WarpCache,
  WarpChainInfo,
  WarpClientConfig,
} from '@vleap/warps'
import { getMultiversxEntrypoint } from './helpers/general'

export class WarpMultiversxWallet implements AdapterWarpWallet {
  private entry: NetworkEntrypoint
  private provider: INetworkProvider
  private cache: WarpCache

  constructor(
    private config: WarpClientConfig,
    private chain: WarpChainInfo
  ) {
    this.entry = getMultiversxEntrypoint(chain, config.env, config)
    this.provider = this.entry.createNetworkProvider()
    this.cache = new WarpCache(config.cache?.type)
  }

  async signTransaction(tx: WarpAdapterGenericTransaction): Promise<WarpAdapterGenericTransaction> {
    if (!tx || typeof tx !== 'object') throw new Error('Invalid transaction object')
    const privateKey = getWarpWalletPrivateKeyFromConfig(this.config, this.chain.name)
    if (!privateKey) throw new Error('Wallet not initialized - no private key provided')
    const isPrivateKeyPem = privateKey.startsWith('-----')
    const secretKey = isPrivateKeyPem ? UserSecretKey.fromPem(privateKey) : UserSecretKey.fromString(privateKey)
    const account = new Account(secretKey)
    if (tx.nonce === 0n) {
      const nonceOnNetwork = await this.entry.recallAccountNonce(account.address)
      const nonceInCache = this.cache.get<number>(`nonce:${account.address.toBech32()}`) || 0
      const highestNonce = BigInt(Math.max(nonceInCache, Number(nonceOnNetwork)))
      tx.nonce = highestNonce
    }
    tx.signature = await account.signTransaction(tx)

    const newNonce = Number(account.nonce) + 1
    this.cache.set(`nonce:${account.address.toBech32()}`, newNonce, CacheTtl.OneMinute)

    return tx
  }

  async signTransactions(txs: WarpAdapterGenericTransaction[]): Promise<WarpAdapterGenericTransaction[]> {
    return Promise.all(txs.map(async (tx) => this.signTransaction(tx)))
  }

  async signMessage(message: string): Promise<string> {
    const privateKey = getWarpWalletPrivateKeyFromConfig(this.config, this.chain.name)
    if (!privateKey) throw new Error('Wallet not initialized - no private key provided')

    const isPrivateKeyPem = privateKey.startsWith('-----')
    const secretKey = isPrivateKeyPem ? UserSecretKey.fromPem(privateKey) : UserSecretKey.fromString(privateKey)
    const account = new Account(secretKey)
    const signature = await account.signMessage(new Message({ data: Buffer.from(message) }))
    return Buffer.from(signature).toString('hex')
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
    return getWarpWalletAddressFromConfig(this.config, this.chain.name)
  }

  getPublicKey(): string | null {
    const privateKey = getWarpWalletPrivateKeyFromConfig(this.config, this.chain.name)
    if (!privateKey) return null
    const isPrivateKeyPem = privateKey.startsWith('-----')
    const secretKey = isPrivateKeyPem ? UserSecretKey.fromPem(privateKey) : UserSecretKey.fromString(privateKey)
    const pubKey = secretKey.generatePublicKey()
    return pubKey.hex()
  }
}
