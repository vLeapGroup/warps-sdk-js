import {
  AdapterWarpResults,
  evaluateResultsCommon,
  getWarpWalletAddressFromConfig,
  parseResultsOutIndex,
  ResolvedInput,
  Warp,
  WarpChainInfo,
  WarpClientConfig,
  WarpConstants,
  WarpExecution,
  WarpExecutionResults,
} from '@vleap/warps'
import { WarpFastsetSerializer } from './WarpFastsetSerializer'

export class WarpFastsetResults implements AdapterWarpResults {
  private readonly serializer: WarpFastsetSerializer

  constructor(
    private readonly config: WarpClientConfig,
    private readonly chain: WarpChainInfo
  ) {
    this.serializer = new WarpFastsetSerializer()
  }

  async getTransactionExecutionResults(warp: Warp, tx: any): Promise<WarpExecution> {
    const success = this.isTransactionSuccessful(tx)
    const transactionHash = this.extractTransactionHash(tx)
    const blockNumber = this.extractBlockNumber(tx)
    const timestamp = this.extractTimestamp(tx)

    return {
      success,
      warp,
      action: 0,
      user: getWarpWalletAddressFromConfig(this.config, this.chain.name),
      txHash: transactionHash,
      tx,
      next: null,
      values: [transactionHash, blockNumber, timestamp],
      valuesRaw: [transactionHash, blockNumber, timestamp],
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
      const match = path.match(/^out\[(\d+)\]$/)
      if (match) {
        const index = parseInt(match[1]) - 1
        return valuesRaw[index]
      }

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
        const value = getNestedValue(path)
        results[key] = value || null
      } else {
        results[key] = path
      }
    }

    return { values, results: await evaluateResultsCommon(warp, results, actionIndex, inputs, this.config.transform?.runner) }
  }

  private isTransactionSuccessful(tx: any): boolean {
    if (!tx) return false

    if (tx.success === false) return false
    if (tx.success === true) return true
    if (tx.status === 'success') return true
    if (tx.status === 1) return true
    if (tx.result && tx.result.success === true) return true

    return false
  }

  private extractTransactionHash(tx: any): string {
    if (!tx) return ''

    return tx.transaction_hash || tx.transactionHash || tx.hash || (tx.result && tx.result.transaction_hash) || ''
  }

  private extractBlockNumber(tx: any): string {
    if (!tx) return '0'

    return tx.block_number?.toString() || tx.blockNumber?.toString() || (tx.result && tx.result.block_number?.toString()) || '0'
  }

  private extractTimestamp(tx: any): string {
    if (!tx) return '0'

    return (
      tx.timestamp?.toString() || tx.timestamp_nanos?.toString() || (tx.result && tx.result.timestamp?.toString()) || Date.now().toString()
    )
  }
}
