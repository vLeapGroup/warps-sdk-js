import {
  SmartContractTransactionsOutcomeParser,
  TransactionEventsParser,
  TransactionOnNetwork,
  TypedValue,
  findEventsByFirstTopic,
} from '@multiversx/sdk-core/out'
import { Warp, WarpContractAction } from '../types'
import { WarpExecutionResults } from '../types/results'
import { WarpActionExecutor } from '../WarpActionExecutor'
import { WarpArgSerializer } from '../WarpArgSerializer'

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
      const outputAtPosition = (outcome.values[outputIndex - 1] || null) as object | null // first is return message
      values.push(outputAtPosition)
      results[resultName] = outputAtPosition ? outputAtPosition.valueOf() : outputAtPosition
    }
  }

  return { values, results }
}

export const extractQueryResults = async (
  warp: Warp,
  typedValues: TypedValue[]
): Promise<{ values: any[]; results: WarpExecutionResults }> => {
  const was = new WarpArgSerializer()

  const values = typedValues.map((t) => was.typedToString(t))
  const valuesRaw = typedValues.map((t) => was.typedToNative(t)[1])
  const results: WarpExecutionResults = {}

  if (!warp.results) {
    return { values, results }
  }

  const getNestedValue = (path: string): unknown => {
    const indices = path
      .split('.')
      .slice(1)
      .map((i) => parseInt(i) - 1) // Convert to 0-based indices
    if (indices.length === 0) return undefined

    let value: any = valuesRaw[indices[0]]

    for (let i = 1; i < indices.length; i++) {
      if (value === undefined || value === null) return undefined
      value = value[indices[i]]
    }

    return value
  }

  Object.entries(warp.results).forEach(([key, path]) => {
    if (path.startsWith('out.')) {
      const value = getNestedValue(path)
      results[key] = value || null
    }
  })

  return { values, results }
}

export const extractCollectResults = async (warp: Warp, response: any): Promise<{ values: any[]; results: WarpExecutionResults }> => {
  const values: any[] = []
  const results: WarpExecutionResults = {}

  for (const [resultName, resultPath] of Object.entries(warp.results || {})) {
    const [resultType, ...pathPartsDotNotated] = resultPath.split('.')
    if (resultType !== 'out') continue
    if (!pathPartsDotNotated.length) {
      const value = response?.data || response
      values.push(value)
      results[resultName] = value
      continue
    }
    const value = pathPartsDotNotated.reduce((obj, key) => obj?.[key], response)
    values.push(value)
    results[resultName] = value
  }

  return { values, results }
}
