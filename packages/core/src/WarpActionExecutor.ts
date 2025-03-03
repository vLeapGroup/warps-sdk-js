import {
  AbiRegistry,
  Address,
  ApiNetworkProvider,
  IContractQueryResponse,
  QueryRunnerAdapter,
  ResultsParser,
  SmartContractQueriesController,
  SmartContractTransactionsFactory,
  StringValue,
  Token,
  TokenTransfer,
  Transaction,
  TransactionsFactoryConfig,
  TransferTransactionsFactory,
  TypedValue,
} from '@multiversx/sdk-core/out'
import { getChainId, shiftBigintBy } from './helpers'
import {
  WarpAction,
  WarpActionInput,
  WarpCollectAction,
  WarpConfig,
  WarpContractAction,
  WarpContractActionTransfer,
  WarpQueryAction,
  WarpTransferAction,
} from './types'
import { WarpArgSerializer } from './WarpArgSerializer'
import { WarpContractLoader } from './WarpContractLoader'

type ResolvedInput = {
  input: WarpActionInput
  value: string | null
}

export class WarpActionExecutor {
  private config: WarpConfig
  private url: URL
  private serializer: WarpArgSerializer
  private contractLoader: WarpContractLoader

  constructor(config: WarpConfig) {
    if (!config.currentUrl) throw new Error('WarpActionExecutor: currentUrl config not set')
    this.config = config
    this.url = new URL(config.currentUrl)
    this.serializer = new WarpArgSerializer()
    this.contractLoader = new WarpContractLoader(config)
  }

  createTransactionForExecute(
    action: WarpTransferAction | WarpContractAction,
    inputs: string[],
    inputTransfers: TokenTransfer[]
  ): Transaction {
    if (!this.config.userAddress) throw new Error('WarpActionExecutor: user address not set')
    const sender = Address.newFromBech32(this.config.userAddress)
    const config = new TransactionsFactoryConfig({ chainID: getChainId(this.config.env) })

    const { destination, args, value, transfers } = this.getTxComponentsFromInputs(action, inputs, inputTransfers, sender)
    const typedArgs = args.map((arg) => this.serializer.stringToTyped(arg))

    if (destination.isContractAddress()) {
      return new SmartContractTransactionsFactory({ config }).createTransactionForExecute({
        sender,
        contract: destination,
        function: 'func' in action ? action.func || '' : '',
        gasLimit: 'gasLimit' in action ? BigInt(action.gasLimit || 0) : 0n,
        arguments: typedArgs,
        tokenTransfers: transfers,
        nativeTransferAmount: value,
      })
    }

    return new TransferTransactionsFactory({ config }).createTransactionForTransfer({
      sender,
      receiver: destination,
      nativeAmount: value,
      tokenTransfers: transfers,
      data: typedArgs[0]?.hasExactClass(StringValue.ClassName) ? typedArgs[0].valueOf() : undefined,
    })
  }

  async executeQuery(action: WarpQueryAction, inputs: string[]): Promise<TypedValue> {
    if (!this.config.chainApiUrl) throw new Error('WarpActionExecutor: Chain API URL not set')
    if (!action.func) throw new Error('WarpActionExecutor: Function not found')
    const chainApi = new ApiNetworkProvider(this.config.chainApiUrl, { timeout: 30_000 })
    const queryRunner = new QueryRunnerAdapter({ networkProvider: chainApi })
    const abi = await this.getAbiForAction(action)
    const { args } = this.getTxComponentsFromInputs(action, inputs, [])
    const typedArgs = args.map((arg) => this.serializer.stringToTyped(arg))
    const controller = new SmartContractQueriesController({ queryRunner, abi })
    const query = controller.createQuery({ contract: action.address, function: action.func, arguments: typedArgs })
    const response = await controller.runQuery(query)

    const legacyResultsParser = new ResultsParser()
    const legacyQueryResponse: IContractQueryResponse = {
      returnCode: response.returnCode,
      returnMessage: response.returnMessage,
      getReturnDataParts: () => response.returnDataParts.map((part) => Buffer.from(part)),
    }

    const functionName = response.function
    const endpoint = abi.getEndpoint(functionName)
    const legacyBundle = legacyResultsParser.parseQueryResponse(legacyQueryResponse, endpoint)
    const result = legacyBundle.firstValue
    if (!result) throw new Error('WarpActionExecutor: Query result not found')

    return result
  }

  async executeCollect(action: WarpCollectAction, inputs: Record<string, any>, meta?: Record<string, any>): Promise<void> {
    const headers = new Headers()
    headers.set('Content-Type', 'application/json')
    headers.set('Accept', 'application/json')
    Object.entries(action.destination.headers).forEach(([key, value]) => {
      headers.set(key, value as string)
    })

    await fetch(action.destination.url, {
      method: action.destination.method,
      headers,
      body: JSON.stringify({ inputs, meta }),
    })
  }

  getTxComponentsFromInputs(
    action: WarpTransferAction | WarpContractAction | WarpQueryAction,
    inputs: string[],
    inputTransfers: TokenTransfer[],
    sender?: Address
  ): { destination: Address; args: string[]; value: bigint; transfers: TokenTransfer[] } {
    const resolvedInputs = this.getResolvedInputs(action, inputs)
    const modifiedInputs = this.getModifiedInputs(resolvedInputs)

    const destinationInput = modifiedInputs.find((i) => i.input.position === 'receiver')?.value
    const detinationInAction = 'address' in action ? action.address : null
    const destinationRaw = destinationInput?.split(':')[1] || detinationInAction || sender?.toBech32()
    if (!destinationRaw) throw new Error('WarpActionExecutor: Destination/Receiver not provided')
    const destination = Address.newFromBech32(destinationRaw)

    const args = this.getPreparedArgs(action, modifiedInputs)

    const valueInput = modifiedInputs.find((i) => i.input.position === 'value')?.value || null
    const valueInAction = 'value' in action ? action.value : null
    const value = BigInt(valueInput?.split(':')[1] || valueInAction || 0)

    const transfersInAction = 'transfers' in action ? action.transfers : []
    const transfers = [...(transfersInAction?.map(this.toTypedTransfer) || []), ...inputTransfers]

    return { destination, args, value, transfers }
  }

  private getModifiedInputs(inputs: ResolvedInput[]): ResolvedInput[] {
    // Note: 'scale' modifier means that the value is multiplied by 10^modifier; the modifier can also be the name of another input field
    // Example: 'scale:10' means that the value is multiplied by 10^10
    // Example 2: 'scale:{amount}' means that the value is multiplied by the value of the 'amount' input field

    // TODO: refactor once more modifiers are added

    return inputs.map((resolved, index) => {
      if (resolved.input.modifier?.startsWith('scale:')) {
        const [, exponent] = resolved.input.modifier.split(':')
        if (isNaN(Number(exponent))) {
          // Scale by another input field
          const exponentVal = Number(inputs.find((i) => i.input.name === exponent)?.value?.split(':')[1])
          if (!exponentVal) throw new Error(`WarpActionExecutor: Exponent value not found for input ${exponent}`)
          const scalableVal = resolved.value?.split(':')[1]
          if (!scalableVal) throw new Error('WarpActionExecutor: Scalable value not found')
          const scaledVal = shiftBigintBy(scalableVal, +exponentVal)
          return { ...resolved, value: `${resolved.input.type}:${scaledVal}` }
        } else {
          // Scale by fixed amount
          const scalableVal = resolved.value?.split(':')[1]
          if (!scalableVal) throw new Error('WarpActionExecutor: Scalable value not found')
          const scaledVal = shiftBigintBy(scalableVal, +exponent)
          return { ...resolved, value: `${resolved.input.type}:${scaledVal}` }
        }
      } else {
        return resolved
      }
    })
  }

  private getResolvedInputs(action: WarpAction, inputArgs: string[]): ResolvedInput[] {
    const argInputs = action.inputs || []

    const toValueByType = (input: WarpActionInput, index: number) => {
      if (input.source === 'query') return this.serializer.nativeToString(input.type, this.url.searchParams.get(input.name) || '')
      return inputArgs[index] || null
    }

    return argInputs.map((input, index) => ({
      input,
      value: toValueByType(input, index),
    }))
  }

  private getPreparedArgs(action: WarpAction, resolvedInputs: ResolvedInput[]): string[] {
    let args = 'args' in action ? action.args : []
    resolvedInputs.forEach(({ input, value }) => {
      if (!value) return
      if (!input.position.startsWith('arg:')) return
      const argIndex = Number(input.position.split(':')[1]) - 1
      args.splice(argIndex, 0, value)
    })

    return args
  }

  private async getAbiForAction(action: WarpQueryAction): Promise<AbiRegistry> {
    if (action.abi) {
      return await this.fetchAbi(action)
    }

    const verification = await this.contractLoader.getVerificationInfo(action.address)
    if (!verification) throw new Error('WarpActionExecutor: Verification info not found')

    return AbiRegistry.create(verification.abi)
  }

  private async fetchAbi(action: WarpQueryAction): Promise<AbiRegistry> {
    if (!action.abi) throw new Error('WarpActionExecutor: ABI not found')
    const abiRes = await fetch(action.abi)
    const abiContents = await abiRes.json()
    return AbiRegistry.create(abiContents)
  }

  private toTypedTransfer(transfer: WarpContractActionTransfer): TokenTransfer {
    return new TokenTransfer({
      token: new Token({ identifier: transfer.token, nonce: BigInt(transfer.nonce || 0) }),
      amount: BigInt(transfer.amount || 0),
    })
  }
}
