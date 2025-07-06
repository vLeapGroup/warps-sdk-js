import {
  Address,
  ArgSerializer,
  DevnetEntrypoint,
  MainnetEntrypoint,
  NetworkEntrypoint,
  SmartContractTransactionsFactory,
  TestnetEntrypoint,
  Transaction,
  TransactionsFactoryConfig,
  TransferTransactionsFactory,
} from '@multiversx/sdk-core/out'
import {
  applyResultsToMessages,
  getNextInfo,
  getWarpActionByIndex,
  WarpCache,
  WarpChainEnv,
  WarpChainInfo,
  WarpExecutable,
  WarpExecution,
  WarpInitConfig,
  WarpInterpolator,
  WarpQueryAction,
} from '@vleap/warps-core'
import { WarpMultiversxAbi } from './WarpMultiversxAbi'
import { WarpMultiversxResults } from './WarpMultiversxResults'
import { WarpMultiversxSerializer } from './WarpMultiversxSerializer'

export class WarpMultiversxExecutor {
  private readonly serializer: WarpMultiversxSerializer
  private readonly abi: WarpMultiversxAbi
  private readonly cache: WarpCache
  private readonly results: WarpMultiversxResults

  constructor(private readonly config: WarpInitConfig) {
    this.serializer = new WarpMultiversxSerializer()
    this.abi = new WarpMultiversxAbi(this.config)
    this.cache = new WarpCache(this.config.cache?.type)
    this.results = new WarpMultiversxResults(this.config)
  }

  async createTransaction(executable: WarpExecutable): Promise<Transaction> {
    const action = getWarpActionByIndex(executable.warp, executable.action)

    let tx: Transaction | null = null
    if (action.type === 'transfer') {
      tx = await this.createTransferTransaction(executable)
    } else if (action.type === 'contract') {
      tx = await this.createContractCallTransaction(executable)
    } else if (action.type === 'query') {
      throw new Error('WarpMultiversxExecutor: Invalid action type for createTransactionForExecute; Use executeQuery instead')
    } else if (action.type === 'collect') {
      throw new Error('WarpMultiversxExecutor: Invalid action type for createTransactionForExecute; Use executeCollect instead')
    }

    if (!tx) throw new Error(`WarpMultiversxExecutor: Invalid action type (${action.type})`)

    return tx
  }

  async createTransferTransaction(executable: WarpExecutable): Promise<Transaction> {
    if (!this.config.user?.wallet) throw new Error('WarpMultiversxExecutor: createTransfer - user address not set')
    const sender = Address.newFromBech32(this.config.user.wallet)
    const config = new TransactionsFactoryConfig({ chainID: executable.chain.chainId })
    const data = executable.data ? Buffer.from(this.serializer.stringToTyped(executable.data).valueOf()) : null
    return new TransferTransactionsFactory({ config }).createTransactionForTransfer(sender, {
      receiver: Address.newFromBech32(executable.destination),
      nativeAmount: executable.value,
      //   tokenTransfers: executable.transfers, // TODO
      data: data ? new Uint8Array(data) : undefined,
    })
  }

  async createContractCallTransaction(executable: WarpExecutable): Promise<Transaction> {
    if (!this.config.user?.wallet) throw new Error('WarpMultiversxExecutor: createContractCall - user address not set')
    const action = getWarpActionByIndex(executable.warp, executable.action)
    const sender = Address.newFromBech32(this.config.user.wallet)
    const typedArgs = executable.args.map((arg) => this.serializer.stringToTyped(arg))
    const config = new TransactionsFactoryConfig({ chainID: executable.chain.chainId })
    return new SmartContractTransactionsFactory({ config }).createTransactionForExecute(sender, {
      contract: Address.newFromBech32(executable.destination),
      function: 'func' in action ? action.func || '' : '',
      gasLimit: 'gasLimit' in action ? BigInt(action.gasLimit || 0) : 0n,
      arguments: typedArgs,
      //   tokenTransfers: executable.transfers, // TODO
      nativeTransferAmount: executable.value,
    })
  }

  async executeQuery(executable: WarpExecutable): Promise<WarpExecution> {
    const action = getWarpActionByIndex(executable.warp, executable.action) as WarpQueryAction
    if (action.type !== 'query') throw new Error(`WarpMultiversxExecutor: Invalid action type for executeQuery: ${action.type}`)
    const preparedWarp = await WarpInterpolator.apply(this.config, executable.warp)
    const abi = await this.abi.getAbiForAction(action)
    const typedArgs = executable.args.map((arg) => this.serializer.stringToTyped(arg))
    const entrypoint = WarpMultiversxExecutor.getChainEntrypoint(executable.chain, this.config.env)
    const contractAddress = Address.newFromBech32(executable.destination)
    const controller = entrypoint.createSmartContractController(abi)
    const query = controller.createQuery({ contract: contractAddress, function: action.func || '', arguments: typedArgs })
    const response = await controller.runQuery(query)
    const isSuccess = response.returnCode === 'ok'
    const argsSerializer = new ArgSerializer()
    const endpoint = abi.getEndpoint(response.function || action.func || '')
    const parts = (response.returnDataParts || []).map((part: any) => (typeof part === 'string' ? Buffer.from(part) : Buffer.from(part)))
    const typedValues = argsSerializer.buffersToValues(parts, endpoint.output)

    const results = await this.results.extractQueryResults(preparedWarp, tx, executable.action, executable.resolvedInputs)
    const next = getNextInfo(this.config, preparedWarp, executable.action, results)

    return {
      success: results.success,
      warp: preparedWarp,
      action: executable.action,
      user: this.config.user?.wallet || null,
      txHash: null,
      next,
      values: results.values,
      results,
      messages: applyResultsToMessages(preparedWarp, results),
    }
  }

  static getChainEntrypoint(chainInfo: WarpChainInfo, env: WarpChainEnv): NetworkEntrypoint {
    const clientName = 'warp-sdk'
    const kind = 'api'
    if (env === 'devnet') return new DevnetEntrypoint(chainInfo.apiUrl, kind, clientName)
    if (env === 'testnet') return new TestnetEntrypoint(chainInfo.apiUrl, kind, clientName)
    return new MainnetEntrypoint(chainInfo.apiUrl, kind, clientName)
  }
}
