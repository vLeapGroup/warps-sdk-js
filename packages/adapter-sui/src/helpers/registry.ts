import { WarpChainEnv, WarpRegistryInfo, WarpTrustStatus } from '@joai/warps'
import { getSuiRegistryPackageId } from '../config'

export const toRegistryMoveTarget = (env: WarpChainEnv, module: string) => `${getSuiRegistryPackageId(env)}::${module}`

const toTrustStatus = (trust: any): WarpTrustStatus => {
  const str = Buffer.from(trust).toString()
  if (str === 'unverified' || str === 'verified' || str === 'blacklisted') return str
  return 'unverified'
}

export const toTypedRegistryInfo = (infoView: any): WarpRegistryInfo => ({
  hash: Buffer.from(infoView.hash).toString('hex'),
  alias: infoView.alias ? Buffer.from(infoView.alias).toString() : null,
  trust: toTrustStatus(infoView.trust),
  owner: infoView.owner,
  createdAt: Number(infoView.created_at),
  upgradedAt: Number(infoView.upgraded_at),
  brand: infoView.brand ? Buffer.from(infoView.brand).toString('hex') : null,
  upgrade: infoView.upgrade ? Buffer.from(infoView.upgrade).toString('hex') : null,
})
