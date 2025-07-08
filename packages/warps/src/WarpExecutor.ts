import {
  applyResultsToMessages,
  extractCollectResults,
  getNextInfo,
  getWarpActionByIndex,
  Warp,
  WarpActionIndex,
  WarpChainInfo,
  WarpExecution,
  WarpInitConfig,
  WarpLogger,
} from '@vleap/warps-core'
import { getAdapter } from '../config/adapter'
import { WarpFactory } from './WarpFactory'

export type WarpAdapterTransaction = any

type ExecutionHandlers = {
  onExecuted?: (result: WarpExecution) => void
}

export class WarpExecutor {
  private config: WarpInitConfig
  private factory: WarpFactory
  private handlers: ExecutionHandlers

  constructor(config: WarpInitConfig, handlers: ExecutionHandlers) {
    this.config = config
    this.factory = new WarpFactory(config)
    this.handlers = handlers
  }

  async execute(warp: Warp, inputs: string[]): Promise<[WarpAdapterTransaction | null, WarpChainInfo | null]> {
    const actionIndex = this.determineActionIndex(warp, inputs)
    const executable = await this.factory.createExecutable(warp, actionIndex, inputs)
    const action = getWarpActionByIndex(warp, actionIndex)

    if (action.type === 'collect') {
      const results = await this.executeCollect(warp, actionIndex, inputs)
      this.handlers.onExecuted?.(results)
      return [null, null]
    }

    const chainName = executable.chain.name.toLowerCase()
    const adapterLoader = getAdapter(chainName) || getAdapter('multiversx')
    if (!adapterLoader) throw new Error(`No adapter registered for chain: ${chainName}`)
    const AdapterExecutor = await adapterLoader.executor()
    const executor = new AdapterExecutor(this.config)
    const tx = await executor.createTransaction(executable)

    return [tx, executable.chain]
  }

  async evaluateResults(tx: WarpAdapterTransaction): Promise<void> {
    const adapterLoader = getAdapter(tx.chain.name.toLowerCase())
    if (!adapterLoader) throw new Error(`No adapter registered for chain: ${tx.chain.name}`)
    const AdapterResults = await adapterLoader.results()
    const results = new AdapterResults(tx)
    const executionResult = (await results.getTransactionExecutionResults(tx)) as WarpExecution
    this.handlers.onExecuted?.(executionResult)
  }

  private determineActionIndex(warp: Warp, inputs: string[]): WarpActionIndex {
    const available = warp.actions.filter((action) => action.type !== 'link')
    const preferredChain = this.config.preferredChain?.toLowerCase()
    if (preferredChain) {
      const preferred = available.findIndex((action) => action.chain?.toLowerCase() === preferredChain)
      if (preferred !== -1) return preferred
    }
    return 1
  }

  private async executeCollect(warp: Warp, action: WarpActionIndex, inputs: string[], extra?: Record<string, any>): Promise<WarpExecution> {
    const { WarpInterpolator } = await import('./WarpInterpolator')
    const { WarpUtils } = await import('./WarpUtils')
    const collectAction = getWarpActionByIndex(warp, action) as any | null
    if (!collectAction) throw new Error('WarpActionExecutor: Action not found')

    const chain = await WarpUtils.getChainInfoForAction(this.config, collectAction)
    const preparedWarp = await WarpInterpolator.apply(this.config, warp)
    const resolvedInputs = await this.factory.getResolvedInputs(chain, collectAction, inputs)
    const modifiedInputs = this.factory.getModifiedInputs(resolvedInputs)
    const serializer = this.factory['serializer']

    const toInputPayloadValue = (resolvedInput: any) => {
      if (!resolvedInput.value) return null
      const value = serializer.stringToNative(resolvedInput.value)[1]
      if (resolvedInput.input.type === 'biguint') {
        return (value as bigint).toString()
      } else if (resolvedInput.input.type === 'esdt') {
        return {
          /* TODO: cast to native transferable */
        }
      } else {
        return value
      }
    }

    const headers = new Headers()
    headers.set('Content-Type', 'application/json')
    headers.set('Accept', 'application/json')
    Object.entries(collectAction.destination.headers || {}).forEach(([key, value]) => {
      headers.set(key, value as string)
    })

    const payload = Object.fromEntries(modifiedInputs.map((i: any) => [i.input.as || i.input.name, toInputPayloadValue(i)]))
    const httpMethod = collectAction.destination.method || 'GET'
    const body = httpMethod === 'GET' ? undefined : JSON.stringify({ ...payload, ...extra })

    WarpLogger.info('Executing collect', {
      url: collectAction.destination.url,
      method: httpMethod,
      headers,
      body,
    })

    try {
      const response = await fetch(collectAction.destination.url, { method: httpMethod, headers, body })
      const content = await response.json()
      const { values, results } = await extractCollectResults(preparedWarp, content, action, modifiedInputs)
      const next = getNextInfo(this.config, preparedWarp, action, results)

      return {
        success: response.ok,
        warp: preparedWarp,
        action: action,
        user: this.config.user?.wallet || null,
        txHash: null,
        next,
        values,
        results: { ...results, _DATA: content },
        messages: applyResultsToMessages(preparedWarp, results),
      }
    } catch (error) {
      WarpLogger.error('WarpActionExecutor: Error executing collect', error)
      return {
        success: false,
        warp: preparedWarp,
        action: action,
        user: this.config.user?.wallet || null,
        txHash: null,
        next: null,
        values: [],
        results: { _DATA: error },
        messages: {},
      }
    }
  }
}
