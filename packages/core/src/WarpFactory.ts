import { WarpUtils } from '../../warps/src/WarpUtils'
import { WarpConstants } from './constants'
import { getWarpActionByIndex, replacePlaceholders, shiftBigintBy } from './helpers/general'
import { extractCollectResults } from './helpers/results'
import { findKnownTokenById } from './tokens'
import {
  ResolvedInput,
  Warp,
  WarpAction,
  WarpActionInput,
  WarpActionInputType,
  WarpChainInfo,
  WarpCollectAction,
  WarpContractAction,
  WarpInitConfig,
  WarpQueryAction,
  WarpTransferAction,
} from './types'
import { WarpExecution } from './types/results'
import { CacheKey, CacheTtl, WarpCache } from './WarpCache'
import { WarpInterpolator } from './WarpInterpolator'
import { WarpLogger } from './WarpLogger'
import { WarpSerializer } from './WarpSerializer'

export type WarpExecutable = {
  chain: WarpChainInfo
  warp: Warp
  destination: string
  args: string[]
  value: bigint
  transfers: string[]
  data: string | null
  resolvedInputs: ResolvedInput[]
}

export class WarpFactory {
  private config: WarpInitConfig
  private url: URL
  private serializer: WarpSerializer
  private cache: WarpCache

  constructor(config: WarpInitConfig) {
    if (!config.currentUrl) throw new Error('WarpActionExecutor: currentUrl config not set')
    this.config = config
    this.url = new URL(config.currentUrl)
    this.serializer = new WarpSerializer()
    this.cache = new WarpCache(config.cache?.type)
  }

  async createExecutable(warp: Warp, actionIndex: number, inputs: string[]): Promise<WarpExecutable> {
    const action = getWarpActionByIndex(warp, actionIndex) as WarpTransferAction | WarpContractAction
    const chain = await WarpUtils.getChainInfoForAction(this.config, action, inputs)

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
    let transfers = [
      ...(transfersInAction?.map(this.toTypedTransfer) || []),
      ...(transferInputs?.map((t) => this.serializer.stringToNative(t)[1] as TokenTransfer) || []),
    ]

    const isSingleTransfer = transfers.length === 1 && transferInputs.length === 1 && !transfersInAction?.length
    const isNativeEsdt = transfers[0]?.token.identifier === `${chain.nativeToken}-000000`
    const hasNoOtherEsdtInputs = !modifiedInputs.some((i) => i.value && i.input.position !== 'transfer' && i.input.type === 'esdt')
    if (isSingleTransfer && isNativeEsdt && hasNoOtherEsdtInputs) {
      value += transfers[0].amount
      transfers = []
    }

    const dataInput = modifiedInputs.find((i) => i.input.position === 'data')?.value
    const dataInAction = 'data' in action ? action.data || '' : null
    const data = dataInput || dataInAction || null

    const executable: WarpExecutable = { warp, chain, destination, args, value, transfers, data, resolvedInputs: modifiedInputs }

    this.cache.set(
      CacheKey.WarpExecutable(this.config.env, warp.meta?.hash || '', actionIndex),
      executable.resolvedInputs,
      CacheTtl.OneWeek
    )

    return executable
  }

  async getTransactionExecutionResults<T>(warp: Warp, actionIndex: number, tx: T): Promise<WarpExecution> {
    const preparedWarp = await WarpInterpolator.apply(this.config, warp)
    const action = getWarpActionByIndex(preparedWarp, actionIndex) as WarpContractAction

    // Restore inputs via cache as transactions are broadcasted and processed asynchronously
    const inputs: ResolvedInput[] = this.cache.get(CacheKey.WarpExecutable(this.config.env, warp.meta?.hash || '', actionIndex)) ?? []

    const results = await this.adapter.results().extractContractResults(this, preparedWarp, action, tx, actionIndex, inputs)
    const next = WarpUtils.getNextInfo(this.config, preparedWarp, actionIndex, results)
    const messages = this.getPreparedMessages(preparedWarp, results.results)

    return {
      success: results.success,
      warp: preparedWarp,
      action: actionIndex,
      user: this.config.user?.wallet || null,
      txHash: results.txHash,
      next,
      values: results.values,
      results: results.results,
      messages,
    }
  }

  async executeQuery(warp: Warp, actionIndex: number, inputs: string[]): Promise<WarpExecution> {
    const action = getWarpActionByIndex(warp, actionIndex) as WarpQueryAction | null
    if (!action) throw new Error('WarpActionExecutor: Action not found')
    if (!action.func) throw new Error('WarpActionExecutor: Function not found')

    const components = await this.createExecutable(warp, actionIndex, inputs)
    const tx = await this.adapter.factory().executeQuery(components)
    const preparedWarp = await WarpInterpolator.apply(this.config, warp)
    const results = await this.adapter.results().extractQueryResults(this, preparedWarp, tx, actionIndex, components.resolvedInputs)
    const next = WarpUtils.getNextInfo(this.config, preparedWarp, actionIndex, results)

    return {
      success: results.success,
      warp: preparedWarp,
      action: actionIndex,
      user: this.config.user?.wallet || null,
      txHash: null,
      next,
      values: results.values,
      results,
      messages: this.getPreparedMessages(preparedWarp, results),
    }
  }

  async executeCollect(warp: Warp, actionIndex: number, inputs: string[], extra?: Record<string, any>): Promise<WarpExecution> {
    const action = getWarpActionByIndex(warp, actionIndex) as WarpCollectAction | null
    if (!action) throw new Error('WarpActionExecutor: Action not found')

    const chain = await WarpUtils.getChainInfoForAction(this.config, action)
    const preparedWarp = await WarpInterpolator.apply(this.config, warp)
    const resolvedInputs = await this.getResolvedInputs(chain, action, inputs)
    const modifiedInputs = this.getModifiedInputs(resolvedInputs)

    const toInputPayloadValue = (resolvedInput: ResolvedInput) => {
      if (!resolvedInput.value) return null
      const value = this.serializer.stringToNative(resolvedInput.value)[1]
      if (resolvedInput.input.type === 'biguint') {
        return (value as bigint).toString() // json-stringify doesn't support bigint
      } else if (resolvedInput.input.type === 'esdt') {
        const casted = value as TokenTransfer
        return { token: casted.token.identifier, nonce: casted.token.nonce.toString(), amount: casted.amount.toString() }
      } else {
        return value
      }
    }

    const headers = new Headers()
    headers.set('Content-Type', 'application/json')
    headers.set('Accept', 'application/json')
    Object.entries(action.destination.headers || {}).forEach(([key, value]) => {
      headers.set(key, value as string)
    })

    const payload = Object.fromEntries(modifiedInputs.map((i) => [i.input.as || i.input.name, toInputPayloadValue(i)]))
    const httpMethod = action.destination.method || 'GET'
    const body = httpMethod === 'GET' ? undefined : JSON.stringify({ ...payload, ...extra })

    WarpLogger.info('Executing collect', {
      url: action.destination.url,
      method: httpMethod,
      headers,
      body,
    })

    try {
      const response = await fetch(action.destination.url, { method: httpMethod, headers, body })
      const content = await response.json()
      const { values, results } = await extractCollectResults(preparedWarp, content, actionIndex, modifiedInputs)
      const next = WarpUtils.getNextInfo(this.config, preparedWarp, actionIndex, results)

      return {
        success: response.ok,
        warp: preparedWarp,
        action: actionIndex,
        user: this.config.user?.wallet || null,
        txHash: null,
        next,
        values,
        results: { ...results, _DATA: content },
        messages: this.getPreparedMessages(preparedWarp, results),
      }
    } catch (error) {
      WarpLogger.error('WarpActionExecutor: Error executing collect', error)
      return {
        success: false,
        warp: preparedWarp,
        action: actionIndex,
        user: this.config.user?.wallet || null,
        txHash: null,
        next: null,
        values: [],
        results: { _DATA: error },
        messages: {},
      }
    }
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

    return argInputs.map((input, index) => {
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
      if (type === 'esdt') {
        const [tokenId, nonce, amount, existingDecimals] = value.split(WarpConstants.ArgCompositeSeparator)
        if (existingDecimals) return input
        const token = new Token({ identifier: tokenId, nonce: BigInt(nonce) })
        const isFungible = new TokenComputer().isFungible(token)
        if (!isFungible) return input // TODO: handle non-fungible tokens like meta-esdts
        const knownToken = findKnownTokenById(tokenId)
        let decimals = knownToken?.decimals
        if (!decimals) {
          const definitionRes = await fetch(`${chain.apiUrl}/tokens/${tokenId}`) // TODO: use chainApi directly; currently causes circular reference for whatever reason
          const definition = await definitionRes.json()
          decimals = definition.decimals
        }
        if (!decimals) throw new Error(`WarpActionExecutor: Decimals not found for token ${tokenId}`)
        const processed = new TokenTransfer({ token, amount: shiftBigintBy(amount, decimals) })
        return this.serializer.nativeToString(type, processed) + WarpConstants.ArgCompositeSeparator + decimals
      }
      return input
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

  private getPreparedMessages(warp: Warp, results: Record<string, any>): Record<string, string> {
    const parts = Object.entries(warp.messages || {}).map(([key, value]) => [key, replacePlaceholders(value, results)])

    return Object.fromEntries(parts)
  }
}
