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
    const validatorUrl = this.chain.defaultApiUrl
    const proxyUrl = this.chain.defaultApiUrl
    this.client = new FastsetClient({
      validatorUrl,
      proxyUrl,
    })
  }

  async getAccount(address: string): Promise<WarpChainAccount> {
    try {
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
    } catch (error) {
      return {
        chain: this.chain.name,
        address,
        balance: BigInt(0),
      }
    }
  }

  async getAccountAssets(address: string): Promise<WarpChainAsset[]> {
    try {
      const account = await this.getAccount(address)

      if (account.balance > 0) {
        return [
          {
            chain: this.chain.name,
            identifier: this.chain.nativeToken?.identifier || 'SET',
            name: this.chain.nativeToken?.name || 'SET',
            decimals: this.chain.nativeToken?.decimals || 6,
            amount: account.balance,
            logoUrl: this.chain.nativeToken?.logoUrl,
          },
        ]
      }

      return []
    } catch (error) {
      return []
    }
  }

  async getAccountActions(address: string, options?: WarpDataLoaderOptions): Promise<WarpChainAction[]> {
    return []
  }

  async getAccountInfo(address: string): Promise<FastsetAccountData | null> {
    try {
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
    } catch (error) {
      console.error('Error getting account info:', error)
      return null
    }
  }

  async getTransactionInfo(txHash: string): Promise<FastsetTransactionData | null> {
    try {
      return {
        hash: txHash,
        hashHex: txHash.startsWith('0x') ? txHash.slice(2) : txHash,
        status: 'submitted',
        details: {
          hash: txHash,
          timestamp: new Date().toISOString(),
        },
      }
    } catch (error) {
      console.error('Error getting transaction info:', error)
      return null
    }
  }

  async checkTransferStatus(fromAddress: string, toAddress: string, amount: string): Promise<boolean> {
    try {
      const fromAccount = await this.getAccountInfo(fromAddress)
      const toAccount = await this.getAccountInfo(toAddress)

      if (!fromAccount || !toAccount) {
        return false
      }

      const transferAmount = parseInt(amount)
      const fromBalance = fromAccount.balanceDecimal

      return fromBalance < transferAmount
    } catch (error) {
      console.error('Error checking transfer status:', error)
      return false
    }
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
}
