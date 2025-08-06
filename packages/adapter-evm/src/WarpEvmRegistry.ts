import {
  AdapterWarpRegistry,
  WarpBrand,
  WarpCache,
  WarpCacheConfig,
  WarpCacheKey,
  WarpChain,
  WarpChainInfo,
  WarpClientConfig,
  WarpLogger,
  WarpRegistryConfigInfo,
  WarpRegistryInfo,
} from '@vleap/warps'
import { ethers } from 'ethers'
import { getEvmApiUrl, getEvmRegistryAddress } from './config'
import { WarpEvmConstants } from './constants'

const RegistryAbi = [
  'function registerWarp(bytes32 hash, string alias, bytes32 brand) external',
  'function unregisterWarp(bytes32 hash) external',
  'function upgradeWarp(string alias, bytes32 hash) external',
  'function setAlias(bytes32 hash, string alias) external',
  'function verifyWarp(bytes32 hash) external',
  'function transferOwnership(bytes32 hash, address newOwner) external',
  'function registerBrand(bytes32 hash) external',
  'function brandWarp(bytes32 warpHash, bytes32 brandHash) external',
  'function getWarpInfo(bytes32 hash) external view returns (address owner, string alias, bytes32 brand, bool verified)',
  'function getWarpInfoByAlias(string alias) external view returns (bytes32 hash, address owner, bytes32 brand, bool verified)',
  'function getBrandInfo(bytes32 hash) external view returns (address owner, bool verified)',
  'function getUserWarps(address user) external view returns (bytes32[] hashes)',
  'function getUserBrands(address user) external view returns (bytes32[] hashes)',
  'function getChainInfo(string chain) external view returns (string name, string chainId, uint256 blockTime, string addressHrp, string apiUrl, string explorerUrl, string nativeToken)',
  'function setChain(string name, string chainId, uint256 blockTime, string addressHrp, string apiUrl, string explorerUrl, string nativeToken) external',
  'function removeChain(string chain) external',
  'function getRegistryConfig() external view returns (uint256 unitPrice, address[] admins)',
]

export class WarpEvmRegistry implements AdapterWarpRegistry {
  private readonly provider: ethers.JsonRpcProvider
  private readonly cache: WarpCache
  private readonly contract: ethers.Contract
  public registryConfig: { unitPrice: bigint; admins: string[] } = { unitPrice: BigInt(0), admins: [] }
  private userWallet: string | null
  private readonly chainName: string

  constructor(
    private config: WarpClientConfig,
    chainName: string = 'ethereum'
  ) {
    this.provider = new ethers.JsonRpcProvider(getEvmApiUrl(config.env, chainName))
    this.cache = new WarpCache(config.cache?.type)
    this.contract = new ethers.Contract(getEvmRegistryAddress(config.env, chainName), RegistryAbi, this.provider)
    this.userWallet = this.config.user?.wallets?.[WarpEvmConstants.ChainName] || null
    this.chainName = chainName
  }

  async init(): Promise<void> {
    try {
      const config = await this.contract.getRegistryConfig()
      this.registryConfig = {
        unitPrice: config.unitPrice,
        admins: config.admins,
      }
    } catch (error) {
      WarpLogger.warn(`Failed to initialize EVM registry config for chain ${this.chainName}`, error)
    }
  }

  getRegistryConfig(): WarpRegistryConfigInfo {
    return {
      unitPrice: this.registryConfig.unitPrice,
      admins: this.registryConfig.admins,
    }
  }

  async createWarpRegisterTransaction(txHash: string, alias?: string | null, brand?: string | null): Promise<ethers.TransactionRequest> {
    if (!this.userWallet) throw new Error('User wallet not set')

    const hash = ethers.keccak256(ethers.toUtf8Bytes(txHash))
    const aliasParam = alias || ''
    const brandParam = brand ? ethers.keccak256(ethers.toUtf8Bytes(brand)) : ethers.ZeroHash

    const data = this.contract.interface.encodeFunctionData('registerWarp', [hash, aliasParam, brandParam])

    return {
      to: this.contract.target,
      data,
    }
  }

  async createWarpUnregisterTransaction(txHash: string): Promise<ethers.TransactionRequest> {
    if (!this.userWallet) throw new Error('User wallet not set')

    const hash = ethers.keccak256(ethers.toUtf8Bytes(txHash))
    const data = this.contract.interface.encodeFunctionData('unregisterWarp', [hash])

    return {
      to: this.contract.target,
      data,
    }
  }

  async createWarpUpgradeTransaction(alias: string, txHash: string): Promise<ethers.TransactionRequest> {
    if (!this.userWallet) throw new Error('User wallet not set')

    const hash = ethers.keccak256(ethers.toUtf8Bytes(txHash))
    const data = this.contract.interface.encodeFunctionData('upgradeWarp', [alias, hash])

    return {
      to: this.contract.target,
      data,
    }
  }

  async createWarpAliasSetTransaction(txHash: string, alias: string): Promise<ethers.TransactionRequest> {
    if (!this.userWallet) throw new Error('User wallet not set')

    const hash = ethers.keccak256(ethers.toUtf8Bytes(txHash))
    const data = this.contract.interface.encodeFunctionData('setAlias', [hash, alias])

    return {
      to: this.contract.target,
      data,
    }
  }

  async createWarpVerifyTransaction(txHash: string): Promise<ethers.TransactionRequest> {
    if (!this.userWallet) throw new Error('User wallet not set')

    const hash = ethers.keccak256(ethers.toUtf8Bytes(txHash))
    const data = this.contract.interface.encodeFunctionData('verifyWarp', [hash])

    return {
      to: this.contract.target,
      data,
    }
  }

  async createWarpTransferOwnershipTransaction(txHash: string, newOwner: string): Promise<ethers.TransactionRequest> {
    if (!this.userWallet) throw new Error('User wallet not set')

    const hash = ethers.keccak256(ethers.toUtf8Bytes(txHash))
    const data = this.contract.interface.encodeFunctionData('transferOwnership', [hash, newOwner])

    return {
      to: this.contract.target,
      data,
    }
  }

  async createBrandRegisterTransaction(txHash: string): Promise<ethers.TransactionRequest> {
    if (!this.userWallet) throw new Error('User wallet not set')

    const hash = ethers.keccak256(ethers.toUtf8Bytes(txHash))
    const data = this.contract.interface.encodeFunctionData('registerBrand', [hash])

    return {
      to: this.contract.target,
      data,
    }
  }

  async createWarpBrandingTransaction(warpHash: string, brandHash: string): Promise<ethers.TransactionRequest> {
    if (!this.userWallet) throw new Error('User wallet not set')

    const warpHashBytes = ethers.keccak256(ethers.toUtf8Bytes(warpHash))
    const brandHashBytes = ethers.keccak256(ethers.toUtf8Bytes(brandHash))
    const data = this.contract.interface.encodeFunctionData('brandWarp', [warpHashBytes, brandHashBytes])

    return {
      to: this.contract.target,
      data,
    }
  }

  async getInfoByAlias(
    alias: string,
    cache?: WarpCacheConfig
  ): Promise<{ registryInfo: WarpRegistryInfo | null; brand: WarpBrand | null }> {
    const cacheKey = WarpCacheKey.RegistryInfo(this.config.env, alias)
    const cached = this.cache.get<{ registryInfo: WarpRegistryInfo | null; brand: WarpBrand | null }>(cacheKey)
    if (cached && cache?.ttl) return cached

    try {
      const result = await this.contract.getWarpInfoByAlias(alias)
      const registryInfo: WarpRegistryInfo = {
        hash: result.hash,
        alias,
        owner: result.owner,
        trust: result.verified ? 'verified' : 'unverified',
        createdAt: Date.now(),
        upgradedAt: Date.now(),
        brand: result.brand !== ethers.ZeroHash ? result.brand : null,
        upgrade: null,
      }

      const brand = result.brand !== ethers.ZeroHash ? await this.fetchBrand(result.brand, cache) : null

      const response = { registryInfo, brand }
      if (cache?.ttl) this.cache.set(cacheKey, response, cache.ttl)
      return response
    } catch (error) {
      return { registryInfo: null, brand: null }
    }
  }

  async getInfoByHash(hash: string, cache?: WarpCacheConfig): Promise<{ registryInfo: WarpRegistryInfo | null; brand: WarpBrand | null }> {
    const cacheKey = WarpCacheKey.RegistryInfo(this.config.env, hash)
    const cached = this.cache.get<{ registryInfo: WarpRegistryInfo | null; brand: WarpBrand | null }>(cacheKey)
    if (cached && cache?.ttl) return cached

    try {
      const result = await this.contract.getWarpInfo(hash)
      const registryInfo: WarpRegistryInfo = {
        hash,
        alias: result.alias,
        owner: result.owner,
        trust: result.verified ? 'verified' : 'unverified',
        createdAt: Date.now(),
        upgradedAt: Date.now(),
        brand: result.brand !== ethers.ZeroHash ? result.brand : null,
        upgrade: null,
      }

      const brand = result.brand !== ethers.ZeroHash ? await this.fetchBrand(result.brand, cache) : null

      const response = { registryInfo, brand }
      if (cache?.ttl) this.cache.set(cacheKey, response, cache.ttl)
      return response
    } catch (error) {
      return { registryInfo: null, brand: null }
    }
  }

  async getUserWarpRegistryInfos(user?: string): Promise<WarpRegistryInfo[]> {
    const userAddress = user || this.userWallet
    if (!userAddress) throw new Error('User address not provided')

    try {
      const hashes = await this.contract.getUserWarps(userAddress)
      const registryInfos: WarpRegistryInfo[] = []

      for (const hash of hashes) {
        const { registryInfo } = await this.getInfoByHash(hash)
        if (registryInfo) {
          registryInfos.push(registryInfo)
        }
      }

      return registryInfos
    } catch (error) {
      return []
    }
  }

  async getUserBrands(user?: string): Promise<WarpBrand[]> {
    const userAddress = user || this.userWallet
    if (!userAddress) throw new Error('User address not provided')

    try {
      const hashes = await this.contract.getUserBrands(userAddress)
      const brands: WarpBrand[] = []

      for (const hash of hashes) {
        const brand = await this.fetchBrand(hash)
        if (brand) {
          brands.push(brand)
        }
      }

      return brands
    } catch (error) {
      return []
    }
  }

  async getChainInfos(cache?: WarpCacheConfig): Promise<WarpChainInfo[]> {
    const cacheKey = WarpCacheKey.ChainInfos(this.config.env)
    const cached = this.cache.get<WarpChainInfo[]>(cacheKey)
    if (cached && cache?.ttl) return cached

    try {
      const chains = ['ethereum', 'arbitrum', 'base']
      const chainInfos: WarpChainInfo[] = []

      for (const chain of chains) {
        try {
          const info = await this.contract.getChainInfo(chain)
          chainInfos.push({
            name: info.name,
            displayName: info.name,
            chainId: info.chainId,
            blockTime: Number(info.blockTime),
            addressHrp: info.addressHrp,
            apiUrl: info.apiUrl,
            explorerUrl: info.explorerUrl,
            nativeToken: info.nativeToken,
          })
        } catch (error) {
          // Skip chains that don't have info
        }
      }

      if (cache?.ttl) this.cache.set(cacheKey, chainInfos, cache.ttl)
      return chainInfos
    } catch (error) {
      return []
    }
  }

  async getChainInfo(chain: WarpChain, cache?: WarpCacheConfig): Promise<WarpChainInfo | null> {
    const cacheKey = WarpCacheKey.ChainInfo(this.config.env, chain)
    const cached = this.cache.get<WarpChainInfo>(cacheKey)
    if (cached && cache?.ttl) return cached

    try {
      const info = await this.contract.getChainInfo(chain)
      const chainInfo: WarpChainInfo = {
        name: info.name,
        displayName: info.name,
        chainId: info.chainId,
        blockTime: Number(info.blockTime),
        addressHrp: info.addressHrp,
        apiUrl: info.apiUrl,
        explorerUrl: info.explorerUrl,
        nativeToken: info.nativeToken,
      }

      if (cache?.ttl) this.cache.set(cacheKey, chainInfo, cache.ttl)
      return chainInfo
    } catch (error) {
      return null
    }
  }

  async setChain(info: WarpChainInfo): Promise<ethers.TransactionRequest> {
    if (!this.userWallet) throw new Error('User wallet not set')

    const data = this.contract.interface.encodeFunctionData('setChain', [
      info.name,
      info.chainId,
      info.blockTime,
      info.addressHrp,
      info.apiUrl,
      info.explorerUrl,
      info.nativeToken,
    ])

    return {
      to: this.contract.target,
      data,
    }
  }

  async removeChain(chain: WarpChain): Promise<ethers.TransactionRequest> {
    if (!this.userWallet) throw new Error('User wallet not set')

    const data = this.contract.interface.encodeFunctionData('removeChain', [chain])

    return {
      to: this.contract.target,
      data,
    }
  }

  async fetchBrand(hash: string, cache?: WarpCacheConfig): Promise<WarpBrand | null> {
    const cacheKey = WarpCacheKey.Brand(this.config.env, hash)
    const cached = this.cache.get<WarpBrand>(cacheKey)
    if (cached && cache?.ttl) return cached

    try {
      const result = await this.contract.getBrandInfo(hash)
      const brand: WarpBrand = {
        protocol: 'warp',
        name: `Brand ${hash}`,
        description: `Brand with hash ${hash}`,
        logo: '',
        meta: {
          hash,
          creator: result.owner,
          createdAt: new Date().toISOString(),
        },
      }

      if (cache?.ttl) this.cache.set(cacheKey, brand, cache.ttl)
      return brand
    } catch (error) {
      return null
    }
  }
}
