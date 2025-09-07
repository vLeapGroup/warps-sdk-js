import { WarpConstants } from '../constants'

/**
 * Builds a nested payload object from a position string and field value.
 * Position strings should be in format: "payload:path.to.nested.location"
 *
 * @param position - The position string defining where to place the value
 * @param fieldName - The field name to use for the value
 * @param value - The value to place at the position
 * @returns A nested object structure or flat object if position doesn't start with 'payload:'
 */
export function buildNestedPayload(position: string, fieldName: string, value: any): any {
  if (!position.startsWith(WarpConstants.Position.Payload)) return { [fieldName]: value }
  return position
    .slice(WarpConstants.Position.Payload.length)
    .split('.')
    .reduceRight((acc, key, i, arr) => ({ [key]: i === arr.length - 1 ? { [fieldName]: value } : acc }), {})
}

/**
 * Recursively merges a source object into a target object and returns the merged result.
 * Existing nested objects are merged recursively, primitive values are overwritten.
 * Does not mutate the original target or source objects.
 *
 * @param target - The target object to merge into
 * @param source - The source object to merge from
 * @returns A new object with the merged result
 */
export function mergeNestedPayload(target: any, source: any): any {
  if (!target) return { ...source }
  if (!source) return { ...target }

  const result = { ...target }

  Object.keys(source).forEach((key) => {
    if (result[key] && typeof result[key] === 'object' && typeof source[key] === 'object') {
      result[key] = mergeNestedPayload(result[key], source[key])
    } else {
      result[key] = source[key]
    }
  })

  return result
}
