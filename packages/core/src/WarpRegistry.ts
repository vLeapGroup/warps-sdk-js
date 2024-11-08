import {
  Address,
  ApiNetworkProvider,
  BytesValue,
  QueryRunnerAdapter,
  SmartContractQueriesController,
  SmartContractTransactionsFactory,
  Transaction,
  TransactionsFactoryConfig,
} from '@multiversx/sdk-core/out'
import { byteArrayToHex } from '@multiversx/sdk-core/out/utils.codec'
import { Config } from './config'
import { getChainId } from './helpers'
import { ChainEnv } from './types'

type RegistryConfig = {
  env: ChainEnv
  userAddress: string
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

  createRegisterTransaction(txHash: string, alias: string | null = null): Transaction {
    if (this.registerCost === BigInt(0)) throw new Error('registry config not loaded')
    const costAmount = alias ? this.registerCost * BigInt(2) : this.registerCost

    return this.getFactory().createTransactionForExecute({
      sender: Address.newFromBech32(this.config.userAddress),
      contract: Address.newFromBech32(Config.Registry.Contract(this.config.env)),
      function: 'register',
      gasLimit: BigInt(10_000_000),
      nativeTransferAmount: costAmount,
      arguments: alias ? [BytesValue.fromHex(txHash), BytesValue.fromUTF8(alias)] : [BytesValue.fromHex(txHash)],
    })
  }

  createAliasAssignTransaction(txHash: string, alias: string): Transaction {
    return this.getFactory().createTransactionForExecute({
      sender: Address.newFromBech32(this.config.userAddress),
      contract: Address.newFromBech32(Config.Registry.Contract(this.config.env)),
      function: 'assignAlias',
      gasLimit: BigInt(10_000_000),
      arguments: [BytesValue.fromUTF8(txHash), BytesValue.fromUTF8(alias)],
    })
  }

  private getFactory(): SmartContractTransactionsFactory {
    const config = new TransactionsFactoryConfig({ chainID: getChainId(this.config.env) })
    return new SmartContractTransactionsFactory({ config })
  }

  private async loadRegistryInfo(config: RegistryConfig): Promise<void> {
    const contract = Config.Registry.Contract(config.env)
    const networkProvider = new ApiNetworkProvider(config.chainApiUrl || Config.Chain.ApiUrl(config.env), { timeout: 30_000 })
    const queryRunner = new QueryRunnerAdapter({ networkProvider: networkProvider })
    const controller = new SmartContractQueriesController({ queryRunner: queryRunner })
    const query = controller.createQuery({ contract, function: 'getConfig', arguments: [] })
    const res = await controller.runQuery(query)
    const [registerCostRaw] = controller.parseQueryResponse(res)

    const registerCost = BigInt('0x' + byteArrayToHex(registerCostRaw))

    this.registerCost = registerCost
  }
}
