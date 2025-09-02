import {
  AdapterWarpDataLoader,
  getProviderUrl,
  WarpChainAccount,
  WarpChainAction,
  WarpChainAsset,
  WarpChainInfo,
  WarpClientConfig,
  WarpDataLoaderOptions,
} from '@vleap/warps'
import { ethers } from 'ethers'
import { EvmLogoService } from './LogoService'
import { findKnownTokenById, getKnownTokensForChain } from './tokens'

interface TokenMetadata {
  name: string
  symbol: string
  decimals: number
  logoUrl?: string
}

interface TokenBalance {
  tokenAddress: string
  balance: bigint
  metadata: TokenMetadata
}

const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function totalSupply() view returns (uint256)',
]

const ERC20_TRANSFER_EVENT = 'event Transfer(address indexed from, address indexed to, uint256 value)'

export class WarpEvmDataLoader implements AdapterWarpDataLoader {
  private provider: ethers.JsonRpcProvider

  constructor(
    private readonly config: WarpClientConfig,
    private readonly chain: WarpChainInfo
  ) {
    const apiUrl = getProviderUrl(this.config, this.chain.name, this.config.env, this.chain.defaultApiUrl)
    const network = new ethers.Network(this.chain.name, parseInt(this.chain.chainId))
    this.provider = new ethers.JsonRpcProvider(apiUrl, network)
  }

  async getAccount(address: string): Promise<WarpChainAccount> {
    const balance = await this.provider.getBalance(address)

    return {
      chain: this.chain.name,
      address,
      balance,
    }
  }

  async getAccountAssets(address: string): Promise<WarpChainAsset[]> {
    const account = await this.getAccount(address)
    const tokenBalances = await this.getERC20TokenBalances(address)

    let assets: WarpChainAsset[] = account.balance > 0 ? [{ ...this.chain.nativeToken, amount: account.balance }] : []

    for (const tokenBalance of tokenBalances) {
      if (tokenBalance.balance > 0n) {
        const logoUrl = tokenBalance.metadata.logoUrl || (await this.getLogoUrl(tokenBalance))

        assets.push({
          chain: this.chain.name,
          identifier: tokenBalance.tokenAddress,
          name: tokenBalance.metadata.name,
          amount: tokenBalance.balance,
          decimals: tokenBalance.metadata.decimals,
          logoUrl: logoUrl || '',
        })
      }
    }

    return assets
  }

  async getAsset(identifier: string): Promise<WarpChainAsset | null> {
    try {
      const metadata = await this.getTokenMetadata(identifier)

      if (!metadata) return null

      return {
        chain: this.chain.name,
        identifier,
        name: metadata.name,
        amount: 0n,
        decimals: metadata.decimals,
        logoUrl: metadata.logoUrl || '',
      }
    } catch (error) {
      return null
    }
  }

  async getAction(identifier: string, awaitCompleted = false): Promise<WarpChainAction | null> {
    try {
      const tx = await this.provider.getTransaction(identifier)
      if (!tx) return null

      const receipt = await this.provider.getTransactionReceipt(identifier)
      const block = await this.provider.getBlock(tx.blockNumber || 'latest')

      return {
        chain: this.chain.name,
        id: tx.hash || identifier,
        receiver: tx.to || '',
        sender: tx.from,
        value: tx.value,
        function: tx.data && tx.data !== '0x' ? 'contract_call' : '',
        status: receipt?.status === 1 ? 'success' : receipt?.status === 0 ? 'failed' : 'pending',
        createdAt: block?.timestamp ? new Date(Number(block.timestamp) * 1000).toISOString() : new Date().toISOString(),
        error: receipt?.status === 0 ? 'Transaction failed' : null,
        tx: {
          hash: tx.hash || '',
          from: tx.from,
          to: tx.to || '',
          value: tx.value.toString(),
          data: tx.data || '0x',
          gasLimit: tx.gasLimit?.toString() || '0',
          gasPrice: tx.gasPrice?.toString() || '0',
          blockNumber: tx.blockNumber || 0,
          blockHash: tx.blockHash || '',
          transactionIndex: tx.index || 0,
        } as any,
      }
    } catch (error) {
      return null
    }
  }

  async getAccountActions(address: string, options?: WarpDataLoaderOptions): Promise<WarpChainAction[]> {
    return []
  }

  private async getERC20TokenBalances(address: string): Promise<TokenBalance[]> {
    const tokenBalances: TokenBalance[] = []
    const env = this.config.env === 'devnet' ? 'testnet' : this.config.env
    const knownTokens = getKnownTokensForChain(this.chain.name, env)

    for (const token of knownTokens) {
      try {
        const balance = await this.getTokenBalance(address, token.id)
        if (balance > 0n) {
          tokenBalances.push({
            tokenAddress: token.id,
            balance,
            metadata: token,
          })
        }
      } catch (error) {}
    }

    const additionalTokens = await this.detectTokensFromEvents(address)
    for (const tokenAddress of additionalTokens) {
      if (!findKnownTokenById(this.chain.name, tokenAddress, env)) {
        try {
          const metadata = await this.getTokenMetadata(tokenAddress)
          const balance = await this.getTokenBalance(address, tokenAddress)
          if (balance > 0n) {
            tokenBalances.push({
              tokenAddress,
              balance,
              metadata,
            })
          }
        } catch (error) {}
      }
    }

    return tokenBalances
  }

  private async getTokenBalance(address: string, tokenAddress: string): Promise<bigint> {
    const contract = new ethers.Contract(tokenAddress, ERC20_ABI, this.provider)
    const balance = await contract.balanceOf(address)
    return balance
  }

  private async getTokenMetadata(tokenAddress: string): Promise<TokenMetadata> {
    const tokenInfo = await EvmLogoService.getTokenInfo(this.chain.name, tokenAddress)

    if (tokenInfo.name && tokenInfo.symbol && tokenInfo.decimals !== undefined) {
      return {
        name: tokenInfo.name,
        symbol: tokenInfo.symbol,
        decimals: tokenInfo.decimals,
        logoUrl: tokenInfo.logoURI,
      }
    }

    const contract = new ethers.Contract(tokenAddress, ERC20_ABI, this.provider)
    const [name, symbol, decimals] = await Promise.all([
      contract.name().catch(() => tokenInfo.name || 'Unknown Token'),
      contract.symbol().catch(() => tokenInfo.symbol || 'UNKNOWN'),
      contract.decimals().catch(() => tokenInfo.decimals || 18),
    ])

    return {
      name: name || tokenInfo.name || 'Unknown Token',
      symbol: symbol || tokenInfo.symbol || 'UNKNOWN',
      decimals: decimals || tokenInfo.decimals || 18,
      logoUrl: tokenInfo.logoURI,
    }
  }

  private async detectTokensFromEvents(address: string): Promise<string[]> {
    try {
      const currentBlock = await this.provider.getBlockNumber()
      const fromBlock = Math.max(0, currentBlock - 10000)

      const filter = {
        fromBlock,
        toBlock: currentBlock,
        topics: [ethers.id('Transfer(address,address,uint256)'), null, ethers.zeroPadValue(address, 32)],
      }

      const logs = await this.provider.getLogs(filter)

      const tokenAddresses = new Set<string>()
      for (const log of logs) {
        tokenAddresses.add(log.address)
      }

      return Array.from(tokenAddresses)
    } catch (error) {
      return []
    }
  }

  private async getLogoUrl(tokenBalance: TokenBalance): Promise<string> {
    return await EvmLogoService.getLogoUrl(
      this.chain.name,
      tokenBalance.tokenAddress,
      tokenBalance.metadata.name,
      tokenBalance.metadata.symbol
    )
  }
}
