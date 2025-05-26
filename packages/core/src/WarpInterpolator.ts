import { WarpConstants } from './constants'
import { Warp, WarpConfig } from './types'

export class WarpInterpolator {
  static applyGlobals(warp: Warp, config: WarpConfig): Warp {
    let modifiable = JSON.stringify(warp)

    Object.values(WarpConstants.Globals).forEach((global) => {
      if (!global?.Placeholder || typeof global.Accessor !== 'function') return
      const value = global.Accessor(config)
      if (value !== undefined && value !== null) {
        modifiable = modifiable.replace(new RegExp(`{{${global.Placeholder}}}`, 'g'), value.toString())
      }
    })

    return JSON.parse(modifiable)
  }

  static applyVars(warp: Warp, config: WarpConfig): Warp {
    if (!warp?.vars) return warp
    let modifiable = JSON.stringify(warp)

    const modify = (placeholder: string, value: string | number) => {
      modifiable = modifiable.replace(new RegExp(`{{${placeholder.toUpperCase()}}}`, 'g'), value.toString())
    }

    Object.entries(warp.vars).forEach(([placeholder, value]) => {
      if (typeof value !== 'string') {
        modify(placeholder, value)
      } else if (value.startsWith(`${WarpConstants.Vars.Query}:`)) {
        if (!config.currentUrl) throw new Error('WarpUtils: currentUrl config is required to prepare vars')
        const queryParamName = value.split(`${WarpConstants.Vars.Query}:`)[1]
        const queryParamValue = new URLSearchParams(config.currentUrl.split('?')[1]).get(queryParamName)
        if (queryParamValue) modify(placeholder, queryParamValue)
      } else if (value.startsWith(`${WarpConstants.Vars.Env}:`)) {
        const envVarName = value.split(`${WarpConstants.Vars.Env}:`)[1]
        const envVarValue = config.vars?.[envVarName]
        if (envVarValue) modify(placeholder, envVarValue)
      } else if (value === WarpConstants.Source.UserWallet && config.user?.wallet) {
        modify(placeholder, config.user.wallet)
      } else {
        modify(placeholder, value)
      }
    })

    return JSON.parse(modifiable)
  }
}
