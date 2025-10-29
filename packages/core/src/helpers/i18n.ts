import { WarpClientConfig } from '../types/config'
import { WarpI18nText, WarpText } from '../types/i18n'

export const resolveWarpText = (text: WarpText, config?: WarpClientConfig): string => {
  const targetLanguage = config?.preferences?.locale || 'en'
  if (typeof text === 'string') return text

  if (typeof text === 'object' && text !== null) {
    if (targetLanguage in text) return text[targetLanguage]
    if ('en' in text) return text.en

    // Fallback to any available language
    const availableLanguages = Object.keys(text)
    if (availableLanguages.length > 0) {
      return text[availableLanguages[0]]
    }
  }

  return ''
}

export const isWarpI18nText = (text: WarpText): text is WarpI18nText => {
  return typeof text === 'object' && text !== null && Object.keys(text).length > 0
}

export const createWarpI18nText = (translations: Record<string, string>): WarpI18nText => {
  return translations
}
