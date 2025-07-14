import { WarpConstants } from '../constants'
import { WarpIdType } from '../types'

export const getWarpInfoFromIdentifier = (
  prefixedIdentifier: string
): { chainPrefix: string; type: WarpIdType; identifier: string; identifierBase: string } | null => {
  const decoded = decodeURIComponent(prefixedIdentifier).trim()
  const parts = decoded.split(WarpConstants.IdentifierParamSeparator)
  const base = decoded.split('?')[0]

  // chain:type:identifier
  if (parts.length === 3 && (parts[1] === WarpConstants.IdentifierType.Alias || parts[1] === WarpConstants.IdentifierType.Hash)) {
    return {
      chainPrefix: parts[0],
      type: parts[1] as WarpIdType,
      identifier: parts[2],
      identifierBase: parts[2].split('?')[0],
    }
  }

  // type:identifier (type is 'alias' or 'hash')
  if (parts.length === 2 && (parts[0] === WarpConstants.IdentifierType.Alias || parts[0] === WarpConstants.IdentifierType.Hash)) {
    return {
      chainPrefix: WarpConstants.IdentifierChainDefault,
      type: parts[0] as WarpIdType,
      identifier: parts[1],
      identifierBase: parts[1].split('?')[0],
    }
  }

  // Edge case: 62-char:xx is invalid (first part is exactly 62 chars, two parts, second part is exactly 2 alphanumeric chars, and nothing else)
  if (parts.length === 2 && /^[a-zA-Z0-9]{62}$/.test(parts[0]) && /^[a-zA-Z0-9]{2}$/.test(parts[1])) {
    return null
  }

  // chain:identifier (chain is not 'alias' or 'hash')
  if (parts.length === 2 && parts[0] !== WarpConstants.IdentifierType.Alias && parts[0] !== WarpConstants.IdentifierType.Hash) {
    return {
      chainPrefix: parts[0],
      type: WarpConstants.IdentifierType.Alias,
      identifier: parts[1],
      identifierBase: parts[1].split('?')[0],
    }
  }

  // 64-char hash (no separator)
  if (base.length === 64) {
    return {
      chainPrefix: WarpConstants.IdentifierChainDefault,
      type: WarpConstants.IdentifierType.Hash,
      identifier: decoded,
      identifierBase: base,
    }
  }

  // fallback: treat as alias
  return {
    chainPrefix: WarpConstants.IdentifierChainDefault,
    type: WarpConstants.IdentifierType.Alias,
    identifier: decoded,
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
