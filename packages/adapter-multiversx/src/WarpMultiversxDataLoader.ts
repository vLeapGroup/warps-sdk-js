import { Address } from '@multiversx/sdk-core'
import {
    AdapterWarpDataLoader,
    WarpChainAccount,
    WarpChainAction,
    WarpChainAsset,
    WarpChainInfo,
    WarpClientConfig,
    WarpDataLoaderOptions,
} from '@vleap/warps'
import { WarpMultiversxExecutor } from './WarpMultiversxExecutor'

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

    assets.push(...tokens.map((token) => ({
      chain: this.chain.name,
      identifier: token.token.identifier,
      name: token.raw.name,
      amount: token.amount,
      decimals: token.raw.decimals,
      logoUrl: token.raw.assets?.pngUrl || '',
    })))

    return assets
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
      status: tx.status,
      createdAt: new Date(tx.timestampMs || tx.timestamp * 1000).toISOString(),
    }))
  }
}
