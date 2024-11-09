import {
  Address,
  ApiNetworkProvider,
  BooleanValue,
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
import { RegistryInfo, WarpConfig } from './types'

export class WarpRegistry {
  private config: WarpConfig
  private registerCost: bigint

  constructor(config: WarpConfig) {
    this.config = config
    this.registerCost = BigInt(0)
  }

  async init(): Promise<void> {
    await this.loadRegistryInfo()
  }

  createRegisterTransaction(txHash: string, registryInfo: RegistryInfo): Transaction {
    if (this.registerCost === BigInt(0)) throw new Error('registry config not loaded. forgot to call init()?')
    if (!this.config.userAddress) throw new Error('registry config user address not set')
    const costAmount = registryInfo.alias ? this.registerCost * BigInt(2) : this.registerCost

    return this.getFactory().createTransactionForExecute({
      sender: Address.newFromBech32(this.config.userAddress),
      contract: Address.newFromBech32(Config.Registry.Contract(this.config.env)),
      function: 'register',
      gasLimit: BigInt(10_000_000),
      nativeTransferAmount: costAmount,
      arguments: registryInfo.alias
        ? [BytesValue.fromHex(txHash), new BooleanValue(registryInfo.isPublic), BytesValue.fromUTF8(registryInfo.alias)]
        : [BytesValue.fromHex(txHash), new BooleanValue(registryInfo.isPublic)],
    })
  }

  createAliasAssignTransaction(txHash: string, alias: string): Transaction {
    if (!this.config.userAddress) throw new Error('registry config user address not set')

    return this.getFactory().createTransactionForExecute({
      sender: Address.newFromBech32(this.config.userAddress),
      contract: Address.newFromBech32(Config.Registry.Contract(this.config.env)),
      function: 'assignAlias',
      gasLimit: BigInt(10_000_000),
      arguments: [BytesValue.fromUTF8(txHash), BytesValue.fromUTF8(alias)],
    })
  }

  async resolveAlias(alias: string): Promise<string | null> {
    const contract = Config.Registry.Contract(this.config.env)
    const controller = this.getController()
    const query = controller.createQuery({ contract, function: 'resolveAlias', arguments: [BytesValue.fromUTF8(alias)] })
    const res = await controller.runQuery(query)
    console.log('resolveAlias res', res)
    const [txHashRaw] = controller.parseQueryResponse(res)
    console.log('resolveAlias txHashRaw', txHashRaw)
    return txHashRaw?.toString() || null
  }

  private async loadRegistryInfo(): Promise<void> {
    const contract = Config.Registry.Contract(this.config.env)
    const controller = this.getController()
    const query = controller.createQuery({ contract, function: 'getConfig', arguments: [] })
    const res = await controller.runQuery(query)
    const [registerCostRaw] = controller.parseQueryResponse(res)

    const registerCost = BigInt('0x' + byteArrayToHex(registerCostRaw))

    this.registerCost = registerCost
  }

  private getFactory(): SmartContractTransactionsFactory {
    const config = new TransactionsFactoryConfig({ chainID: getChainId(this.config.env) })
    return new SmartContractTransactionsFactory({ config })
  }

  private getController(): SmartContractQueriesController {
    const apiUrl = this.config.chainApiUrl || Config.Chain.ApiUrl(this.config.env)
    const networkProvider = new ApiNetworkProvider(apiUrl, { timeout: 30_000 })
    const queryRunner = new QueryRunnerAdapter({ networkProvider: networkProvider })
    return new SmartContractQueriesController({ queryRunner: queryRunner })
  }
}
