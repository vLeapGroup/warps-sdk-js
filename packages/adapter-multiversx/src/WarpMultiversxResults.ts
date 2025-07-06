import { SmartContractTransactionsOutcomeParser, TransactionEventsParser, TransactionOnNetwork, TypedValue } from '@multiversx/sdk-core/out'
import {
  ResolvedInput,
  Warp,
  WarpConstants,
  WarpContractAction,
  WarpExecutionResults,
  WarpInitConfig,
  evaluateResultsCommon,
} from '@vleap/warps-core'
import { Buffer } from 'buffer'
import { WarpMultiversxAbi } from './WarpMultiversxAbi'
import { WarpMultiversxSerializer } from './WarpMultiversxSerializer'

export class WarpMultiversxResults {
  private readonly abi: WarpMultiversxAbi
  private readonly serializer: WarpMultiversxSerializer

  constructor(config: WarpInitConfig) {
    this.abi = new WarpMultiversxAbi(config)
    this.serializer = new WarpMultiversxSerializer()
  }

  async getTransactionExecutionResults(warp: Warp, actionIndex: number, tx: TransactionOnNetwork): Promise<WarpExecution> {
    const preparedWarp = await WarpInterpolator.apply(this.config, warp)
    const action = getWarpActionByIndex(preparedWarp, actionIndex) as WarpContractAction

    // Restore inputs via cache as transactions are broadcasted and processed asynchronously
    const inputs: ResolvedInput[] = this.cache.get(WarpCacheKey.WarpExecutable(this.config.env, warp.meta?.hash || '', actionIndex)) ?? []

    const results = await this.extractContractResults(preparedWarp, action, tx, actionIndex, inputs)
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

  static parseOutActionIndex(resultPath: string): number | null {
    if (resultPath === 'out') return 1
    const outIndexMatch = resultPath.match(/^out\[(\d+)\]/)
    if (outIndexMatch) return parseInt(outIndexMatch[1], 10)
    if (resultPath.startsWith('out.') || resultPath.startsWith('event.')) return null
    return null
  }

  static getNestedValueFromObject(obj: any, path: string[]): any {
    return path.reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : null), obj)
  }

  async extractContractResults(
    warp: Warp,
    action: WarpContractAction,
    tx: TransactionOnNetwork,
    actionIndex: number,
    inputs: ResolvedInput[]
  ): Promise<{ values: any[]; results: WarpExecutionResults; success: boolean; txHash: string }> {
    let values: any[] = []
    let results: WarpExecutionResults = {}
    if (!warp.results || action.type !== 'contract') {
      return { values, results, success: tx.status.isSuccessful(), txHash: tx.hash }
    }
    const needsAbi = Object.values(warp.results).some(
      (resultPath) => typeof resultPath === 'string' && (resultPath.includes('out') || resultPath.includes('event'))
    )
    if (!needsAbi) {
      for (const [resultName, resultPath] of Object.entries(warp.results)) {
        results[resultName] = resultPath
      }
      return {
        values,
        results: await evaluateResultsCommon(warp, results, actionIndex, inputs),
        success: tx.status.isSuccessful(),
        txHash: tx.hash,
      }
    }
    const abi = await this.abi.getAbiForAction(action)
    const eventParser = new TransactionEventsParser({ abi })
    const outcomeParser = new SmartContractTransactionsOutcomeParser({ abi })
    const outcome = outcomeParser.parseExecute({ transactionOnNetwork: tx, function: action.func || undefined })
    for (const [resultName, resultPath] of Object.entries(warp.results)) {
      if (typeof resultPath !== 'string') continue
      if (resultPath.startsWith(WarpConstants.Transform.Prefix)) continue
      if (resultPath.startsWith('input.')) {
        results[resultName] = resultPath
        continue
      }
      const currentActionIndex = WarpMultiversxResults.parseOutActionIndex(resultPath)
      if (currentActionIndex !== null && currentActionIndex !== actionIndex) {
        results[resultName] = null
        continue
      }
      const parts = resultPath.split('.')
      const resultType = parts[0]
      const partOne = parts[1]
      const partTwo = parts[2]
      if (resultType === 'event') {
        if (!partOne || isNaN(Number(partTwo))) continue
        const topicPosition = Number(partTwo)
        const events = tx.smartContractResults[0].logs.events
        const event = events.find((e: any) => {
          const id = Buffer.isBuffer(e.identifier) ? e.identifier.toString('utf8') : e.identifier
          return id === partOne
        })
        const fallbackTopic = event ? event.topics[topicPosition] : undefined
        let outcomeAtPosition = null
        if (Buffer.isBuffer(fallbackTopic)) {
          outcomeAtPosition = fallbackTopic.toString('utf8')
        } else if (typeof fallbackTopic === 'string') {
          outcomeAtPosition = fallbackTopic
        } else if (fallbackTopic && fallbackTopic.toString) {
          outcomeAtPosition = fallbackTopic.toString()
        } else {
          outcomeAtPosition = fallbackTopic
        }
        if (typeof outcomeAtPosition !== 'string') {
          outcomeAtPosition = String(outcomeAtPosition)
        }
        values.push(outcomeAtPosition)
        results[resultName] = outcomeAtPosition !== undefined ? outcomeAtPosition : null
      } else if (resultType === 'out' || resultType.startsWith('out[')) {
        if (!partOne) continue
        const outputIndex = Number(partOne)
        let outputAtPosition = outcome.values[outputIndex - 1] || null
        if (partTwo) {
          outputAtPosition = outputAtPosition[partTwo] || null
        }
        let str = null
        if (outputAtPosition && typeof outputAtPosition === 'object' && typeof outputAtPosition.hasClassOrSuperclass === 'function') {
          str = this.serializer.typedToString(outputAtPosition)
        } else if (outputAtPosition != null) {
          str = outputAtPosition.toString()
        }
        if (str !== null) {
          if (str.startsWith('address:')) outputAtPosition = str.slice('address:'.length)
          else if (str.startsWith('hex:')) outputAtPosition = str.slice('hex:'.length)
          else {
            const colonIdx = str.indexOf(':')
            outputAtPosition = colonIdx !== -1 ? str.slice(colonIdx + 1) : str
          }
        }
        values.push(outputAtPosition)
        results[resultName] = outputAtPosition !== undefined ? outputAtPosition : null
      } else {
        results[resultName] = resultPath
      }
    }
    return {
      values,
      results: await evaluateResultsCommon(warp, results, actionIndex, inputs),
      success: tx.status.isSuccessful(),
      txHash: tx.hash,
    }
  }

  async extractQueryResults(
    warp: Warp,
    tx: TransactionOnNetwork,
    actionIndex: number,
    inputs: ResolvedInput[]
  ): Promise<{ values: any[]; results: WarpExecutionResults; success: boolean; txHash: string }> {
    const typedValues: TypedValue[] = (tx as any).typedValues || []
    const values: any[] = typedValues.map((t: TypedValue) => this.serializer.typedToString(t))
    const valuesRaw: any[] = typedValues.map((t: TypedValue) => this.serializer.typedToNative(t)[1])
    let results: WarpExecutionResults = {}
    if (!warp.results) return { values, results, success: true, txHash: (tx as any).hash || '' }
    const getOutValue = (path: string): unknown => {
      if (path.startsWith('out.')) {
        const idx = parseInt(path.split('.')[1], 10) - 1
        let value = typedValues[idx]
        if (value !== undefined && value !== null) {
          const str = this.serializer.typedToString(value)
          if (str.startsWith('address:')) return str.slice('address:'.length)
          if (str.startsWith('hex:')) return str.slice('hex:'.length)
          const colonIdx = str.indexOf(':')
          return colonIdx !== -1 ? str.slice(colonIdx + 1) : str
        }
        return null
      }
      if (path === 'out') {
        return typedValues.map((t: TypedValue) => {
          const str = this.serializer.typedToString(t)
          if (str.startsWith('address:')) return str.slice('address:'.length)
          if (str.startsWith('hex:')) return str.slice('hex:'.length)
          const colonIdx = str.indexOf(':')
          return colonIdx !== -1 ? str.slice(colonIdx + 1) : str
        })
      }
      const outIndexMatch = path.match(/^out\[(\d+)\]/)
      if (outIndexMatch) {
        const idx = parseInt(outIndexMatch[1], 10) - 1
        let value = typedValues[idx]
        if (value !== undefined && value !== null) {
          const str = this.serializer.typedToString(value)
          if (str.startsWith('address:')) return str.slice('address:'.length)
          if (str.startsWith('hex:')) return str.slice('hex:'.length)
          const colonIdx = str.indexOf(':')
          return colonIdx !== -1 ? str.slice(colonIdx + 1) : str
        }
        return null
      }
      return null
    }
    for (const [key, path] of Object.entries(warp.results)) {
      if (typeof path !== 'string') continue
      if (path.startsWith(WarpConstants.Transform.Prefix)) continue
      const currentActionIndex = WarpMultiversxResults.parseOutActionIndex(path)
      if (currentActionIndex !== null && currentActionIndex !== actionIndex) {
        results[key] = null
        continue
      }
      if (path.startsWith('out.') || path === 'out' || path.startsWith('out[')) {
        const value = getOutValue(path)
        results[key] = value !== undefined ? value : null
      } else {
        results[key] = path
      }
    }
    return {
      values,
      results: await evaluateResultsCommon(warp, results, actionIndex, inputs),
      success: true,
      txHash: (tx as any).hash || '',
    }
  }

  async extractCollectResults(
    warp: Warp,
    tx: TransactionOnNetwork,
    actionIndex: number,
    inputs: ResolvedInput[]
  ): Promise<{ values: any[]; results: WarpExecutionResults; success: boolean; txHash: string }> {
    const response = tx as any
    const values: any[] = []
    let results: WarpExecutionResults = {}
    for (const [resultName, resultPath] of Object.entries(warp.results || {})) {
      if (typeof resultPath !== 'string') continue
      if (resultPath.startsWith(WarpConstants.Transform.Prefix)) continue
      const currentActionIndex = WarpMultiversxResults.parseOutActionIndex(resultPath)
      if (currentActionIndex !== null && currentActionIndex !== actionIndex) {
        results[resultName] = null
        continue
      }
      const parts = resultPath.split('.')
      const resultType = parts[0]
      const pathParts = parts.slice(1)
      if (resultType === 'out' || resultType.startsWith('out[')) {
        const value =
          pathParts.length === 0 ? response?.data || response : WarpMultiversxResults.getNestedValueFromObject(response, pathParts)
        values.push(value)
        results[resultName] = value
      } else {
        results[resultName] = resultPath
      }
    }
    return {
      values,
      results: await evaluateResultsCommon(warp, results, actionIndex, inputs),
      success: true,
      txHash: response.hash || '',
    }
  }

  async resolveWarpResultsRecursively(props: {
    warp: Warp
    entryActionIndex: number
    executor: { executeQuery: Function; executeCollect: Function }
    inputs: ResolvedInput[]
    meta?: Record<string, any>
  }): Promise<any> {
    const warp = props.warp
    const entryActionIndex = props.entryActionIndex
    const executor = props.executor
    const inputs = props.inputs
    const meta = props.meta
    const resultsCache: Map<number, any> = new Map()
    const resolving: Set<number> = new Set()
    const self = this
    async function resolveAction(actionIndex: number, actionInputs: ResolvedInput[] = []): Promise<any> {
      if (resultsCache.has(actionIndex)) return resultsCache.get(actionIndex)
      if (resolving.has(actionIndex)) throw new Error(`Circular dependency detected at action ${actionIndex}`)
      resolving.add(actionIndex)
      const action = warp.actions[actionIndex - 1]
      if (!action) throw new Error(`Action ${actionIndex} not found`)
      let execution: any
      if (action.type === 'query') {
        execution = await executor.executeQuery(warp, actionIndex, actionInputs)
      } else if (action.type === 'collect') {
        execution = await executor.executeCollect(warp, actionIndex, actionInputs, meta)
      } else {
        throw new Error(`Unsupported or interactive action type: ${action.type}`)
      }
      resultsCache.set(actionIndex, execution)
      if (warp.results) {
        for (const pathRaw of Object.values(warp.results)) {
          const path = String(pathRaw)
          const outIndexMatch = path.match(/^out\[(\d+)\]/)
          if (outIndexMatch) {
            const depIndex = parseInt(outIndexMatch[1], 10)
            if (depIndex !== actionIndex && !resultsCache.has(depIndex)) {
              await resolveAction(depIndex)
            }
          }
        }
      }
      resolving.delete(actionIndex)
      return execution
    }
    await resolveAction(entryActionIndex, inputs)
    const combinedResults: Record<string, any> = {}
    for (const exec of resultsCache.values()) {
      for (const [key, value] of Object.entries(exec.results)) {
        if (value !== null) {
          combinedResults[key] = value
        } else if (!(key in combinedResults)) {
          combinedResults[key] = null
        }
      }
    }
    const finalResults = await evaluateResultsCommon(warp, combinedResults, entryActionIndex, inputs)
    const entryExecution = resultsCache.get(entryActionIndex)
    return {
      ...entryExecution,
      action: entryActionIndex,
      results: finalResults,
    }
  }
}
