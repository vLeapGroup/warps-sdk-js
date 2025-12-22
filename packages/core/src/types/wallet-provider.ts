import { WarpClientConfig, WarpWalletDetails } from './config'
import { WarpChainInfo } from './warp'

export interface WalletProvider {
  getAddress(): Promise<string | null>
  getPublicKey(): Promise<string | null>
  signTransaction(tx: any): Promise<any>
  signMessage(message: string): Promise<string>
  create(mnemonic: string): WarpWalletDetails
  generate(): WarpWalletDetails
}

export type WalletProviderFactory = (config: WarpClientConfig, chain: WarpChainInfo) => WalletProvider | null
