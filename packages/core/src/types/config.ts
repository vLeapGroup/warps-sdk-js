import { WarpAbiContents } from './abi'
import { WarpBrand } from './brand'
import { ClientCacheConfig } from './cache'
import { WarpChainAccount, WarpChainAction, WarpChainAsset } from './chain'
import { WarpChainEnv } from './general'
import { WarpRegistryConfigInfo, WarpRegistryInfo } from './registry'
import { WarpExecution } from './results'
import { ClientIndexConfig } from './search'
import { ClientTransformConfig } from './transform'
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

export type WarpProviderConfig = Record<WarpChainEnv, string>

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
  providers?: Record<WarpChain, WarpProviderConfig>
  schema?: {
    warp?: string
    brand?: string
  }
  cache?: ClientCacheConfig
  transform?: ClientTransformConfig
  index?: ClientIndexConfig
}

export type WarpCacheConfig = {
  ttl?: number
}

export type AdapterFactory = (config: WarpClientConfig, fallback?: Adapter) => Adapter

export type Adapter = {
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
  dataLoader: AdapterWarpDataLoader
  // Optional method for registering adapter-specific types
  registerTypes?: (typeRegistry: WarpTypeRegistry) => void
}

export type WarpAdapterGenericTransaction = any
export type WarpAdapterGenericRemoteTransaction = any
export type WarpAdapterGenericValue = any
export type WarpAdapterGenericType = any

// Type handler for adapter-specific types
export interface WarpTypeHandler {
  // Convert string value to native value (e.g., "TOKEN-123456" -> "TOKEN-123456")
  stringToNative(value: string): any
  // Convert native value to string (e.g., "TOKEN-123456" -> "token:TOKEN-123456")
  nativeToString(value: any): string
}

// Registry for adapter-specific types
export interface WarpTypeRegistry {
  // Register a custom type handler for a specific type
  registerType(typeName: string, handler: WarpTypeHandler): void
  // Check if a type is registered
  hasType(typeName: string): boolean
  // Get handler for a type
  getHandler(typeName: string): WarpTypeHandler | undefined
  // Get all registered type names
  getRegisteredTypes(): string[]
}

export interface BaseWarpBuilder {
  createFromRaw(encoded: string, validate?: boolean): Promise<Warp>
  createFromUrl(url: string): Promise<Warp>
  setName(name: string): BaseWarpBuilder
  setTitle(title: string): BaseWarpBuilder
  setDescription(description: string): BaseWarpBuilder
  setPreview(preview: string): BaseWarpBuilder
  setActions(actions: WarpAction[]): BaseWarpBuilder
  addAction(action: WarpAction): BaseWarpBuilder
  build(): Promise<Warp>
}

export interface AdapterWarpBuilder {
  createInscriptionTransaction(warp: Warp): Promise<WarpAdapterGenericTransaction>
  createFromTransaction(tx: WarpAdapterGenericTransaction, validate?: boolean): Promise<Warp>
  createFromTransactionHash(hash: string, cache?: WarpCacheConfig): Promise<Warp | null>
}

export type CombinedWarpBuilder = AdapterWarpBuilder & BaseWarpBuilder

export interface AdapterWarpAbiBuilder {
  createInscriptionTransaction(abi: WarpAbiContents): Promise<WarpAdapterGenericTransaction>
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
  executeQuery(executable: WarpExecutable): Promise<WarpExecution>
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
  getAssetUrl(identifier: string): string
  getContractUrl(address: string): string
}

export interface WarpDataLoaderOptions {
  page?: number
  size?: number
}

export interface AdapterWarpDataLoader {
  getAccount(address: string): Promise<WarpChainAccount>
  getAccountAssets(address: string): Promise<WarpChainAsset[]>
  getAsset(identifier: string): Promise<WarpChainAsset | null>
  getAction(identifier: string, awaitCompleted?: boolean): Promise<WarpChainAction | null>
  getAccountActions(address: string, options?: WarpDataLoaderOptions): Promise<WarpChainAction[]>
}
