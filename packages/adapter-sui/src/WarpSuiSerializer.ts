import { WarpActionInputType, WarpNativeValue, WarpSerializer } from '@vleap/warps-core'

export class WarpSuiSerializer {
  public readonly coreSerializer: WarpSerializer

  constructor() {
    this.coreSerializer = new WarpSerializer()
  }

  typedToString(value: any): string {
    // SUI BCS serialization to string (hex or base64)
    if (typeof value === 'string') return `string:${value}`
    if (typeof value === 'boolean') return `bool:${value}`
    if (typeof value === 'number' || typeof value === 'bigint') return `uint64:${value.toString()}`
    if (value && typeof value === 'object' && value.address) return `address:${value.address}`
    if (value && typeof value === 'object' && value.type && value.value) return `${value.type}:${value.value}`
    throw new Error(`WarpSuiSerializer (typedToString): Unsupported input type: ${typeof value}`)
  }

  typedToNative(value: any): [WarpActionInputType, WarpNativeValue] {
    const stringValue = this.typedToString(value)
    return this.coreSerializer.stringToNative(stringValue)
  }

  nativeToTyped(type: WarpActionInputType, value: WarpNativeValue): any {
    const stringValue = this.coreSerializer.nativeToString(type, value)
    return this.stringToTyped(stringValue)
  }

  stringToTyped(value: string): any {
    // Parse string to SUI BCS type
    const [type, raw] = value.split(':', 2)
    switch (type) {
      case 'string':
        return raw
      case 'bool':
        return raw === 'true'
      case 'uint64':
        return BigInt(raw)
      case 'address':
        return { address: raw }
      default:
        throw new Error(`WarpSuiSerializer (stringToTyped): Unsupported type: ${type}`)
    }
  }

  typeToString(type: any): WarpActionInputType {
    if (type === 'string') return 'string'
    if (type === 'bool') return 'bool'
    if (type === 'uint64' || type === 'bigint') return 'uint64'
    if (type === 'address') return 'address'
    throw new Error(`WarpSuiSerializer (typeToString): Unsupported input type: ${type}`)
  }
}
