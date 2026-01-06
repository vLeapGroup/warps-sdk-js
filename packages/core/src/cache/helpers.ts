import { WarpSerializer } from '../WarpSerializer'
import { WarpInputTypes } from '../constants'

const serializer = new WarpSerializer()

// JSON replacer for value serialization (handles BigInts and other special types)
export const valueReplacer = (key: string, value: any): any => {
  if (typeof value === 'bigint') return serializer.nativeToString('biguint', value)
  return value
}

// JSON reviver for value deserialization (handles BigInts and other special types)
export const valueReviver = (key: string, value: any): any => {
  if (typeof value === 'string') {
    if (value.startsWith(WarpInputTypes.Biguint + ':')) return serializer.stringToNative(value)[1]
  }
  return value
}
