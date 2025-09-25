import { WarpProtocolVersions } from '../config'
import { Adapter, ProtocolName, Warp, WarpAction, WarpActionType, WarpChain } from '../types'

export const findWarpAdapterForChain = (chain: WarpChain, adapters: Adapter[]): Adapter => {
  const adapter = adapters.find((a) => a.chainInfo.name.toLowerCase() === chain.toLowerCase())
  if (!adapter) throw new Error(`Adapter not found for chain: ${chain}`)
  return adapter
}

export const findWarpAdapterByPrefix = (prefix: string, adapters: Adapter[]): Adapter => {
  const adapter = adapters.find((a) => a.prefix.toLowerCase() === prefix.toLowerCase())
  if (!adapter) throw new Error(`Adapter not found for prefix: ${prefix}`)
  return adapter
}

export const getLatestProtocolIdentifier = (name: ProtocolName): string => {
  if (name === 'warp') return `warp:${WarpProtocolVersions.Warp}`
  if (name === 'brand') return `brand:${WarpProtocolVersions.Brand}`
  if (name === 'abi') return `abi:${WarpProtocolVersions.Abi}`
  throw new Error(`getLatestProtocolIdentifier: Invalid protocol name: ${name}`)
}

export const getWarpActionByIndex = (warp: Warp, index: number) => warp?.actions[index - 1]

export const getWarpPrimaryAction = (warp: Warp): { action: WarpAction; index: number } => {
  const actionWithPrimary = warp.actions.find((action) => action.primary === true)
  if (actionWithPrimary) return { action: actionWithPrimary, index: warp.actions.indexOf(actionWithPrimary) }
  const detectableTypes: WarpActionType[] = ['transfer', 'contract', 'query', 'collect']
  const reversedActions = [...warp.actions].reverse()
  const primaryAction = reversedActions.find((action) => detectableTypes.includes(action.type))
  if (!primaryAction) throw new Error(`Warp has no primary action: ${warp.meta?.hash}`)
  return { action: primaryAction, index: warp.actions.indexOf(primaryAction) }
}

export const isWarpActionAutoExecute = (action: WarpAction) => {
  if (action.auto === false) return false // actions can be explicitly set to not auto execute
  if (action.type === 'link') return action.auto === true // links should not automatically open, unless explicitly set to auto
  return true
}

export const shiftBigintBy = (value: bigint | string | number, decimals: number): bigint => {
  const valueStr = value.toString()
  const [integerPart, fractionalPart = ''] = valueStr.split('.')
  const shiftPlaces = Math.abs(decimals)

  if (decimals > 0) {
    return BigInt(integerPart + fractionalPart.padEnd(shiftPlaces, '0'))
  } else if (decimals < 0) {
    const combined = integerPart + fractionalPart
    if (shiftPlaces >= combined.length) {
      return 0n
    }
    const newIntegerPart = combined.slice(0, -shiftPlaces) || '0'
    return BigInt(newIntegerPart)
  } else {
    return valueStr.includes('.') ? BigInt(valueStr.split('.')[0]) : BigInt(valueStr)
  }
}

export const toPreviewText = (text: string, maxChars = 100) => {
  if (!text) return ''
  let sanitized = text
    .replace(/<\/?(h[1-6])[^>]*>/gi, ' - ') // replace heading tags with space and colon
    .replace(/<\/?(p|div|ul|ol|li|br|hr)[^>]*>/gi, ' ') // replace other block-level HTML tags with spaces
    .replace(/<[^>]+>/g, '') // remove all other HTML tags
    .replace(/\s+/g, ' ') // collapse multiple spaces into a single space
    .trim()

  sanitized = sanitized.startsWith('- ') ? sanitized.slice(2) : sanitized
  sanitized = sanitized.length > maxChars ? sanitized.substring(0, sanitized.lastIndexOf(' ', maxChars)) + '...' : sanitized

  return sanitized
}

export const replacePlaceholders = (message: string, bag: Record<string, any>) =>
  message.replace(/\{\{([^}]+)\}\}/g, (match, p1) => bag[p1] || '')

export const applyResultsToMessages = (warp: Warp, results: Record<string, any>): Record<string, string> => {
  const parts = Object.entries(warp.messages || {}).map(([key, value]) => [key, replacePlaceholders(value, results)])

  return Object.fromEntries(parts)
}
