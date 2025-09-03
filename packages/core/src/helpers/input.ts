import { WarpActionInputType } from '../types'

/**
 * Splits an input string into type and value, using only the first colon as separator.
 * This handles cases where the value itself contains colons (like SUI token IDs).
 */
export function splitInput(input: string): [WarpActionInputType, string] {
  const [type, ...valueParts] = input.split(/:(.*)/, 2) as [WarpActionInputType, string]
  return [type, valueParts[0] || '']
}
