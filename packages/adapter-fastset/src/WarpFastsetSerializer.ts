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
    if (typeof value === 'string') {
      return `string:${value}`
    }

    if (typeof value === 'number') {
      return `number:${value}`
    }

    if (typeof value === 'boolean') {
      return `boolean:${value}`
    }

    if (typeof value === 'bigint') {
      return `biguint:${value.toString()}`
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

    return `string:${String(value)}`
  }

  typedToNative(value: any): [WarpActionInputType, WarpNativeValue] {
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
      return ['biguint', value.toString()]
    }

    return ['string', String(value)]
  }

  nativeToTyped(type: WarpActionInputType, value: WarpNativeValue): any {
    switch (type) {
      case 'string':
        return String(value)
      case 'number':
        return Number(value)
      case 'boolean':
        return Boolean(value)
      case 'biguint':
        return BigInt(value as string | number)
      case 'address':
        return String(value)
      case 'hex':
        return String(value)
      default:
        return String(value)
    }
  }

  nativeToType(type: BaseWarpActionInputType): WarpAdapterGenericType {
    switch (type) {
      case 'string':
        return 'string'
      case 'number':
        return 'number'
      case 'boolean':
        return 'boolean'
      case 'biguint':
        return 'biguint'
      case 'address':
        return 'address'
      case 'hex':
        return 'hex'
      default:
        return 'string'
    }
  }

  stringToTyped(value: string): any {
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
      case 'biguint':
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
