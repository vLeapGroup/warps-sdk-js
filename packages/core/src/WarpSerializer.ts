import { WarpConstants, WarpInputTypes } from './constants'
import { BaseWarpActionInputType, WarpActionInputType, WarpChainAssetValue, WarpNativeValue, WarpTypeRegistry } from './types'

export class WarpSerializer {
  private typeRegistry: WarpTypeRegistry | undefined

  setTypeRegistry(typeRegistry: WarpTypeRegistry): void {
    this.typeRegistry = typeRegistry
  }

  nativeToString(type: WarpActionInputType, value: WarpNativeValue): string {
    // Check built-in types first
    if (type === WarpInputTypes.Asset && typeof value === 'object' && value && 'identifier' in value && 'amount' in value) {
      return 'decimals' in value
        ? WarpInputTypes.Asset +
            WarpConstants.ArgParamsSeparator +
            value.identifier +
            WarpConstants.ArgCompositeSeparator +
            value.amount.toString() +
            WarpConstants.ArgCompositeSeparator +
            String(value.decimals)
        : WarpInputTypes.Asset +
            WarpConstants.ArgParamsSeparator +
            value.identifier +
            WarpConstants.ArgCompositeSeparator +
            String(value.amount)
    }

    // Check adapter-registered types
    if (this.typeRegistry?.hasType(type)) {
      const handler = this.typeRegistry.getHandler(type)
      if (handler) {
        return handler.nativeToString(value)
      }
    }

    // Default behavior for standard types
    return `${type}:${value?.toString() ?? ''}`
  }

  stringToNative(value: string): [WarpActionInputType, WarpNativeValue] {
    const parts = value.split(WarpConstants.ArgParamsSeparator)
    const baseType = parts[0]
    const val = parts.slice(1).join(WarpConstants.ArgParamsSeparator)

    if (baseType === 'null') {
      return [baseType, null]
    }
    if (baseType === WarpInputTypes.Option) {
      const [baseType, baseValue] = val.split(WarpConstants.ArgParamsSeparator) as [WarpActionInputType, WarpNativeValue]
      return [WarpInputTypes.Option + WarpConstants.ArgParamsSeparator + baseType, baseValue || null]
    }
    if (baseType === WarpInputTypes.Vector) {
      const vectorParts = (val as string).split(WarpConstants.ArgParamsSeparator) as [WarpActionInputType, WarpNativeValue]
      const baseType = vectorParts.slice(0, -1).join(WarpConstants.ArgParamsSeparator)
      const valuesRaw = vectorParts[vectorParts.length - 1]
      const valuesStrings = valuesRaw ? (valuesRaw as string).split(',') : []
      const values = valuesStrings.map((v) => this.stringToNative(baseType + WarpConstants.ArgParamsSeparator + v)[1])
      return [WarpInputTypes.Vector + WarpConstants.ArgParamsSeparator + baseType, values]
    } else if (baseType.startsWith(WarpInputTypes.Tuple)) {
      const rawTypes = baseType.match(/\(([^)]+)\)/)?.[1]?.split(WarpConstants.ArgCompositeSeparator) as BaseWarpActionInputType[]
      const valuesStrings = val.split(WarpConstants.ArgCompositeSeparator)
      const values = valuesStrings.map((val, index) => this.stringToNative(`${rawTypes[index]}:${val}`)[1])
      return [baseType, values]
    } else if (baseType === WarpInputTypes.String) return [baseType, val]
    else if (baseType === WarpInputTypes.Uint8 || baseType === WarpInputTypes.Uint16 || baseType === WarpInputTypes.Uint32)
      return [baseType, Number(val)]
    else if (
      baseType === WarpInputTypes.Uint64 ||
      baseType === WarpInputTypes.Uint128 ||
      baseType === WarpInputTypes.Uint256 ||
      baseType === WarpInputTypes.Biguint
    )
      return [baseType, BigInt((val as string) || 0)]
    else if (baseType === WarpInputTypes.Bool) return [baseType, val === 'true']
    else if (baseType === WarpInputTypes.Address) return [baseType, val]
    else if (baseType === WarpInputTypes.Hex) return [baseType, val]
    else if (baseType === WarpInputTypes.Asset) {
      const [identifier, amount] = (val as string).split(WarpConstants.ArgCompositeSeparator)
      const value: WarpChainAssetValue = { identifier, amount: BigInt(amount) }
      return [baseType, value]
    }

    // Check adapter-registered types before throwing error
    if (this.typeRegistry?.hasType(baseType)) {
      const handler = this.typeRegistry.getHandler(baseType)
      if (handler) {
        const nativeValue = handler.stringToNative(val)
        return [baseType as WarpActionInputType, nativeValue]
      }
    }

    throw new Error(`WarpArgSerializer (stringToNative): Unsupported input type: ${baseType}`)
  }
}
