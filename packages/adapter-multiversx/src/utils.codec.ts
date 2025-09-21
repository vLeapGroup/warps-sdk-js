import { WarpActionInputType, WarpNativeValue, WarpSerializer } from '@vleap/warps'
import { WarpMultiversxInputTypes } from './constants'

export const token = (value: string): string => {
  return new WarpSerializer().nativeToString(WarpMultiversxInputTypes.Token, value)
}

export const codemeta = (value: string): string => {
  return new WarpSerializer().nativeToString(WarpMultiversxInputTypes.CodeMeta, value)
}

export const option = (value: WarpNativeValue | null, type: WarpActionInputType): string => {
  return new WarpSerializer().nativeToString(WarpMultiversxInputTypes.Optional, value)
}

export const list = (values: WarpNativeValue[]): string => {
  return new WarpSerializer().nativeToString(WarpMultiversxInputTypes.List, values)
}
