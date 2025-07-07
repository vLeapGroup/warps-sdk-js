import { TransactionOnNetwork } from '@multiversx/sdk-core'
import { WarpAbi, WarpCache, WarpInitConfig } from '@vleap/warps-core'

export class WarpAbiBuilder {
  private config: WarpInitConfig
  private cache: WarpCache = new WarpCache()

  constructor(config: WarpInitConfig) {
    this.config = config
  }

  //   createInscriptionTransaction(abi: WarpAbiContents): Transaction {
  //     // TODO: use multiversxabi method
  //     return new Transaction()
  //   }

  async createFromRaw(encoded: string): Promise<WarpAbi> {
    // TODO: use multiversxabi method
    return JSON.parse(encoded) as WarpAbi
  }

  async createFromTransaction(tx: TransactionOnNetwork): Promise<WarpAbi> {
    // TODO: use multiversxabi method
    const abi = await this.createFromRaw(tx.data.toString())

    abi.meta = {
      hash: tx.hash,
      creator: tx.sender.bech32(),
      createdAt: new Date(tx.timestamp * 1000).toISOString(),
    }

    return abi
  }
}
