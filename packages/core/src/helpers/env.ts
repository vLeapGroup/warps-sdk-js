import { WarpConstants } from '../constants'
import { Warp } from '../types'

export const extractWarpEnvKeys = (warp: Warp) =>
  Object.values(warp.vars || {})
    .filter((val) => val.startsWith(`${WarpConstants.Vars.Env}:`))
    .map((val) => val.replace(`${WarpConstants.Vars.Env}:`, ''))
