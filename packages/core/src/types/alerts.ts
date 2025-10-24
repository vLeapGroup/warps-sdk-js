import { WarpText } from './i18n'

export type WarpAlertName = string

export type WarpAlert = {
  trigger: string
  subject: WarpText
  body: WarpText
}

export type WarpAlerts = Record<WarpAlertName, WarpAlert>
