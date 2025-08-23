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
  WarpChain,
  WarpChainAssetValue,
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
    const adapter = findWarpAdapterForChain(executable.chain.name, this.adapters)

    if (action.type === 'query') {
      const result = await adapter.executor.executeQuery(executable)
      result.success ? this.handlers?.onExecuted?.(result) : this.handlers?.onError?.({ message: JSON.stringify(result.values) })
      return { tx: null, chain: executable.chain }
    }

    const tx = await adapter.executor.createTransaction(executable)

    return { tx, chain: executable.chain }
  }

  async evaluateResults(warp: Warp, chain: WarpChain, tx: WarpAdapterGenericRemoteTransaction): Promise<void> {
    const result = await findWarpAdapterForChain(chain, this.adapters).results.getTransactionExecutionResults(warp, tx)
    this.handlers?.onExecuted?.(result)
  }

  private async executeCollect(warp: Warp, action: WarpActionIndex, inputs: string[], extra?: Record<string, any>): Promise<WarpExecution> {
    const collectAction = getWarpActionByIndex(warp, action) as any | null
    if (!collectAction) throw new Error('WarpActionExecutor: Action not found')

    const chainInfo = await this.factory.getChainInfoForAction(collectAction)
    const adapter = findWarpAdapterForChain(chainInfo.name, this.adapters)
    const preparedWarp = await new WarpInterpolator(this.config, adapter).apply(this.config, warp)
    const resolvedInputs = await this.factory.getResolvedInputs(chainInfo.name, collectAction, inputs)
    const modifiedInputs = this.factory.getModifiedInputs(resolvedInputs)

    const toInputPayloadValue = (resolvedInput: any) => {
      if (!resolvedInput.value) return null
      const value = this.serializer.stringToNative(resolvedInput.value)[1]
      if (resolvedInput.input.type === 'biguint') {
        return (value as bigint).toString()
      } else if (resolvedInput.input.type === 'asset') {
        const { identifier, nonce, amount } = value as WarpChainAssetValue
        return { identifier, nonce: nonce.toString(), amount: amount.toString() }
      } else {
        return value
      }
    }

    const headers = new Headers()
    headers.set('Content-Type', 'application/json')
    headers.set('Accept', 'application/json')

    if (this.handlers?.onSignRequest) {
      const walletAddress = this.config.user?.wallets?.[chainInfo.name]
      if (!walletAddress) throw new Error(`No wallet configured for chain ${chainInfo.name}`)
      const { message, nonce, expiresAt } = await createAuthMessage(walletAddress, `${chainInfo.name}-adapter`)
      const signature = await this.handlers.onSignRequest({ message, chain: chainInfo })
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
      const { values, results } = await extractCollectResults(preparedWarp, content, action, modifiedInputs, this.config.transform?.runner)
      const next = getNextInfo(this.config, this.adapters, preparedWarp, action, results)

      return {
        success: response.ok,
        warp: preparedWarp,
        action: action,
        user: this.config.user?.wallets?.[chainInfo.name] || null,
        txHash: null,
        tx: null,
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
        user: this.config.user?.wallets?.[chainInfo.name] || null,
        txHash: null,
        tx: null,
        next: null,
        values: [],
        results: { _DATA: error },
        messages: {},
      }
    }
  }
}
