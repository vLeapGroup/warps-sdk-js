import { Config } from './config'
import { ChainEnv, RegistryInfo } from './types'

export const getChainId = (env: ChainEnv): string => {
  if (env === 'devnet') return 'D'
  if (env === 'testnet') return 'T'
  return '1'
}

export const getLatestProtocolIdentifier = (name: string): string => `${name}:${Config.LatestProtocolVersion}`

export const toTypedRegistryInfo = (registryInfo: any): RegistryInfo => ({
  hash: registryInfo.hash.toString('hex'),
  alias: registryInfo.alias?.toString() || null,
  trust: registryInfo.trust.toString(),
  creator: registryInfo.creator.toString(),
  createdAt: registryInfo.created_at.toNumber(),
  brand: registryInfo.brand?.toString('hex') || null,
  upgrade: registryInfo.upgrade?.toString('hex') || null,
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
    return BigInt(value)
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
