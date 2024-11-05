import {
  Address,
  ApiNetworkProvider,
  QueryRunnerAdapter,
  SmartContractQueriesController,
  SmartContractTransactionsFactory,
  Transaction,
  TransactionsFactoryConfig,
} from '@multiversx/sdk-core/out'
import { Config } from './config'
import { getChainId } from './helpers'
import { ChainEnv, Warp } from './types'

type RegistryConfig = {
  env: ChainEnv
  chainApiUrl?: string
}

export class WarpRegistry {
  private config: RegistryConfig
  private registerCost: bigint

  constructor(config: RegistryConfig) {
    this.config = config
    this.registerCost = BigInt(0)
    this.loadRegistryInfo(config)
  }

  createRegisterTransaction(warp: Warp): Transaction {
    if (this.registerCost === BigInt(0)) throw new Error('registry config not loaded')
    const config = new TransactionsFactoryConfig({ chainID: getChainId(this.config.env) })
    const factory = new SmartContractTransactionsFactory({ config })
    return factory.createTransactionForExecute({
      sender: Address.newFromBech32(warp.owner),
      contract: Address.newFromBech32(Config.Registry.Contract(this.config.env)),
      function: 'register',
      gasLimit: BigInt(10_000_000),
      nativeTransferAmount: this.registerCost,
    })
  }

  private async loadRegistryInfo(config: RegistryConfig): Promise<void> {
    const contract = Config.Registry.Contract(config.env)
    const networkProvider = new ApiNetworkProvider(config.chainApiUrl || Config.Chain.ApiUrl(config.env), { timeout: 30_000 })
    const queryRunner = new QueryRunnerAdapter({ networkProvider: networkProvider })
    const controller = new SmartContractQueriesController({ queryRunner: queryRunner })
    const query = controller.createQuery({ contract, function: 'getConfig', arguments: [] })
    const res = await controller.runQuery(query)
    const [registerCost] = controller.parseQueryResponse(res)

    console.log('registerCost', registerCost, res)

    this.registerCost = registerCost
  }
}
