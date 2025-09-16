import {
  AdapterWarpExecutor,
  getWarpActionByIndex,
  getWarpWalletAddressFromConfig,
  WarpAdapterGenericTransaction,
  WarpChainInfo,
  WarpClientConfig,
  WarpExecutable,
} from '@vleap/warps'
import { getConfiguredFastsetClient } from './helpers'
import { FastsetClient } from './sdk'

export class WarpFastsetExecutor implements AdapterWarpExecutor {
  private readonly client: FastsetClient

  constructor(
    private readonly config: WarpClientConfig,
    private readonly chain: WarpChainInfo
  ) {
    this.client = getConfiguredFastsetClient(this.config, this.chain)
  }

  async createTransaction(executable: WarpExecutable): Promise<any> {
    const action = getWarpActionByIndex(executable.warp, executable.action)
    if (action.type === 'transfer') return this.createTransferTransaction(executable)
    if (action.type === 'contract') return this.createContractCallTransaction(executable)
    if (action.type === 'query') throw new Error('WarpFastsetExecutor: Invalid action type for createTransaction; Use executeQuery instead')
    if (action.type === 'collect')
      throw new Error('WarpFastsetExecutor: Invalid action type for createTransaction; Use executeCollect instead')
    throw new Error(`WarpFastsetExecutor: Invalid action type (${action.type})`)
  }

  async createTransferTransaction(executable: WarpExecutable): Promise<WarpAdapterGenericTransaction> {
    const userWallet = getWarpWalletAddressFromConfig(this.config, executable.chain.name)
    if (!userWallet) throw new Error('WarpFastsetExecutor: createTransfer - user address not set')
    const senderPubKey = FastsetClient.decodeBech32Address(userWallet)
    const recipientPubKey = FastsetClient.decodeBech32Address(executable.destination)
    const nonce = await this.client.getNextNonce(userWallet)

    const nativeAmountInTransfers =
      executable.transfers.find((transfer) => transfer.identifier === this.chain.nativeToken?.identifier)?.amount || 0n

    const nativeAmountTotal = nativeAmountInTransfers + executable.value
    const amountHex = BigInt(nativeAmountTotal).toString(16)

    return {
      sender: senderPubKey,
      recipient: { FastSet: recipientPubKey },
      nonce,
      timestamp_nanos: BigInt(Date.now()) * 1_000_000n,
      claim: { Transfer: { amount: amountHex, user_data: null } },
    }
  }

  async createContractCallTransaction(executable: WarpExecutable): Promise<any> {
    throw new Error('WarpFastsetExecutor: Not implemented')
  }

  async executeQuery(executable: WarpExecutable): Promise<any> {
    throw new Error('WarpFastsetExecutor: Not implemented')
  }
}
