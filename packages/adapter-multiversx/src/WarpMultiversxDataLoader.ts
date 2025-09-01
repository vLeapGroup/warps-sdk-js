import { Address, TransactionOnNetwork } from '@multiversx/sdk-core'
import {
  AdapterWarpDataLoader,
  WarpChainAccount,
  WarpChainAction,
  WarpChainActionStatus,
  WarpChainAsset,
  WarpChainInfo,
  WarpClientConfig,
  WarpDataLoaderOptions,
} from '@vleap/warps'
import { WarpMultiversxExecutor } from './WarpMultiversxExecutor'
import { getNormalizedTokenIdentifier } from './helpers/general'

export class WarpMultiversxDataLoader implements AdapterWarpDataLoader {
  constructor(
    private readonly config: WarpClientConfig,
    private readonly chain: WarpChainInfo
  ) {}

  async getAccount(address: string): Promise<WarpChainAccount> {
    const provider = WarpMultiversxExecutor.getChainEntrypoint(this.chain, this.config.env, this.config).createNetworkProvider()
    const accountReq = await provider.getAccount(Address.newFromBech32(address))

    return {
      chain: this.chain.name,
      address: accountReq.address.toBech32(),
      balance: accountReq.balance,
    }
  }

  async getAccountAssets(address: string): Promise<WarpChainAsset[]> {
    const provider = WarpMultiversxExecutor.getChainEntrypoint(this.chain, this.config.env, this.config).createNetworkProvider()
    const accountReq = provider.getAccount(Address.newFromBech32(address))
    const tokensReq = provider.getFungibleTokensOfAccount(Address.newFromBech32(address))
    const [account, tokens] = await Promise.all([accountReq, tokensReq])

    let assets: WarpChainAsset[] = account.balance > 0 ? [{ ...this.chain.nativeToken, amount: account.balance }] : []

    assets.push(
      ...tokens.map((token) => ({
        chain: this.chain.name,
        identifier: token.token.identifier,
        name: token.raw.name,
        amount: token.amount,
        decimals: token.raw.decimals,
        logoUrl: token.raw.assets?.pngUrl || '',
      }))
    )

    return assets
  }

  async getAsset(identifier: string): Promise<WarpChainAsset | null> {
    const provider = WarpMultiversxExecutor.getChainEntrypoint(this.chain, this.config.env, this.config).createNetworkProvider()
    const normalizedIdentifier = getNormalizedTokenIdentifier(identifier)
    const token = await provider.doGetGeneric(`tokens/${normalizedIdentifier}`)

    return {
      chain: this.chain.name,
      identifier: token.identifier,
      name: token.name,
      amount: token.amount,
      decimals: token.decimals,
      logoUrl: token.assets?.pngUrl || '',
    }
  }

  async getAction(identifier: string, awaitCompleted = false): Promise<WarpChainAction | null> {
    const entrypoint = WarpMultiversxExecutor.getChainEntrypoint(this.chain, this.config.env, this.config)
    const tx = awaitCompleted ? await entrypoint.awaitCompletedTransaction(identifier) : await entrypoint.getTransaction(identifier)

    return {
      chain: this.chain.name,
      id: tx.hash,
      receiver: tx.receiver.toBech32(),
      sender: tx.sender.toBech32(),
      value: tx.value,
      function: tx.function,
      status: this.toActionStatus(tx),
      createdAt: this.toActionCreatedAt(tx),
      error: tx?.smartContractResults.map((r) => r.raw.returnMessage)[0] || null,
      tx,
    }
  }

  async getAccountActions(address: string, options?: WarpDataLoaderOptions): Promise<WarpChainAction[]> {
    const provider = WarpMultiversxExecutor.getChainEntrypoint(this.chain, this.config.env, this.config).createNetworkProvider()

    let url = `accounts/${address}/transactions`
    const params = new URLSearchParams()

    const size = options?.size || 25
    const page = options?.page || 0

    if (page > 0) {
      const from = page * size
      params.append('from', from.toString())
    }

    if (size !== 25) {
      params.append('size', size.toString())
    }

    if (params.toString()) {
      url += `?${params.toString()}`
    }

    const transactions = await provider.doGetGeneric(url)

    return transactions.map((tx: any) => ({
      chain: this.chain.name,
      id: tx.txHash,
      receiver: tx.receiver,
      sender: tx.sender,
      value: tx.value,
      function: tx.function,
      status: this.toActionStatus(tx),
      createdAt: this.toActionCreatedAt(tx),
    }))
  }

  private toActionStatus(tx: TransactionOnNetwork): WarpChainActionStatus {
    if (tx.status.isSuccessful()) return 'success'
    if (tx.status.isFailed()) return 'failed'
    return 'pending'
  }

  private toActionCreatedAt(tx: TransactionOnNetwork): string {
    return new Date(tx.timestamp || tx.timestamp * 1000).toISOString()
  }
}
