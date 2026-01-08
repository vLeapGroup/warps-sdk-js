import { Address } from '@multiversx/sdk-core/out'
import { WarpRegistryConfigInfo, WarpRegistryInfo } from '@joai/warps'

export const toTypedRegistryInfo = (registryInfo: any): WarpRegistryInfo => ({
  hash: registryInfo.hash.toString('hex'),
  alias: registryInfo.alias?.toString() || null,
  trust: registryInfo.trust.toString(),
  owner: registryInfo.owner.toString(),
  createdAt: registryInfo.created_at.toNumber(),
  upgradedAt: registryInfo.upgraded_at?.toNumber(),
  brand: registryInfo.brand?.toString('hex') || null,
  upgrade: registryInfo.upgrade?.toString('hex') || null,
})

export const toTypedConfigInfo = (configInfo: any): WarpRegistryConfigInfo => ({
  unitPrice: BigInt(configInfo.unit_price.toString()),
  admins: configInfo.admins.map((admin: Address) => admin.toBech32()),
})
