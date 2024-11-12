import {
  AbiRegistry,
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
import RegistryAbi from './abis/registry.abi.json'
import { Config } from './config'
import { getChainId, toTypedWarpInfo } from './helpers'
import { WarpConfig, WarpInfo } from './types'

export class WarpRegistry {
  private config: WarpConfig
  private registerCost: bigint

  constructor(config: WarpConfig) {
    this.config = config
    this.registerCost = BigInt(0)
  }

  async init(): Promise<void> {
    await this.loadRegistryConfigs()
  }

  createRegisterTransaction(txHash: string, alias?: string | null): Transaction {
    if (this.registerCost === BigInt(0)) throw new Error('registry config not loaded. forgot to call init()?')
    if (!this.config.userAddress) throw new Error('registry config user address not set')
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
    if (!this.config.userAddress) throw new Error('registry config user address not set')

    return this.getFactory().createTransactionForExecute({
      sender: Address.newFromBech32(this.config.userAddress),
      contract: Address.newFromBech32(Config.Registry.Contract(this.config.env)),
      function: 'assignAlias',
      gasLimit: BigInt(10_000_000),
      arguments: [BytesValue.fromUTF8(txHash), BytesValue.fromUTF8(alias)],
    })
  }

  createPublishTransaction(txHash: string): Transaction {
    if (!this.config.userAddress) throw new Error('registry config user address not set')

    return this.getFactory().createTransactionForExecute({
      sender: Address.newFromBech32(this.config.userAddress),
      contract: Address.newFromBech32(Config.Registry.Contract(this.config.env)),
      function: 'publish',
      gasLimit: BigInt(10_000_000),
      arguments: [BytesValue.fromUTF8(txHash)],
    })
  }

  async getInfoByAlias(alias: string): Promise<WarpInfo | null> {
    const contract = Config.Registry.Contract(this.config.env)
    const controller = this.getController()
    const query = controller.createQuery({ contract, function: 'getInfoByAlias', arguments: [BytesValue.fromUTF8(alias)] })
    const res = await controller.runQuery(query)
    const [warpInfoRaw] = controller.parseQueryResponse(res)
    return warpInfoRaw ? toTypedWarpInfo(warpInfoRaw) : null
  }

  private async loadRegistryConfigs(): Promise<void> {
    const contract = Config.Registry.Contract(this.config.env)
    const controller = this.getController()
    const query = controller.createQuery({ contract, function: 'getConfig', arguments: [] })
    const res = await controller.runQuery(query)
    const [registerCostRaw] = controller.parseQueryResponse(res)

    console.log('loadRegistryConfigs registerCostRaw', registerCostRaw)

    const registerCost = BigInt('0x' + byteArrayToHex(registerCostRaw))

    this.registerCost = registerCost
  }

  private getFactory(): SmartContractTransactionsFactory {
    const config = new TransactionsFactoryConfig({ chainID: getChainId(this.config.env) })
    const abi = AbiRegistry.create(RegistryAbi)
    return new SmartContractTransactionsFactory({ config, abi })
  }

  private getController(): SmartContractQueriesController {
    const apiUrl = this.config.chainApiUrl || Config.Chain.ApiUrl(this.config.env)
    const networkProvider = new ApiNetworkProvider(apiUrl, { timeout: 30_000 })
    const queryRunner = new QueryRunnerAdapter({ networkProvider: networkProvider })
    const abi = AbiRegistry.create(RegistryAbi)
    return new SmartContractQueriesController({ queryRunner, abi })
  }
}
