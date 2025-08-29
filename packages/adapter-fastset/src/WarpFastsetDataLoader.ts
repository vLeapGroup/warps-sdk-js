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
    const accountInfo = await this.client.getAccountInfo(address)

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
      balance: BigInt(parseInt(accountInfo.balance, 16)),
    }
  }

  async getAccountAssets(address: string): Promise<WarpChainAsset[]> {
    const assets: WarpChainAsset[] = []

    // Get native token balance
    const account = await this.getAccount(address)
    if (account.balance > 0) {
      assets.push({
        chain: this.chain.name,
        identifier: this.chain.nativeToken?.identifier || 'SET',
        name: this.chain.nativeToken?.name || 'SET',
        decimals: this.chain.nativeToken?.decimals || 6,
        amount: account.balance,
        logoUrl: this.chain.nativeToken?.logoUrl,
      })
    }

    // Get all asset balances for the account
    const assetBalances = await this.client.getAssetBalances(address)
    if (assetBalances) {
      for (const [assetId, assetBalance] of Object.entries(assetBalances)) {
        if (assetBalance.balance) {
          const amount = BigInt(assetBalance.balance)
          if (amount > 0) {
            assets.push({
              chain: this.chain.name,
              identifier: assetId,
              name: assetBalance.name || assetId,
              decimals: assetBalance.decimals || 6,
              amount,
              logoUrl: assetBalance.logo_url,
            })
          }
        }
      }
    }

    return assets
  }

  async getAccountActions(address: string, options?: WarpDataLoaderOptions): Promise<WarpChainAction[]> {
    return []
  }

  async getAccountInfo(address: string): Promise<FastsetAccountData | null> {
    const accountInfo = await this.client.getAccountInfo(address)

    if (!accountInfo) {
      return null
    }

    const balanceDecimal = parseInt(accountInfo.balance, 16)

    return {
      address,
      balance: accountInfo.balance,
      balanceDecimal,
      nextNonce: accountInfo.next_nonce,
      sequenceNumber: accountInfo.sequence_number,
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
    const assetBalance = await this.client.getAssetBalance(address, assetId)

    if (!assetBalance || !assetBalance.balance) {
      return null
    }

    const amount = BigInt(assetBalance.balance)
    if (amount === 0n) {
      return null
    }

    return {
      chain: this.chain.name,
      identifier: assetId,
      name: assetBalance.name || assetId,
      decimals: assetBalance.decimals || 6,
      amount,
      logoUrl: assetBalance.logo_url,
    }
  }
}
