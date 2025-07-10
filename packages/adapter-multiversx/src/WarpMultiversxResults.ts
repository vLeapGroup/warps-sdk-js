import {
  findEventsByFirstTopic,
  SmartContractTransactionsOutcomeParser,
  TransactionEventsParser,
  TransactionOnNetwork,
  TypedValue,
} from '@multiversx/sdk-core'
import {
  AdapterWarpResults,
  applyResultsToMessages,
  evaluateResultsCommon,
  findWarpExecutableAction,
  getNextInfo,
  parseResultsOutIndex,
  ResolvedInput,
  Warp,
  WarpActionIndex,
  WarpCache,
  WarpCacheKey,
  WarpConstants,
  WarpContractAction,
  WarpExecution,
  WarpExecutionResults,
  WarpInitConfig,
} from '@vleap/warps'
import { WarpMultiversxAbi } from './WarpMultiversxAbi'
import { WarpMultiversxSerializer } from './WarpMultiversxSerializer'

export class WarpMultiversxResults implements AdapterWarpResults {
  private readonly abi: WarpMultiversxAbi
  private readonly serializer: WarpMultiversxSerializer
  private readonly cache: WarpCache

  constructor(private readonly config: WarpInitConfig) {
    this.abi = new WarpMultiversxAbi(config)
    this.serializer = new WarpMultiversxSerializer()
    this.cache = new WarpCache(config.cache?.type)
  }

  async getTransactionExecutionResults(warp: Warp, tx: TransactionOnNetwork): Promise<WarpExecution> {
    const [action, actionIndex] = findWarpExecutableAction(warp)

    // Restore inputs via cache as transactions are broadcasted and processed asynchronously
    const inputs: ResolvedInput[] = this.cache.get(WarpCacheKey.WarpExecutable(this.config.env, warp.meta?.hash || '', actionIndex)) ?? []

    const results = await this.extractContractResults(warp, tx, inputs)
    const next = getNextInfo(this.config, warp, actionIndex, results)
    const messages = applyResultsToMessages(warp, results.results)

    return {
      success: tx.status.isSuccessful(),
      warp,
      action: actionIndex,
      user: this.config.user?.wallet || null,
      txHash: tx.hash,
      next,
      values: results.values,
      results: results.results,
      messages,
    }
  }

  async extractContractResults(
    warp: Warp,
    tx: TransactionOnNetwork,
    inputs: ResolvedInput[]
  ): Promise<{ values: any[]; results: WarpExecutionResults }> {
    const [action, actionIndex] = findWarpExecutableAction(warp) as [WarpContractAction, WarpActionIndex]
    let values: any[] = []
    let results: WarpExecutionResults = {}
    if (!warp.results || action.type !== 'contract') {
      return { values, results }
    }
    const needsAbi = Object.values(warp.results).some((resultPath) => resultPath.includes('out') || resultPath.includes('event'))
    if (!needsAbi) {
      for (const [resultName, resultPath] of Object.entries(warp.results)) {
        results[resultName] = resultPath
      }
      return { values, results: await evaluateResultsCommon(warp, results, actionIndex, inputs) }
    }
    const abi = await this.abi.getAbiForAction(action)
    const eventParser = new TransactionEventsParser({ abi })
    const outcomeParser = new SmartContractTransactionsOutcomeParser({ abi })
    const outcome = outcomeParser.parseExecute({ transactionOnNetwork: tx, function: action.func || undefined })
    for (const [resultName, resultPath] of Object.entries(warp.results)) {
      if (resultPath.startsWith(WarpConstants.Transform.Prefix)) continue
      if (resultPath.startsWith('input.')) {
        results[resultName] = resultPath
        continue
      }
      const currentActionIndex = parseResultsOutIndex(resultPath)
      if (currentActionIndex !== null && currentActionIndex !== actionIndex) {
        results[resultName] = null
        continue
      }
      const [resultType, partOne, partTwo] = resultPath.split('.')
      if (resultType === 'event') {
        if (!partOne || isNaN(Number(partTwo))) continue
        const topicPosition = Number(partTwo)
        const events = findEventsByFirstTopic(tx, partOne)
        const outcome = eventParser.parseEvents({ events })[0]
        const outcomeAtPosition = (Object.values(outcome)[topicPosition] || null) as object | null
        values.push(outcomeAtPosition)
        results[resultName] = outcomeAtPosition ? outcomeAtPosition.valueOf() : outcomeAtPosition
      } else if (resultType === 'out' || resultType.startsWith('out[')) {
        if (!partOne) continue
        const outputIndex = Number(partOne)
        let outputAtPosition = outcome.values[outputIndex - 1] || null
        if (partTwo) {
          outputAtPosition = outputAtPosition[partTwo] || null
        }
        if (outputAtPosition && typeof outputAtPosition === 'object') {
          outputAtPosition = 'toFixed' in outputAtPosition ? outputAtPosition.toFixed() : outputAtPosition.valueOf()
        }
        values.push(outputAtPosition)
        results[resultName] = outputAtPosition ? outputAtPosition.valueOf() : outputAtPosition
      } else {
        results[resultName] = resultPath
      }
    }
    return { values, results: await evaluateResultsCommon(warp, results, actionIndex, inputs) }
  }

  async extractQueryResults(
    warp: Warp,
    typedValues: TypedValue[],
    actionIndex: number,
    inputs: ResolvedInput[]
  ): Promise<{ values: any[]; results: WarpExecutionResults }> {
    const values = typedValues.map((t) => this.serializer.typedToString(t))
    const valuesRaw = typedValues.map((t) => this.serializer.typedToNative(t)[1])
    let results: WarpExecutionResults = {}
    if (!warp.results) return { values, results }
    const getNestedValue = (path: string): unknown => {
      const indices = path
        .split('.')
        .slice(1)
        .map((i) => parseInt(i) - 1)
      if (indices.length === 0) return undefined
      let value: any = valuesRaw[indices[0]]
      for (let i = 1; i < indices.length; i++) {
        if (value === undefined || value === null) return undefined
        value = value[indices[i]]
      }
      return value
    }
    for (const [key, path] of Object.entries(warp.results)) {
      if (path.startsWith(WarpConstants.Transform.Prefix)) continue
      const currentActionIndex = parseResultsOutIndex(path)
      if (currentActionIndex !== null && currentActionIndex !== actionIndex) {
        results[key] = null
        continue
      }
      if (path.startsWith('out.') || path === 'out' || path.startsWith('out[')) {
        results[key] = getNestedValue(path) || null
      } else {
        results[key] = path
      }
    }
    return { values, results: await evaluateResultsCommon(warp, results, actionIndex, inputs) }
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
