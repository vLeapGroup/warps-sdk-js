// ISO 639-1 language codes (2-letter format)
export type WarpLocale =
  | 'en'
  | 'es'
  | 'fr'
  | 'de'
  | 'it'
  | 'pt'
  | 'ru'
  | 'zh'
  | 'ja'
  | 'ko'
  | 'ar'
  | 'hi'
  | 'nl'
  | 'sv'
  | 'da'
  | 'no'
  | 'fi'
  | 'pl'
  | 'tr'
  | 'el'
  | 'he'
  | 'th'
  | 'vi'
  | 'id'
  | 'ms'
  | 'tl'
  | string

export type WarpText = string | WarpI18nText

export type WarpI18nText = {
  [language: string]: string
}
