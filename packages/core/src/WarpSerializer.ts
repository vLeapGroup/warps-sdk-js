import { WarpConstants } from './constants'
import { BaseWarpActionInputType, WarpActionInputType, WarpChainAssetValue, WarpNativeValue } from './types'

export class WarpSerializer {
  nativeToString(type: WarpActionInputType, value: WarpNativeValue): string {
    if (type === 'asset' && typeof value === 'object' && value && 'identifier' in value && 'nonce' in value && 'amount' in value) {
      return `${type}:${value.identifier}|${value.nonce.toString()}|${value.amount.toString()}`
    }
    return `${type}:${value?.toString() ?? ''}`
  }

  stringToNative(value: string): [WarpActionInputType, WarpNativeValue] {
    const parts = value.split(WarpConstants.ArgParamsSeparator)
    const baseType = parts[0]
    const val = parts.slice(1).join(WarpConstants.ArgParamsSeparator)

    if (baseType === 'null') {
      return [baseType, null]
    }
    if (baseType === 'option') {
      const [baseType, baseValue] = val.split(WarpConstants.ArgParamsSeparator) as [WarpActionInputType, WarpNativeValue]
      return [`option:${baseType}`, baseValue || null]
    } else if (baseType === 'optional') {
      const [baseType, baseValue] = val.split(WarpConstants.ArgParamsSeparator) as [WarpActionInputType, WarpNativeValue]
      return [`optional:${baseType}`, baseValue || null]
    } else if (baseType === 'list') {
      const listParts = val.split(WarpConstants.ArgParamsSeparator) as [WarpActionInputType, WarpNativeValue]
      const baseType = listParts.slice(0, -1).join(WarpConstants.ArgParamsSeparator)
      const valuesRaw = listParts[listParts.length - 1]
      const valuesStrings = valuesRaw ? (valuesRaw as string).split(',') : []
      const values = valuesStrings.map((v) => this.stringToNative(`${baseType}:${v}`)[1])
      return [`list:${baseType}`, values]
    } else if (baseType === 'variadic') {
      const variadicParts = (val as string).split(WarpConstants.ArgParamsSeparator) as [WarpActionInputType, WarpNativeValue]
      const baseType = variadicParts.slice(0, -1).join(WarpConstants.ArgParamsSeparator)
      const valuesRaw = variadicParts[variadicParts.length - 1]
      const valuesStrings = valuesRaw ? (valuesRaw as string).split(',') : []
      const values = valuesStrings.map((v) => this.stringToNative(`${baseType}:${v}`)[1])
      return [`variadic:${baseType}`, values]
    } else if (baseType.startsWith('composite')) {
      const rawTypes = baseType.match(/\(([^)]+)\)/)?.[1]?.split(WarpConstants.ArgCompositeSeparator) as BaseWarpActionInputType[]
      const valuesStrings = val.split(WarpConstants.ArgCompositeSeparator)
      const values = valuesStrings.map((val, index) => this.stringToNative(`${rawTypes[index]}:${val}`)[1])
      return [baseType, values]
    } else if (baseType === 'string') return [baseType, val]
    else if (baseType === 'uint8' || baseType === 'uint16' || baseType === 'uint32') return [baseType, Number(val)]
    else if (baseType === 'uint64' || baseType === 'biguint') return [baseType, BigInt((val as string) || 0)]
    else if (baseType === 'bool') return [baseType, val === 'true']
    else if (baseType === 'address') return [baseType, val]
    else if (baseType === 'token') return [baseType, val]
    else if (baseType === 'hex') return [baseType, val]
    else if (baseType === 'codemeta') return [baseType, val]
    else if (baseType === 'asset') {
      const [identifier, nonce, amount] = (val as string).split(WarpConstants.ArgCompositeSeparator)
      const value: WarpChainAssetValue = { identifier, nonce: BigInt(nonce), amount: BigInt(amount) }
      return [baseType, value]
    }
    throw new Error(`WarpArgSerializer (stringToNative): Unsupported input type: ${baseType}`)
  }
}
