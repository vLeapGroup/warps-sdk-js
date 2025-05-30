import { Address } from '@multiversx/sdk-core/out'
import { ConfigInfo, RegistryInfo } from '../types'

export const toTypedRegistryInfo = (registryInfo: any): RegistryInfo => ({
  hash: registryInfo.hash.toString('hex'),
  alias: registryInfo.alias?.toString() || null,
  trust: registryInfo.trust.toString(),
  owner: registryInfo.owner.toString(),
  createdAt: registryInfo.created_at.toNumber(),
  upgradedAt: registryInfo.upgraded_at?.toNumber(),
  brand: registryInfo.brand?.toString('hex') || null,
  upgrade: registryInfo.upgrade?.toString('hex') || null,
})

export const toTypedConfigInfo = (configInfo: any): ConfigInfo => ({
  unitPrice: BigInt(configInfo.unit_price.toString()),
  admins: configInfo.admins.map((admin: Address) => admin.toBech32()),
})
