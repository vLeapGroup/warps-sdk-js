import { WarpConstants } from '../constants'
import { ResolvedInput, Warp } from '../types'
import { WarpExecutionResults } from '../types/results'
import { WarpLogger } from '../WarpLogger'
import { WarpSerializer } from '../WarpSerializer'
import { getWarpActionByIndex } from './general'

/**
 * Parses out[N] notation and returns the action index (1-based) or null if invalid.
 * Also handles plain "out" which defaults to action index 1.
 */
export const parseOutActionIndex = (resultPath: string): number | null => {
  if (resultPath === 'out') return 1
  const outIndexMatch = resultPath.match(/^out\[(\d+)\]/)
  if (outIndexMatch) return parseInt(outIndexMatch[1], 10)
  if (resultPath.startsWith('out.') || resultPath.startsWith('event.')) return null
  return null
}

export const extractCollectResults = async (
  warp: Warp,
  response: any,
  actionIndex: number,
  inputs: ResolvedInput[]
): Promise<{ values: any[]; results: WarpExecutionResults }> => {
  const values: any[] = []
  let results: WarpExecutionResults = {}
  for (const [resultName, resultPath] of Object.entries(warp.results || {})) {
    if (resultPath.startsWith(WarpConstants.Transform.Prefix)) continue
    const currentActionIndex = parseOutActionIndex(resultPath)
    if (currentActionIndex !== null && currentActionIndex !== actionIndex) {
      results[resultName] = null
      continue
    }
    const [resultType, ...pathParts] = resultPath.split('.')
    if (resultType === 'out' || resultType.startsWith('out[')) {
      const value = pathParts.length === 0 ? response?.data || response : getNestedValueFromObject(response, pathParts)
      values.push(value)
      results[resultName] = value
    } else {
      results[resultName] = resultPath
    }
  }
  return { values, results: await evaluateResultsCommon(warp, results, actionIndex, inputs) }
}

/**
 * Resolves all results for a warp, including dependencies referenced via out[N], recursively.
 * Executes all required actions and applies transforms, returning the final results for the entry action.
 */
export async function resolveWarpResultsRecursively(
  warp: any,
  entryActionIndex: number,
  executor: { executeQuery: Function; executeCollect: Function },
  inputs: ResolvedInput[],
  meta?: Record<string, any>
): Promise<any> {
  const resultsCache = new Map<number, any>()
  const resolving = new Set<number>()

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
  const finalResults = await evaluateResultsCommon(warp, combinedResults, entryActionIndex, inputs)
  const entryExecution = resultsCache.get(entryActionIndex)!
  // Determine overall success: all actions must have success !== false
  const overallSuccess = Array.from(resultsCache.values()).every((exec) => exec && exec.success !== false)
  return {
    ...entryExecution,
    results: finalResults,
    success: overallSuccess,
  }
}

export const evaluateResultsCommon = async (
  warp: Warp,
  baseResults: WarpExecutionResults,
  actionIndex: number,
  inputs: ResolvedInput[]
): Promise<WarpExecutionResults> => {
  if (!warp.results) return baseResults
  let results = { ...baseResults }
  results = evaluateInputResults(results, warp, actionIndex, inputs)
  results = await evaluateTransformResults(warp, results)
  return results
}

const evaluateInputResults = (
  results: WarpExecutionResults,
  warp: Warp,
  actionIndex: number,
  inputs: ResolvedInput[]
): WarpExecutionResults => {
  const modifiable = { ...results }
  const actionInputs = getWarpActionByIndex(warp, actionIndex)?.inputs || []
  const serializer = new WarpSerializer()
  for (const [key, value] of Object.entries(modifiable)) {
    if (typeof value === 'string' && value.startsWith('input.')) {
      const inputName = value.split('.')[1]
      const inputIndex = actionInputs.findIndex((i) => i.as === inputName || i.name === inputName)
      const valueAtIndex = inputIndex !== -1 ? inputs[inputIndex]?.value : null
      modifiable[key] = valueAtIndex ? serializer.stringToNative(valueAtIndex)[1] : null
    }
  }
  return modifiable
}

const getNestedValueFromObject = (obj: any, path: string[]): any => {
  return path.reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : null), obj)
}

const evaluateTransformResults = async (warp: Warp, baseResults: WarpExecutionResults): Promise<WarpExecutionResults> => {
  if (!warp.results) return baseResults
  const modifiable = { ...baseResults }

  const transforms = Object.entries(warp.results)
    .filter(([, path]) => path.startsWith(WarpConstants.Transform.Prefix))
    .map(([key, path]) => ({ key, code: path.substring(WarpConstants.Transform.Prefix.length) }))

  for (const { key, code } of transforms) {
    try {
      // Dynamically import runInVm only when needed
      const { runInVm } = await import('./vm')
      modifiable[key] = await runInVm(code, modifiable)
    } catch (err) {
      WarpLogger.error(`Transform error for result '${key}':`, err)
      modifiable[key] = null
    }
  }

  return modifiable
}
