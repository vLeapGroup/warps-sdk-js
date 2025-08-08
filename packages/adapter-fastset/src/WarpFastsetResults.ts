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
import { WarpFastsetSerializer } from './WarpFastsetSerializer'

export class WarpFastsetResults implements AdapterWarpResults {
  private readonly serializer: WarpFastsetSerializer

  constructor(private readonly config: WarpClientConfig) {
    this.serializer = new WarpFastsetSerializer()
  }

  async getTransactionExecutionResults(warp: Warp, tx: any): Promise<WarpExecution> {
    // TODO: Implement Fastset-specific transaction result processing
    // This should process Fastset transaction results into WarpExecution format

    const success = this.isTransactionSuccessful(tx)
    const gasUsed = this.extractGasUsed(tx)
    const gasPrice = this.extractGasPrice(tx)
    const blockNumber = this.extractBlockNumber(tx)
    const transactionHash = this.extractTransactionHash(tx)

    const logs = this.extractLogs(tx)

    return {
      success,
      warp,
      action: 0,
      user: this.config.user?.wallets?.fastset || null,
      txHash: transactionHash,
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
    // TODO: Implement Fastset-specific query result extraction
    // This should extract and process query results according to Fastset format

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

  private isTransactionSuccessful(tx: any): boolean {
    // TODO: Implement Fastset-specific transaction success detection
    // This should determine if a Fastset transaction was successful

    // Placeholder implementation - replace with Fastset-specific logic
    return tx.status === 'success' || tx.status === 1 || tx.success === true
  }

  private extractGasUsed(tx: any): string {
    // TODO: Implement Fastset-specific gas used extraction
    // This should extract gas used from Fastset transaction

    // Placeholder implementation - replace with Fastset-specific logic
    return tx.gasUsed?.toString() || tx.gas_used?.toString() || '0'
  }

  private extractGasPrice(tx: any): string {
    // TODO: Implement Fastset-specific gas price extraction
    // This should extract gas price from Fastset transaction

    // Placeholder implementation - replace with Fastset-specific logic
    return tx.gasPrice?.toString() || tx.gas_price?.toString() || '0'
  }

  private extractBlockNumber(tx: any): string {
    // TODO: Implement Fastset-specific block number extraction
    // This should extract block number from Fastset transaction

    // Placeholder implementation - replace with Fastset-specific logic
    return tx.blockNumber?.toString() || tx.block_number?.toString() || '0'
  }

  private extractTransactionHash(tx: any): string {
    // TODO: Implement Fastset-specific transaction hash extraction
    // This should extract transaction hash from Fastset transaction

    // Placeholder implementation - replace with Fastset-specific logic
    return tx.hash || tx.transactionHash || tx.transaction_hash || ''
  }

  private extractLogs(tx: any): any[] {
    // TODO: Implement Fastset-specific log extraction
    // This should extract logs from Fastset transaction

    // Placeholder implementation - replace with Fastset-specific logic
    const logs = tx.logs || tx.events || []

    return logs.map((log: any) => ({
      address: log.address || log.contract,
      topics: log.topics || log.topics || [],
      data: log.data || log.payload || '',
      blockNumber: log.blockNumber?.toString() || log.block_number?.toString() || '0',
      transactionHash: log.transactionHash || log.transaction_hash || '',
      index: log.index?.toString() || '0',
    }))
  }
}
