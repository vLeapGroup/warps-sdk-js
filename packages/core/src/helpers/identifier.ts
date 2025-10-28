import { WarpConstants } from '../constants'
import { WarpIdType } from '../types'

const isHash = (identifier: string, chainPrefix?: string): boolean => {
  // If it's a hex string longer than 32 characters, it's a hash
  // (since aliases cannot exceed 32 characters)
  const hexRegex = /^[a-fA-F0-9]+$/
  const MAX_ALIAS_LENGTH = 32

  return hexRegex.test(identifier) && identifier.length > MAX_ALIAS_LENGTH
}

const findFirstSeparator = (str: string): { separator: string; index: number } | null => {
  const separator = WarpConstants.IdentifierParamSeparator
  const index = str.indexOf(separator)
  return index !== -1 ? { separator, index } : null
}

const splitBySeparators = (str: string): string[] => {
  const result = findFirstSeparator(str)
  if (!result) return [str]

  const { separator, index } = result
  const firstPart = str.substring(0, index)
  const remaining = str.substring(index + separator.length)

  // Recursively split the remaining part
  const remainingParts = splitBySeparators(remaining)
  return [firstPart, ...remainingParts]
}

export const getWarpInfoFromIdentifier = (
  prefixedIdentifier: string
): { chainPrefix: string; type: WarpIdType; identifier: string; identifierBase: string } | null => {
  const decoded = decodeURIComponent(prefixedIdentifier).trim()
  const identifierWithoutAliasMarker = decoded.replace(WarpConstants.IdentifierAliasMarker, '')
  const base = identifierWithoutAliasMarker.split('?')[0]
  const parts = splitBySeparators(base)

  // Handle 64-character hex hash (no separator)
  if (base.length === 64 && /^[a-fA-F0-9]+$/.test(base)) {
    return {
      chainPrefix: WarpConstants.IdentifierChainDefault,
      type: WarpConstants.IdentifierType.Hash,
      identifier: identifierWithoutAliasMarker,
      identifierBase: base,
    }
  }

  // Edge case: 62-char:xx is invalid (first part is exactly 62 chars, two parts, second part is exactly 2 alphanumeric chars)
  if (parts.length === 2 && /^[a-zA-Z0-9]{62}$/.test(parts[0]) && /^[a-zA-Z0-9]{2}$/.test(parts[1])) {
    return null
  }

  // Handle chain.type.identifier format (3 parts)
  if (parts.length === 3) {
    const [chainPrefix, type, identifier] = parts
    if (type === WarpConstants.IdentifierType.Alias || type === WarpConstants.IdentifierType.Hash) {
      const identifierWithQuery = identifierWithoutAliasMarker.includes('?')
        ? identifier + identifierWithoutAliasMarker.substring(identifierWithoutAliasMarker.indexOf('?'))
        : identifier
      return {
        chainPrefix,
        type: type as WarpIdType,
        identifier: identifierWithQuery,
        identifierBase: identifier,
      }
    }
  }

  // Handle type.identifier format (2 parts, type is 'alias' or 'hash')
  if (parts.length === 2) {
    const [type, identifier] = parts
    if (type === WarpConstants.IdentifierType.Alias || type === WarpConstants.IdentifierType.Hash) {
      const identifierWithQuery = identifierWithoutAliasMarker.includes('?')
        ? identifier + identifierWithoutAliasMarker.substring(identifierWithoutAliasMarker.indexOf('?'))
        : identifier
      return {
        chainPrefix: WarpConstants.IdentifierChainDefault,
        type: type as WarpIdType,
        identifier: identifierWithQuery,
        identifierBase: identifier,
      }
    }
  }

  // Handle chain.identifier format (2 parts, chain is not 'alias' or 'hash')
  if (parts.length === 2) {
    const [chainPrefix, identifier] = parts
    if (chainPrefix !== WarpConstants.IdentifierType.Alias && chainPrefix !== WarpConstants.IdentifierType.Hash) {
      const identifierWithQuery = identifierWithoutAliasMarker.includes('?')
        ? identifier + identifierWithoutAliasMarker.substring(identifierWithoutAliasMarker.indexOf('?'))
        : identifier

      // Determine if identifier is a hash (hex string > 32 chars)
      const identifierType = isHash(identifier, chainPrefix) ? WarpConstants.IdentifierType.Hash : WarpConstants.IdentifierType.Alias

      return {
        chainPrefix,
        type: identifierType,
        identifier: identifierWithQuery,
        identifierBase: identifier,
      }
    }
  }

  // Fallback: treat as alias
  return {
    chainPrefix: WarpConstants.IdentifierChainDefault,
    type: WarpConstants.IdentifierType.Alias,
    identifier: identifierWithoutAliasMarker,
    identifierBase: base,
  }
}

export const extractIdentifierInfoFromUrl = (
  url: string
): { chainPrefix: string; type: WarpIdType; identifier: string; identifierBase: string } | null => {
  const urlObj = new URL(url)
  const searchParamValue = urlObj.searchParams.get(WarpConstants.IdentifierParamName)
  let value = searchParamValue
  if (!value) {
    // fallback for superclient style URLs
    value = urlObj.pathname.split('/')[1]
  }

  if (!value) {
    return null
  }

  const decodedParam = decodeURIComponent(value)
  return getWarpInfoFromIdentifier(decodedParam)
}
