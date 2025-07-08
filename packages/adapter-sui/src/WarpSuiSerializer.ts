import { Transaction } from '@mysten/sui/transactions'
import { AdapterWarpSerializer, WarpActionInputType, WarpNativeValue, WarpSerializer } from '@vleap/warps-core'

export class WarpSuiSerializer implements AdapterWarpSerializer {
  public readonly coreSerializer: WarpSerializer

  constructor() {
    this.coreSerializer = new WarpSerializer()
  }

  typedToString(value: any): string {
    if (value === null || value === undefined) return 'option:null'
    if (typeof value === 'string') return `string:${value}`
    if (typeof value === 'boolean') return `bool:${value}`
    if (typeof value === 'number') return `uint64:${value.toString()}`
    if (typeof value === 'bigint') return `uint64:${value.toString()}`
    if (value && typeof value === 'object' && value.address) return `address:${value.address}`
    if (Array.isArray(value)) {
      if (value.length === 0) return 'vector:u8:'
      const type = this.typeToString(typeof value[0])
      const values = value.map((item: any) => this.typedToString(item).split(':')[1])
      return `vector:${type}:${values.join(',')}`
    }
    if (value && typeof value === 'object' && value.type && value.value) {
      // Option type: { type: 'option', value: ... }
      if (value.type === 'option') {
        if (value.value === null || value.value === undefined) return 'option:null'
        const inner = this.typedToString(value.value)
        return `option:${inner}`
      }
    }
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
    const [type, raw] = value.split(/:(.*)/, 2) as [WarpActionInputType, string]
    const tx = new Transaction()
    if (type === 'object') return tx.object(raw)
    if (type === 'string') return tx.pure.string(raw)
    if (type === 'bool') return tx.pure.bool(raw === 'true')
    if (type === 'u8') return tx.pure.u8(Number(raw))
    if (type === 'u16') return tx.pure.u16(Number(raw))
    if (type === 'u32') return tx.pure.u32(Number(raw))
    if (type === 'u64' || type === 'uint64') return tx.pure.u64(BigInt(raw))
    if (type === 'u128') return tx.pure.u128(BigInt(raw))
    if (type === 'u256') return tx.pure.u256(BigInt(raw))
    if (type === 'address') return tx.pure.address(raw)
    // if (type === 'vector') {
    //   const [elemType, listValues] = raw.split(/:(.*)/, 2)
    //   if (!listValues) return tx.pure.vector(elemType, [])
    //   const values = listValues.split(',').map((v: string) => this.stringToTyped(tx, `${elemType}:${v}`))
    //   return tx.pure.vector(elemType, values)
    // }
    // if (type === 'option') {
    //   if (raw === 'null' || raw === undefined) return tx.pure.option('u64', null)
    //   // Try to infer the type from the inner value
    //   const [innerType] = raw.split(':', 1)
    //   return tx.pure.option(innerType, this.stringToTyped(tx, raw))
    // }
    throw new Error(`WarpSuiSerializer (stringToTyped): Unsupported type: ${type}`)
  }

  typeToString(type: any): WarpActionInputType {
    if (type === 'string') return 'string'
    if (type === 'bool') return 'bool'
    if (type === 'u8') return 'u8'
    if (type === 'u16') return 'u16'
    if (type === 'u32') return 'u32'
    if (type === 'u64' || type === 'bigint' || type === 'number') return 'u64'
    if (type === 'u128') return 'u128'
    if (type === 'u256') return 'u256'
    if (type === 'address') return 'address'
    if (type === 'vector') return 'vector'
    if (type === 'option') return 'option'
    throw new Error(`WarpSuiSerializer (typeToString): Unsupported input type: ${type}`)
  }

  nativeToType(type: any): any {
    // TODO: Implement Sui-specific nativeToType
    throw new Error('Not implemented')
  }
}
