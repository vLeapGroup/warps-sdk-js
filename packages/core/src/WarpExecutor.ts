import { WarpConstants } from './constants'
import {
  applyResultsToMessages,
  extractCollectResults,
  findWarpAdapterForChain,
  findWarpExecutableAction,
  getNextInfo,
  getWarpActionByIndex,
} from './helpers'
import { buildNestedPayload, mergeNestedPayload } from './helpers/payload'
import { createAuthHeaders, createAuthMessage } from './helpers/signing'
import {
  Adapter,
  ResolvedInput,
  Warp,
  WarpAdapterGenericRemoteTransaction,
  WarpAdapterGenericTransaction,
  WarpChain,
  WarpChainAssetValue,
  WarpChainInfo,
  WarpClientConfig,
  WarpCollectAction,
  WarpExecutable,
  WarpExecution,
} from './types'
import { WarpFactory } from './WarpFactory'
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
    const executable = await this.factory.createExecutable(warp, actionIndex, inputs)

    if (action.type === 'collect') {
      const result = await this.executeCollect(executable)
      result.success ? this.handlers?.onExecuted?.(result) : this.handlers?.onError?.({ message: JSON.stringify(result.values) })
      return { tx: null, chain: null }
    }

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

  private async executeCollect(executable: WarpExecutable, extra?: Record<string, any>): Promise<WarpExecution> {
    const wallet = this.config.user?.wallets?.[executable.chain.name] || null
    const collectAction = getWarpActionByIndex(executable.warp, executable.action) as WarpCollectAction

    const toInputPayloadValue = (resolvedInput: ResolvedInput) => {
      if (!resolvedInput.value) return null
      const value = this.serializer.stringToNative(resolvedInput.value)[1]
      if (resolvedInput.input.type === 'biguint') {
        return (value as bigint).toString()
      } else if (resolvedInput.input.type === 'asset') {
        const { identifier, amount } = value as WarpChainAssetValue
        return { identifier, amount: amount.toString() }
      } else {
        return value
      }
    }

    const headers = new Headers()
    headers.set('Content-Type', 'application/json')
    headers.set('Accept', 'application/json')

    if (this.handlers?.onSignRequest) {
      if (!wallet) throw new Error(`No wallet configured for chain ${executable.chain.name}`)
      const { message, nonce, expiresAt } = await createAuthMessage(wallet, `${executable.chain.name}-adapter`)
      const signature = await this.handlers.onSignRequest({ message, chain: executable.chain })
      const authHeaders = createAuthHeaders(wallet, signature, nonce, expiresAt)
      Object.entries(authHeaders).forEach(([key, value]) => headers.set(key, value))
    }

    Object.entries(collectAction.destination.headers || {}).forEach(([key, value]) => {
      headers.set(key, value as string)
    })

    let payload: any = {}
    executable.resolvedInputs.forEach((resolvedInput: any) => {
      const fieldName = resolvedInput.input.as || resolvedInput.input.name
      const value = toInputPayloadValue(resolvedInput)
      if (resolvedInput.input.position && resolvedInput.input.position.startsWith(WarpConstants.Position.Payload)) {
        const nestedPayload = buildNestedPayload(resolvedInput.input.position, fieldName, value)
        payload = mergeNestedPayload(payload, nestedPayload)
      } else {
        // or use flat structure when position is not set
        payload[fieldName] = value
      }
    })
    const httpMethod = collectAction.destination.method || 'GET'
    const body = httpMethod === 'GET' ? undefined : JSON.stringify({ ...payload, ...extra })

    WarpLogger.info('Executing collect', { url: collectAction.destination.url, method: httpMethod, headers, body })

    try {
      const response = await fetch(collectAction.destination.url, { method: httpMethod, headers, body })
      WarpLogger.info('Collect response', { response })
      const content = await response.json()
      const { values, results } = await extractCollectResults(
        executable.warp,
        content,
        executable.action,
        executable.resolvedInputs,
        this.config.transform?.runner
      )
      const next = getNextInfo(this.config, this.adapters, executable.warp, executable.action, results)

      return {
        success: response.ok,
        warp: executable.warp,
        action: executable.action,
        user: this.config.user?.wallets?.[executable.chain.name] || null,
        txHash: null,
        tx: null,
        next,
        values,
        valuesRaw: [],
        results: { ...results, _DATA: content },
        messages: applyResultsToMessages(executable.warp, results),
      }
    } catch (error) {
      WarpLogger.error('WarpActionExecutor: Error executing collect', error)
      return {
        success: false,
        warp: executable.warp,
        action: executable.action,
        user: wallet,
        txHash: null,
        tx: null,
        next: null,
        values: [],
        valuesRaw: [],
        results: { _DATA: error },
        messages: {},
      }
    }
  }
}
