import {
  AdapterWarpExecutor,
  applyResultsToMessages,
  getNextInfo,
  getProviderUrl,
  getWarpActionByIndex,
  getWarpWalletAddressFromConfig,
  WarpChainAssetValue,
  WarpChainInfo,
  WarpClientConfig,
  WarpExecutable,
  WarpExecution,
  WarpQueryAction,
} from '@vleap/warps'
import { ethers } from 'ethers'
import { WarpEvmConstants } from './constants'
import { WarpEvmResults } from './WarpEvmResults'
import { WarpEvmSerializer } from './WarpEvmSerializer'

export class WarpEvmExecutor implements AdapterWarpExecutor {
  private readonly serializer: WarpEvmSerializer
  private readonly provider: ethers.JsonRpcProvider
  private readonly results: WarpEvmResults

  constructor(
    private readonly config: WarpClientConfig,
    private readonly chain: WarpChainInfo
  ) {
    this.serializer = new WarpEvmSerializer()
    const apiUrl = getProviderUrl(this.config, chain.name, this.config.env, this.chain.defaultApiUrl)
    const network = new ethers.Network(this.chain.name, parseInt(this.chain.chainId))
    this.provider = new ethers.JsonRpcProvider(apiUrl, network)
    this.results = new WarpEvmResults(config, this.chain)
  }

  async createTransaction(executable: WarpExecutable): Promise<ethers.TransactionRequest> {
    const action = getWarpActionByIndex(executable.warp, executable.action)

    let tx: ethers.TransactionRequest | null = null
    if (action.type === 'transfer') {
      tx = await this.createTransferTransaction(executable)
    } else if (action.type === 'contract') {
      tx = await this.createContractCallTransaction(executable)
    } else if (action.type === 'query') {
      throw new Error('WarpEvmExecutor: Invalid action type for createTransaction; Use executeQuery instead')
    } else if (action.type === 'collect') {
      throw new Error('WarpEvmExecutor: Invalid action type for createTransaction; Use executeCollect instead')
    }

    if (!tx) throw new Error(`WarpEvmExecutor: Invalid action type (${action.type})`)

    return tx
  }

  async createTransferTransaction(executable: WarpExecutable): Promise<ethers.TransactionRequest> {
    const userWallet = getWarpWalletAddressFromConfig(this.config, executable.chain.name)
    if (!userWallet) throw new Error('WarpEvmExecutor: createTransfer - user address not set')

    if (!ethers.isAddress(executable.destination)) {
      throw new Error(`WarpEvmExecutor: Invalid destination address: ${executable.destination}`)
    }

    if (executable.transfers && executable.transfers.length > 0) {
      return this.createTokenTransferTransaction(executable, userWallet)
    }

    const tx: ethers.TransactionRequest = {
      to: executable.destination,
      value: executable.value,
      data: executable.data ? this.serializer.stringToTyped(executable.data) : '0x',
    }

    return this.estimateGasAndSetDefaults(tx, userWallet)
  }

  async createContractCallTransaction(executable: WarpExecutable): Promise<ethers.TransactionRequest> {
    const userWallet = getWarpWalletAddressFromConfig(this.config, executable.chain.name)
    if (!userWallet) throw new Error('WarpEvmExecutor: createContractCall - user address not set')

    const action = getWarpActionByIndex(executable.warp, executable.action)
    if (!action || !('func' in action) || !action.func) throw new Error('WarpEvmExecutor: Contract action must have a function name')
    if (!ethers.isAddress(executable.destination)) throw new Error(`WarpEvmExecutor: Invalid contract address: ${executable.destination}`)

    try {
      let iface: ethers.Interface
      try {
        iface = new ethers.Interface(JSON.parse(action.abi as string))
      } catch {
        iface = new ethers.Interface([action.abi as string])
      }

      const nativeArgs = executable.args.map((arg) => this.serializer.coreSerializer.stringToNative(arg)[1])
      const encodedData = iface.encodeFunctionData(action.func, nativeArgs)

      const tx: ethers.TransactionRequest = {
        to: executable.destination,
        value: executable.value,
        data: encodedData,
      }

      return this.estimateGasAndSetDefaults(tx, userWallet)
    } catch (error) {
      throw new Error(`WarpEvmExecutor: Failed to encode function data for ${action.func}: ${error}`)
    }
  }

  private async createTokenTransferTransaction(executable: WarpExecutable, userWallet: string): Promise<ethers.TransactionRequest> {
    if (executable.transfers.length === 0) throw new Error('WarpEvmExecutor: No transfers provided')
    if (!this.chain.nativeToken?.identifier) throw new Error('WarpEvmExecutor: No native token defined for this chain')

    const nativeTokenTransfers = executable.transfers.filter((transfer) => transfer.identifier === this.chain.nativeToken!.identifier)
    const erc20Transfers = executable.transfers.filter((transfer) => transfer.identifier !== this.chain.nativeToken!.identifier)

    if (nativeTokenTransfers.length === 1 && erc20Transfers.length === 0) {
      const transfer = nativeTokenTransfers[0]

      if (transfer.amount <= 0n) throw new Error('WarpEvmExecutor: Native token transfer amount must be positive')

      const tx: ethers.TransactionRequest = {
        to: executable.destination,
        value: transfer.amount,
        data: '0x',
      }

      return this.estimateGasAndSetDefaults(tx, userWallet)
    }

    if (nativeTokenTransfers.length === 0 && erc20Transfers.length === 1) {
      return this.createSingleTokenTransfer(executable, erc20Transfers[0], userWallet)
    }

    if (executable.transfers.length > 1) throw new Error('WarpEvmExecutor: Multiple token transfers not yet supported')

    throw new Error('WarpEvmExecutor: Invalid transfer configuration')
  }

  private async createSingleTokenTransfer(
    executable: WarpExecutable,
    transfer: WarpChainAssetValue,
    userWallet: string
  ): Promise<ethers.TransactionRequest> {
    if (!ethers.isAddress(transfer.identifier)) {
      throw new Error(`WarpEvmExecutor: Invalid token address: ${transfer.identifier}`)
    }

    const transferInterface = new ethers.Interface(['function transfer(address to, uint256 amount) returns (bool)'])

    const encodedData = transferInterface.encodeFunctionData('transfer', [executable.destination, transfer.amount])

    const tx: ethers.TransactionRequest = {
      to: transfer.identifier,
      value: 0n,
      data: encodedData,
    }

    return this.estimateGasAndSetDefaults(tx, userWallet)
  }

  async executeQuery(executable: WarpExecutable): Promise<WarpExecution> {
    const action = getWarpActionByIndex(executable.warp, executable.action) as WarpQueryAction
    if (action.type !== 'query') throw new Error(`WarpEvmExecutor: Invalid action type for executeQuery: ${action.type}`)
    if (!action.func) throw new Error('WarpEvmExecutor: Query action must have a function name')
    if (!ethers.isAddress(executable.destination)) throw new Error(`WarpEvmExecutor: Invalid address for query: ${executable.destination}`)

    try {
      let iface: ethers.Interface
      try {
        iface = new ethers.Interface(JSON.parse(action.abi as string))
      } catch {
        iface = new ethers.Interface([action.abi as string])
      }

      const nativeArgs = executable.args.map((arg) => this.serializer.coreSerializer.stringToNative(arg)[1])
      const encodedData = iface.encodeFunctionData(action.func, nativeArgs)

      const result = await this.provider.call({
        to: executable.destination,
        data: encodedData,
      })

      const decodedResult = iface.decodeFunctionResult(action.func, result)
      const isSuccess = true

      const { values, results } = await this.results.extractQueryResults(
        executable.warp,
        decodedResult,
        executable.action,
        executable.resolvedInputs
      )

      const next = getNextInfo(this.config, [], executable.warp, executable.action, results)

      return {
        success: isSuccess,
        warp: executable.warp,
        action: executable.action,
        user: getWarpWalletAddressFromConfig(this.config, executable.chain.name),
        txHash: null,
        tx: null,
        next,
        values,
        results,
        messages: applyResultsToMessages(executable.warp, results),
      }
    } catch (error) {
      return {
        success: false,
        warp: executable.warp,
        action: executable.action,
        user: getWarpWalletAddressFromConfig(this.config, executable.chain.name),
        txHash: null,
        tx: null,
        next: null,
        values: { string: [], native: [] },
        results: {},
        messages: {},
      }
    }
  }

  private async estimateGasAndSetDefaults(tx: ethers.TransactionRequest, from: string): Promise<ethers.TransactionRequest> {
    try {
      const gasEstimate = await this.provider.estimateGas({
        ...tx,
        from,
      })

      if (gasEstimate < BigInt(WarpEvmConstants.Validation.MinGasLimit)) throw new Error(`Gas estimate too low: ${gasEstimate}`)
      if (gasEstimate > BigInt(WarpEvmConstants.Validation.MaxGasLimit)) throw new Error(`Gas estimate too high: ${gasEstimate}`)

      const feeData = await this.provider.getFeeData()

      // Handle both EIP-1559 and legacy gas pricing
      if (feeData.maxFeePerGas && feeData.maxPriorityFeePerGas) {
        // EIP-1559 pricing
        return {
          ...tx,
          chainId: BigInt(this.chain.chainId),
          gasLimit: gasEstimate,
          maxFeePerGas: feeData.maxFeePerGas,
          maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
        }
      } else if (feeData.gasPrice) {
        // Legacy pricing
        return {
          ...tx,
          chainId: BigInt(this.chain.chainId),
          gasLimit: gasEstimate,
          gasPrice: feeData.gasPrice,
        }
      } else {
        // Fallback to default values
        return {
          ...tx,
          chainId: BigInt(this.chain.chainId),
          gasLimit: gasEstimate,
          gasPrice: ethers.parseUnits(WarpEvmConstants.GasPrice.Default, 'wei'),
        }
      }
    } catch (error) {
      // If gas estimation fails, use default values based on transaction type
      let defaultGasLimit = BigInt(WarpEvmConstants.GasLimit.Default)

      // Determine gas limit based on transaction type
      if (tx.data && tx.data !== '0x') {
        // Check if this is a token transfer by looking for ERC-20 transfer function signature
        if (tx.data.startsWith('0xa9059cbb')) {
          // transfer(address,uint256) function signature
          defaultGasLimit = BigInt(WarpEvmConstants.GasLimit.TokenTransfer)
        } else {
          defaultGasLimit = BigInt(WarpEvmConstants.GasLimit.ContractCall)
        }
      } else {
        defaultGasLimit = BigInt(WarpEvmConstants.GasLimit.Transfer)
      }

      return {
        ...tx,
        chainId: BigInt(this.chain.chainId),
        gasLimit: defaultGasLimit,
        gasPrice: ethers.parseUnits(WarpEvmConstants.GasPrice.Default, 'wei'),
      }
    }
  }

  async verifyMessage(message: string, signature: string): Promise<string> {
    try {
      const recoveredAddress = ethers.verifyMessage(message, signature)
      return recoveredAddress
    } catch (error) {
      throw new Error(`Failed to verify message: ${error}`)
    }
  }
}
