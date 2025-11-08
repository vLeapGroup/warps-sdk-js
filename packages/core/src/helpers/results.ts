import { WarpConstants } from '../constants'
import { ResolvedInput, TransformRunner, Warp, WarpClientConfig } from '../types'
import { WarpExecutionResults } from '../types/results'
import { WarpLogger } from '../WarpLogger'
import { WarpSerializer } from '../WarpSerializer'
import { getWarpActionByIndex } from './general'

export const extractCollectResults = async (
  warp: Warp,
  response: any,
  actionIndex: number,
  inputs: ResolvedInput[],
  serializer: WarpSerializer,
  config: WarpClientConfig
): Promise<{ values: { string: string[]; native: any[] }; results: WarpExecutionResults }> => {
  const stringValues: string[] = []
  const nativeValues: any[] = []
  let results: WarpExecutionResults = {}
  for (const [resultName, resultPath] of Object.entries(warp.results || {})) {
    if (resultPath.startsWith(WarpConstants.Transform.Prefix)) continue
    const currentActionIndex = parseResultsOutIndex(resultPath)
    if (currentActionIndex !== null && currentActionIndex !== actionIndex) {
      results[resultName] = null
      continue
    }
    const [resultType, ...pathParts] = resultPath.split('.')

    const getNestedValueFromObject = (obj: any, path: string[]): any =>
      path.reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : null), obj)

    if (resultType === 'out' || resultType.startsWith('out[')) {
      const value = pathParts.length === 0 ? response?.data || response : getNestedValueFromObject(response, pathParts)
      stringValues.push(String(value))
      nativeValues.push(value)
      results[resultName] = value
    } else {
      results[resultName] = resultPath
    }
  }
  return {
    values: { string: stringValues, native: nativeValues },
    results: await evaluateResultsCommon(warp, results, actionIndex, inputs, serializer, config),
  }
}

// Processes and finalizes the results of a Warp action, supporting result definitions like:
//   - 'input.amount' to echo input values
//   - 'transform: return out.value * 2' for computed results
// Enables users to define results that are static, input-based, or computed via custom code.
export const evaluateResultsCommon = async (
  warp: Warp,
  baseResults: WarpExecutionResults,
  actionIndex: number,
  inputs: ResolvedInput[],
  serializer: WarpSerializer,
  config: WarpClientConfig
): Promise<WarpExecutionResults> => {
  if (!warp.results) return baseResults
  let results = { ...baseResults }
  results = evaluateInputResults(results, warp, actionIndex, inputs, serializer)
  results = await evaluateTransformResults(warp, results, config.transform?.runner || null)
  return results
}

// Supports result fields like 'input.amount', replacing them with the actual value provided for 'amount' in the action's inputs.
// Lets users expose or echo specific input values directly in the results by referencing them as 'input.<name>'.
const evaluateInputResults = (
  results: WarpExecutionResults,
  warp: Warp,
  actionIndex: number,
  inputs: ResolvedInput[],
  serializer: WarpSerializer
): WarpExecutionResults => {
  const modifiable = { ...results }
  const actionInputs = getWarpActionByIndex(warp, actionIndex)?.inputs || []

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

// Supports result fields starting with 'transform:', e.g., 'transform: return out.value * 2',
// which run user-defined code to compute the result value based on other results.
// Enables advanced, programmable result shaping using custom JavaScript logic in the result definition.
const evaluateTransformResults = async (
  warp: Warp,
  baseResults: WarpExecutionResults,
  transformRunner: TransformRunner | null
): Promise<WarpExecutionResults> => {
  if (!warp.results) return baseResults
  const modifiable = { ...baseResults }

  const transforms = Object.entries(warp.results)
    .filter(([, path]) => path.startsWith(WarpConstants.Transform.Prefix))
    .map(([key, path]) => ({ key, code: path.substring(WarpConstants.Transform.Prefix.length) }))

  if (transforms.length > 0 && (!transformRunner || typeof transformRunner.run !== 'function')) {
    throw new Error('Transform results are defined but no transform runner is configured. Provide a runner via config.transform.runner.')
  }

  for (const { key, code } of transforms) {
    try {
      modifiable[key] = await transformRunner!.run(code, modifiable)
    } catch (err) {
      WarpLogger.error(`Transform error for result '${key}':`, err)
      modifiable[key] = null
    }
  }

  return modifiable
}

/**
 * Parses out[N] notation and returns the action index (1-based) or null if invalid.
 * Also handles plain "out" which defaults to action index 1.
 */
export const parseResultsOutIndex = (resultPath: string): number | null => {
  if (resultPath === 'out') return 1
  const outIndexMatch = resultPath.match(/^out\[(\d+)\]/)
  if (outIndexMatch) return parseInt(outIndexMatch[1], 10)
  if (resultPath.startsWith('out.') || resultPath.startsWith('event.')) return null
  return null
}
