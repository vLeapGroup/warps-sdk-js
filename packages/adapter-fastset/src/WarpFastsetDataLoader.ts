import {
  AdapterWarpDataLoader,
  WarpChainAccount,
  WarpChainAction,
  WarpChainAsset,
  WarpChainInfo,
  WarpClientConfig,
  WarpDataLoaderOptions,
} from '@vleap/warps'
import { FastsetClient } from './sdk/FastsetClient'
import { Wallet } from './sdk/Wallet'

export interface FastsetAccountData {
  address: string
  balance: string
  balanceDecimal: number
  nextNonce: number
  sequenceNumber: number
}

export interface FastsetTransactionData {
  hash: string
  hashHex: string
  status: string
  details: any
}

export class WarpFastsetDataLoader implements AdapterWarpDataLoader {
  private client: FastsetClient

  constructor(
    private readonly config: WarpClientConfig,
    private readonly chain: WarpChainInfo
  ) {
    this.client = new FastsetClient()
  }

  async getAccount(address: string): Promise<WarpChainAccount> {
    const addressBytes = Wallet.decodeBech32Address(address)
    const accountInfo = await this.client.getAccountInfo(addressBytes)

    if (!accountInfo) {
      return {
        chain: this.chain.name,
        address,
        balance: BigInt(0),
      }
    }

    return {
      chain: this.chain.name,
      address,
      balance: BigInt(accountInfo.balance),
    }
  }

  async getAccountAssets(address: string): Promise<WarpChainAsset[]> {
    // Get account info which includes token balances
    const addressBytes = Wallet.decodeBech32Address(address)
    const accountInfo = await this.client.getAccountInfo(addressBytes)

    const assets: WarpChainAsset[] = []

    // Add native token balance
    if (accountInfo && BigInt(accountInfo.balance) > 0) {
      assets.push({
        ...this.chain.nativeToken,
        amount: BigInt(accountInfo.balance),
      })
    }

    // Add token balances from the account info
    if (accountInfo && accountInfo.token_balance.length > 0) {
      for (const [tokenId, balance] of accountInfo.token_balance) {
        const amount = BigInt(balance)
        if (amount > 0) {
          assets.push({
            chain: this.chain.name,
            identifier: Buffer.from(tokenId).toString('hex'),
            symbol: 'TOKEN',
            name: `Token ${Buffer.from(tokenId).toString('hex').slice(0, 8)}`,
            decimals: 6, // Default decimals
            logoUrl: undefined,
            amount,
          })
        }
      }
    }

    return assets
  }

  async getAsset(identifier: string): Promise<WarpChainAsset | null> {
    return null
  }

  async getAction(identifier: string, awaitCompleted = false): Promise<WarpChainAction | null> {
    return null
  }

  async getAccountActions(address: string, options?: WarpDataLoaderOptions): Promise<WarpChainAction[]> {
    return []
  }

  async getAccountInfo(address: string): Promise<FastsetAccountData | null> {
    const addressBytes = Wallet.decodeBech32Address(address)
    const accountInfo = await this.client.getAccountInfo(addressBytes)

    if (!accountInfo) {
      return null
    }

    const balanceDecimal = parseInt(accountInfo.balance)

    return {
      address,
      balance: accountInfo.balance,
      balanceDecimal,
      nextNonce: accountInfo.next_nonce,
      sequenceNumber: accountInfo.next_nonce, // Use next_nonce as sequence number
    }
  }

  async getTransactionInfo(txHash: string): Promise<FastsetTransactionData | null> {
    return {
      hash: txHash,
      hashHex: txHash.startsWith('0x') ? txHash.slice(2) : txHash,
      status: 'submitted',
      details: {
        hash: txHash,
        timestamp: new Date().toISOString(),
      },
    }
  }

  async checkTransferStatus(fromAddress: string, toAddress: string, amount: string): Promise<boolean> {
    const fromAccount = await this.getAccountInfo(fromAddress)
    const toAccount = await this.getAccountInfo(toAddress)

    if (!fromAccount || !toAccount) {
      return false
    }

    const transferAmount = parseInt(amount)
    const fromBalance = fromAccount.balanceDecimal

    return fromBalance < transferAmount
  }

  async getAccountBalance(address: string): Promise<{ balance: string; balanceDecimal: number } | null> {
    const accountInfo = await this.getAccountInfo(address)
    if (!accountInfo) {
      return null
    }

    return {
      balance: accountInfo.balance,
      balanceDecimal: accountInfo.balanceDecimal,
    }
  }

  async getAssetBalance(address: string, assetId: string): Promise<WarpChainAsset | null> {
    const addressBytes = Wallet.decodeBech32Address(address)
    const accountInfo = await this.client.getAccountInfo(addressBytes)

    if (!accountInfo) {
      return null
    }

    // Look for the specific token in the account's token balances
    const tokenBalance = accountInfo.token_balance.find(([tokenId]) => {
      return Buffer.from(tokenId).toString('hex') === assetId
    })

    if (!tokenBalance) {
      return null
    }

    const [, balance] = tokenBalance
    const amount = BigInt(balance)

    if (amount === 0n) {
      return null
    }

    return {
      chain: this.chain.name,
      identifier: assetId,
      symbol: 'TOKEN',
      name: `Token ${assetId.slice(0, 8)}`,
      decimals: 6, // Default decimals
      logoUrl: undefined,
      amount,
    }
  }
}
