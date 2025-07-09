import { WarpConstants } from './constants'
import { getMainChainInfo } from './helpers'
import { Adapter, InterpolationBag, Warp, WarpAction, WarpInitConfig } from './types'

export class WarpInterpolator {
  constructor(
    private config: WarpInitConfig,
    private repository: Adapter
  ) {}

  async apply(config: WarpInitConfig, warp: Warp): Promise<Warp> {
    const modifiable = this.applyVars(config, warp)
    return await this.applyGlobals(config, modifiable)
  }

  async applyGlobals(config: WarpInitConfig, warp: Warp): Promise<Warp> {
    let modifiable = { ...warp }
    modifiable.actions = await Promise.all(modifiable.actions.map(async (action) => await this.applyActionGlobals(action)))

    modifiable = await this.applyRootGlobals(modifiable, config)

    return modifiable
  }

  applyVars(config: WarpInitConfig, warp: Warp): Warp {
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

  private async applyRootGlobals(warp: Warp, config: WarpInitConfig): Promise<Warp> {
    let modifiable = JSON.stringify(warp)
    const rootBag: InterpolationBag = { config, chain: getMainChainInfo(config) }

    Object.values(WarpConstants.Globals).forEach((global) => {
      const value = global.Accessor(rootBag)
      if (value !== undefined && value !== null) {
        modifiable = modifiable.replace(new RegExp(`{{${global.Placeholder}}}`, 'g'), value.toString())
      }
    })

    return JSON.parse(modifiable)
  }

  private async applyActionGlobals(action: WarpAction): Promise<WarpAction> {
    const chain = action.chain ? await this.repository.registry.getChainInfo(action.chain) : getMainChainInfo(this.config)
    if (!chain) throw new Error(`Chain info not found for ${action.chain}`)
    let modifiable = JSON.stringify(action)
    const bag: InterpolationBag = { config: this.config, chain }

    Object.values(WarpConstants.Globals).forEach((global) => {
      const value = global.Accessor(bag)
      if (value !== undefined && value !== null) {
        modifiable = modifiable.replace(new RegExp(`{{${global.Placeholder}}}`, 'g'), value.toString())
      }
    })

    return JSON.parse(modifiable)
  }
}
