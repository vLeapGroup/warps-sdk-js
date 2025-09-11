import { WarpConstants } from '../constants'
import { Warp, WarpSecret } from '../types'

export const extractWarpSecrets = (warp: Warp): WarpSecret[] =>
  Object.values(warp.vars || {})
    .filter((val) => val.startsWith(`${WarpConstants.Vars.Env}:`))
    .map((val) => {
      const value = val.replace(`${WarpConstants.Vars.Env}:`, '').trim()
      const [key, description] = value.split(WarpConstants.ArgCompositeSeparator)
      return { key, description: description || null }
    })
