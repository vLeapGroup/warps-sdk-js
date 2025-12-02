import {
  AdapterWarpSerializer,
  BaseWarpActionInputType,
  WarpActionInputType,
  WarpAdapterGenericType,
  WarpConstants,
  WarpNativeValue,
  WarpSerializer,
} from '@vleap/warps'
import { ethers } from 'ethers'

const SplitParamsRegex = new RegExp(`${WarpConstants.ArgParamsSeparator}(.*)`)

export class WarpEvmSerializer implements AdapterWarpSerializer {
  public readonly coreSerializer: WarpSerializer

  constructor() {
    this.coreSerializer = new WarpSerializer()
  }

  typedToString(value: any): string {
    if (typeof value === 'string') {
      if (ethers.isAddress(value)) {
        return `address:${value}`
      }
      if (ethers.isHexString(value) && !ethers.isAddress(value)) {
        return `hex:${value}`
      }
      return `string:${value}`
    }
    if (typeof value === 'number') {
      if (Number.isInteger(value)) {
        if (value >= 0 && value <= 255) return `uint8:${value}`
        if (value >= 0 && value <= 65535) return `uint16:${value}`
        if (value >= 0 && value <= 4294967295) return `uint32:${value}`
        return `uint64:${value}`
      }
      return `string:${value}`
    }
    if (typeof value === 'bigint') {
      return `biguint:${value.toString()}`
    }
    if (typeof value === 'boolean') {
      return `boolean:${value}`
    }
    if (Array.isArray(value)) {
      if (value.length === 0) return `list:string:`
      const types = value.map((item) => this.typedToString(item).split(WarpConstants.ArgParamsSeparator)[0]) as BaseWarpActionInputType[]
      const type = types[0] as BaseWarpActionInputType
      const values = value.map((item) => this.typedToString(item).split(WarpConstants.ArgParamsSeparator)[1]) as WarpNativeValue[]
      return `list:${type}:${values.join(',')}`
    }
    if (value === null || value === undefined) {
      return `string:null`
    }
    return `string:${String(value)}`
  }

  typedToNative(value: any): [WarpActionInputType, WarpNativeValue] {
    const stringValue = this.typedToString(value)
    const [type, ...valueParts] = stringValue.split(WarpConstants.ArgParamsSeparator)
    const nativeValue = valueParts.join(WarpConstants.ArgParamsSeparator)
    return [type, this.parseNativeValue(type, nativeValue)]
  }

  nativeToTyped(type: WarpActionInputType, value: WarpNativeValue): any {
    switch (type) {
      case 'string':
        return String(value)
      case 'uint8':
      case 'uint16':
      case 'uint32':
      case 'uint64':
        return BigInt(value as string | number)
      case 'biguint':
        return BigInt(value as string | number)
      case 'boolean':
        return Boolean(value)
      case 'address':
        return String(value)
      case 'hex':
        const hexValue = String(value)
        return hexValue.startsWith('0x') ? hexValue : `0x${hexValue}`
      default:
        if (type.startsWith('list:')) {
          const [, itemType, itemsStr] = type.split(':')
          if (!itemsStr) return []
          const items = itemsStr.split(',')
          return items.map((item) => this.nativeToTyped(itemType, item))
        }
        return String(value)
    }
  }

  nativeToType(type: BaseWarpActionInputType): WarpAdapterGenericType {
    switch (type) {
      case 'string':
        return 'string'
      case 'uint8':
      case 'uint16':
      case 'uint32':
      case 'uint64':
      case 'biguint':
        return 'bigint'
      case 'boolean':
        return 'boolean'
      case 'address':
        return 'string'
      case 'hex':
        return 'string'
      default:
        return 'string'
    }
  }

  stringToTyped(value: string): any {
    const parts = value.split(WarpConstants.ArgParamsSeparator, 2)
    if (parts.length < 2) {
      return value
    }

    const [type, stringValue] = parts

    switch (type) {
      case 'string':
        return stringValue
      case 'uint8':
      case 'uint16':
      case 'uint32':
      case 'uint64':
        return BigInt(stringValue)
      case 'biguint':
        return BigInt(stringValue)
      case 'boolean':
        return stringValue === 'true'
      case 'address':
        return stringValue
      case 'hex':
        return stringValue.startsWith('0x') ? stringValue : `0x${stringValue}`
      default:
        if (type.startsWith('list:')) {
          const [, itemType, itemsStr] = type.split(':')
          if (!itemsStr) return []
          const items = itemsStr.split(',')
          return items.map((item) => this.stringToTyped(`${itemType}:${item}`))
        }
        return stringValue
    }
  }

  private parseNativeValue(type: string, value: string): WarpNativeValue {
    switch (type) {
      case 'string':
        return value
      case 'uint8':
      case 'uint16':
      case 'uint32':
      case 'uint64':
      case 'biguint':
        return BigInt(value)
      case 'boolean':
        return value === 'true'
      case 'address':
        return value
      case 'hex':
        return value
      default:
        return value
    }
  }
}
