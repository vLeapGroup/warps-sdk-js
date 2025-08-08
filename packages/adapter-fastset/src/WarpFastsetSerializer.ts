import {
  AdapterWarpSerializer,
  BaseWarpActionInputType,
  WarpActionInputType,
  WarpAdapterGenericType,
  WarpNativeValue,
  WarpSerializer,
} from '@vleap/warps'

export class WarpFastsetSerializer implements AdapterWarpSerializer {
  public readonly coreSerializer: WarpSerializer

  constructor() {
    this.coreSerializer = new WarpSerializer()
  }

  typedToString(value: any): string {
    // TODO: Implement Fastset-specific serialization logic
    // This should handle Fastset-specific data types and formats

    if (typeof value === 'string') {
      // TODO: Add Fastset address validation if needed
      return `string:${value}`
    }

    if (typeof value === 'number') {
      return `number:${value}`
    }

    if (typeof value === 'boolean') {
      return `boolean:${value}`
    }

    if (typeof value === 'bigint') {
      return `bigint:${value.toString()}`
    }

    if (Array.isArray(value)) {
      const items = value.map((item) => this.typedToString(item)).join(',')
      return `array:${items}`
    }

    if (value === null) {
      return 'null:null'
    }

    if (value === undefined) {
      return 'undefined:undefined'
    }

    // Default to string representation
    return `string:${String(value)}`
  }

  typedToNative(value: any): [WarpActionInputType, WarpNativeValue] {
    // TODO: Implement Fastset-specific type conversion
    // This should convert Fastset-specific types to native types

    if (typeof value === 'string') {
      return ['string', value]
    }

    if (typeof value === 'number') {
      return ['number', value]
    }

    if (typeof value === 'boolean') {
      return ['boolean', value]
    }

    if (typeof value === 'bigint') {
      return ['bigint', value]
    }

    // Default to string
    return ['string', String(value)]
  }

  nativeToTyped(type: WarpActionInputType, value: WarpNativeValue): any {
    // TODO: Implement Fastset-specific type conversion
    // This should convert native types to Fastset-specific types

    switch (type) {
      case 'string':
        return String(value)
      case 'number':
        return Number(value)
      case 'boolean':
        return Boolean(value)
      case 'bigint':
        return BigInt(value as string | number)
      default:
        return String(value)
    }
  }

  nativeToType(type: BaseWarpActionInputType): WarpAdapterGenericType {
    // TODO: Implement Fastset-specific type mapping
    switch (type) {
      case 'string':
        return 'string'
      case 'number':
        return 'number'
      case 'boolean':
        return 'boolean'
      case 'bigint':
        return 'bigint'
      default:
        return 'string'
    }
  }

  stringToTyped(value: string): any {
    // TODO: Implement Fastset-specific string parsing
    // This should parse Fastset-specific string formats

    const colonIndex = value.indexOf(':')
    if (colonIndex === -1) {
      return value
    }

    const type = value.substring(0, colonIndex)
    const stringValue = value.substring(colonIndex + 1)

    switch (type) {
      case 'string':
        return stringValue
      case 'number':
        return Number(stringValue)
      case 'boolean':
        return stringValue === 'true'
      case 'bigint':
        return BigInt(stringValue)
      case 'array':
        return stringValue.split(',').map((item) => this.stringToTyped(item))
      case 'null':
        return null
      case 'undefined':
        return undefined
      default:
        return stringValue
    }
  }
}
