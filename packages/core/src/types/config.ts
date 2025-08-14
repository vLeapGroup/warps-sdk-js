import { WarpBrand } from './brand'
import { WarpCacheType } from './cache'
import { WarpChainEnv } from './general'
import { WarpRegistryConfigInfo, WarpRegistryInfo } from './registry'
import { WarpExecution } from './results'
import {
  BaseWarpActionInputType,
  Warp,
  WarpAction,
  WarpActionInputType,
  WarpChain,
  WarpChainInfo,
  WarpExecutable,
  WarpExplorerName,
  WarpNativeValue,
} from './warp'

export type WarpUserWallets = Record<WarpChain, string | null>

export type WarpClientConfig = {
  env: WarpChainEnv
  clientUrl?: string
  currentUrl?: string
  vars?: Record<string, string | number>
  user?: {
    wallets?: WarpUserWallets
  }
  preferences?: {
    explorers?: Record<WarpChain, WarpExplorerName>
  }
  schema?: {
    warp?: string
    brand?: string
  }
  cache?: {
    ttl?: number
    type?: WarpCacheType
  }
  index?: {
    url?: string
    apiKey?: string
    searchParamName?: string
  }
}

export type WarpCacheConfig = {
  ttl?: number
}

export type AdapterFactory = (config: WarpClientConfig, fallback?: Adapter) => Adapter

export type Adapter = {
  chain: WarpChain
  chainInfo: WarpChainInfo
  prefix: string
  builder: () => CombinedWarpBuilder
  executor: AdapterWarpExecutor
  results: AdapterWarpResults
  serializer: AdapterWarpSerializer
  registry: AdapterWarpRegistry
  explorer: AdapterWarpExplorer
  abiBuilder: () => AdapterWarpAbiBuilder
  brandBuilder: () => AdapterWarpBrandBuilder
}

export type WarpAdapterGenericTransaction = any
export type WarpAdapterGenericRemoteTransaction = any
export type WarpAdapterGenericValue = any
export type WarpAdapterGenericType = any

export interface BaseWarpBuilder {
  createFromRaw(encoded: string): Promise<Warp>
  setTitle(title: string): BaseWarpBuilder
  setDescription(description: string): BaseWarpBuilder
  setPreview(preview: string): BaseWarpBuilder
  setActions(actions: WarpAction[]): BaseWarpBuilder
  addAction(action: WarpAction): BaseWarpBuilder
  build(): Promise<Warp>
}

export interface AdapterWarpBuilder {
  createInscriptionTransaction(warp: Warp): WarpAdapterGenericTransaction
  createFromTransaction(tx: WarpAdapterGenericTransaction, validate?: boolean): Promise<Warp>
  createFromTransactionHash(hash: string, cache?: WarpCacheConfig): Promise<Warp | null>
}

export type CombinedWarpBuilder = AdapterWarpBuilder & BaseWarpBuilder

export interface AdapterWarpAbiBuilder {
  createFromRaw(encoded: string): Promise<any>
  createFromTransaction(tx: WarpAdapterGenericTransaction): Promise<any>
  createFromTransactionHash(hash: string, cache?: WarpCacheConfig): Promise<any | null>
}

export interface AdapterWarpBrandBuilder {
  createInscriptionTransaction(brand: WarpBrand): WarpAdapterGenericTransaction
  createFromTransaction(tx: WarpAdapterGenericTransaction, validate?: boolean): Promise<WarpBrand>
  createFromTransactionHash(hash: string, cache?: WarpCacheConfig): Promise<WarpBrand | null>
}

export interface AdapterWarpExecutor {
  createTransaction(executable: WarpExecutable): Promise<WarpAdapterGenericTransaction>
  preprocessInput(chain: WarpChainInfo, input: string, type: WarpActionInputType, value: string): Promise<string>
  signMessage(message: string, privateKey: string): Promise<string>
}

export interface AdapterWarpResults {
  getTransactionExecutionResults(warp: Warp, tx: WarpAdapterGenericRemoteTransaction): Promise<WarpExecution>
}

export interface AdapterWarpSerializer {
  typedToString(value: WarpAdapterGenericValue): string
  typedToNative(value: WarpAdapterGenericValue): [WarpActionInputType, WarpNativeValue]
  nativeToTyped(type: WarpActionInputType, value: WarpNativeValue): WarpAdapterGenericValue
  nativeToType(type: BaseWarpActionInputType): WarpAdapterGenericType
  stringToTyped(value: string): WarpAdapterGenericValue
}

export interface AdapterWarpRegistry {
  init(): Promise<void>
  getRegistryConfig(): WarpRegistryConfigInfo
  createWarpRegisterTransaction(txHash: string, alias?: string | null, brand?: string | null): Promise<WarpAdapterGenericTransaction>
  createWarpUnregisterTransaction(txHash: string): Promise<WarpAdapterGenericTransaction>
  createWarpUpgradeTransaction(alias: string, txHash: string): Promise<WarpAdapterGenericTransaction>
  createWarpAliasSetTransaction(txHash: string, alias: string): Promise<WarpAdapterGenericTransaction>
  createWarpVerifyTransaction(txHash: string): Promise<WarpAdapterGenericTransaction>
  createWarpTransferOwnershipTransaction(txHash: string, newOwner: string): Promise<WarpAdapterGenericTransaction>
  createBrandRegisterTransaction(txHash: string): Promise<WarpAdapterGenericTransaction>
  createWarpBrandingTransaction(warpHash: string, brandHash: string): Promise<WarpAdapterGenericTransaction>
  getInfoByAlias(alias: string, cache?: WarpCacheConfig): Promise<{ registryInfo: WarpRegistryInfo | null; brand: WarpBrand | null }>
  getInfoByHash(hash: string, cache?: WarpCacheConfig): Promise<{ registryInfo: WarpRegistryInfo | null; brand: WarpBrand | null }>
  getUserWarpRegistryInfos(user?: string): Promise<WarpRegistryInfo[]>
  getUserBrands(user?: string): Promise<WarpBrand[]>
  fetchBrand(hash: string, cache?: WarpCacheConfig): Promise<WarpBrand | null>
}

export interface AdapterWarpExplorer {
  getAccountUrl(address: string): string
  getTransactionUrl(hash: string): string
}
