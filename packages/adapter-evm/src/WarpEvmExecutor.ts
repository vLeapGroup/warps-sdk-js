import {
  AdapterWarpExecutor,
  applyResultsToMessages,
  getNextInfo,
  getWarpActionByIndex,
  WarpActionInputType,
  WarpChainInfo,
  WarpClientConfig,
  WarpExecutable,
  WarpExecution,
  WarpQueryAction,
} from '@vleap/warps'
import { ethers } from 'ethers'
import { getEvmApiUrl } from './config'
import { WarpEvmConstants } from './constants'
import { getEvmAdapter } from './main'
import { WarpEvmResults } from './WarpEvmResults'
import { WarpEvmSerializer } from './WarpEvmSerializer'

export class WarpEvmExecutor implements AdapterWarpExecutor {
  private readonly serializer: WarpEvmSerializer
  private readonly provider: ethers.JsonRpcProvider
  private readonly results: WarpEvmResults

  constructor(private readonly config: WarpClientConfig) {
    this.serializer = new WarpEvmSerializer()
    this.provider = new ethers.JsonRpcProvider(getEvmApiUrl(config.env))
    this.results = new WarpEvmResults(config)
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
    const userWallet = this.config.user?.wallets?.[executable.chain.name]
    if (!userWallet) throw new Error('WarpEvmExecutor: createTransfer - user address not set')

    // Validate destination address
    if (!ethers.isAddress(executable.destination)) {
      throw new Error(`WarpEvmExecutor: Invalid destination address: ${executable.destination}`)
    }

    // Validate value
    if (executable.value < 0) {
      throw new Error(`WarpEvmExecutor: Transfer value cannot be negative: ${executable.value}`)
    }

    const tx: ethers.TransactionRequest = {
      to: executable.destination,
      value: executable.value,
      data: executable.data ? this.serializer.stringToTyped(executable.data) : '0x',
    }

    return this.estimateGasAndSetDefaults(tx, userWallet)
  }

  async createContractCallTransaction(executable: WarpExecutable): Promise<ethers.TransactionRequest> {
    const userWallet = this.config.user?.wallets?.[executable.chain.name]
    if (!userWallet) throw new Error('WarpEvmExecutor: createContractCall - user address not set')

    const action = getWarpActionByIndex(executable.warp, executable.action)
    if (!action || !('func' in action) || !action.func) {
      throw new Error('WarpEvmExecutor: Contract action must have a function name')
    }

    // Validate destination address
    if (!ethers.isAddress(executable.destination)) {
      throw new Error(`WarpEvmExecutor: Invalid contract address: ${executable.destination}`)
    }

    // Validate value
    if (executable.value < 0) {
      throw new Error(`WarpEvmExecutor: Contract call value cannot be negative: ${executable.value}`)
    }

    try {
      const iface = new ethers.Interface([`function ${action.func}`])
      const encodedData = iface.encodeFunctionData(action.func, executable.args)

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

  async executeQuery(executable: WarpExecutable): Promise<WarpExecution> {
    const action = getWarpActionByIndex(executable.warp, executable.action) as WarpQueryAction
    if (action.type !== 'query') {
      throw new Error(`WarpEvmExecutor: Invalid action type for executeQuery: ${action.type}`)
    }
    if (!action.func) {
      throw new Error('WarpEvmExecutor: Query action must have a function name')
    }

    // Validate destination address
    if (!ethers.isAddress(executable.destination)) {
      throw new Error(`WarpEvmExecutor: Invalid contract address for query: ${executable.destination}`)
    }

    try {
      const iface = new ethers.Interface([`function ${action.func}`])
      const encodedData = iface.encodeFunctionData(action.func, executable.args)

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

      const adapter = getEvmAdapter(this.config)
      const next = getNextInfo(this.config, adapter, executable.warp, executable.action, results)

      return {
        success: isSuccess,
        warp: executable.warp,
        action: executable.action,
        user: this.config.user?.wallets?.[executable.chain.name] || null,
        txHash: null,
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
        user: this.config.user?.wallets?.[executable.chain.name] || null,
        txHash: null,
        next: null,
        values: [],
        results: {},
        messages: {},
      }
    }
  }

  async preprocessInput(chain: WarpChainInfo, input: string, type: WarpActionInputType, value: string): Promise<string> {
    const typedValue = this.serializer.stringToTyped(value)

    switch (type) {
      case 'address':
        if (!ethers.isAddress(typedValue)) {
          throw new Error(`Invalid address format: ${typedValue}`)
        }
        return ethers.getAddress(typedValue)
      case 'hex':
        if (!ethers.isHexString(typedValue)) {
          throw new Error(`Invalid hex format: ${typedValue}`)
        }
        return typedValue
      case 'uint8':
      case 'uint16':
      case 'uint32':
      case 'uint64':
      case 'biguint':
        const bigIntValue = BigInt(typedValue)
        if (bigIntValue < 0) {
          throw new Error(`Negative value not allowed for type ${type}: ${typedValue}`)
        }
        return bigIntValue.toString()
      default:
        return String(typedValue)
    }
  }

  private async estimateGasAndSetDefaults(tx: ethers.TransactionRequest, from: string): Promise<ethers.TransactionRequest> {
    try {
      const gasEstimate = await this.provider.estimateGas({
        ...tx,
        from,
      })

      // Validate gas estimate
      if (gasEstimate < BigInt(WarpEvmConstants.Validation.MinGasLimit)) {
        throw new Error(`Gas estimate too low: ${gasEstimate}`)
      }
      if (gasEstimate > BigInt(WarpEvmConstants.Validation.MaxGasLimit)) {
        throw new Error(`Gas estimate too high: ${gasEstimate}`)
      }

      const feeData = await this.provider.getFeeData()

      // Handle both EIP-1559 and legacy gas pricing
      if (feeData.maxFeePerGas && feeData.maxPriorityFeePerGas) {
        // EIP-1559 pricing
        return {
          ...tx,
          gasLimit: gasEstimate,
          maxFeePerGas: feeData.maxFeePerGas,
          maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
        }
      } else if (feeData.gasPrice) {
        // Legacy pricing
        return {
          ...tx,
          gasLimit: gasEstimate,
          gasPrice: feeData.gasPrice,
        }
      } else {
        // Fallback to default values
        return {
          ...tx,
          gasLimit: gasEstimate,
          gasPrice: ethers.parseUnits(WarpEvmConstants.GasPrice.Default, 'wei'),
        }
      }
    } catch (error) {
      // If gas estimation fails, use default values based on transaction type
      let defaultGasLimit = BigInt(WarpEvmConstants.GasLimit.Default)

      // Determine gas limit based on transaction type
      if (tx.data && tx.data !== '0x') {
        defaultGasLimit = BigInt(WarpEvmConstants.GasLimit.ContractCall)
      } else {
        defaultGasLimit = BigInt(WarpEvmConstants.GasLimit.Transfer)
      }

      return {
        ...tx,
        gasLimit: defaultGasLimit,
        gasPrice: ethers.parseUnits(WarpEvmConstants.GasPrice.Default, 'wei'),
      }
    }
  }

  async signMessage(message: string, privateKey: string): Promise<string> {
    // EVM-specific ECDSA signing
    const { createSign } = await import('crypto')
    const sign = createSign('SHA256')
    sign.update(message)
    return sign.sign(privateKey, 'base64')
  }

  async createHttpAuthHeaders(walletAddress: string, privateKey: string, config: WarpClientConfig): Promise<Record<string, string>> {
    const { createAuthMessage, createAuthHeaders } = await import('@vleap/warps')

    const { message, nonce, expiresAt } = createAuthMessage(walletAddress, 'evm-adapter')

    // EVM-specific ECDSA signing
    const { createSign } = await import('crypto')
    const sign = createSign('SHA256')
    sign.update(message)
    const signature = sign.sign(privateKey, 'base64')

    return createAuthHeaders(walletAddress, signature, nonce, expiresAt)
  }
}
