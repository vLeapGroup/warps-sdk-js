import { WarpConstants } from './constants'
import { findWarpAdapterForChain, findWarpDefaultAdapter, getMainChainInfo, getWarpActionByIndex, shiftBigintBy } from './helpers'
import {
  Adapter,
  ResolvedInput,
  Warp,
  WarpAction,
  WarpActionInput,
  WarpActionInputType,
  WarpChain,
  WarpChainInfo,
  WarpClientConfig,
  WarpContractAction,
  WarpExecutable,
  WarpTransferAction,
} from './types'
import { CacheTtl, WarpCache, WarpCacheKey } from './WarpCache'
import { WarpSerializer } from './WarpSerializer'

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
  }

  async createExecutable(warp: Warp, actionIndex: number, inputs: string[]): Promise<WarpExecutable> {
    const action = getWarpActionByIndex(warp, actionIndex) as WarpTransferAction | WarpContractAction
    if (!action) throw new Error('WarpFactory: Action not found')
    const chain = await this.getChainInfoForAction(action, inputs)

    const resolvedInputs = await this.getResolvedInputs(chain, action, inputs)
    const modifiedInputs = this.getModifiedInputs(resolvedInputs)

    const destinationInput = modifiedInputs.find((i) => i.input.position === 'receiver')?.value
    const detinationInAction = 'address' in action ? action.address : null
    const destinationRaw = destinationInput?.split(':')[1] || detinationInAction
    if (!destinationRaw) throw new Error('WarpActionExecutor: Destination/Receiver not provided')
    const destination = destinationRaw

    const args = this.getPreparedArgs(action, modifiedInputs)

    const valueInput = modifiedInputs.find((i) => i.input.position === 'value')?.value || null
    const valueInAction = 'value' in action ? action.value : null
    let value = BigInt(valueInput?.split(':')[1] || valueInAction || 0)

    const transferInputs = modifiedInputs.filter((i) => i.input.position === 'transfer' && i.value).map((i) => i.value) as string[]
    const transfersInAction = 'transfers' in action ? action.transfers : []
    const transfers = [...(transfersInAction || []), ...(transferInputs || [])]

    // TODO: extract to multiversx adapter?
    // const isSingleTransfer = transfers.length === 1 && transferInputs.length === 1 && !transfersInAction?.length
    // const isNativeEsdt = transfers[0]?.token.identifier === `${chain.nativeToken}-000000`
    // const hasNoOtherEsdtInputs = !modifiedInputs.some((i) => i.value && i.input.position !== 'transfer' && i.input.type === 'esdt')
    // if (isSingleTransfer && isNativeEsdt && hasNoOtherEsdtInputs) {
    //   value += transfers[0].amount
    //   transfers = []
    // }

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
    if (inputs) {
      const chainFromInputs = await this.tryGetChainFromInputs(action, inputs)
      if (chainFromInputs) return chainFromInputs
    }
    return this.getDefaultChainInfo(action)
  }

  public async getResolvedInputs(chain: WarpChainInfo, action: WarpAction, inputArgs: string[]): Promise<ResolvedInput[]> {
    const argInputs = action.inputs || []
    const preprocessed = await Promise.all(inputArgs.map((arg) => this.preprocessInput(chain, arg)))

    const toValueByType = (input: WarpActionInput, index: number) => {
      if (input.source === 'query') {
        const value = this.url.searchParams.get(input.name)
        if (!value) return null
        return this.serializer.nativeToString(input.type, value)
      } else if (input.source === WarpConstants.Source.UserWallet) {
        if (!this.config.user?.wallet) return null
        return this.serializer.nativeToString('address', this.config.user.wallet)
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

  public async preprocessInput(chain: WarpChainInfo, input: string): Promise<string> {
    try {
      const [type, value] = input.split(WarpConstants.ArgParamsSeparator, 2) as [WarpActionInputType, string]
      const adapter = findWarpAdapterForChain(chain.name, this.adapters)
      return adapter.executor.preprocessInput(chain, input, type, value)
    } catch (e) {
      return input
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
    if (!chainInput) throw new Error('WarpUtils: Chain input not found')

    const serializer = new WarpSerializer()
    const chainValue = serializer.stringToNative(chainInput)[1] as WarpChain

    const adapter = findWarpAdapterForChain(chainValue, this.adapters)
    const chainInfo = await adapter.registry.getChainInfo(chainValue)
    if (!chainInfo) throw new Error(`WarpUtils: Chain info not found for ${chainValue}`)

    return chainInfo
  }

  private async getDefaultChainInfo(action: WarpAction): Promise<WarpChainInfo> {
    if (!action.chain) return getMainChainInfo(this.config)

    const adapter = findWarpDefaultAdapter(this.adapters)
    const chainInfo = await adapter.registry.getChainInfo(action.chain, { ttl: CacheTtl.OneWeek })
    if (!chainInfo) throw new Error(`WarpUtils: Chain info not found for ${action.chain}`)

    return chainInfo
  }
}
