import { Address } from '@multiversx/sdk-core'
import { AdapterWarpDataLoader, WarpChainAccount, WarpChainAsset, WarpChainInfo, WarpClientConfig } from '@vleap/warps'
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
      address: accountReq.address.toBech32(),
      balance: accountReq.balance,
    }
  }

  async getAccountAssets(address: string): Promise<WarpChainAsset[]> {
    const provider = WarpMultiversxExecutor.getChainEntrypoint(this.chain, this.config.env, this.config).createNetworkProvider()
    const tokensReq = await provider.getFungibleTokensOfAccount(Address.newFromBech32(address))

    return tokensReq.map((token) => ({
      identifier: token.token.identifier,
      name: token.raw.name,
      amount: token.amount,
      decimals: token.raw.decimals,
      logoUrl: token.raw.assets?.pngUrl || '',
    }))
  }
}
