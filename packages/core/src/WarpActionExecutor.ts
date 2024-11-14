import {
  Address,
  AddressValue,
  BigUIntValue,
  BooleanValue,
  BytesValue,
  SmartContractTransactionsFactory,
  Transaction,
  TransactionsFactoryConfig,
  TypedValue,
  U16Value,
  U32Value,
  U64Value,
  U8Value,
} from '@multiversx/sdk-core/out'
import { getChainId } from './helpers'
import { WarpAction, WarpActionInputPosition, WarpActionInputType, WarpConfig, WarpContractAction } from './types'

export class WarpActionExecutor {
  private config: WarpConfig
  private url: URL

  constructor(config: WarpConfig, url: string) {
    this.config = config
    this.url = new URL(url)
  }

  createTransactionForExecute(action: WarpContractAction): Transaction {
    if (!this.config.userAddress) throw new Error('WarpActionExecutor: user address not set')
    const config = new TransactionsFactoryConfig({ chainID: getChainId(this.config.env) })
    const factory = new SmartContractTransactionsFactory({ config })

    const args = this.getTypedArgsWithInputs(action)
    const nativeValueFromUrl = this.getPositionValueFromUrl(action, 'value')
    const nativeTransferAmount = BigInt(nativeValueFromUrl || action.value || 0)

    return factory.createTransactionForExecute({
      sender: Address.newFromBech32(this.config.userAddress),
      contract: Address.newFromBech32(action.address),
      function: action.func || '',
      gasLimit: BigInt(action.gasLimit),
      arguments: args,
      nativeTransferAmount,
    })
  }

  getPositionValueFromUrl(action: WarpAction, position: WarpActionInputPosition): string | null {
    const searchParams = new URLSearchParams(this.url.search)
    const inputsFromQuery = action.inputs?.filter((input) => input.source === 'query')
    const valuePositionQueryName = inputsFromQuery?.find((i) => i.position === position)?.name
    return valuePositionQueryName ? searchParams.get(valuePositionQueryName) : null
  }

  getTypedArgsWithInputs(action: WarpContractAction): TypedValue[] {
    return action.args.map((arg) => {
      const [type, value] = arg.split(':')
      return this.toTypedArg(value, type as WarpActionInputType)
    })
  }

  private toTypedArg(arg: string, type: WarpActionInputType): TypedValue {
    if (type === 'text') return BytesValue.fromUTF8(arg)
    if (type === 'uint8') return new U8Value(Number(arg))
    if (type === 'uint16') return new U16Value(Number(arg))
    if (type === 'uint32') return new U32Value(Number(arg))
    if (type === 'uint64') return new U64Value(BigInt(arg))
    if (type === 'biguint') return new BigUIntValue(BigInt(arg))
    if (type === 'boolean') return new BooleanValue(arg === 'true')
    if (type === 'address') return new AddressValue(Address.newFromBech32(arg))
    if (type === 'hex') return BytesValue.fromHex(arg)
    return BytesValue.fromUTF8(arg)
  }
}
