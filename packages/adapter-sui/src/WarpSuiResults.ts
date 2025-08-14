import { SuiClient } from '@mysten/sui/client'
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
  WarpChain,
  WarpClientConfig,
  WarpConstants,
  WarpContractAction,
  WarpExecution,
  WarpExecutionResults,
} from '@vleap/warps'
import { WarpSuiSerializer } from './WarpSuiSerializer'
import { getSuiApiUrl } from './config'
import { getSuiAdapter } from './main'

export class WarpSuiResults implements AdapterWarpResults {
  private readonly serializer: WarpSuiSerializer
  private readonly client: SuiClient

  constructor(
    private readonly config: WarpClientConfig,
    private readonly chain: WarpChain
  ) {
    this.serializer = new WarpSuiSerializer()
    this.client = new SuiClient({ url: getSuiApiUrl(config.env) })
  }

  async getTransactionExecutionResults(warp: Warp, tx: any): Promise<WarpExecution> {
    const { action, actionIndex } = findWarpExecutableAction(warp) as { action: WarpContractAction; actionIndex: WarpActionIndex }
    // SUI: tx is a TransactionBlockResponse
    const results = await this.extractContractResults(warp, actionIndex, tx, [])
    const adapter = getSuiAdapter(this.config)
    const next = getNextInfo(this.config, adapter, warp, actionIndex, results)
    const messages = applyResultsToMessages(warp, results.results)
    return {
      success: tx.effects?.status?.status === 'success',
      warp,
      action: actionIndex,
      user: this.config.user?.wallets?.[this.chain] || null,
      txHash: tx.digest,
      next,
      values: results.values,
      results: results.results,
      messages,
    }
  }

  async extractContractResults(
    warp: Warp,
    actionIndex: WarpActionIndex,
    tx: any,
    inputs: ResolvedInput[]
  ): Promise<{ values: any[]; results: WarpExecutionResults }> {
    // SUI: extract results from tx effects or return values
    let values: any[] = []
    let results: WarpExecutionResults = {}
    if (!warp.results) return { values, results }
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
      // SUI: support extracting from tx return values or events
      if (resultPath.startsWith('out.')) {
        // For SUI, use tx.effects?.events or tx.returnValues
        results[resultName] = tx.returnValues ? tx.returnValues[resultName] : null
        values.push(results[resultName])
      } else {
        results[resultName] = resultPath
      }
    }
    return { values, results: await evaluateResultsCommon(warp, results, actionIndex, inputs) }
  }

  async extractQueryResults(
    warp: Warp,
    typedValues: any[],
    actionIndex: number,
    inputs: ResolvedInput[]
  ): Promise<{ values: any[]; results: WarpExecutionResults }> {
    // SUI: typedValues are direct query results
    const values = typedValues
    let results: WarpExecutionResults = {}
    if (!warp.results) return { values, results }
    for (const [key, path] of Object.entries(warp.results)) {
      if (path.startsWith(WarpConstants.Transform.Prefix)) continue
      const currentActionIndex = parseResultsOutIndex(path)
      if (currentActionIndex !== null && currentActionIndex !== actionIndex) {
        results[key] = null
        continue
      }
      if (path.startsWith('out.') || path === 'out') {
        // If values is an array of objects, extract the property
        if (Array.isArray(values) && values.length > 0 && typeof values[0] === 'object' && values[0] !== null) {
          const prop = path.replace(/^out\./, '')
          results[key] = values[0][prop]
        } else {
          results[key] = values[0]
        }
      } else {
        results[key] = path
      }
    }
    return { values, results: await evaluateResultsCommon(warp, results, actionIndex, inputs) }
  }
}
