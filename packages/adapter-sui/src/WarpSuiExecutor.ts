import { SuiClient } from '@mysten/sui/client'
import { Transaction } from '@mysten/sui/transactions'
import {
  AdapterWarpExecutor,
  applyResultsToMessages,
  getNextInfo,
  getProviderUrl,
  getWarpActionByIndex,
  getWarpWalletAddressFromConfig,
  WarpChainInfo,
  WarpClientConfig,
  WarpContractAction,
  WarpExecutable,
  WarpExecution,
  WarpQueryAction,
} from '@vleap/warps'
import { WarpSuiResults } from './WarpSuiResults'
import { WarpSuiSerializer } from './WarpSuiSerializer'

export class WarpSuiExecutor implements AdapterWarpExecutor {
  private readonly serializer: WarpSuiSerializer
  private readonly results: WarpSuiResults
  private readonly client: SuiClient
  private readonly userWallet: string | null

  constructor(
    private readonly config: WarpClientConfig,
    private readonly chain: WarpChainInfo
  ) {
    this.serializer = new WarpSuiSerializer()
    this.results = new WarpSuiResults(this.config, this.chain)
    const apiUrl = getProviderUrl(this.config, this.chain.name, this.config.env, this.chain.defaultApiUrl)
    this.client = new SuiClient({ url: apiUrl })
    this.userWallet = getWarpWalletAddressFromConfig(this.config, this.chain.name)
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

    if (!executable.destination) {
      throw new Error('WarpSuiExecutor: Invalid destination address')
    }

    if (executable.value < 0) {
      throw new Error(`WarpSuiExecutor: Transfer value cannot be negative: ${executable.value}`)
    }

    const tx = new Transaction()
    const transferObjects: any[] = []

    // Handle native SUI transfer from executable.value
    if (executable.value > 0) {
      const suiCoin = await this.handleCoinTransfer(tx, '0x2::sui::SUI', executable.value)
      transferObjects.push(suiCoin)
    }

    // Handle token transfers dynamically by querying coin objects
    for (const transfer of executable.transfers) {
      const tokenCoin = await this.handleCoinTransfer(tx, transfer.identifier, transfer.amount)
      transferObjects.push(tokenCoin)
    }

    if (transferObjects.length > 0) {
      tx.transferObjects(transferObjects, tx.pure.address(executable.destination))
    }

    return tx
  }

  async createContractCallTransaction(executable: WarpExecutable): Promise<Transaction> {
    if (!this.userWallet) throw new Error('WarpSuiExecutor: createContractCall - user address not set')

    const action = getWarpActionByIndex(executable.warp, executable.action) as WarpContractAction
    if (!action.func) throw new Error('WarpSuiExecutor: createContractCall - function not set')

    // Validate destination address
    if (!executable.destination || executable.destination.length === 0) {
      throw new Error('WarpSuiExecutor: Invalid contract address')
    }

    // Validate value
    if (executable.value < 0) {
      throw new Error(`WarpSuiExecutor: Contract call value cannot be negative: ${executable.value}`)
    }

    const tx = new Transaction()
    const transferObjects: any[] = []

    // Handle native SUI transfer from executable.value
    if (executable.value > 0) {
      const suiCoin = await this.handleCoinTransfer(tx, '0x2::sui::SUI', executable.value)
      transferObjects.push(suiCoin)
    }

    // Handle token transfers for contract calls
    for (const transfer of executable.transfers) {
      const tokenCoin = await this.handleCoinTransfer(tx, transfer.identifier, transfer.amount)
      transferObjects.push(tokenCoin)
    }

    // Transfer all objects to destination if any
    if (transferObjects.length > 0) {
      tx.transferObjects(transferObjects, tx.pure.address(executable.destination))
    }

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
    const next = getNextInfo(this.config, [], executable.warp, executable.action, results)
    return {
      success: true,
      warp: executable.warp,
      action: executable.action,
      user: this.userWallet,
      txHash: null,
      tx: null,
      next,
      values: extractedValues,
      valuesRaw: [],
      results,
      messages: applyResultsToMessages(executable.warp, results),
    }
  }

  async signMessage(message: string, privateKey: string): Promise<string> {
    throw new Error('Not implemented')
  }

  private async handleCoinTransfer(tx: Transaction, coinType: string, amount: bigint): Promise<any> {
    // For SUI transfers, try gas coin optimization first
    if (coinType === '0x2::sui::SUI') {
      const gasCoin = await this.tryGasCoinTransfer(tx, amount)
      if (gasCoin) return gasCoin
    }

    // Fall back to coin objects for any coin type
    return this.createCoinTransferFromObjects(tx, coinType, amount)
  }

  private async tryGasCoinTransfer(tx: Transaction, amount: bigint): Promise<any | null> {
    try {
      const [coin] = tx.splitCoins(tx.gas, [tx.pure.u64(amount.toString())])
      return coin
    } catch {
      // Gas coin doesn't have sufficient balance, fall back to coin objects
      return null
    }
  }

  private async createCoinTransferFromObjects(tx: Transaction, coinType: string, amount: bigint): Promise<any> {
    const coinObjects = await this.getCoinObjectsForTransfer(coinType, amount)

    if (coinObjects.length === 0) {
      throw new Error(`No coin objects found for ${coinType}`)
    }

    const firstCoin = coinObjects[0]
    const coinBalance = BigInt(firstCoin.balance)

    // Single coin has sufficient balance
    if (coinBalance >= amount) {
      const [coin] = tx.splitCoins(tx.object(firstCoin.coinObjectId), [tx.pure.u64(amount.toString())])
      return coin
    }

    // Multiple coins needed - merge then split
    const primaryCoin = tx.object(firstCoin.coinObjectId)
    const additionalCoins = coinObjects.slice(1).map((c) => tx.object(c.coinObjectId))

    if (additionalCoins.length > 0) {
      tx.mergeCoins(primaryCoin, additionalCoins)
    }

    const [coin] = tx.splitCoins(primaryCoin, [tx.pure.u64(amount.toString())])
    return coin
  }

  private async getCoinObjectsForTransfer(
    coinType: string,
    requiredAmount: bigint
  ): Promise<Array<{ coinObjectId: string; balance: string }>> {
    if (!this.userWallet) throw new Error('User wallet not set')

    const response = await this.client.getCoins({
      owner: this.userWallet,
      coinType: coinType,
    })

    // Sort by balance descending (largest coins first for efficiency)
    const sortedCoins = response.data
      .map((coin) => ({
        coinObjectId: coin.coinObjectId,
        balance: coin.balance,
      }))
      .sort((a, b) => (BigInt(b.balance) > BigInt(a.balance) ? 1 : -1))

    // Select minimum coins needed for the required amount
    const selectedCoins: Array<{ coinObjectId: string; balance: string }> = []
    let totalBalance = BigInt(0)

    for (const coin of sortedCoins) {
      selectedCoins.push(coin)
      totalBalance += BigInt(coin.balance)

      if (totalBalance >= requiredAmount) {
        break
      }
    }

    if (totalBalance < requiredAmount) {
      throw new Error(`Insufficient ${coinType} balance. Required: ${requiredAmount}, Available: ${totalBalance}`)
    }

    return selectedCoins
  }
}
