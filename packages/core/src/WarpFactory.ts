import { WarpConstants } from './constants'
import { findWarpAdapterForChain, getWarpActionByIndex, shiftBigintBy } from './helpers'
import {
  Adapter,
  ResolvedInput,
  Warp,
  WarpAction,
  WarpActionInput,
  WarpActionInputType,
  WarpChain,
  WarpChainAssetValue,
  WarpChainInfo,
  WarpClientConfig,
  WarpContractAction,
  WarpExecutable,
  WarpTransferAction,
} from './types'
import { asset } from './utils.codec'
import { CacheTtl, WarpCache, WarpCacheKey } from './WarpCache'
import { WarpLogger } from './WarpLogger'
import { WarpSerializer } from './WarpSerializer'
import { WarpTypeRegistryImpl } from './WarpTypeRegistry'

export class WarpFactory {
  private url: URL
  private serializer: WarpSerializer
  private cache: WarpCache

  constructor(
    private config: WarpClientConfig,
    private adapters: Adapter[]
  ) {
    if (!config.currentUrl) throw new Error('WarpFactory: currentUrl config not set')
    this.url = new URL(config.currentUrl)
    this.serializer = new WarpSerializer()
    this.cache = new WarpCache(config.cache?.type)

    // Initialize type registry with adapter-specific types
    const typeRegistry = new WarpTypeRegistryImpl()
    this.serializer.setTypeRegistry(typeRegistry)

    // Register types from all adapters
    for (const adapter of adapters) {
      if (adapter.registerTypes) {
        adapter.registerTypes(typeRegistry)
      }
    }
  }

  async createExecutable(warp: Warp, actionIndex: number, inputs: string[]): Promise<WarpExecutable> {
    const action = getWarpActionByIndex(warp, actionIndex) as WarpTransferAction | WarpContractAction
    if (!action) throw new Error('WarpFactory: Action not found')
    const chain = await this.getChainInfoForAction(action, inputs)

    const resolvedInputs = await this.getResolvedInputs(chain.name, action, inputs)
    const modifiedInputs = this.getModifiedInputs(resolvedInputs)

    const destinationInput = modifiedInputs.find((i) => i.input.position === 'receiver')?.value
    const destinationInAction = 'address' in action ? action.address : null
    const destination = destinationInput ? (this.serializer.stringToNative(destinationInput)[1] as string) : destinationInAction
    if (!destination) throw new Error('WarpActionExecutor: Destination/Receiver not provided')

    const args = this.getPreparedArgs(action, modifiedInputs)

    const valueInput = modifiedInputs.find((i) => i.input.position === 'value')?.value || null
    const valueInAction = 'value' in action ? action.value : null
    let value = BigInt(valueInput?.split(':')[1] || valueInAction || 0)

    const transferInputs = modifiedInputs.filter((i) => i.input.position === 'transfer' && i.value).map((i) => i.value) as string[]
    const transfersInAction = 'transfers' in action ? action.transfers : []
    const transfersMerged = [...(transfersInAction || []), ...(transferInputs || [])]
    const transfers = transfersMerged.map((t) => this.serializer.stringToNative(t)[1]) as WarpChainAssetValue[]

    const dataInput = modifiedInputs.find((i) => i.input.position === 'data')?.value
    const dataInAction = 'data' in action ? action.data || '' : null
    const data = dataInput || dataInAction || null

    const executable: WarpExecutable = {
      warp,
      chain,
      action: actionIndex,
      destination,
      args,
      value,
      transfers,
      data,
      resolvedInputs: modifiedInputs,
    }

    this.cache.set(
      WarpCacheKey.WarpExecutable(this.config.env, warp.meta?.hash || '', actionIndex),
      executable.resolvedInputs,
      CacheTtl.OneWeek
    )

    return executable
  }

  async getChainInfoForAction(action: WarpAction, inputs?: string[]): Promise<WarpChainInfo> {
    if (action.chain) {
      const adapter = findWarpAdapterForChain(action.chain, this.adapters)
      return adapter.chainInfo
    }

    if (inputs) {
      const chainFromInputs = await this.tryGetChainFromInputs(action, inputs)
      if (chainFromInputs) return chainFromInputs
    }

    // Finally use default adapter
    const defaultAdapter = this.adapters[0]
    return defaultAdapter.chainInfo
  }

  public async getResolvedInputs(chain: WarpChain, action: WarpAction, inputArgs: string[]): Promise<ResolvedInput[]> {
    const argInputs = action.inputs || []
    const preprocessed = await Promise.all(inputArgs.map((arg) => this.preprocessInput(chain, arg)))

    const toValueByType = (input: WarpActionInput, index: number) => {
      if (input.source === 'query') {
        const value = this.url.searchParams.get(input.name)
        if (!value) return null
        return this.serializer.nativeToString(input.type, value)
      } else if (input.source === WarpConstants.Source.UserWallet) {
        if (!this.config.user?.wallets?.[chain]) return null
        return this.serializer.nativeToString('address', this.config.user.wallets[chain])
      } else {
        return preprocessed[index] || null
      }
    }

    return argInputs.map((input: WarpActionInput, index: number) => {
      const value = toValueByType(input, index)
      return {
        input,
        value: value || (input.default !== undefined ? this.serializer.nativeToString(input.type, input.default) : null),
      }
    })
  }

  public getModifiedInputs(inputs: ResolvedInput[]): ResolvedInput[] {
    // Note: 'scale' modifier means that the value is multiplied by 10^modifier; the modifier can also be the name of another input field
    // Example: 'scale:10' means that the value is multiplied by 10^10
    // Example 2: 'scale:{amount}' means that the value is multiplied by the value of the 'amount' input field

    // TODO: refactor once more modifiers are added

    return inputs.map((resolved, index) => {
      if (resolved.input.modifier?.startsWith('scale:')) {
        const [, exponent] = resolved.input.modifier.split(':')
        if (isNaN(Number(exponent))) {
          // Scale by another input field
          const exponentVal = Number(inputs.find((i) => i.input.name === exponent)?.value?.split(':')[1])
          if (!exponentVal) throw new Error(`WarpActionExecutor: Exponent value not found for input ${exponent}`)
          const scalableVal = resolved.value?.split(':')[1]
          if (!scalableVal) throw new Error('WarpActionExecutor: Scalable value not found')
          const scaledVal = shiftBigintBy(scalableVal, +exponentVal)
          return { ...resolved, value: `${resolved.input.type}:${scaledVal}` }
        } else {
          // Scale by fixed amount
          const scalableVal = resolved.value?.split(':')[1]
          if (!scalableVal) throw new Error('WarpActionExecutor: Scalable value not found')
          const scaledVal = shiftBigintBy(scalableVal, +exponent)
          return { ...resolved, value: `${resolved.input.type}:${scaledVal}` }
        }
      } else {
        return resolved
      }
    })
  }

  public async preprocessInput(chain: WarpChain, input: string): Promise<string> {
    try {
      const [type, value] = input.split(WarpConstants.ArgParamsSeparator, 2) as [WarpActionInputType, string]
      const adapter = findWarpAdapterForChain(chain, this.adapters)

      if (type === 'asset') {
        const [assetId, amount, existingDecimals] = value.split(WarpConstants.ArgCompositeSeparator)
        if (existingDecimals) return input
        const chainAsset = await adapter.dataLoader.getAsset(assetId)
        if (!chainAsset) throw new Error(`WarpFactory: Asset not found for asset ${assetId}`)
        if (typeof chainAsset.decimals !== 'number') throw new Error(`WarpFactory: Decimals not found for asset ${assetId}`)
        const amountBig = shiftBigintBy(amount, chainAsset.decimals)
        return asset({ chain, identifier: assetId, name: chainAsset.name, amount: amountBig, decimals: chainAsset.decimals })
      } else {
        return input
      }
    } catch (e) {
      WarpLogger.warn('WarpFactory: Preprocess input failed', e)
      throw e
    }
  }

  private getPreparedArgs(action: WarpAction, resolvedInputs: ResolvedInput[]): string[] {
    let args = 'args' in action ? action.args || [] : []
    resolvedInputs.forEach(({ input, value }) => {
      if (!value) return
      if (!input.position?.startsWith('arg:')) return
      const argIndex = Number(input.position.split(':')[1]) - 1
      args.splice(argIndex, 0, value)
    })

    return args
  }

  private async tryGetChainFromInputs(action: WarpAction, inputs: string[]): Promise<WarpChainInfo | null> {
    const chainPositionIndex = action.inputs?.findIndex((i) => i.position === 'chain')
    if (chainPositionIndex === -1 || chainPositionIndex === undefined) return null

    const chainInput = inputs[chainPositionIndex]
    if (!chainInput) throw new Error('Chain input not found')

    const serializer = new WarpSerializer()
    const chainValue = serializer.stringToNative(chainInput)[1] as WarpChain

    const adapter = findWarpAdapterForChain(chainValue, this.adapters)

    return adapter.chainInfo
  }
}
