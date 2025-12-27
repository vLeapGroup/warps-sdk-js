import { WarpClientConfig, WarpWalletDetails } from './config'
import { WarpChainInfo } from './warp'

export interface WalletProvider {
  getAddress(): Promise<string | null>
  getPublicKey(): Promise<string | null>
  signTransaction(tx: any): Promise<any>
  signMessage(message: string): Promise<string>
  importFromMnemonic(mnemonic: string): Promise<WarpWalletDetails>
  importFromPrivateKey(privateKey: string): Promise<WarpWalletDetails>
  export(): Promise<WarpWalletDetails>
  generate(): Promise<WarpWalletDetails>
}

export type WalletProviderFactory = (config: WarpClientConfig, chain: WarpChainInfo) => WalletProvider | null
