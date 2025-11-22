import { safeWindow } from './constants'
import { extractCollectOutput, findWarpAdapterForChain, getNextInfo, getWarpActionByIndex, isWarpActionAutoExecute } from './helpers'
import { applyOutputToMessages } from './helpers/messages'
import { buildMappedOutput } from './helpers/payload'
import { createAuthHeaders, createAuthMessage } from './helpers/signing'
import { getWarpWalletAddressFromConfig } from './helpers/wallet'
import {
  Adapter,
  Warp,
  WarpActionExecutionResult,
  WarpActionIndex,
  WarpAdapterGenericTransaction,
  WarpChainAction,
  WarpChainInfo,
  WarpClientConfig,
  WarpCollectAction,
  WarpCollectDestinationHttp,
  WarpExecutable,
  WarpLinkAction,
} from './types'
import { WarpFactory } from './WarpFactory'
import { WarpInterpolator } from './WarpInterpolator'
import { WarpLogger } from './WarpLogger'

export type ExecutionHandlers = {
  onExecuted?: (result: WarpActionExecutionResult) => void | Promise<void>
  onError?: (params: { message: string }) => void
  onSignRequest?: (params: { message: string; chain: WarpChainInfo }) => string | Promise<string>
  onActionExecuted?: (params: {
    action: WarpActionIndex
    chain: WarpChainInfo | null
    execution: WarpActionExecutionResult | null
    tx: WarpAdapterGenericTransaction | null
  }) => void
  onActionUnhandled?: (params: {
    action: WarpActionIndex
    chain: WarpChainInfo | null
    execution: WarpActionExecutionResult | null
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
    chain: WarpChainInfo | null
    immediateExecutions: WarpActionExecutionResult[]
  }> {
    let txs: WarpAdapterGenericTransaction[] = []
    let chainInfo: WarpChainInfo | null = null
    let immediateExecutions: WarpActionExecutionResult[] = []

    for (let index = 1; index <= warp.actions.length; index++) {
      const action = getWarpActionByIndex(warp, index)
      if (!isWarpActionAutoExecute(action, warp)) continue
      const { tx, chain, immediateExecution } = await this.executeAction(warp, index, inputs, meta)
      if (tx) txs.push(tx)
      if (chain) chainInfo = chain
      if (immediateExecution) immediateExecutions.push(immediateExecution)
    }

    if (!chainInfo && txs.length > 0) throw new Error(`WarpExecutor: Chain not found for ${txs.length} transactions`)

    // Call onExecuted handler after all actions are executed – if there are no transactions, call it with the last immediate execution
    // If there are transactions to be executed, defer onExecuted call to transaction result evaluation
    if (txs.length === 0 && immediateExecutions.length > 0) {
      const lastImmediateExecution = immediateExecutions[immediateExecutions.length - 1]
      await this.callHandler(() => this.handlers?.onExecuted?.(lastImmediateExecution))
    }

    return { txs, chain: chainInfo, immediateExecutions }
  }

  async executeAction(
    warp: Warp,
    actionIndex: WarpActionIndex,
    inputs: string[],
    meta: { envs?: Record<string, any>; queries?: Record<string, any> } = {}
  ): Promise<{
    tx: WarpAdapterGenericTransaction | null
    chain: WarpChainInfo | null
    immediateExecution: WarpActionExecutionResult | null
  }> {
    const action = getWarpActionByIndex(warp, actionIndex)

    if (action.type === 'link') {
      await this.callHandler(async () => {
        const url = (action as WarpLinkAction).url
        if (this.config.interceptors?.openLink) {
          await this.config.interceptors.openLink(url)
        } else {
          safeWindow.open(url, '_blank')
        }
      })

      return { tx: null, chain: null, immediateExecution: null }
    }

    const executable = await this.factory.createExecutable(warp, actionIndex, inputs, meta)

    if (action.type === 'collect') {
      const result = await this.executeCollect(executable)
      if (result.status === 'success') {
        await this.callHandler(() => this.handlers?.onActionExecuted?.({ action: actionIndex, chain: null, execution: result, tx: null }))
        return { tx: null, chain: null, immediateExecution: result }
      } else if (result.status === 'unhandled') {
        await this.callHandler(() => this.handlers?.onActionUnhandled?.({ action: actionIndex, chain: null, execution: result, tx: null }))
        return { tx: null, chain: null, immediateExecution: result }
      } else {
        this.handlers?.onError?.({ message: JSON.stringify(result.values) })
      }
      return { tx: null, chain: null, immediateExecution: null }
    }

    const adapter = findWarpAdapterForChain(executable.chain.name, this.adapters)

    if (action.type === 'query') {
      const result = await adapter.executor.executeQuery(executable)
      if (result.status === 'success') {
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

  async evaluateOutput(warp: Warp, actions: WarpChainAction[]): Promise<void> {
    if (actions.length === 0) return
    if (warp.actions.length === 0) return
    if (!this.handlers) return

    const chain = await this.factory.getChainInfoForWarp(warp)
    const adapter = findWarpAdapterForChain(chain.name, this.adapters)

    const outputs = (
      await Promise.all(
        warp.actions.map(async (action, index) => {
          if (!isWarpActionAutoExecute(action, warp)) return null
          if (action.type !== 'transfer' && action.type !== 'contract') return null
          const chainAction = actions[index]
          const currentActionIndex = index + 1
          const result = await adapter.output.getActionExecution(warp, currentActionIndex, chainAction)

          if (result.status === 'success') {
            await this.callHandler(() =>
              this.handlers?.onActionExecuted?.({
                action: currentActionIndex,
                chain: chain,
                execution: result,
                tx: chainAction,
              })
            )
          } else {
            await this.callHandler(() => this.handlers?.onError?.({ message: 'Action failed: ' + JSON.stringify(result.values) }))
          }

          return result
        })
      )
    ).filter((r) => r !== null)

    if (outputs.every((r) => r.status === 'success')) {
      const lastOutput = outputs[outputs.length - 1]
      await this.callHandler(() => this.handlers?.onExecuted?.(lastOutput))
    } else {
      await this.callHandler(() => this.handlers?.onError?.({ message: `Warp failed: ${JSON.stringify(outputs.map((r) => r.values))}` }))
    }
  }

  private async executeCollect(executable: WarpExecutable, extra?: Record<string, any>): Promise<WarpActionExecutionResult> {
    const wallet = getWarpWalletAddressFromConfig(this.config, executable.chain.name)
    const collectAction = getWarpActionByIndex(executable.warp, executable.action) as WarpCollectAction

    const serializer = this.factory.getSerializer()
    const payload = buildMappedOutput(executable.resolvedInputs, serializer)

    if (collectAction.destination && typeof collectAction.destination === 'object' && 'url' in collectAction.destination) {
      return await this.doHttpRequest(executable, collectAction.destination, wallet, payload, extra)
    }

    const { values, output } = await extractCollectOutput(
      executable.warp,
      payload,
      executable.action,
      executable.resolvedInputs,
      serializer,
      this.config
    )

    return this.buildCollectResult(executable, wallet, 'unhandled', values, output)
  }

  private async doHttpRequest(
    executable: WarpExecutable,
    destination: WarpCollectDestinationHttp,
    wallet: string | null,
    payload: any,
    extra: Record<string, any> | undefined
  ): Promise<WarpActionExecutionResult> {
    const interpolator = new WarpInterpolator(this.config, findWarpAdapterForChain(executable.chain.name, this.adapters))

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

    if (destination.headers) {
      Object.entries(destination.headers).forEach(([key, value]) => {
        const interpolatedValue = interpolator.applyInputs(value as string, executable.resolvedInputs, this.factory.getSerializer())
        headers.set(key, interpolatedValue)
      })
    }

    const httpMethod = destination.method || 'GET'
    const body = httpMethod === 'GET' ? undefined : JSON.stringify({ ...payload, ...extra })
    const url = interpolator.applyInputs(destination.url, executable.resolvedInputs, this.factory.getSerializer())

    WarpLogger.debug('WarpExecutor: Executing HTTP collect', { url, method: httpMethod, headers, body })

    try {
      const response = await fetch(url, { method: httpMethod, headers, body })
      WarpLogger.debug('Collect response status', { status: response.status })
      const content = await response.json()
      WarpLogger.debug('Collect response content', { content })
      const { values, output } = await extractCollectOutput(
        executable.warp,
        content,
        executable.action,
        executable.resolvedInputs,
        this.factory.getSerializer(),
        this.config
      )

      return this.buildCollectResult(
        executable,
        getWarpWalletAddressFromConfig(this.config, executable.chain.name),
        response.ok ? 'success' : 'error',
        values,
        output,
        content
      )
    } catch (error) {
      WarpLogger.error('WarpActionExecutor: Error executing collect', error)
      return {
        status: 'error',
        warp: executable.warp,
        action: executable.action,
        user: wallet,
        txHash: null,
        tx: null,
        next: null,
        values: { string: [], native: [], mapped: {} },
        output: { _DATA: error },
        messages: {},
        destination: this.getDestinationFromResolvedInputs(executable),
      }
    }
  }

  private getDestinationFromResolvedInputs(executable: WarpExecutable): string | null {
    const destinationInput = executable.resolvedInputs.find((i) => i.input.position === 'receiver' || i.input.position === 'destination')
    return destinationInput?.value || executable.destination
  }

  private buildCollectResult(
    executable: WarpExecutable,
    wallet: string | null,
    status: 'success' | 'error' | 'unhandled',
    values: { string: string[]; native: any[]; mapped: Record<string, any> },
    output: any,
    rawData?: any
  ): WarpActionExecutionResult {
    const next = getNextInfo(this.config, this.adapters, executable.warp, executable.action, output)

    return {
      status,
      warp: executable.warp,
      action: executable.action,
      user: wallet || getWarpWalletAddressFromConfig(this.config, executable.chain.name),
      txHash: null,
      tx: null,
      next,
      values,
      output: rawData ? { ...output, _DATA: rawData } : output,
      messages: applyOutputToMessages(executable.warp, output, this.config),
      destination: this.getDestinationFromResolvedInputs(executable),
    }
  }

  private async callHandler<T>(handler: (() => T | Promise<T>) | undefined): Promise<T | undefined> {
    if (!handler) return undefined
    return await handler()
  }
}
