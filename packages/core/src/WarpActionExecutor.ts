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
} from './types'
import { WarpArgSerializer } from './WarpArgSerializer'
import { WarpContractLoader } from './WarpContractLoader'

export class WarpActionExecutor {
  private config: WarpConfig
  private url: URL
  private serializer: WarpArgSerializer
  private contractLoader: WarpContractLoader

  constructor(config: WarpConfig, url: string) {
    this.config = config
    this.url = new URL(url)
    this.serializer = new WarpArgSerializer()
    this.contractLoader = new WarpContractLoader(config)
  }

  createTransactionForExecute(action: WarpContractAction, inputs: string[], inputTransfers: TokenTransfer[]): Transaction {
    if (!this.config.userAddress) throw new Error('WarpActionExecutor: user address not set')
    const sender = Address.newFromBech32(this.config.userAddress)
    const destination = Address.newFromBech32(action.address)
    const config = new TransactionsFactoryConfig({ chainID: getChainId(this.config.env) })

    const args = this.getCombinedInputs(action, inputs)
    const modifiedCombinedArgs = this.getModifiedInputs(action, args)
    const typedArgs = modifiedCombinedArgs.map((arg) => this.serializer.stringToTyped(arg))
    const nativeValueFromField = this.getNativeValueFromField(action, inputs)
    const nativeValueFromUrl = this.getNativeValueFromUrl(action)
    const nativeTransferAmount = BigInt(nativeValueFromField || nativeValueFromUrl || action.value || 0)
    const combinedTransfers = this.getCombinedTokenTransfers(action, inputTransfers)

    if (destination.isContractAddress()) {
      return new SmartContractTransactionsFactory({ config }).createTransactionForExecute({
        sender,
        contract: destination,
        function: action.func || '',
        gasLimit: BigInt(action.gasLimit),
        arguments: typedArgs,
        tokenTransfers: combinedTransfers,
        nativeTransferAmount,
      })
    }

    return new TransferTransactionsFactory({ config }).createTransactionForTransfer({
      sender,
      receiver: destination,
      nativeAmount: nativeTransferAmount,
      tokenTransfers: combinedTransfers,
      data: typedArgs[0]?.hasExactClass(StringValue.ClassName) ? typedArgs[0].valueOf() : undefined,
    })
  }

  async executeQuery(action: WarpQueryAction, inputs: string[]): Promise<TypedValue> {
    if (!this.config.chainApiUrl) throw new Error('WarpActionExecutor: Chain API URL not set')
    if (!action.func) throw new Error('WarpActionExecutor: Function not found')
    const chainApi = new ApiNetworkProvider(this.config.chainApiUrl, { timeout: 30_000 })
    const queryRunner = new QueryRunnerAdapter({ networkProvider: chainApi })
    const abi = await this.getAbiForAction(action)
    const modifiedInputArgs = this.getModifiedInputs(action, inputs)
    const txArgs = this.getCombinedInputs(action, modifiedInputArgs)
    const typedArgs = txArgs.map((arg) => this.serializer.stringToTyped(arg))
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

  async executeCollect(action: WarpCollectAction, inputs: string[]): Promise<void> {
    const headers = new Headers()
    headers.set('Content-Type', 'application/json')
    headers.set('Accept', 'application/json')
    Object.entries(action.destination.headers).forEach(([key, value]) => {
      headers.set(key, value as string)
    })

    await fetch(action.destination.url, {
      method: action.destination.method,
      headers,
      body: JSON.stringify({ inputs }),
    })
  }

  getArgumentsForInputs(action: WarpAction, inputs: string[]): string[] {
    const modifiedInputArgs = this.getModifiedInputs(action, inputs)
    const txArgs = this.getCombinedInputs(action, modifiedInputArgs)
    return txArgs
  }

  getNativeValueFromField(action: WarpAction, inputs: string[]): string | null {
    const valueFieldIndex = (action.inputs || []).findIndex((input) => input.source === 'field' && input.position === 'value')
    const valueFieldValue = valueFieldIndex !== -1 ? inputs[valueFieldIndex] : null
    return valueFieldValue ? valueFieldValue.split(':')[1] : null
  }

  getNativeValueFromUrl(action: WarpAction): string | null {
    const searchParams = new URLSearchParams(this.url.search)
    const inputsFromQuery = action.inputs?.filter((input) => input.source === 'query')
    const valuePositionQueryName = inputsFromQuery?.find((i) => i.position === 'value')?.name
    return valuePositionQueryName ? searchParams.get(valuePositionQueryName) : null
  }

  // Combines the provided transfers from input with the action transfers
  getCombinedTokenTransfers(action: WarpContractAction, inputTransfers: TokenTransfer[]): TokenTransfer[] {
    const actionTransfers = action.transfers?.map(this.toTypedTransfer) || []

    return [...actionTransfers, ...inputTransfers]
  }

  // Applies modifiers to the input args
  getModifiedInputs(action: WarpAction, inputs: string[]): string[] {
    const modifiableInputs = Object.fromEntries(inputs.entries())
    const inputsWithModifiers = action.inputs?.filter((input) => !!input.modifier) || []

    // Note: 'scale' modifier means that the value is multiplied by 10^modifier; the modifier can also be the name of another input field
    // Example: 'scale:10' means that the value is multiplied by 10^10
    // Example 2: 'scale:{amount}' means that the value is multiplied by the value of the 'amount' input field

    // TODO: refactor once more modifiers are added

    inputsWithModifiers.forEach((input, index) => {
      if (input.modifier?.startsWith('scale:')) {
        const [, exponent] = input.modifier.split(':')
        if (isNaN(Number(exponent))) {
          // Scale by another input field
          const inputIndex = input.position.startsWith('arg:') ? Number(input.position.split(':')[1]) - 1 : index
          const scalableInput = action.inputs?.find((i) => i.name === exponent)
          if (!scalableInput) throw new Error(`WarpActionExecutor: Scalable input ${exponent} not found`)
          const scalableInputIndex = Number(scalableInput.position.split(':')[1]) - 1
          const exponentVal = modifiableInputs[scalableInputIndex].split(':')[1]
          const scalableVal = modifiableInputs[inputIndex].split(':')[1]
          const scaledVal = shiftBigintBy(scalableVal, +exponentVal)
          modifiableInputs[inputIndex] = `${input.type}:${scaledVal}`
        } else {
          // Scale by fixed amount
          const inputIndex = input.position.startsWith('arg:') ? Number(input.position.split(':')[1]) - 1 : index
          const scalableVal = modifiableInputs[inputIndex].split(':')[1]
          const scaledVal = shiftBigintBy(scalableVal, +exponent)
          modifiableInputs[inputIndex] = `${input.type}:${scaledVal}`
        }
      }
    })

    return Object.values(modifiableInputs)
  }

  // Combines the provided args with filtered input args and sorts them by position index
  getCombinedInputs(action: WarpAction, inputArgs: string[]): string[] {
    const argInputs = action.inputs?.filter((input) => input.position.startsWith('arg:')) || []

    const toValueByType = (input: WarpActionInput, index: number) => {
      if (input.source === 'query') return this.serializer.nativeToString(input.type, this.url.searchParams.get(input.name) || '')
      return inputArgs[index]
    }

    const argInputsWithValues: { input: WarpActionInput; value: string }[] = argInputs.map((input, index) => ({
      input,
      value: toValueByType(input, index),
    }))

    let args = 'args' in action ? action.args : []
    argInputsWithValues.forEach(({ input, value }) => {
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
