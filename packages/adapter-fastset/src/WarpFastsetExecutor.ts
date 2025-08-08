import {
  AdapterWarpExecutor,
  getWarpActionByIndex,
  WarpActionInputType,
  WarpChainInfo,
  WarpClientConfig,
  WarpExecutable,
  WarpQueryAction,
} from '@vleap/warps'
import { getFastsetApiUrl } from './config'
import { WarpFastsetSerializer } from './WarpFastsetSerializer'

export class WarpFastsetExecutor implements AdapterWarpExecutor {
  private readonly serializer: WarpFastsetSerializer

  constructor(private readonly config: WarpClientConfig) {
    this.serializer = new WarpFastsetSerializer()
  }

  async createTransaction(executable: WarpExecutable): Promise<any> {
    // TODO: Implement Fastset-specific transaction creation
    // This should create Fastset transactions based on the executable

    const action = getWarpActionByIndex(executable.warp, executable.action)

    let tx: any = null
    if (action.type === 'transfer') {
      tx = await this.createTransferTransaction(executable)
    } else if (action.type === 'contract') {
      tx = await this.createContractCallTransaction(executable)
    } else if (action.type === 'query') {
      throw new Error('WarpFastsetExecutor: Invalid action type for createTransaction; Use executeQuery instead')
    } else if (action.type === 'collect') {
      throw new Error('WarpFastsetExecutor: Invalid action type for createTransaction; Use executeCollect instead')
    }

    if (!tx) throw new Error(`WarpFastsetExecutor: Invalid action type (${action.type})`)

    return tx
  }

  async createTransferTransaction(executable: WarpExecutable): Promise<any> {
    // TODO: Implement Fastset-specific transfer transaction creation
    // This should create a Fastset transfer transaction

    const userWallet = this.config.user?.wallets?.[executable.chain.name]
    if (!userWallet) throw new Error('WarpFastsetExecutor: createTransfer - user address not set')

    // TODO: Add Fastset-specific address validation
    if (!this.isValidFastsetAddress(executable.destination)) {
      throw new Error(`WarpFastsetExecutor: Invalid destination address: ${executable.destination}`)
    }

    // TODO: Add Fastset-specific value validation
    if (executable.value < 0) {
      throw new Error(`WarpFastsetExecutor: Transfer value cannot be negative: ${executable.value}`)
    }

    return {
      type: 'fastset-transfer',
      from: userWallet,
      to: executable.destination,
      value: executable.value,
      data: executable.data ? this.serializer.stringToTyped(executable.data) : '',
      // TODO: Add Fastset-specific transaction fields
    }
  }

  async createContractCallTransaction(executable: WarpExecutable): Promise<any> {
    // TODO: Implement Fastset-specific contract call transaction creation
    // This should create a Fastset contract call transaction

    const userWallet = this.config.user?.wallets?.[executable.chain.name]
    if (!userWallet) throw new Error('WarpFastsetExecutor: createContractCall - user address not set')

    const action = getWarpActionByIndex(executable.warp, executable.action)
    if (!action || !('func' in action) || !action.func) {
      throw new Error('WarpFastsetExecutor: Contract action must have a function name')
    }

    // TODO: Add Fastset-specific address validation
    if (!this.isValidFastsetAddress(executable.destination)) {
      throw new Error(`WarpFastsetExecutor: Invalid contract address: ${executable.destination}`)
    }

    // TODO: Add Fastset-specific value validation
    if (executable.value < 0) {
      throw new Error(`WarpFastsetExecutor: Contract call value cannot be negative: ${executable.value}`)
    }

    try {
      // TODO: Implement Fastset-specific function encoding
      const encodedData = this.encodeFunctionData(action.func, executable.args)

      return {
        type: 'fastset-contract-call',
        from: userWallet,
        to: executable.destination,
        value: executable.value,
        data: encodedData,
        function: action.func,
        // TODO: Add Fastset-specific transaction fields
      }
    } catch (error) {
      throw new Error(`WarpFastsetExecutor: Failed to encode function data for ${action.func}: ${error}`)
    }
  }

  async executeQuery(executable: WarpExecutable): Promise<any> {
    // TODO: Implement Fastset-specific query execution
    // This should execute queries on Fastset blockchain

    const action = getWarpActionByIndex(executable.warp, executable.action) as WarpQueryAction
    if (action.type !== 'query') {
      throw new Error(`WarpFastsetExecutor: Invalid action type for executeQuery: ${action.type}`)
    }
    if (!action.func) {
      throw new Error('WarpFastsetExecutor: Query action must have a function name')
    }

    // TODO: Add Fastset-specific address validation
    if (!this.isValidFastsetAddress(executable.destination)) {
      throw new Error(`WarpFastsetExecutor: Invalid contract address for query: ${executable.destination}`)
    }

    try {
      // TODO: Implement Fastset-specific query execution
      const result = await this.executeFastsetQuery(executable.destination, action.func, executable.args)

      return {
        success: true,
        result,
        // TODO: Add Fastset-specific result fields
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        // TODO: Add Fastset-specific error fields
      }
    }
  }

  async preprocessInput(chain: WarpChainInfo, input: string, type: WarpActionInputType, value: string): Promise<string> {
    // TODO: Implement Fastset-specific input preprocessing
    // This should validate and preprocess inputs according to Fastset rules

    const typedValue = this.serializer.stringToTyped(value)

    switch (type) {
      case 'address':
        // TODO: Add Fastset-specific address validation
        if (!this.isValidFastsetAddress(typedValue)) {
          throw new Error(`Invalid Fastset address format: ${typedValue}`)
        }
        return typedValue
      case 'number':
        const numValue = Number(typedValue)
        if (isNaN(numValue)) {
          throw new Error(`Invalid number format: ${typedValue}`)
        }
        return numValue.toString()
      case 'bigint':
        const bigIntValue = BigInt(typedValue)
        if (bigIntValue < 0) {
          throw new Error(`Negative value not allowed for type ${type}: ${typedValue}`)
        }
        return bigIntValue.toString()
      default:
        return String(typedValue)
    }
  }

  private isValidFastsetAddress(address: string): boolean {
    // TODO: Implement Fastset-specific address validation
    // This should validate Fastset address format

    // Placeholder implementation - replace with Fastset-specific validation
    return typeof address === 'string' && address.length > 0
  }

  private encodeFunctionData(functionName: string, args: any[]): string {
    // TODO: Implement Fastset-specific function encoding
    // This should encode function calls according to Fastset's ABI format

    // Placeholder implementation - replace with Fastset-specific encoding
    return JSON.stringify({
      function: functionName,
      arguments: args,
    })
  }

  private async executeFastsetQuery(contractAddress: string, functionName: string, args: any[]): Promise<any> {
    // TODO: Implement Fastset-specific query execution
    // This should execute queries on Fastset blockchain

    // Placeholder implementation - replace with Fastset-specific RPC call
    const response = await fetch(`${getFastsetApiUrl(this.config.env, 'fastset')}/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contract: contractAddress,
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
}
