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
  const serializer = new WarpSerializer()
  for (const [key, value] of Object.entries(modifiable)) {
    if (typeof value === 'string' && value.startsWith('input.')) {
      const inputName = value.split('.')[1]
      // Find input by matching name or alias in the inputs array
      const inputValue = inputs.find((resolvedInput) => {
        const input = resolvedInput.input
        return input.as === inputName || input.name === inputName
      })?.value
      modifiable[key] = inputValue ? serializer.stringToNative(inputValue)[1] : null
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
