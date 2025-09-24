import { WarpChainName, WarpConstants } from './constants'
import { getWarpWalletAddressFromConfig } from './helpers/wallet'
import { Adapter, InterpolationBag, Warp, WarpAction, WarpClientConfig } from './types'

export class WarpInterpolator {
  constructor(
    private config: WarpClientConfig,
    private adapter: Adapter
  ) {}

  async apply(
    config: WarpClientConfig,
    warp: Warp,
    meta: { envs?: Record<string, any>; queries?: Record<string, any> } = {}
  ): Promise<Warp> {
    const modifiable = this.applyVars(config, warp, meta)
    return await this.applyGlobals(config, modifiable)
  }

  async applyGlobals(config: WarpClientConfig, warp: Warp): Promise<Warp> {
    let modifiable = { ...warp }
    modifiable.actions = await Promise.all(modifiable.actions.map(async (action) => await this.applyActionGlobals(action)))

    modifiable = await this.applyRootGlobals(modifiable, config)

    return modifiable
  }

  applyVars(config: WarpClientConfig, warp: Warp, meta: { envs?: Record<string, any>; queries?: Record<string, any> } = {}): Warp {
    if (!warp?.vars) return warp
    const wallet = getWarpWalletAddressFromConfig(config, this.adapter.chainInfo.name)
    let modifiable = JSON.stringify(warp)

    const modify = (placeholder: string, value: string | number) => {
      modifiable = modifiable.replace(new RegExp(`{{${placeholder.toUpperCase()}}}`, 'g'), value.toString())
    }

    Object.entries(warp.vars).forEach(([placeholder, value]) => {
      if (typeof value !== 'string') {
        modify(placeholder, value)
      } else if (value.startsWith(WarpConstants.Vars.Query + WarpConstants.ArgParamsSeparator)) {
        const queryVar = value.slice(WarpConstants.Vars.Query.length + 1)
        const [queryName, _queryDescription] = queryVar.split(WarpConstants.ArgCompositeSeparator)
        const queryValueInUrl = config.currentUrl ? new URLSearchParams(config.currentUrl.split('?')[1]).get(queryName) : null
        const queryValueInMeta = meta.queries?.[queryName] || null
        const queryValue = queryValueInMeta || queryValueInUrl
        if (queryValue) modify(placeholder, queryValue)
      } else if (value.startsWith(WarpConstants.Vars.Env + WarpConstants.ArgParamsSeparator)) {
        const envVar = value.slice(WarpConstants.Vars.Env.length + 1)
        const [envVarName, _envVarDescription] = envVar.split(WarpConstants.ArgCompositeSeparator)
        const combinedEnvs = { ...config.vars, ...meta.envs }
        const envVarValue = combinedEnvs?.[envVarName]
        if (envVarValue) modify(placeholder, envVarValue)
      } else if (value === WarpConstants.Source.UserWallet && wallet) {
        modify(placeholder, wallet)
      } else {
        modify(placeholder, value)
      }
    })

    return JSON.parse(modifiable)
  }

  private async applyRootGlobals(warp: Warp, config: WarpClientConfig): Promise<Warp> {
    let modifiable = JSON.stringify(warp)

    const rootBag: InterpolationBag = {
      config,
      chain: this.adapter.chainInfo.name as WarpChainName,
      chainInfo: this.adapter.chainInfo,
    }

    Object.values(WarpConstants.Globals).forEach((global) => {
      const value = global.Accessor(rootBag)
      if (value !== undefined && value !== null) {
        modifiable = modifiable.replace(new RegExp(`{{${global.Placeholder}}}`, 'g'), value.toString())
      }
    })

    return JSON.parse(modifiable)
  }

  private async applyActionGlobals(action: WarpAction): Promise<WarpAction> {
    const chain = action.chain ? this.adapter.chainInfo : this.adapter.chainInfo
    if (!chain) throw new Error(`Chain info not found for ${action.chain}`)
    let modifiable = JSON.stringify(action)

    const bag: InterpolationBag = {
      config: this.config,
      chain: this.adapter.chainInfo.name as WarpChainName,
      chainInfo: chain,
    }

    Object.values(WarpConstants.Globals).forEach((global) => {
      const value = global.Accessor(bag)
      if (value !== undefined && value !== null) {
        modifiable = modifiable.replace(new RegExp(`{{${global.Placeholder}}}`, 'g'), value.toString())
      }
    })

    return JSON.parse(modifiable)
  }
}
