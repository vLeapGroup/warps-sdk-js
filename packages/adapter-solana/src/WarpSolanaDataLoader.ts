import {
  AdapterWarpDataLoader,
  CacheTtl,
  getProviderConfig,
  getWarpChainAssetLogoUrl,
  WarpCache,
  WarpCacheKey,
  WarpChainAccount,
  WarpChainAction,
  WarpChainAsset,
  WarpChainInfo,
  WarpClientConfig,
  WarpDataLoaderOptions,
} from '@vleap/warps'
import { Connection, PublicKey } from '@solana/web3.js'
import { getAccount, getMint } from '@solana/spl-token'
import { WarpSolanaConstants } from './constants'
import { findKnownTokenById, getKnownTokensForChain } from './tokens'

export class WarpSolanaDataLoader implements AdapterWarpDataLoader {
  private connection: Connection
  private cache: WarpCache

  constructor(
    private readonly config: WarpClientConfig,
    private readonly chain: WarpChainInfo
  ) {
    const providerConfig = getProviderConfig(this.config, this.chain.name, this.config.env, this.chain.defaultApiUrl)
    this.connection = new Connection(providerConfig.url, 'confirmed')
    this.cache = new WarpCache(config.cache?.type)
  }

  async getAccount(address: string): Promise<WarpChainAccount> {
    try {
      const publicKey = new PublicKey(address)
      const balance = await this.connection.getBalance(publicKey)

      return {
        chain: this.chain.name,
        address,
        balance: BigInt(balance),
      }
    } catch (error) {
      throw new Error(`Failed to get account: ${error}`)
    }
  }

  async getAccountAssets(address: string): Promise<WarpChainAsset[]> {
    try {
      const account = await this.getAccount(address)
      const tokenBalances = await this.getTokenBalances(address)

      let assets: WarpChainAsset[] = account.balance > 0n ? [{ ...this.chain.nativeToken, amount: account.balance }] : []

      for (const tokenBalance of tokenBalances) {
        if (tokenBalance.balance > 0n) {
          assets.push({
            chain: this.chain.name,
            identifier: tokenBalance.tokenAddress,
            name: tokenBalance.metadata.name,
            symbol: tokenBalance.metadata.symbol,
            amount: tokenBalance.balance,
            decimals: tokenBalance.metadata.decimals,
            logoUrl: tokenBalance.metadata.logoUrl || '',
          })
        }
      }

      return assets
    } catch (error) {
      return []
    }
  }

  async getAsset(identifier: string): Promise<WarpChainAsset | null> {
    try {
      if (identifier === this.chain.nativeToken.identifier || identifier === 'SOL') {
        return this.chain.nativeToken
      }

      const cacheKey = WarpCacheKey.Asset(this.config.env, this.chain.name, identifier)
      const cachedAsset = this.cache.get<WarpChainAsset>(cacheKey)
      if (cachedAsset) {
        return cachedAsset
      }

      const env = this.config.env === 'mainnet' ? 'mainnet' : this.config.env === 'devnet' ? 'devnet' : 'testnet'
      const knownToken = findKnownTokenById(this.chain.name, env, identifier)

      if (knownToken) {
        return {
          chain: this.chain.name,
          identifier,
          name: knownToken.name,
          symbol: knownToken.symbol,
          amount: 0n,
          decimals: knownToken.decimals,
          logoUrl: knownToken.logoUrl,
        }
      }

      const metadata = await this.getTokenMetadata(identifier)

      const asset: WarpChainAsset = {
        chain: this.chain.name,
        identifier,
        name: metadata.name,
        symbol: metadata.symbol,
        amount: 0n,
        decimals: metadata.decimals,
        logoUrl: metadata.logoUrl,
      }

      this.cache.set(cacheKey, asset, CacheTtl.OneHour)

      return asset
    } catch (error) {
      return null
    }
  }

  async getAction(identifier: string, awaitCompleted = false): Promise<WarpChainAction | null> {
    try {
      const signature = identifier
      const tx = await this.connection.getTransaction(signature, {
        commitment: 'confirmed',
        maxSupportedTransactionVersion: 0,
      })

      if (!tx) return null

      const slot = tx.slot
      const blockTime = tx.blockTime ? new Date(tx.blockTime * 1000).toISOString() : new Date().toISOString()

      const message = tx.transaction.message
      let accountKeys: PublicKey[] = []
      if ('staticAccountKeys' in message) {
        accountKeys = message.staticAccountKeys || []
      } else {
        try {
          const allKeys = (message as any).getAccountKeys?.()
          if (allKeys) {
            accountKeys = allKeys.keySegments().flat() || []
          }
        } catch {
          accountKeys = []
        }
      }
      const sender = accountKeys[0]?.toBase58() || ''
      const receiver = accountKeys.length > 1 ? accountKeys[1]?.toBase58() || '' : ''

      const preBalances = tx.meta?.preBalances || []
      const postBalances = tx.meta?.postBalances || []
      const value = preBalances.length > 0 && postBalances.length > 0 ? BigInt(Math.abs(postBalances[0] - preBalances[0])) : 0n

      const status = tx.meta?.err ? 'failed' : 'success'
      let compiledInstructions: any[] = []
      if ('compiledInstructions' in message && Array.isArray(message.compiledInstructions)) {
        compiledInstructions = message.compiledInstructions
      }
      const hasInstructions = compiledInstructions.length > 0

      return {
        chain: this.chain.name,
        id: signature,
        receiver,
        sender,
        value,
        function: hasInstructions ? (compiledInstructions[0]?.programIdIndex !== undefined ? 'contract_call' : 'transfer') : 'transfer',
        status,
        createdAt: blockTime,
        error: tx.meta?.err ? JSON.stringify(tx.meta.err) : null,
        tx: {
          signature,
          slot,
          blockTime,
          err: tx.meta?.err || null,
        } as any,
      }
    } catch (error) {
      return null
    }
  }

  async getAccountActions(address: string, options?: WarpDataLoaderOptions): Promise<WarpChainAction[]> {
    return []
  }

  private async getTokenBalances(address: string): Promise<Array<{ tokenAddress: string; balance: bigint; metadata: { name: string; symbol: string; decimals: number; logoUrl: string } }>> {
    try {
      const publicKey = new PublicKey(address)
      const tokenAccounts = await this.connection.getParsedTokenAccountsByOwner(publicKey, {
        programId: new PublicKey(WarpSolanaConstants.Programs.TokenProgram),
      })

      const env = this.config.env === 'mainnet' ? 'mainnet' : this.config.env === 'devnet' ? 'devnet' : 'testnet'
      const knownTokens = getKnownTokensForChain(this.chain.name, env)

      const balances = await Promise.all(
        tokenAccounts.value.map(async (tokenAccount: any) => {
          const mintAddress = tokenAccount.account.data.parsed.info.mint
          const balance = BigInt(tokenAccount.account.data.parsed.info.tokenAmount.amount)
          const decimals = tokenAccount.account.data.parsed.info.tokenAmount.decimals

          const knownToken = knownTokens.find((token) => token.identifier === mintAddress)

          if (knownToken) {
            return {
              tokenAddress: mintAddress,
              balance,
              metadata: {
                name: knownToken.name,
                symbol: knownToken.symbol,
                decimals: knownToken.decimals,
                logoUrl: getWarpChainAssetLogoUrl(knownToken, this.config) || '',
              },
            }
          }

          const metadata = await this.getTokenMetadata(mintAddress)

          return {
            tokenAddress: mintAddress,
            balance,
            metadata: {
              name: metadata.name,
              symbol: metadata.symbol,
              decimals: metadata.decimals || decimals,
              logoUrl: metadata.logoUrl,
            },
          }
        })
      )

      return balances.filter((b: any) => b.balance > 0n)
    } catch (error) {
      return []
    }
  }

  private async getTokenMetadata(tokenAddress: string): Promise<{ name: string; symbol: string; decimals: number; logoUrl: string }> {
    try {
      const mintPublicKey = new PublicKey(tokenAddress)
      const mintInfo = await getMint(this.connection, mintPublicKey)

      return {
        name: 'Unknown Token',
        symbol: 'UNKNOWN',
        decimals: mintInfo.decimals,
        logoUrl: '',
      }
    } catch (error) {
      return {
        name: 'Unknown Token',
        symbol: 'UNKNOWN',
        decimals: WarpSolanaConstants.NativeToken.Decimals,
        logoUrl: '',
      }
    }
  }
}
