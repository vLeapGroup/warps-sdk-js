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
const runTransform = async (code: string, input: any): Promise<any> => {
  if (typeof window === 'undefined') {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { VM } = require('vm2')
    const vm = new VM({ timeout: 1000, sandbox: { input }, eval: false, wasm: false })

    // Handle arrow function syntax: () => { return ... }
    if (code.trim().startsWith('(') && code.includes('=>')) {
      return vm.run(`(${code})(input)`)
    }

    return null
  } else {
    // Browser: use Web Worker
    return new Promise((resolve, reject) => {
      const workerCode =
        code.trim().startsWith('(') && code.includes('=>')
          ? `onmessage = function(e) {
             const input = e.data.input;
             try {
               const result = (${code})(input);
               postMessage({ result });
             } catch (err) {
               postMessage({ error: err.message });
             }
           }`
          : `onmessage = function(e) {
             const input = e.data.input;
             try {
               ${code};
               const result = typeof transform === 'function' ? transform(input) : null;
               postMessage({ result });
             } catch (err) {
               postMessage({ error: err.message });
             }
           }`

      const blob = new Blob([workerCode], { type: 'application/javascript' })
      const worker = new Worker(URL.createObjectURL(blob))

      worker.onmessage = (e) => {
        worker.terminate()
        if (e.data && 'error' in e.data) {
          reject(new Error(e.data.error))
        } else {
          resolve(e.data.result)
        }
      }

      worker.onerror = (e) => {
        worker.terminate()
        reject(new Error(e.message))
      }

      worker.postMessage({ input })
    })
  }
}

/**
 * Evaluates results with support for transform functions.
 */
const evaluateResults = async (warp: Warp, baseResults: WarpExecutionResults): Promise<WarpExecutionResults> => {
  if (!warp.results) return baseResults

  const results = { ...baseResults }
  const transforms = Object.entries(warp.results)
    .filter(([, path]) => path.startsWith(WarpConstants.Transform.Prefix))
    .map(([key, path]) => ({ key, code: path.substring(WarpConstants.Transform.Prefix.length) }))

  // Evaluate transforms sequentially to allow dependencies
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
  tx: TransactionOnNetwork
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

    const [resultType, partOne, partTwo] = resultPath.split('.')
    if (resultType === 'event') {
      if (!partOne || isNaN(Number(partTwo))) continue
      const topicPosition = Number(partTwo)
      const events = findEventsByFirstTopic(tx, partOne)
      const outcome = eventParser.parseEvents({ events })[0]
      const outcomeAtPosition = (Object.values(outcome)[topicPosition] || null) as object | null
      values.push(outcomeAtPosition)
      results[resultName] = outcomeAtPosition ? outcomeAtPosition.valueOf() : outcomeAtPosition
    } else if (resultType === 'out') {
      if (!partOne) continue
      const outputIndex = Number(partOne)
      const outputAtPosition = (outcome.values[outputIndex - 1] || null) as object | null
      values.push(outputAtPosition)
      results[resultName] = outputAtPosition ? outputAtPosition.valueOf() : outputAtPosition
    }
  }

  return { values, results: await evaluateResults(warp, results) }
}

export const extractQueryResults = async (
  warp: Warp,
  typedValues: TypedValue[]
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
    if (path.startsWith('out.')) {
      results[key] = getNestedValue(path) || null
    }
  }

  return { values, results: await evaluateResults(warp, results) }
}

export const extractCollectResults = async (warp: Warp, response: any): Promise<{ values: any[]; results: WarpExecutionResults }> => {
  const values: any[] = []
  let results: WarpExecutionResults = {}

  for (const [resultName, resultPath] of Object.entries(warp.results || {})) {
    if (resultPath.startsWith(WarpConstants.Transform.Prefix)) continue

    const [resultType, ...pathParts] = resultPath.split('.')
    if (resultType !== 'out') continue

    const value = pathParts.length === 0 ? response?.data || response : pathParts.reduce((obj, key) => obj?.[key], response)

    values.push(value)
    results[resultName] = value
  }

  return { values, results: await evaluateResults(warp, results) }
}
