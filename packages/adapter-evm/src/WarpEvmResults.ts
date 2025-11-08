import {
  AdapterWarpResults,
  evaluateResultsCommon,
  getProviderConfig,
  getWarpWalletAddressFromConfig,
  parseResultsOutIndex,
  ResolvedInput,
  Warp,
  WarpActionExecution,
  WarpActionIndex,
  WarpAdapterGenericRemoteTransaction,
  WarpChainAction,
  WarpChainInfo,
  WarpClientConfig,
  WarpConstants,
  WarpExecutionResults,
  WarpNativeValue,
} from '@vleap/warps'
import { ethers } from 'ethers'
import { WarpEvmSerializer } from './WarpEvmSerializer'

export class WarpEvmResults implements AdapterWarpResults {
  private readonly serializer: WarpEvmSerializer
  private readonly provider: ethers.JsonRpcProvider

  constructor(
    private readonly config: WarpClientConfig,
    private readonly chain: WarpChainInfo
  ) {
    this.serializer = new WarpEvmSerializer()
    const providerConfig = getProviderConfig(this.config, this.chain.name, this.config.env, this.chain.defaultApiUrl)
    const network = new ethers.Network(this.chain.name, parseInt(this.chain.chainId))
    this.provider = new ethers.JsonRpcProvider(providerConfig.url, network)
  }

  async getActionExecution(
    warp: Warp,
    actionIndex: WarpActionIndex,
    tx: WarpAdapterGenericRemoteTransaction
  ): Promise<WarpActionExecution> {
    if (!tx) {
      return this.createFailedExecution(warp, actionIndex)
    }

    // Handle WarpChainAction object (from getActions)
    if ('status' in tx && typeof tx.status === 'string') {
      return this.handleWarpChainAction(warp, actionIndex, tx as WarpChainAction)
    }

    // Handle ethers.TransactionReceipt object (legacy)
    return this.handleTransactionReceipt(warp, actionIndex, tx as ethers.TransactionReceipt)
  }

  private createFailedExecution(warp: Warp, actionIndex: WarpActionIndex): WarpActionExecution {
    return {
      success: false,
      warp,
      action: actionIndex,
      user: getWarpWalletAddressFromConfig(this.config, this.chain.name),
      txHash: '',
      tx: null,
      next: null,
      values: { string: [], native: [] },
      results: {},
      messages: {},
    }
  }

  private handleWarpChainAction(warp: Warp, actionIndex: WarpActionIndex, tx: WarpChainAction): WarpActionExecution {
    const success = tx.status === 'success'
    const transactionHash = tx.id || tx.tx?.hash || ''
    const gasUsed = tx.tx?.gasLimit || '0'
    const gasPrice = tx.tx?.gasPrice || '0'
    const blockNumber = tx.tx?.blockNumber || '0'

    const rawValues = [transactionHash, blockNumber, gasUsed, gasPrice]
    const stringValues = rawValues.map(String)

    return {
      success,
      warp,
      action: actionIndex,
      user: getWarpWalletAddressFromConfig(this.config, this.chain.name),
      txHash: transactionHash,
      tx,
      next: null,
      values: { string: stringValues, native: rawValues },
      results: {},
      messages: {},
    }
  }

  private handleTransactionReceipt(warp: Warp, actionIndex: WarpActionIndex, tx: ethers.TransactionReceipt): WarpActionExecution {
    const success = tx.status === 1
    const gasUsed = tx.gasUsed?.toString() || '0'
    const gasPrice = tx.gasPrice?.toString() || '0'
    const blockNumber = tx.blockNumber?.toString() || '0'
    const transactionHash = tx.hash

    const logs = tx.logs.map((log) => ({
      address: log.address,
      topics: [...log.topics],
      data: log.data,
      blockNumber: log.blockNumber?.toString() || '0',
      transactionHash: log.transactionHash,
      index: log.index?.toString() || '0',
    }))

    const rawValues = [transactionHash, blockNumber, gasUsed, gasPrice, ...(logs.length > 0 ? logs : [])]
    const stringValues = rawValues.map(String)

    return {
      success,
      warp,
      action: actionIndex,
      user: getWarpWalletAddressFromConfig(this.config, this.chain.name),
      txHash: transactionHash,
      tx,
      next: null,
      values: { string: stringValues, native: rawValues },
      results: {},
      messages: {},
    }
  }

  async extractQueryResults(
    warp: Warp,
    typedValues: unknown[],
    actionIndex: number,
    inputs: ResolvedInput[]
  ): Promise<{ values: { string: string[]; native: WarpNativeValue[] }; results: WarpExecutionResults }> {
    const stringValues = typedValues.map((t) => this.serializer.typedToString(t))
    const nativeValues = typedValues.map((t) => this.serializer.typedToNative(t)[1])
    const values = { string: stringValues, native: nativeValues }
    let results: WarpExecutionResults = {}

    if (!warp.results) return { values, results }

    const getNestedValue = (path: string): unknown => {
      const indices = path
        .split('.')
        .slice(1)
        .map((i) => parseInt(i) - 1)
      if (indices.length === 0) return undefined
      let value: unknown = nativeValues[indices[0]]
      for (let i = 1; i < indices.length; i++) {
        if (value === undefined || value === null) return undefined
        value = (value as Record<string, unknown>)[indices[i]]
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

    return { values, results: await evaluateResultsCommon(warp, results, actionIndex, inputs, this.serializer.coreSerializer, this.config) }
  }

  async getTransactionStatus(
    txHash: string
  ): Promise<{ status: 'pending' | 'confirmed' | 'failed'; blockNumber?: number; gasUsed?: bigint }> {
    try {
      const receipt = await this.provider.getTransactionReceipt(txHash)

      if (!receipt) {
        return { status: 'pending' }
      }

      return {
        status: receipt.status === 1 ? 'confirmed' : 'failed',
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed,
      }
    } catch (error) {
      throw new Error(`Failed to get transaction status: ${error}`)
    }
  }

  async getTransactionReceipt(txHash: string): Promise<ethers.TransactionReceipt | null> {
    try {
      return await this.provider.getTransactionReceipt(txHash)
    } catch (error) {
      return null
    }
  }
}
