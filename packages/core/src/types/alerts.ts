import { WarpText } from './i18n'

export type WarpAlertName = string

export type WarpAlert = {
  label: WarpText
  trigger: string
  subject: WarpText
  body: WarpText
  action?: string
}

export type WarpAlerts = Record<WarpAlertName, WarpAlert>
