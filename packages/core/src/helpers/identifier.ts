import { WarpConstants } from '../constants'
import { WarpIdType } from '../types'

export const getWarpInfoFromIdentifier = (
  prefixedIdentifier: string
): { type: WarpIdType; identifier: string; identifierBase: string } | null => {
  const decodedIdentifier = decodeURIComponent(prefixedIdentifier)

  // Handle prefixed identifier (contains separator)
  if (decodedIdentifier.includes(WarpConstants.IdentifierParamSeparator)) {
    const [idType, identifier] = decodedIdentifier.split(WarpConstants.IdentifierParamSeparator)
    const identifierBase = identifier.split('?')[0]
    return { type: idType as WarpIdType, identifier, identifierBase }
  }

  const identifierBase = decodedIdentifier.split('?')[0]

  // If exactly 64 characters, treat as hash
  if (identifierBase.length === 64) {
    return { type: WarpConstants.IdentifierType.Hash, identifier: decodedIdentifier, identifierBase }
  }

  // Otherwise treat as alias
  return { type: WarpConstants.IdentifierType.Alias, identifier: decodedIdentifier, identifierBase }
}
