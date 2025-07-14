import { WarpClientConfig } from '../types'
import { WarpExecutionNextInfo, WarpExecutionResults } from '../types/results'
import { Warp } from '../types/warp'
import { WarpLinkBuilder } from '../WarpLinkBuilder'
import { replacePlaceholders } from './general'
import { getWarpInfoFromIdentifier } from './identifier'

const URL_PREFIX = 'https://'

export const getNextInfo = (
  config: WarpClientConfig,
  warp: Warp,
  actionIndex: number,
  results: WarpExecutionResults
): WarpExecutionNextInfo | null => {
  const next = (warp.actions?.[actionIndex] as { next?: string })?.next || warp.next || null
  if (!next) return null
  if (next.startsWith(URL_PREFIX)) return [{ identifier: null, url: next }]

  const [baseIdentifier, queryWithPlaceholders] = next.split('?')
  if (!queryWithPlaceholders) {
    return [{ identifier: baseIdentifier, url: buildNextUrl(baseIdentifier, config) }]
  }

  // Find all array placeholders like {{DELEGATIONS[].contract}}
  const arrayPlaceholders = queryWithPlaceholders.match(/{{([^}]+)\[\](\.[^}]+)?}}/g) || []
  if (arrayPlaceholders.length === 0) {
    const query = replacePlaceholders(queryWithPlaceholders, { ...warp.vars, ...results })
    const identifier = query ? `${baseIdentifier}?${query}` : baseIdentifier
    return [{ identifier, url: buildNextUrl(identifier, config) }]
  }

  // Support multiple array placeholders that reference the same array
  const placeholder = arrayPlaceholders[0]
  if (!placeholder) return []
  const resultNameMatch = placeholder.match(/{{([^[]+)\[\]/)
  const resultName = resultNameMatch ? resultNameMatch[1] : null
  if (!resultName || results[resultName] === undefined) return []

  const resultArray = Array.isArray(results[resultName]) ? results[resultName] : [results[resultName]]
  if (resultArray.length === 0) return []

  // Create regex patterns for all array placeholders with the same result name
  const arrayRegexes = arrayPlaceholders
    .filter((p) => p.includes(`{{${resultName}[]`))
    .map((p) => {
      const fieldMatch = p.match(/\[\](\.[^}]+)?}}/)
      const field = fieldMatch ? fieldMatch[1] || '' : ''
      return {
        placeholder: p,
        field: field ? field.slice(1) : '', // Remove leading dot if present
        regex: new RegExp(p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
      }
    })

  const nextLinks = resultArray
    .map((item) => {
      let replacedQuery = queryWithPlaceholders

      // Replace all array placeholders for this item
      for (const { regex, field } of arrayRegexes) {
        const value = field ? getNestedValue(item, field) : item
        if (value === undefined || value === null) return null
        replacedQuery = replacedQuery.replace(regex, value)
      }

      if (replacedQuery.includes('{{') || replacedQuery.includes('}}')) return null
      const identifier = replacedQuery ? `${baseIdentifier}?${replacedQuery}` : baseIdentifier
      return { identifier, url: buildNextUrl(identifier, config) }
    })
    .filter((link): link is NonNullable<typeof link> => link !== null)

  return nextLinks
}

const buildNextUrl = (identifier: string, config: WarpClientConfig): string => {
  const [rawId, queryString] = identifier.split('?')
  const info = getWarpInfoFromIdentifier(rawId) || { type: 'alias', identifier: rawId, identifierBase: rawId }
  const warpLink = new WarpLinkBuilder(config)
  const baseUrl = warpLink.build(info.type, info.identifierBase)
  if (!queryString) return baseUrl

  const url = new URL(baseUrl)
  new URLSearchParams(queryString).forEach((value, key) => url.searchParams.set(key, value))
  return url.toString().replace(/\/\?/, '?')
}

const getNestedValue = (obj: any, path: string): any => {
  return path.split('.').reduce((current, key) => current?.[key], obj)
}
