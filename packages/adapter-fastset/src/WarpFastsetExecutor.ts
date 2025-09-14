import {
  AdapterWarpExecutor,
  getWarpActionByIndex,
  getWarpWalletAddressFromConfig,
  WarpChainInfo,
  WarpClientConfig,
  WarpExecutable,
} from '@vleap/warps'
import { FastsetClient, Transaction } from './sdk'

export class WarpFastsetExecutor implements AdapterWarpExecutor {
  private readonly fastsetClient: FastsetClient

  constructor(
    private readonly config: WarpClientConfig,
    private readonly chain: WarpChainInfo
  ) {
    this.fastsetClient = new FastsetClient({ proxyUrl: 'https://proxy.fastset.xyz' })
  }

  async createTransaction(executable: WarpExecutable): Promise<any> {
    const action = getWarpActionByIndex(executable.warp, executable.action)
    if (action.type === 'transfer') return this.createTransferTransaction(executable)
    if (action.type === 'contract') return this.createContractCallTransaction(executable)
    if (action.type === 'query') throw new Error('WarpFastsetExecutor: Invalid type for createTransaction; Use executeQuery instead')
    if (action.type === 'collect') throw new Error('WarpFastsetExecutor: Invalid type for createTransaction; Use executeCollect instead')
    throw new Error(`WarpFastsetExecutor: Invalid type (${action.type})`)
  }

  async createTransferTransaction(executable: WarpExecutable): Promise<Transaction> {
    const userWallet = getWarpWalletAddressFromConfig(this.config, executable.chain.name)
    if (!userWallet) throw new Error('WarpFastsetExecutor: User address not set')

    const senderAddress = FastsetClient.decodeBech32Address(userWallet)
    const recipientAddress = FastsetClient.decodeBech32Address(executable.destination)
    const nonce = await this.fastsetClient.getNextNonce(userWallet)

    // Get amount from transfers or value
    const amount = executable.transfers?.[0]?.amount ? '0x' + executable.transfers[0].amount.toString(16) : executable.value.toString()

    const userData = executable.data ? this.fromBase64(executable.data) : null

    const claim = { Transfer: { amount, user_data: userData } }
    return new Transaction(senderAddress, { FastSet: recipientAddress }, nonce, claim)
  }

  async createContractCallTransaction(executable: WarpExecutable): Promise<any> {
    const userWallet = this.config.user?.wallets?.[executable.chain.name]
    if (!userWallet) throw new Error('WarpFastsetExecutor: User address not set')
    const action = getWarpActionByIndex(executable.warp, executable.action)
    if (!action || !('func' in action) || !action.func) throw new Error('Contract action must have function name')

    return {
      type: 'fastset-contract-call',
      contract: this.fromBase64(executable.destination),
      function: action.func,
      data: JSON.stringify({ function: action.func, arguments: executable.args }),
      value: executable.value,
      chain: executable.chain,
    }
  }

  async executeQuery(executable: WarpExecutable): Promise<any> {
    const action = getWarpActionByIndex(executable.warp, executable.action) as any
    if (action.type !== 'query') throw new Error(`Invalid action type for executeQuery: ${action.type}`)

    try {
      const result = await this.executeFastsetQuery(this.fromBase64(executable.destination), action.func, executable.args)
      return { success: true, result, chain: executable.chain }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error), chain: executable.chain }
    }
  }

  async executeTransfer(executable: WarpExecutable): Promise<any> {
    const transaction = await this.createTransferTransaction(executable)
    return { success: true, transaction, chain: executable.chain.name }
  }

  async executeTransferWithKey(executable: WarpExecutable, privateKey: string): Promise<any> {
    const transaction = await this.createTransferTransaction(executable)
    const privateKeyBytes = this.fromBase64(privateKey)

    const transactionData = {
      sender: privateKeyBytes.slice(0, 32),
      recipient: transaction.getRecipientAddress(),
      nonce: await this.fastsetClient.getNextNonce(FastsetClient.encodeBech32Address(privateKeyBytes.slice(0, 32))),
      timestamp_nanos: BigInt(Date.now()) * 1_000_000n,
      claim: { Transfer: { amount: transaction.getAmount(), user_data: transaction.getUserData() } },
    }

    const signature = await this.signTransaction(transactionData, privateKeyBytes)
    const result = await this.fastsetClient.submitTransaction(transactionData, signature)

    return { success: true, result, message: 'Transaction submitted successfully', chain: executable.chain.name }
  }

  private async signTransaction(transaction: any, privateKey: Uint8Array): Promise<Uint8Array> {
    const wallet = new (await import('./sdk')).Wallet(Buffer.from(privateKey).toString('hex'))
    return wallet.signTransactionRaw(this.serializeTransaction(transaction))
  }

  private serializeTransaction(tx: any): Uint8Array {
    const serialized = JSON.stringify(tx, (k, v) => (v instanceof Uint8Array ? Array.from(v) : v))
    return new TextEncoder().encode(serialized)
  }

  private async executeFastsetQuery(contractAddress: Uint8Array, functionName: string, args: unknown[]): Promise<unknown> {
    const response = await fetch('https://proxy.fastset.xyz', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'set_proxy_query',
        params: { contract: Array.from(contractAddress), function: functionName, arguments: args },
        id: 1,
      }),
    })
    if (!response.ok) throw new Error(`Query failed: ${response.statusText}`)
    return response.json()
  }

  private fromBase64(base64: string): Uint8Array {
    return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
  }
}
