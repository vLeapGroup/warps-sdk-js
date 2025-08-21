import {
  AdapterWarpResults,
  evaluateResultsCommon,
  parseResultsOutIndex,
  ResolvedInput,
  Warp,
  WarpClientConfig,
  WarpConstants,
  WarpExecution,
  WarpExecutionResults,
} from '@vleap/warps'
import { ethers } from 'ethers'
import { WarpEvmSerializer } from './WarpEvmSerializer'

export class WarpEvmResults implements AdapterWarpResults {
  private readonly serializer: WarpEvmSerializer

  constructor(private readonly config: WarpClientConfig) {
    this.serializer = new WarpEvmSerializer()
  }

  async getTransactionExecutionResults(warp: Warp, tx: ethers.TransactionReceipt): Promise<WarpExecution> {
    const success = tx.status === 1
    const gasUsed = tx.gasUsed?.toString() || '0'
    const gasPrice = tx.gasPrice?.toString() || '0'
    const blockNumber = tx.blockNumber?.toString() || '0'
    const transactionHash = tx.hash

    const logs = tx.logs.map((log) => ({
      address: log.address,
      topics: log.topics,
      data: log.data,
      blockNumber: log.blockNumber?.toString() || '0',
      transactionHash: log.transactionHash,
      index: log.index?.toString() || '0',
    }))

    return {
      success,
      warp,
      action: 0,
      user: this.config.user?.wallets?.evm || null,
      txHash: transactionHash,
      tx,
      next: null,
      values: [transactionHash, blockNumber, gasUsed, gasPrice, ...(logs.length > 0 ? logs : [])],
      results: {},
      messages: {},
    }
  }

  async extractQueryResults(
    warp: Warp,
    typedValues: any[],
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
}
