import { WarpConstants, WarpNativeValue, WarpSerializer } from '@vleap/warps'
import { WarpMultiversxInputTypes } from './constants'

export const token = (value: WarpNativeValue): string => {
  return new WarpSerializer().nativeToString(WarpMultiversxInputTypes.Token, value)
}

export const codemeta = (value: WarpNativeValue): string => {
  return new WarpSerializer().nativeToString(WarpMultiversxInputTypes.CodeMeta, value)
}

export const optional = <T extends WarpNativeValue>(codecFunc: (value: T) => string, value: T | null): string => {
  if (value === null) {
    return WarpMultiversxInputTypes.Optional + WarpConstants.ArgParamsSeparator
  }
  const encoded = codecFunc(value)
  const colonIndex = encoded.indexOf(WarpConstants.ArgParamsSeparator)
  const baseType = encoded.substring(0, colonIndex)
  const baseValue = encoded.substring(colonIndex + 1)
  return WarpMultiversxInputTypes.Optional + WarpConstants.ArgParamsSeparator + baseType + WarpConstants.ArgParamsSeparator + baseValue
}

export const list = (values: WarpNativeValue[]): string => {
  return new WarpSerializer().nativeToString(WarpMultiversxInputTypes.List, values)
}
