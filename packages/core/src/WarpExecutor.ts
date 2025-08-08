import {
  applyResultsToMessages,
  extractCollectResults,
  findWarpAdapterForChain,
  findWarpExecutableAction,
  getNextInfo,
  getWarpActionByIndex,
} from './helpers'
import { createAuthHeaders, createAuthMessage } from './helpers/signing'
import {
  Adapter,
  Warp,
  WarpActionIndex,
  WarpAdapterGenericRemoteTransaction,
  WarpAdapterGenericTransaction,
  WarpChainInfo,
  WarpClientConfig,
  WarpExecution,
} from './types'
import { WarpFactory } from './WarpFactory'
import { WarpInterpolator } from './WarpInterpolator'
import { WarpLogger } from './WarpLogger'
import { WarpSerializer } from './WarpSerializer'

export type ExecutionHandlers = {
  onExecuted?: (result: WarpExecution) => void
  onError?: (params: { message: string }) => void
  onSignRequest?: (params: { message: string; chain: WarpChainInfo }) => Promise<string>
}

export class WarpExecutor {
  private factory: WarpFactory
  private serializer: WarpSerializer

  constructor(
    private config: WarpClientConfig,
    private adapters: Adapter[],
    private handlers?: ExecutionHandlers
  ) {
    this.handlers = handlers
    this.factory = new WarpFactory(config, adapters)
    this.serializer = new WarpSerializer()
  }

  async execute(warp: Warp, inputs: string[]): Promise<{ tx: WarpAdapterGenericTransaction | null; chain: WarpChainInfo | null }> {
    const { action, actionIndex } = findWarpExecutableAction(warp)

    if (action.type === 'collect') {
      const result = await this.executeCollect(warp, actionIndex, inputs)
      result.success ? this.handlers?.onExecuted?.(result) : this.handlers?.onError?.({ message: JSON.stringify(result.values) })
      return { tx: null, chain: null }
    }

    const executable = await this.factory.createExecutable(warp, actionIndex, inputs)
    const chainName = executable.chain.name.toLowerCase()
    const adapterLoader = this.adapters.find((a) => a.chain.toLowerCase() === chainName)
    if (!adapterLoader) throw new Error(`No adapter registered for chain: ${chainName}`)
    const tx = await adapterLoader.executor.createTransaction(executable)

    return { tx, chain: executable.chain }
  }

  async evaluateResults(warp: Warp, chain: WarpChainInfo, tx: WarpAdapterGenericRemoteTransaction): Promise<void> {
    const adapterLoader = this.adapters.find((a) => a.chain.toLowerCase() === chain.name.toLowerCase())
    if (!adapterLoader) throw new Error(`No adapter registered for chain: ${chain.name}`)
    const result = (await adapterLoader.results.getTransactionExecutionResults(warp, tx)) as WarpExecution
    this.handlers?.onExecuted?.(result)
  }

  private async executeCollect(warp: Warp, action: WarpActionIndex, inputs: string[], extra?: Record<string, any>): Promise<WarpExecution> {
    const collectAction = getWarpActionByIndex(warp, action) as any | null
    if (!collectAction) throw new Error('WarpActionExecutor: Action not found')

    const chain = await this.factory.getChainInfoForAction(collectAction)
    const adapter = findWarpAdapterForChain(chain.name, this.adapters)
    const preparedWarp = await new WarpInterpolator(this.config, adapter).apply(this.config, warp)
    const resolvedInputs = await this.factory.getResolvedInputs(chain, collectAction, inputs)
    const modifiedInputs = this.factory.getModifiedInputs(resolvedInputs)

    const toInputPayloadValue = (resolvedInput: any) => {
      if (!resolvedInput.value) return null
      const value = this.serializer.stringToNative(resolvedInput.value)[1]
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

    if (this.handlers?.onSignRequest) {
      const walletAddress = this.config.user?.wallets?.[chain.name]
      if (!walletAddress) throw new Error(`No wallet configured for chain ${chain.name}`)
      const { message, nonce, expiresAt } = createAuthMessage(walletAddress, `${chain.name}-adapter`)
      const signature = await this.handlers.onSignRequest({ message, chain })
      const authHeaders = createAuthHeaders(walletAddress, signature, nonce, expiresAt)
      Object.entries(authHeaders).forEach(([key, value]) => headers.set(key, value))
    }

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
      const next = getNextInfo(this.config, adapter, preparedWarp, action, results)

      return {
        success: response.ok,
        warp: preparedWarp,
        action: action,
        user: this.config.user?.wallets?.[chain.name] || null,
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
        user: this.config.user?.wallets?.[chain.name] || null,
        txHash: null,
        next: null,
        values: [],
        results: { _DATA: error },
        messages: {},
      }
    }
  }
}
