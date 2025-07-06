import {
  AbiRegistry,
  Address,
  ArgSerializer,
  DevnetEntrypoint,
  MainnetEntrypoint,
  NetworkEntrypoint,
  SmartContractTransactionsFactory,
  TestnetEntrypoint,
  Token,
  TokenTransfer,
  Transaction,
  TransactionsFactoryConfig,
  TransferTransactionsFactory,
} from '@multiversx/sdk-core/out'
import {
  IChainFactory,
  TxComponents,
  WarpAbiBuilder,
  WarpChainEnv,
  WarpChainInfo,
  WarpConstants,
  WarpContractAction,
  WarpContractActionTransfer,
  WarpInitConfig,
  WarpQueryAction,
} from '@vleap/warps-core'
import { WarpMultiversxContractLoader } from './WarpMultiversxContractLoader'
import { WarpMultiversxSerializer } from './WarpMultiversxSerializer'

export class WarpMultiversxExecutor implements IChainFactory<any> {
  private readonly serializer: WarpMultiversxSerializer
  private readonly contractLoader: WarpMultiversxContractLoader

  constructor(private readonly config: WarpInitConfig) {
    this.serializer = new WarpMultiversxSerializer()
    this.contractLoader = new WarpMultiversxContractLoader(this.config)
  }

  async createTransaction(components: TxComponents): Promise<Transaction> {
    let tx: Transaction | null = null
    if (action.type === 'transfer') {
      tx = await this.adapter.factory().createTransfer(components)
    } else if (action.type === 'contract') {
      tx = await this.adapter.factory().createContractCall(components, action as WarpContractAction)
    } else if (action.type === 'query') {
      throw new Error('WarpActionExecutor: Invalid action type for createTransactionForExecute; Use executeQuery instead')
    } else if (action.type === 'collect') {
      throw new Error('WarpActionExecutor: Invalid action type for createTransactionForExecute; Use executeCollect instead')
    }

    if (!tx) throw new Error(`WarpActionExecutor: Invalid action type (${action.type})`)

    return tx
  }

  async createTransfer(components: TxComponents): Promise<Transaction> {
    if (!this.config.user?.wallet) throw new Error('MultiversxFactory: createTransfer - user address not set')
    const sender = Address.newFromBech32(this.config.user.wallet)
    const config = new TransactionsFactoryConfig({ chainID: components.chain.chainId })
    const data = components.data ? Buffer.from(this.serializer.stringToTyped(components.data).valueOf()) : null
    return new TransferTransactionsFactory({ config }).createTransactionForTransfer(sender, {
      receiver: components.destination,
      nativeAmount: components.value,
      tokenTransfers: components.transfers,
      data: data ? new Uint8Array(data) : undefined,
    })
  }

  async createContractCall(components: TxComponents, action: WarpContractAction): Promise<Transaction> {
    if (!this.config.user?.wallet) throw new Error('MultiversxFactory: createContractCall - user address not set')
    const sender = Address.newFromBech32(this.config.user.wallet)
    const typedArgs = components.args.map((arg) => this.serializer.stringToTyped(arg))
    const config = new TransactionsFactoryConfig({ chainID: components.chain.chainId })
    return new SmartContractTransactionsFactory({ config }).createTransactionForExecute(sender, {
      contract: components.destination,
      function: 'func' in action ? action.func || '' : '',
      gasLimit: 'gasLimit' in action ? BigInt(action.gasLimit || 0) : 0n,
      arguments: typedArgs,
      tokenTransfers: components.transfers,
      nativeTransferAmount: components.value,
    })
  }

  async executeQuery(components: TxComponents): Promise<any> {
    const action = (components as any).action as WarpContractAction
    if (!action) throw new Error('No action provided in components')
    const abi = await this.getAbiForAction(action)
    const typedArgs = components.args.map((arg) => this.serializer.stringToTyped(arg))
    const entrypoint = WarpMultiversxExecutor.getChainEntrypoint(components.chain, this.config.env)
    const contractAddress = Address.newFromBech32(action.address)
    const controller = entrypoint.createSmartContractController(abi)
    const query = controller.createQuery({ contract: contractAddress, function: action.func || '', arguments: typedArgs })
    const response = await controller.runQuery(query)
    const isSuccess = response.returnCode === 'ok'
    const argsSerializer = new ArgSerializer()
    const endpoint = abi.getEndpoint(response.function || action.func || '')
    const parts = (response.returnDataParts || []).map((part: any) => (typeof part === 'string' ? Buffer.from(part) : Buffer.from(part)))
    const typedValues = argsSerializer.buffersToValues(parts, endpoint.output)
    return { isSuccess, typedValues, response }
  }

  static getChainEntrypoint(chainInfo: WarpChainInfo, env: WarpChainEnv): NetworkEntrypoint {
    const clientName = 'warp-sdk'
    const kind = 'api'
    if (env === 'devnet') return new DevnetEntrypoint(chainInfo.apiUrl, kind, clientName)
    if (env === 'testnet') return new TestnetEntrypoint(chainInfo.apiUrl, kind, clientName)
    return new MainnetEntrypoint(chainInfo.apiUrl, kind, clientName)
  }

  public async getAbiForAction(action: WarpContractAction | WarpQueryAction): Promise<AbiRegistry> {
    if (action.abi) {
      return await this.fetchAbi(action)
    }

    const chainInfo = getMainChainInfo(this.config)
    const verification = await this.contractLoader.getVerificationInfo(action.address, chainInfo)
    if (!verification) throw new Error('WarpActionExecutor: Verification info not found')

    return AbiRegistry.create(verification.abi)
  }

  private async fetchAbi(action: WarpContractAction | WarpQueryAction): Promise<AbiRegistry> {
    if (!action.abi) throw new Error('WarpActionExecutor: ABI not found')
    if (action.abi.startsWith(WarpConstants.IdentifierType.Hash)) {
      const abiBuilder = new WarpAbiBuilder(this.config)
      const hashValue = action.abi.split(WarpConstants.IdentifierParamSeparator)[1]
      const abi = await abiBuilder.createFromTransactionHash(hashValue)
      if (!abi) throw new Error(`WarpActionExecutor: ABI not found for hash: ${action.abi}`)
      return AbiRegistry.create(abi.content)
    } else {
      const abiRes = await fetch(action.abi)
      const abiContents = await abiRes.json()
      return AbiRegistry.create(abiContents)
    }
  }

  private toTypedTransfer(transfer: WarpContractActionTransfer): TokenTransfer {
    return new TokenTransfer({
      token: new Token({ identifier: transfer.token, nonce: BigInt(transfer.nonce || 0) }),
      amount: BigInt(transfer.amount || 0),
    })
  }
}
