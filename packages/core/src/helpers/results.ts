import {
  SmartContractTransactionsOutcomeParser,
  TransactionEventsParser,
  TransactionOnNetwork,
  TypedValue,
  findEventsByFirstTopic,
} from '@multiversx/sdk-core/out'
import { WarpConstants } from '../constants'
import { Warp, WarpContractAction } from '../types'
import { WarpExecutionResults } from '../types/results'
import { WarpActionExecutor } from '../WarpActionExecutor'
import { WarpArgSerializer } from '../WarpArgSerializer'

/**
 * Executes transform code securely in Node.js (using vm2) or browser (using Web Worker).
 */
const runTransform = async (code: string, result: any): Promise<any> => {
  if (typeof window === 'undefined') {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { VM } = require('vm2')
    const vm = new VM({ timeout: 1000, sandbox: { result }, eval: false, wasm: false })

    // Handle arrow function syntax: () => { return ... }
    if (code.trim().startsWith('(') && code.includes('=>')) {
      return vm.run(`(${code})(result)`)
    }

    return null
  }
  // Handle browser environment by creating a Web Worker
  return new Promise((resolve, reject) => {
    try {
      const blob = new Blob(
        [
          `
          self.onmessage = function(e) {
            try {
              const result = e.data;
              const output = (${code})(result);
              self.postMessage({ result: output });
            } catch (error) {
              self.postMessage({ error: error.toString() });
            }
          };
        `,
        ],
        { type: 'application/javascript' }
      )
      const url = URL.createObjectURL(blob)
      const worker = new Worker(url)
      worker.onmessage = function (e) {
        if (e.data.error) {
          reject(new Error(e.data.error))
        } else {
          resolve(e.data.result)
        }
        worker.terminate()
        URL.revokeObjectURL(url)
      }
      worker.onerror = function (e) {
        reject(new Error(`Error in transform: ${e.message}`))
        worker.terminate()
        URL.revokeObjectURL(url)
      }
      worker.postMessage(result)
    } catch (err) {
      return reject(err)
    }
  })
}

/**
 * Parses out[N] notation and returns the action index (1-based) or null if invalid.
 * Also handles plain "out" which defaults to action index 1.
 * Returns null for legacy paths like "out.1.2" to maintain backwards compatibility.
 *
 * Note: This implementation handles basic out[N] indexing but doesn't automatically execute
 * referenced actions. To access results from other actions, they must be executed explicitly
 * before being referenced. This design choice maintains API stability and avoids potential
 * circular dependencies or unexpected side effects.
 */
const parseOutActionIndex = (resultPath: string): number | null => {
  if (resultPath === 'out') return 1
  const outIndexMatch = resultPath.match(/^out\[(\d+)\]/)
  if (outIndexMatch) return parseInt(outIndexMatch[1], 10)
  if (resultPath.startsWith('out.') || resultPath.startsWith('event.')) return null
  return null
}

/**
 * Utility to get a nested value from an object by path array.
 */
const getNestedValueFromObject = (obj: any, path: string[]): any => {
  return path.reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : null), obj)
}

/**
 * Evaluates results with support for transform functions.
 */
export const evaluateResults = async (warp: Warp, baseResults: WarpExecutionResults): Promise<WarpExecutionResults> => {
  if (!warp.results) return baseResults
  const results = { ...baseResults }
  const transforms = Object.entries(warp.results)
    .filter(([, path]) => path.startsWith(WarpConstants.Transform.Prefix))
    .map(([key, path]) => ({ key, code: path.substring(WarpConstants.Transform.Prefix.length) }))
  for (const { key, code } of transforms) {
    try {
      results[key] = await runTransform(code, results)
    } catch (err) {
      console.error(`Transform error for result '${key}':`, err)
      results[key] = null
    }
  }
  return results
}

export const extractContractResults = async (
  executor: WarpActionExecutor,
  warp: Warp,
  action: WarpContractAction,
  tx: TransactionOnNetwork,
  currentActionIndex: number = 1
): Promise<{ values: any[]; results: WarpExecutionResults }> => {
  let values: any[] = []
  let results: WarpExecutionResults = {}
  if (!warp.results || !action.abi || action.type !== 'contract') {
    return { values, results }
  }
  const abi = await executor.getAbiForAction(action)
  const eventParser = new TransactionEventsParser({ abi })
  const outcomeParser = new SmartContractTransactionsOutcomeParser({ abi })
  const outcome = outcomeParser.parseExecute({ transactionOnNetwork: tx, function: action.func || undefined })
  for (const [resultName, resultPath] of Object.entries(warp.results)) {
    if (resultPath.startsWith(WarpConstants.Transform.Prefix)) continue
    const actionIndex = parseOutActionIndex(resultPath)
    if (actionIndex !== null && actionIndex !== currentActionIndex) {
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
    }
  }
  return { values, results: await evaluateResults(warp, results) }
}

export const extractQueryResults = async (
  warp: Warp,
  typedValues: TypedValue[],
  currentActionIndex: number = 1
): Promise<{ values: any[]; results: WarpExecutionResults }> => {
  const was = new WarpArgSerializer()
  const values = typedValues.map((t) => was.typedToString(t))
  const valuesRaw = typedValues.map((t) => was.typedToNative(t)[1])
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
    const actionIndex = parseOutActionIndex(path)
    if (actionIndex !== null && actionIndex !== currentActionIndex) {
      results[key] = null
      continue
    }
    if (path.startsWith('out.') || path === 'out' || path.startsWith('out[')) {
      results[key] = getNestedValue(path) || null
    }
  }
  return { values, results: await evaluateResults(warp, results) }
}

export const extractCollectResults = async (
  warp: Warp,
  response: any,
  currentActionIndex: number = 1
): Promise<{ values: any[]; results: WarpExecutionResults }> => {
  const values: any[] = []
  let results: WarpExecutionResults = {}
  for (const [resultName, resultPath] of Object.entries(warp.results || {})) {
    if (resultPath.startsWith(WarpConstants.Transform.Prefix)) continue
    const actionIndex = parseOutActionIndex(resultPath)
    if (actionIndex !== null && actionIndex !== currentActionIndex) {
      results[resultName] = null
      continue
    }
    const [resultType, ...pathParts] = resultPath.split('.')
    if (resultType !== 'out' && !resultType.startsWith('out[')) continue
    const value = pathParts.length === 0 ? response?.data || response : getNestedValueFromObject(response, pathParts)
    values.push(value)
    results[resultName] = value
  }
  return { values, results: await evaluateResults(warp, results) }
}

/**
 * Resolves all results for a warp, including dependencies referenced via out[N], recursively.
 * Executes all required actions and applies transforms, returning the final results for the entry action.
 *
 * @param warp The warp definition
 * @param entryActionIndex The index of the entry action to start execution from (1-based)
 * @param executor An object with executeQuery and executeCollect methods (typically a WarpActionExecutor instance)
 * @param inputs Initial inputs for the entry action
 * @param meta Optional metadata for collect actions
 * @returns The execution result with all dependencies resolved and transforms applied
 */
export async function resolveWarpResultsRecursively(
  warp: any,
  entryActionIndex: number,
  executor: { executeQuery: Function; executeCollect: Function },
  inputs: string[] = [],
  meta?: Record<string, any>
): Promise<any> {
  const resultsCache = new Map<number, any>()
  const resolving = new Set<number>()

  async function resolveAction(actionIndex: number, actionInputs: string[] = []): Promise<any> {
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
    // Recursively resolve dependencies referenced by out[N] in warp.results
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

  // Merge all results for transforms
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
  const finalResults = await evaluateResults(warp, combinedResults)
  const entryExecution = resultsCache.get(entryActionIndex)!
  return {
    ...entryExecution,
    results: finalResults,
  }
}
