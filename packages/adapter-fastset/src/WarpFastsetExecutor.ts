import {
  AdapterWarpExecutor,
  getProviderUrl,
  getWarpActionByIndex,
  WarpActionInputType,
  WarpChainInfo,
  WarpClientConfig,
  WarpExecutable,
  WarpQueryAction,
} from '@vleap/warps'
import { getFastsetApiUrl } from './config'
import { FastsetClient, fromBase64, isValidFastsetAddress, normalizeAmount } from './sdk'
import { WarpFastsetSerializer } from './WarpFastsetSerializer'

export class WarpFastsetExecutor implements AdapterWarpExecutor {
  private readonly serializer: WarpFastsetSerializer
  private readonly fastsetClient: FastsetClient

  constructor(
    private readonly config: WarpClientConfig,
    private readonly chain: WarpChainInfo
  ) {
    this.serializer = new WarpFastsetSerializer()
    const apiUrl = getProviderUrl(this.config, chain.name, this.config.env, this.chain.defaultApiUrl)
    const proxyUrl = getProviderUrl(this.config, chain.name, this.config.env, this.chain.defaultApiUrl)
    this.fastsetClient = new FastsetClient({
      validatorUrl: apiUrl,
      proxyUrl: proxyUrl,
    })
  }

  async createTransaction(executable: WarpExecutable): Promise<any> {
    const action = getWarpActionByIndex(executable.warp, executable.action)

    switch (action.type) {
      case 'transfer':
        return this.createTransferTransaction(executable)
      case 'contract':
        return this.createContractCallTransaction(executable)
      case 'query':
        throw new Error('WarpFastsetExecutor: Invalid action type for createTransaction; Use executeQuery instead')
      case 'collect':
        throw new Error('WarpFastsetExecutor: Invalid action type for createTransaction; Use executeCollect instead')
      default:
        throw new Error(`WarpFastsetExecutor: Invalid action type (${action.type})`)
    }
  }

  async createTransferTransaction(executable: WarpExecutable): Promise<any> {
    const userWallet = this.config.user?.wallets?.[executable.chain.name]
    if (!userWallet) throw new Error('WarpFastsetExecutor: createTransfer - user address not set')

    if (!isValidFastsetAddress(executable.destination)) {
      throw new Error(`WarpFastsetExecutor: Invalid destination address: ${executable.destination}`)
    }

    if (executable.value < 0) {
      throw new Error(`WarpFastsetExecutor: Transfer value cannot be negative: ${executable.value}`)
    }

    const recipientAddress = fromBase64(executable.destination)
    const amount = normalizeAmount(executable.value.toString())
    const userData = executable.data ? fromBase64(this.serializer.stringToTyped(executable.data)) : undefined

    return {
      type: 'fastset-transfer',
      recipient: recipientAddress,
      amount,
      userData,
      chain: executable.chain,
    }
  }

  async createContractCallTransaction(executable: WarpExecutable): Promise<any> {
    const userWallet = this.config.user?.wallets?.[executable.chain.name]
    if (!userWallet) throw new Error('WarpFastsetExecutor: createContractCall - user address not set')

    const action = getWarpActionByIndex(executable.warp, executable.action)
    if (!action || !('func' in action) || !action.func) {
      throw new Error('WarpFastsetExecutor: Contract action must have a function name')
    }

    if (!isValidFastsetAddress(executable.destination)) {
      throw new Error(`WarpFastsetExecutor: Invalid contract address: ${executable.destination}`)
    }

    if (executable.value < 0) {
      throw new Error(`WarpFastsetExecutor: Contract call value cannot be negative: ${executable.value}`)
    }

    try {
      const contractAddress = fromBase64(executable.destination)
      const encodedData = this.encodeFunctionData(action.func, executable.args)

      return {
        type: 'fastset-contract-call',
        contract: contractAddress,
        function: action.func,
        data: encodedData,
        value: executable.value,
        chain: executable.chain,
      }
    } catch (error) {
      throw new Error(`WarpFastsetExecutor: Failed to encode function data for ${action.func}: ${error}`)
    }
  }

  async executeQuery(executable: WarpExecutable): Promise<any> {
    const action = getWarpActionByIndex(executable.warp, executable.action) as WarpQueryAction
    if (action.type !== 'query') {
      throw new Error(`WarpFastsetExecutor: Invalid action type for executeQuery: ${action.type}`)
    }
    if (!action.func) {
      throw new Error('WarpFastsetExecutor: Query action must have a function name')
    }

    if (!isValidFastsetAddress(executable.destination)) {
      throw new Error(`WarpFastsetExecutor: Invalid contract address for query: ${executable.destination}`)
    }

    try {
      const contractAddress = fromBase64(executable.destination)
      const result = await this.executeFastsetQuery(contractAddress, action.func, executable.args)

      return {
        success: true,
        result,
        chain: executable.chain,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        chain: executable.chain,
      }
    }
  }

  async preprocessInput(chain: WarpChainInfo, input: string, type: WarpActionInputType, value: string): Promise<string> {
    const typedValue = this.serializer.stringToTyped(value)

    switch (type) {
      case 'address':
        if (!isValidFastsetAddress(typedValue)) {
          throw new Error(`Invalid Fastset address format: ${typedValue}`)
        }
        return typedValue
      case 'hex':
        // Validate hex format (allow 0x prefix)
        const hexValue = typedValue.startsWith('0x') ? typedValue.slice(2) : typedValue
        if (!/^[0-9a-fA-F]+$/.test(hexValue)) {
          throw new Error(`Invalid hex format: ${typedValue}`)
        }
        return typedValue
      case 'number':
        const numValue = Number(typedValue)
        if (isNaN(numValue)) {
          throw new Error(`Invalid number format: ${typedValue}`)
        }
        return numValue.toString()
      case 'biguint':
        const bigIntValue = BigInt(typedValue)
        if (bigIntValue < 0) {
          throw new Error(`Negative value not allowed`)
        }
        return bigIntValue.toString()
      default:
        return String(typedValue)
    }
  }

  private encodeFunctionData(functionName: string, args: unknown[]): string {
    return JSON.stringify({
      function: functionName,
      arguments: args,
    })
  }

  private async executeFastsetQuery(contractAddress: Uint8Array, functionName: string, args: unknown[]): Promise<unknown> {
    const response = await fetch(`${getFastsetApiUrl(this.config.env, 'fastset')}/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contract: Array.from(contractAddress),
        function: functionName,
        arguments: args,
      }),
    })

    if (!response.ok) {
      throw new Error(`Fastset query failed: ${response.statusText}`)
    }

    return response.json()
  }

  async signMessage(message: string, privateKey: string): Promise<string> {
    throw new Error('Not implemented')
  }

  async executeTransfer(executable: WarpExecutable): Promise<any> {
    const userWallet = this.config.user?.wallets?.[executable.chain.name]
    if (!userWallet) throw new Error('WarpFastsetExecutor: executeTransfer - user wallet not set')

    const transaction = await this.createTransferTransaction(executable)

    return {
      success: true,
      transaction,
      chain: executable.chain.name,
      message: 'Transaction created successfully. Use executeTransferWithKey to execute with private key.',
    }
  }

  async executeTransferWithKey(executable: WarpExecutable, privateKey: string): Promise<any> {
    const userWallet = this.config.user?.wallets?.[executable.chain.name]
    if (!userWallet) throw new Error('WarpFastsetExecutor: executeTransfer - user wallet not set')

    const transaction = await this.createTransferTransaction(executable)
    const privateKeyBytes = fromBase64(privateKey)
    const transactionHash = await this.fastsetClient.executeTransfer(
      privateKeyBytes,
      transaction.recipient,
      transaction.amount,
      transaction.userData
    )

    return {
      success: true,
      transactionHash: Array.from(transactionHash),
      chain: executable.chain.name,
    }
  }
}
