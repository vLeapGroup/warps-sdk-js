import { WalletProvider, WarpWalletDetails } from '@vleap/warps'
import { getWarpWalletAddressFromConfig, WarpChainInfo, WarpClientConfig } from '@vleap/warps'

export class ReadOnlyWalletProvider implements WalletProvider {
  constructor(
    private config: WarpClientConfig,
    private chain: WarpChainInfo
  ) {}

  async getAddress(): Promise<string | null> {
    return getWarpWalletAddressFromConfig(this.config, this.chain.name)
  }

  async getPublicKey(): Promise<string | null> {
    return getWarpWalletAddressFromConfig(this.config, this.chain.name)
  }

  async signTransaction(tx: any): Promise<any> {
    const address = await this.getAddress()
    throw new Error(`Wallet can not be used for signing: ${address}`)
  }

  async signMessage(message: string): Promise<string> {
    const address = await this.getAddress()
    throw new Error(`Wallet can not be used for signing: ${address}`)
  }

  create(mnemonic: string): WarpWalletDetails {
    const address = getWarpWalletAddressFromConfig(this.config, this.chain.name)
    throw new Error(`Wallet can not be used for signing: ${address}`)
  }

  generate(): WarpWalletDetails {
    const address = getWarpWalletAddressFromConfig(this.config, this.chain.name)
    throw new Error(`Wallet can not be used for signing: ${address}`)
  }
}
