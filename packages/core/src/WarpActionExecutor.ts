import {
  Address,
  AddressValue,
  BigUIntValue,
  BooleanValue,
  BytesValue,
  SmartContractTransactionsFactory,
  Token,
  TokenTransfer,
  Transaction,
  TransactionsFactoryConfig,
  TypedValue,
  U16Value,
  U32Value,
  U64Value,
  U8Value,
} from '@multiversx/sdk-core/out'
import { getChainId } from './helpers'
import { WarpAction, WarpActionInput, WarpActionInputType, WarpConfig, WarpContractAction, WarpContractActionTransfer } from './types'

export class WarpActionExecutor {
  private config: WarpConfig
  private url: URL

  constructor(config: WarpConfig, url: string) {
    this.config = config
    this.url = new URL(url)
  }

  createTransactionForExecute(action: WarpContractAction, inputArgs: string[], inputTransfers: TokenTransfer[]): Transaction {
    if (!this.config.userAddress) throw new Error('WarpActionExecutor: user address not set')
    const config = new TransactionsFactoryConfig({ chainID: getChainId(this.config.env) })
    const factory = new SmartContractTransactionsFactory({ config })

    const modifiedInputArgs = this.getModifiedInputArgs(action, inputArgs)
    const txArgs = this.getPreparedTxArgs(action, modifiedInputArgs)
    const typedTxArgs = this.getTypedArgsFromInput(txArgs)
    const nativeValueFromField = this.getNativeValueFromField(action, modifiedInputArgs)
    const nativeValueFromUrl = this.getNativeValueFromUrl(action)
    const nativeTransferAmount = BigInt(nativeValueFromField || nativeValueFromUrl || action.value || 0)
    const combinedTransfers = this.getCombinedTokenTransfers(action, inputTransfers)

    return factory.createTransactionForExecute({
      sender: Address.newFromBech32(this.config.userAddress),
      contract: Address.newFromBech32(action.address),
      function: action.func || '',
      gasLimit: BigInt(action.gasLimit),
      arguments: typedTxArgs,
      tokenTransfers: combinedTransfers,
      nativeTransferAmount,
    })
  }

  getNativeValueFromField(action: WarpAction, inputArgs: string[]): string | null {
    const valueFieldIndex = (action.inputs || []).findIndex((input) => input.source === 'field' && input.position === 'value')
    const valueFieldValue = valueFieldIndex !== -1 ? inputArgs[valueFieldIndex] : null
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
  getModifiedInputArgs(action: WarpContractAction, inputArgs: string[]): string[] {
    const inputsWithModifiers = action.inputs?.filter((input) => !!input.modifier && input.position.startsWith('arg:')) || []

    // Note: 'scale' modifier means that the value is multiplied by 10^modifier; the modifier can also be the name of another input field
    // Example: 'scale:10' means that the value is multiplied by 10^10
    // Example 2: 'scale:{amount}' means that the value is multiplied by the value of the 'amount' input field

    // TODO: refactor once more modifiers are added

    for (const input of inputsWithModifiers) {
      if (input.modifier?.startsWith('scale:')) {
        const [, exponent] = input.modifier.split(':')
        if (isNaN(Number(exponent))) {
          // Scale by another input field
          const inputArgsIndex = Number(input.position.split(':')[1]) - 1
          const scalableInput = action.inputs?.find((i) => i.name === exponent)
          if (!scalableInput) throw new Error(`WarpActionExecutor: Scalable input ${exponent} not found`)
          const scalableInputArgsIndex = Number(scalableInput.position.split(':')[1]) - 1
          const exponentVal = BigInt(inputArgs[scalableInputArgsIndex].split(':')[1])
          const scalableVal = BigInt(inputArgs[inputArgsIndex].split(':')[1])
          const scaledVal = scalableVal * BigInt(10) ** exponentVal
          inputArgs[inputArgsIndex] = `${input.type}:${scaledVal}`
        } else {
          // Scale by fixed amount
          const inputArgsIndex = Number(input.position.split(':')[1]) - 1
          const scalableVal = BigInt(inputArgs[inputArgsIndex].split(':')[1])
          const scaledVal = scalableVal * BigInt(10) ** BigInt(exponent)
          inputArgs[inputArgsIndex] = `${input.type}:${scaledVal}`
        }
      }
    }

    return inputArgs
  }

  // Combines the provided args with filtered input args and sorts them by position index
  getPreparedTxArgs(action: WarpContractAction, inputArgs: string[]): string[] {
    const fieldInputs = action.inputs?.filter((input) => input.source === 'field' && input.position.startsWith('arg:')) || []
    const inputsWithValues: { input: WarpActionInput; value: string }[] = fieldInputs.map((input, index) => ({
      input,
      value: inputArgs[index],
    }))
    let args = action.args || []
    inputsWithValues.forEach(({ input, value }) => {
      const argIndex = Number(input.position.split(':')[1]) - 1
      args.splice(argIndex, 0, value)
    })
    return args
  }

  // Converts the input args to typed values
  getTypedArgsFromInput(inputArgs: string[]): TypedValue[] {
    return inputArgs.map((arg) => {
      const [type, value] = arg.split(':')
      return this.toTypedArg(value, type as WarpActionInputType)
    })
  }

  private toTypedTransfer(transfer: WarpContractActionTransfer): TokenTransfer {
    return new TokenTransfer({
      token: new Token({ identifier: transfer.token, nonce: BigInt(transfer.nonce || 0) }),
      amount: BigInt(transfer.amount || 0),
    })
  }

  private toTypedArg(arg: string, type: WarpActionInputType): TypedValue {
    if (type === 'string') return BytesValue.fromUTF8(arg)
    if (type === 'uint8') return new U8Value(Number(arg))
    if (type === 'uint16') return new U16Value(Number(arg))
    if (type === 'uint32') return new U32Value(Number(arg))
    if (type === 'uint64') return new U64Value(BigInt(arg))
    if (type === 'biguint') return new BigUIntValue(BigInt(arg))
    if (type === 'boolean') return new BooleanValue(arg === 'true')
    if (type === 'address') return new AddressValue(Address.newFromBech32(arg))
    if (type === 'hex') return BytesValue.fromHex(arg)
    throw new Error(`WarpActionExecutor: Unsupported input type: ${type}`)
  }
}
