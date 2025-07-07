import { SuiClient } from '@mysten/sui/client'
import { Transaction } from '@mysten/sui/transactions'
import {
  applyResultsToMessages,
  getNextInfo,
  getWarpActionByIndex,
  WarpExecutable,
  WarpExecution,
  WarpInitConfig,
  WarpQueryAction,
} from '@vleap/warps-core'
import { WarpSuiResults } from './WarpSuiResults'
import { WarpSuiSerializer } from './WarpSuiSerializer'

export class WarpSuiExecutor {
  private readonly serializer: WarpSuiSerializer
  private readonly results: WarpSuiResults
  private readonly client: SuiClient

  constructor(private readonly config: WarpInitConfig) {
    this.serializer = new WarpSuiSerializer()
    this.results = new WarpSuiResults(this.config)
    this.client = new SuiClient({ url: this.config.currentUrl! })
  }

  async createTransaction(executable: WarpExecutable): Promise<Transaction> {
    const action = getWarpActionByIndex(executable.warp, executable.action)
    if (action.type === 'transfer') {
      return this.createTransferTransaction(executable)
    } else if (action.type === 'contract') {
      return this.createContractCallTransaction(executable)
    } else if (action.type === 'query') {
      throw new Error('WarpSuiExecutor: Invalid action type for createTransaction; Use executeQuery instead')
    } else if (action.type === 'collect') {
      throw new Error('WarpSuiExecutor: Invalid action type for createTransaction; Use executeCollect instead')
    }
    throw new Error(`WarpSuiExecutor: Invalid action type (${action.type})`)
  }

  async createTransferTransaction(executable: WarpExecutable): Promise<Transaction> {
    if (!this.config.user?.wallet) throw new Error('WarpSuiExecutor: createTransfer - user address not set')
    const tx = new Transaction()
    // SUI: transfer SUI to destination
    // For now, just use tx.gas as the coin to transfer
    const [coin] = tx.splitCoins(tx.gas, [tx.pure.u64(Number(executable.value))])
    tx.transferObjects([coin], tx.pure.address(executable.destination))
    return tx
  }

  private serializeArg(tx: Transaction, arg: any) {
    if (typeof arg === 'string' && arg.includes(':')) {
      const [type, raw] = arg.split(':', 2)
      switch (type) {
        case 'string':
          return tx.pure.string(raw)
        case 'bool':
          return tx.pure.bool(raw === 'true')
        case 'uint64':
          return tx.pure.u64(BigInt(raw))
        case 'address':
          return tx.pure.address(raw)
        default:
          throw new Error(`WarpSuiExecutor: Unsupported argument type: ${type}`)
      }
    }
    // fallback: try string
    return tx.pure.string(String(arg))
  }

  async createContractCallTransaction(executable: WarpExecutable): Promise<Transaction> {
    if (!this.config.user?.wallet) throw new Error('WarpSuiExecutor: createContractCall - user address not set')
    const action = getWarpActionByIndex(executable.warp, executable.action)
    const tx = new Transaction()
    // SUI: Move call
    tx.moveCall({
      target: (action as any).func,
      arguments: executable.args.map((arg: any) => this.serializeArg(tx, arg)),
    })
    return tx
  }

  async executeQuery(executable: WarpExecutable): Promise<WarpExecution> {
    const action = getWarpActionByIndex(executable.warp, executable.action) as WarpQueryAction
    if (action.type !== 'query') throw new Error(`WarpSuiExecutor: Invalid action type for executeQuery: ${action.type}`)
    // SUI: query contract state or object
    const result = await this.client.getObject({ id: executable.destination, options: { showContent: true } })
    const values = [result]
    const { values: extractedValues, results } = await this.results.extractQueryResults(
      executable.warp,
      values,
      executable.action,
      executable.resolvedInputs
    )
    const next = getNextInfo(this.config, executable.warp, executable.action, results)
    return {
      success: true,
      warp: executable.warp,
      action: executable.action,
      user: this.config.user?.wallet || null,
      txHash: null,
      next,
      values: extractedValues,
      results,
      messages: applyResultsToMessages(executable.warp, results),
    }
  }
}
