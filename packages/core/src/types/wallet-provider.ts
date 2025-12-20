import { WarpChainInfo } from './warp'
import { WarpClientConfig } from './config'

export interface WalletProvider {
  getAddress(): Promise<string | null>
  getPublicKey(): Promise<string | null>
  signTransaction(tx: any): Promise<any>
  signMessage(message: string): Promise<string>
}

export type WalletProviderFactory = (config: WarpClientConfig, chain: WarpChainInfo) => WalletProvider | null
