import {
  AbiRegistry,
  Address,
  ApiNetworkProvider,
  BytesValue,
  QueryRunnerAdapter,
  SmartContractQueriesController,
  SmartContractTransactionsFactory,
  Token,
  TokenTransfer,
  Transaction,
  TransactionsFactoryConfig,
  TransferTransactionsFactory,
} from '@multiversx/sdk-core/out'
import { getChainId, shiftBigintBy } from './helpers'
import { WarpAction, WarpActionInput, WarpConfig, WarpContractAction, WarpContractActionTransfer, WarpQueryAction } from './types'
import { WarpArgSerializer } from './WarpArgSerializer'

export class WarpActionExecutor {
  private config: WarpConfig
  private url: URL
  private serializer: WarpArgSerializer

  constructor(config: WarpConfig, url: string) {
    this.config = config
    this.url = new URL(url)
    this.serializer = new WarpArgSerializer()
  }

  createTransactionForExecute(action: WarpContractAction, inputs: string[], inputTransfers: TokenTransfer[]): Transaction {
    if (!this.config.userAddress) throw new Error('WarpActionExecutor: user address not set')
    const sender = Address.newFromBech32(this.config.userAddress)
    const destination = Address.newFromBech32(action.address)
    const config = new TransactionsFactoryConfig({ chainID: getChainId(this.config.env) })

    const modifiedInputArgs = this.getModifiedInputs(action, inputs)
    const txArgs = this.getCombinedInputs(action, modifiedInputArgs)
    const typedArgs = txArgs.map((arg) => this.serializer.stringToTyped(arg))
    const nativeValueFromField = this.getNativeValueFromField(action, modifiedInputArgs)
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
      data: typedArgs[0]?.hasExactClass(BytesValue.ClassName) ? typedArgs[0].valueOf() : undefined,
    })
  }

  async executeQuery(action: WarpQueryAction, inputs: string[]) {
    if (!action.func) throw new Error('WarpActionExecutor: Function not found')
    const chainApi = new ApiNetworkProvider(this.config.env)
    const queryRunner = new QueryRunnerAdapter({ networkProvider: chainApi })
    const abi = await this.fetchAbi(action)
    const controller = new SmartContractQueriesController({ queryRunner, abi })
    const modifiedInputArgs = this.getModifiedInputs(action, inputs)
    const txArgs = this.getCombinedInputs(action, modifiedInputArgs)
    const typedArgs = txArgs.map((arg) => this.serializer.stringToTyped(arg))
    const query = controller.createQuery({ contract: action.address, function: action.func, arguments: typedArgs })
    const res = await controller.runQuery(query)
    const [result] = controller.parseQueryResponse(res)
    return result
  }

  private async fetchAbi(action: WarpQueryAction): Promise<AbiRegistry> {
    if (!action.abi) throw new Error('WarpActionExecutor: ABI not found')
    const abiRes = await fetch(action.abi)
    const abiContents = await abiRes.json()
    return AbiRegistry.create(abiContents)
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
          const exponentVal = inputs[scalableInputIndex].split(':')[1]
          const scalableVal = inputs[inputIndex].split(':')[1]
          const scaledVal = shiftBigintBy(scalableVal, +exponentVal)
          inputs[inputIndex] = `${input.type}:${scaledVal}`
        } else {
          // Scale by fixed amount
          const inputIndex = input.position.startsWith('arg:') ? Number(input.position.split(':')[1]) - 1 : index
          const scalableVal = inputs[inputIndex].split(':')[1]
          const scaledVal = shiftBigintBy(scalableVal, +exponent)
          inputs[inputIndex] = `${input.type}:${scaledVal}`
        }
      }
    })

    return inputs
  }

  // Combines the provided args with filtered input args and sorts them by position index
  getCombinedInputs(action: WarpAction, inputArgs: string[]): string[] {
    const fieldInputs = action.inputs?.filter((input) => input.source === 'field' && input.position.startsWith('arg:')) || []
    const inputsWithValues: { input: WarpActionInput; value: string }[] = fieldInputs.map((input, index) => ({
      input,
      value: inputArgs[index],
    }))
    let args = 'args' in action ? action.args : []
    inputsWithValues.forEach(({ input, value }) => {
      const argIndex = Number(input.position.split(':')[1]) - 1
      args.splice(argIndex, 0, value)
    })
    return args
  }

  private toTypedTransfer(transfer: WarpContractActionTransfer): TokenTransfer {
    return new TokenTransfer({
      token: new Token({ identifier: transfer.token, nonce: BigInt(transfer.nonce || 0) }),
      amount: BigInt(transfer.amount || 0),
    })
  }
}
