import { WarpConfig, WarpProtocolVersions } from '../config'
import { Adapter, ProtocolName, Warp, WarpAction, WarpActionIndex, WarpChainInfo, WarpClientConfig, WarpInitConfig } from '../types'

export const findWarpAdapter = (config: WarpClientConfig, chainInfo: WarpChainInfo): Adapter => {
  const adapter = config.adapters.find((a) => a.chain.toLowerCase() === chainInfo.name.toLowerCase())
  return adapter || config.adapters[0]
}

export const getMainChainInfo = (config: WarpInitConfig): WarpChainInfo => ({
  name: WarpConfig.MainChain.Name,
  displayName: WarpConfig.MainChain.DisplayName,
  chainId: WarpConfig.MainChain.ChainId(config.env),
  blockTime: WarpConfig.MainChain.BlockTime(config.env),
  addressHrp: WarpConfig.MainChain.AddressHrp,
  apiUrl: WarpConfig.MainChain.ApiUrl(config.env),
  explorerUrl: WarpConfig.MainChain.ExplorerUrl(config.env),
  nativeToken: WarpConfig.MainChain.NativeToken,
})

export const getLatestProtocolIdentifier = (name: ProtocolName): string => {
  if (name === 'warp') return `warp:${WarpProtocolVersions.Warp}`
  if (name === 'brand') return `brand:${WarpProtocolVersions.Brand}`
  if (name === 'abi') return `abi:${WarpProtocolVersions.Abi}`
  throw new Error(`getLatestProtocolIdentifier: Invalid protocol name: ${name}`)
}

export const getWarpActionByIndex = (warp: Warp, index: number) => warp?.actions[index - 1]

export const findWarpExecutableAction = (warp: Warp): [WarpAction, WarpActionIndex] => {
  warp.actions.forEach((action, index) => {
    if (action.type === 'link') return
    return [action, index]
  })

  return [getWarpActionByIndex(warp, 1), 1]
}

export const toTypedChainInfo = (chainInfo: any): WarpChainInfo => ({
  name: chainInfo.name.toString(),
  displayName: chainInfo.display_name.toString(),
  chainId: chainInfo.chain_id.toString(),
  blockTime: chainInfo.block_time.toNumber(),
  addressHrp: chainInfo.address_hrp.toString(),
  apiUrl: chainInfo.api_url.toString(),
  explorerUrl: chainInfo.explorer_url.toString(),
  nativeToken: chainInfo.native_token.toString(),
})

export const shiftBigintBy = (value: bigint | string, decimals: number): bigint => {
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
