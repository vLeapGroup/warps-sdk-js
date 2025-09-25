import { safeWindow, WarpConstants } from './constants'
import {
  applyResultsToMessages,
  extractCollectResults,
  findWarpAdapterForChain,
  getNextInfo,
  getWarpActionByIndex,
  isWarpActionAutoExecute,
} from './helpers'
import { buildNestedPayload, mergeNestedPayload } from './helpers/payload'
import { createAuthHeaders, createAuthMessage } from './helpers/signing'
import { getWarpWalletAddressFromConfig } from './helpers/wallet'
import {
  Adapter,
  ResolvedInput,
  Warp,
  WarpActionIndex,
  WarpAdapterGenericRemoteTransaction,
  WarpAdapterGenericTransaction,
  WarpChain,
  WarpChainAssetValue,
  WarpChainInfo,
  WarpClientConfig,
  WarpCollectAction,
  WarpExecutable,
  WarpExecution,
  WarpLinkAction,
} from './types'
import { WarpFactory } from './WarpFactory'
import { WarpLogger } from './WarpLogger'

export type ExecutionHandlers = {
  onExecuted?: (result: WarpExecution) => void | Promise<void>
  onError?: (params: { message: string }) => void
  onSignRequest?: (params: { message: string; chain: WarpChainInfo }) => string | Promise<string>
  onActionExecuted?: (params: {
    action: WarpActionIndex
    chain: WarpChainInfo | null
    execution: WarpExecution | null
    tx: WarpAdapterGenericTransaction | null
  }) => void
}

export class WarpExecutor {
  private factory: WarpFactory

  constructor(
    private config: WarpClientConfig,
    private adapters: Adapter[],
    private handlers?: ExecutionHandlers
  ) {
    this.handlers = handlers
    this.factory = new WarpFactory(config, adapters)
  }

  async execute(
    warp: Warp,
    inputs: string[],
    meta: { envs?: Record<string, any>; queries?: Record<string, any> } = {}
  ): Promise<{
    txs: WarpAdapterGenericTransaction[]
    chain: WarpChainInfo
    immediateExecutions: WarpExecution[]
  }> {
    let txs: WarpAdapterGenericTransaction[] = []
    let chainInfo: WarpChainInfo | null = null
    let immediateExecutions: WarpExecution[] = []

    for (let index = 1; index <= warp.actions.length; index++) {
      const action = getWarpActionByIndex(warp, index)
      if (!isWarpActionAutoExecute(action)) continue
      const { tx, chain, immediateExecution } = await this.executeAction(warp, index, inputs, meta)
      if (tx) txs.push(tx)
      if (chain) chainInfo = chain
      if (immediateExecution) immediateExecutions.push(immediateExecution)
    }

    if (!chainInfo) throw new Error('WarpExecutor: Chain not found')

    return { txs, chain: chainInfo, immediateExecutions }
  }

  async executeAction(
    warp: Warp,
    actionIndex: WarpActionIndex,
    inputs: string[],
    meta: { envs?: Record<string, any>; queries?: Record<string, any> } = {}
  ): Promise<{ tx: WarpAdapterGenericTransaction | null; chain: WarpChainInfo | null; immediateExecution: WarpExecution | null }> {
    const action = getWarpActionByIndex(warp, actionIndex)
    const executable = await this.factory.createExecutable(warp, actionIndex, inputs, meta)

    if (action.type === 'link') {
      await this.callHandler(() => {
        const url = (action as WarpLinkAction).url
        if (this.config.interceptors?.openLink) {
          this.config.interceptors.openLink(url)
        } else {
          safeWindow.open(url, '_blank')
        }
      })
    }

    if (action.type === 'collect') {
      const result = await this.executeCollect(executable)
      if (result.success) {
        await this.callHandler(() => this.handlers?.onActionExecuted?.({ action: actionIndex, chain: null, execution: result, tx: null }))
        return { tx: null, chain: null, immediateExecution: result }
      } else {
        this.handlers?.onError?.({ message: JSON.stringify(result.values) })
      }
      return { tx: null, chain: null, immediateExecution: null }
    }

    const adapter = findWarpAdapterForChain(executable.chain.name, this.adapters)

    if (action.type === 'query') {
      const result = await adapter.executor.executeQuery(executable)
      if (result.success) {
        await this.callHandler(() =>
          this.handlers?.onActionExecuted?.({ action: actionIndex, chain: executable.chain, execution: result, tx: null })
        )
      } else {
        this.handlers?.onError?.({ message: JSON.stringify(result.values) })
      }
      return { tx: null, chain: executable.chain, immediateExecution: result }
    }

    const tx = await adapter.executor.createTransaction(executable)

    return { tx, chain: executable.chain, immediateExecution: null }
  }

  async evaluateResults(
    warp: Warp,
    actionIndex: WarpActionIndex,
    chain: WarpChain,
    tx: WarpAdapterGenericRemoteTransaction
  ): Promise<void> {
    const result = await findWarpAdapterForChain(chain, this.adapters).results.getTransactionExecutionResults(warp, actionIndex, tx)
    await this.callHandler(() => this.handlers?.onExecuted?.(result))
  }

  private async executeCollect(executable: WarpExecutable, extra?: Record<string, any>): Promise<WarpExecution> {
    const wallet = getWarpWalletAddressFromConfig(this.config, executable.chain.name)
    const collectAction = getWarpActionByIndex(executable.warp, executable.action) as WarpCollectAction

    const toInputPayloadValue = (resolvedInput: ResolvedInput) => {
      if (!resolvedInput.value) return null
      const value = this.factory.getSerializer().stringToNative(resolvedInput.value)[1]
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
      const signature = await this.callHandler(() => this.handlers?.onSignRequest?.({ message, chain: executable.chain }))
      if (signature) {
        const authHeaders = createAuthHeaders(wallet, signature, nonce, expiresAt)
        Object.entries(authHeaders).forEach(([key, value]) => headers.set(key, value))
      }
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
        // Use flat structure when position is not set
        payload[fieldName] = value
      }
    })
    const httpMethod = collectAction.destination.method || 'GET'
    const body = httpMethod === 'GET' ? undefined : JSON.stringify({ ...payload, ...extra })

    WarpLogger.debug('Executing collect', { url: collectAction.destination.url, method: httpMethod, headers, body })

    try {
      const response = await fetch(collectAction.destination.url, { method: httpMethod, headers, body })
      WarpLogger.debug('Collect response status', { status: response.status })
      const content = await response.json()
      WarpLogger.debug('Collect response content', { content })
      const { values, results } = await extractCollectResults(
        executable.warp,
        content,
        executable.action,
        executable.resolvedInputs,
        this.factory.getSerializer(),
        this.config.transform?.runner
      )
      const next = getNextInfo(this.config, this.adapters, executable.warp, executable.action, results)

      return {
        success: response.ok,
        warp: executable.warp,
        action: executable.action,
        user: getWarpWalletAddressFromConfig(this.config, executable.chain.name),
        txHash: null,
        tx: null,
        next,
        values,
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
        values: { string: [], native: [] },
        results: { _DATA: error },
        messages: {},
      }
    }
  }

  private async callHandler<T>(handler: (() => T | Promise<T>) | undefined): Promise<T | undefined> {
    if (!handler) return undefined
    return await handler()
  }
}
