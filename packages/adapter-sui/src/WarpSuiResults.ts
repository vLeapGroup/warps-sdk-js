import { SuiClient } from '@mysten/sui/client'
import {
  AdapterWarpResults,
  applyResultsToMessages,
  evaluateResultsCommon,
  getNextInfo,
  getProviderConfig,
  getWarpWalletAddressFromConfig,
  parseResultsOutIndex,
  ResolvedInput,
  Warp,
  WarpActionExecution,
  WarpActionIndex,
  WarpAdapterGenericRemoteTransaction,
  WarpChainInfo,
  WarpClientConfig,
  WarpConstants,
  WarpExecutionResults,
} from '@vleap/warps'
import { WarpSuiSerializer } from './WarpSuiSerializer'

export class WarpSuiResults implements AdapterWarpResults {
  private readonly serializer: WarpSuiSerializer
  private readonly client: SuiClient

  constructor(
    private readonly config: WarpClientConfig,
    private readonly chain: WarpChainInfo
  ) {
    this.serializer = new WarpSuiSerializer()
    const providerConfig = getProviderConfig(this.config, this.chain.name, this.config.env, this.chain.defaultApiUrl)
    this.client = new SuiClient({ url: providerConfig.url })
  }

  async getActionExecution(
    warp: Warp,
    actionIndex: WarpActionIndex,
    tx: WarpAdapterGenericRemoteTransaction
  ): Promise<WarpActionExecution> {
    const results = await this.extractContractResults(warp, actionIndex, tx, [])
    const next = getNextInfo(this.config, [], warp, actionIndex, results)
    const messages = applyResultsToMessages(warp, results.results)
    return {
      success: tx.effects?.status?.status === 'success',
      warp,
      action: actionIndex,
      user: getWarpWalletAddressFromConfig(this.config, this.chain.name),
      txHash: tx.digest,
      tx,
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
  ): Promise<{ values: { string: string[]; native: any[] }; results: WarpExecutionResults }> {
    // SUI: extract results from tx effects or return values
    let stringValues: string[] = []
    let nativeValues: any[] = []
    let results: WarpExecutionResults = {}
    if (!warp.results) return { values: { string: stringValues, native: nativeValues }, results }
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
        const nativeValue = tx.returnValues ? tx.returnValues[resultName] : null
        results[resultName] = nativeValue
        stringValues.push(String(nativeValue))
        nativeValues.push(nativeValue)
      } else {
        results[resultName] = resultPath
      }
    }
    return {
      values: { string: stringValues, native: nativeValues },
      results: await evaluateResultsCommon(warp, results, actionIndex, inputs, this.serializer.coreSerializer, this.config),
    }
  }

  async extractQueryResults(
    warp: Warp,
    typedValues: any[],
    actionIndex: number,
    inputs: ResolvedInput[]
  ): Promise<{ values: { string: string[]; native: any[] }; results: WarpExecutionResults }> {
    // SUI: typedValues are direct query results
    const stringValues = typedValues.map((native) => String(native))
    const nativeValues = typedValues
    const values = { string: stringValues, native: nativeValues }
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
        if (Array.isArray(typedValues) && typedValues.length > 0 && typeof typedValues[0] === 'object' && typedValues[0] !== null) {
          const prop = path.replace(/^out\./, '')
          results[key] = typedValues[0][prop]
        } else {
          results[key] = typedValues[0]
        }
      } else {
        results[key] = path
      }
    }
    return { values, results: await evaluateResultsCommon(warp, results, actionIndex, inputs, this.serializer.coreSerializer, this.config) }
  }
}
