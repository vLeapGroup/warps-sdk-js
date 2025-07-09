import { WarpBrand } from './brand'
import { WarpCacheType } from './cache'
import { WarpChainEnv } from './general'
import { WarpRegistryInfo } from './registry'
import { WarpExecution } from './results'
import {
  BaseWarpActionInputType,
  Warp,
  WarpActionIndex,
  WarpActionInputType,
  WarpChain,
  WarpChainInfo,
  WarpExecutable,
  WarpNativeValue,
} from './warp'

export type WarpInitConfig = {
  env: WarpChainEnv
  repository: Adapter
  adapters: Adapter[]
  preferredChain?: WarpChain
  clientUrl?: string
  currentUrl?: string
  vars?: Record<string, string | number>
  user?: {
    wallet?: string
  }
  schema?: {
    warp?: string
    brand?: string
  }
  cache?: {
    ttl?: number
    type?: WarpCacheType
  }
  registry?: {
    contract?: string
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

export type Adapter = {
  chain: WarpChain
  builder: AdapterWarpBuilderConstructor
  executor: AdapterWarpExecutorConstructor
  results: AdapterWarpResultsConstructor
  serializer: AdapterWarpSerializerConstructor
  registry: AdapterWarpRegistryConstructor
}

export type WarpAdapterGenericTransaction = any
export type WarpAdapterGenericRemoteTransaction = any
export type WarpAdapterGenericValue = any
export type WarpAdapterGenericType = any

export interface AdapterWarpBuilderConstructor {
  new (config: WarpInitConfig): AdapterWarpBuilder
}

export interface AdapterWarpBuilder {
  createInscriptionTransaction(warp: Warp): WarpAdapterGenericTransaction
  createFromTransaction(tx: WarpAdapterGenericTransaction, validate?: boolean): Promise<Warp>
  createFromTransactionHash(hash: string, cache?: WarpCacheConfig): Promise<Warp | null>
}

export interface AdapterWarpExecutorConstructor {
  new (config: WarpInitConfig): AdapterWarpExecutor
}

export interface AdapterWarpExecutor {
  createTransaction(executable: WarpExecutable): Promise<WarpAdapterGenericTransaction>
  preprocessInput(chain: WarpChainInfo, input: string, type: WarpActionInputType, value: string): Promise<string>
}

export interface AdapterWarpResultsConstructor {
  new (config: WarpInitConfig): AdapterWarpResults
}

export interface AdapterWarpResults {
  getTransactionExecutionResults(warp: Warp, actionIndex: WarpActionIndex, tx: WarpAdapterGenericRemoteTransaction): Promise<WarpExecution>
}

export interface AdapterWarpSerializerConstructor {
  new (): AdapterWarpSerializer
}

export interface AdapterWarpSerializer {
  typedToString(value: WarpAdapterGenericValue): string
  typedToNative(value: WarpAdapterGenericValue): [WarpActionInputType, WarpNativeValue]
  nativeToTyped(type: WarpActionInputType, value: WarpNativeValue): WarpAdapterGenericValue
  nativeToType(type: BaseWarpActionInputType): WarpAdapterGenericType
  stringToTyped(value: string): WarpAdapterGenericValue
}

export interface AdapterWarpRegistryConstructor {
  new (config: WarpInitConfig): AdapterWarpRegistry
}

export interface AdapterWarpRegistry {
  createWarpRegisterTransaction(txHash: string, alias?: string | null, brand?: string | null): WarpAdapterGenericTransaction
  createWarpUnregisterTransaction(txHash: string): WarpAdapterGenericTransaction
  createWarpUpgradeTransaction(alias: string, txHash: string): WarpAdapterGenericTransaction
  createWarpAliasSetTransaction(txHash: string, alias: string): WarpAdapterGenericTransaction
  createWarpVerifyTransaction(txHash: string): WarpAdapterGenericTransaction
  createWarpTransferOwnershipTransaction(txHash: string, newOwner: string): WarpAdapterGenericTransaction
  createBrandRegisterTransaction(txHash: string): WarpAdapterGenericTransaction
  createWarpBrandingTransaction(warpHash: string, brandHash: string): WarpAdapterGenericTransaction
  getInfoByAlias(alias: string, cache?: WarpCacheConfig): Promise<{ registryInfo: WarpRegistryInfo | null; brand: WarpBrand | null }>
  getInfoByHash(hash: string, cache?: WarpCacheConfig): Promise<{ registryInfo: WarpRegistryInfo | null; brand: WarpBrand | null }>
  getUserWarpRegistryInfos(user?: string): Promise<WarpRegistryInfo[]>
  getUserBrands(user?: string): Promise<WarpBrand[]>
  getChainInfos(cache?: WarpCacheConfig): Promise<WarpChainInfo[]>
  getChainInfo(chain: WarpChain, cache?: WarpCacheConfig): Promise<WarpChainInfo | null>
  setChain(info: WarpChainInfo): Promise<WarpAdapterGenericTransaction>
  removeChain(chain: WarpChain): Promise<WarpAdapterGenericTransaction>
  fetchBrand(hash: string, cache?: WarpCacheConfig): Promise<WarpBrand | null>
}
