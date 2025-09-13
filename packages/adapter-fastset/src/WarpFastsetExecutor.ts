import * as ed25519 from '@noble/ed25519'
import {
  AdapterWarpExecutor,
  getProviderUrl,
  getWarpActionByIndex,
  getWarpWalletAddressFromConfig,
  WarpChainInfo,
  WarpClientConfig,
  WarpExecutable,
  WarpQueryAction,
} from '@vleap/warps'
import { FastsetClient, TransactionData } from './sdk/FastsetClient'
import { Wallet } from './sdk/Wallet'
import { WarpFastsetSerializer } from './WarpFastsetSerializer'

export class WarpFastsetExecutor implements AdapterWarpExecutor {
  private readonly serializer: WarpFastsetSerializer
  private readonly fastsetClient: FastsetClient

  constructor(
    private readonly config: WarpClientConfig,
    private readonly chain: WarpChainInfo
  ) {
    this.serializer = new WarpFastsetSerializer()
    const proxyUrl = getProviderUrl(this.config, chain.name, this.config.env, this.chain.defaultApiUrl)
    this.fastsetClient = new FastsetClient({
      proxyUrl,
    })
  }

  async createTransaction(executable: WarpExecutable): Promise<any> {
    const action = getWarpActionByIndex(executable.warp, executable.action)
    if (action.type === 'transfer') return this.createTransferTransaction(executable)
    if (action.type === 'contract') return this.createContractCallTransaction(executable)
    if (action.type === 'query') throw new Error('WarpFastsetExecutor: Invalid type for createTransaction; Use executeQuery instead')
    if (action.type === 'collect') throw new Error('WarpFastsetExecutor: Invalid type for createTransaction; Use executeCollect instead')
    throw new Error(`WarpFastsetExecutor: Invalid type (${action.type})`)
  }

  async createTransferTransaction(executable: WarpExecutable): Promise<any> {
    const userWallet = getWarpWalletAddressFromConfig(this.config, executable.chain.name)
    if (!userWallet) throw new Error('WarpFastsetExecutor: createTransfer - user address not set')
    console.log('createTransferTransaction - userWallet', userWallet, executable)
    if (!this.isValidAddress(executable.destination)) throw new Error(`WarpFastsetExecutor: Invalid destination: ${executable.destination}`)
    if (executable.value < 0) throw new Error(`WarpFastsetExecutor: Negative transfer value: ${executable.value}`)

    const recipientAddress = this.fromBase64(executable.destination)
    const amount = this.normalizeAmount(executable.value.toString())
    const userData = executable.data ? this.fromBase64(this.serializer.stringToTyped(executable.data)) : undefined

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
    if (!action || !('func' in action) || !action.func) throw new Error('WarpFastsetExecutor: Contract action must have a function name')
    if (!this.isValidAddress(executable.destination)) throw new Error(`WarpFastsetExecutor: Invalid address: ${executable.destination}`)
    if (executable.value < 0) throw new Error(`WarpFastsetExecutor: Contract call value cannot be negative: ${executable.value}`)

    try {
      const contractAddress = this.fromBase64(executable.destination)
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
    if (action.type !== 'query') throw new Error(`WarpFastsetExecutor: Invalid action type for executeQuery: ${action.type}`)
    if (!action.func) throw new Error('WarpFastsetExecutor: Query action must have a function name')
    if (!this.isValidAddress(executable.destination)) throw new Error(`WarpFastsetExecutor: Invalid address: ${executable.destination}`)

    try {
      const contractAddress = this.fromBase64(executable.destination)
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

  async signMessage(message: string, privateKey: string): Promise<string> {
    throw new Error('Not implemented')
  }

  private async signTransaction(transaction: TransactionData, privateKey: Uint8Array): Promise<Uint8Array> {
    const transactionJson = JSON.stringify(transaction, (key, value) => {
      if (value instanceof Uint8Array) {
        return Array.from(value)
      }
      return value
    })

    const prefix = 'Transaction::'
    const dataToSign = new TextEncoder().encode(prefix + transactionJson)

    return await ed25519.sign(dataToSign, privateKey)
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
    const privateKeyBytes = this.fromBase64(privateKey)
    // Create transaction data for the new API
    const transactionData = {
      sender: Array.from(privateKeyBytes.slice(0, 32)), // First 32 bytes as public key
      recipient: { FastSet: transaction.recipient },
      nonce: await this.fastsetClient.getNextNonce(Wallet.encodeBech32Address(privateKeyBytes.slice(0, 32))),
      timestamp_nanos: (BigInt(Date.now()) * 1_000_000n).toString(),
      claim: {
        Transfer: {
          recipient: { FastSet: transaction.recipient },
          amount: transaction.amount,
          user_data: transaction.userData ? Array.from(transaction.userData as Uint8Array) : null,
        },
      },
    }

    const signature = await this.signTransaction(transactionData, privateKeyBytes)
    const transactionHash = await this.fastsetClient.submitTransaction(transactionData, signature)

    return {
      success: true,
      transactionHash: Array.from(transactionHash),
      chain: executable.chain.name,
    }
  }

  private encodeFunctionData(functionName: string, args: unknown[]): string {
    return JSON.stringify({
      function: functionName,
      arguments: args,
    })
  }

  private async executeFastsetQuery(contractAddress: Uint8Array, functionName: string, args: unknown[]): Promise<unknown> {
    const validatorUrl = getProviderUrl(this.config, this.chain.name, this.config.env, this.chain.defaultApiUrl)
    const response = await fetch(`${validatorUrl}/query`, {
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

  private isValidAddress(address: string): boolean {
    if (typeof address !== 'string' || address.length === 0) return false
    try {
      const decoded = Wallet.decodeBech32Address(address)
      return decoded.length === 32
    } catch {
      return false
    }
  }

  private fromBase64(base64: string): Uint8Array {
    return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
  }

  private normalizeAmount(amount: string): string {
    return amount.startsWith('0x') ? amount.slice(2) : amount
  }
}
