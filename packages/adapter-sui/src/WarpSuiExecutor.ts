import { SuiClient } from '@mysten/sui/client'
import { Transaction } from '@mysten/sui/transactions'
import {
  AdapterWarpExecutor,
  applyResultsToMessages,
  getNextInfo,
  getWarpActionByIndex,
  WarpActionInputType,
  WarpChainInfo,
  WarpClientConfig,
  WarpContractAction,
  WarpExecutable,
  WarpExecution,
  WarpQueryAction,
} from '@vleap/warps'
import { WarpSuiResults } from './WarpSuiResults'
import { WarpSuiSerializer } from './WarpSuiSerializer'
import { WarpSuiConstants } from './constants'

export class WarpSuiExecutor implements AdapterWarpExecutor {
  private readonly serializer: WarpSuiSerializer
  private readonly results: WarpSuiResults
  private readonly client: SuiClient
  private readonly userWallet: string | null

  constructor(private readonly config: WarpClientConfig) {
    this.serializer = new WarpSuiSerializer()
    this.results = new WarpSuiResults(this.config)
    this.client = new SuiClient({ url: this.config.currentUrl! })
    this.userWallet = this.config.user?.wallets?.[WarpSuiConstants.ChainName] || null
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
    if (!this.userWallet) throw new Error('WarpSuiExecutor: createTransfer - user address not set')
    const tx = new Transaction()
    const [coin] = tx.splitCoins(tx.gas, [tx.pure.u64(Number(executable.value))])
    tx.transferObjects([coin], tx.pure.address(executable.destination))
    return tx
  }

  async createContractCallTransaction(executable: WarpExecutable): Promise<Transaction> {
    if (!this.userWallet) throw new Error('WarpSuiExecutor: createContractCall - user address not set')
    const action = getWarpActionByIndex(executable.warp, executable.action) as WarpContractAction
    if (!action.func) throw new Error('WarpSuiExecutor: createContractCall - function not set')
    const tx = new Transaction()
    const target = `${action.address}::${action.func}`
    const pureArgs = executable.args.map((arg) => this.serializer.stringToTyped(arg, tx))
    tx.moveCall({ target, arguments: pureArgs })
    return tx
  }

  async executeQuery(executable: WarpExecutable): Promise<WarpExecution> {
    const action = getWarpActionByIndex(executable.warp, executable.action) as WarpQueryAction
    if (action.type !== 'query') throw new Error(`WarpSuiExecutor: Invalid action type for executeQuery: ${action.type}`)
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
      user: this.userWallet,
      txHash: null,
      next,
      values: extractedValues,
      results,
      messages: applyResultsToMessages(executable.warp, results),
    }
  }

  async preprocessInput(chain: WarpChainInfo, input: string, type: WarpActionInputType, value: string): Promise<string> {
    return input
  }
}
