import { WarpConstants } from '../constants'
import { Warp } from '../types'

export const getEventNameFromWarp = (warp: Warp, alertName: string): string | null => {
  const alert = warp.alerts?.[alertName]
  if (!alert) return null
  const prefixWithSep = WarpConstants.Alerts.TriggerEventPrefix + WarpConstants.ArgParamsSeparator
  if (!alert.trigger.startsWith(prefixWithSep)) return null
  const suffix = alert.trigger.replace(prefixWithSep, '')
  if (!suffix) return null
  return suffix
}
