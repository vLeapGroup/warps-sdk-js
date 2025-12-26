import { WarpBrand } from '../types/brand'
import { WarpChainAsset } from '../types/chain'
import { WarpClientConfig } from '../types/config'
import { WarpChainInfo } from '../types/warp'

export const getWarpBrandLogoUrl = (brand: WarpBrand, config?: WarpClientConfig): string => {
  const scheme = config?.preferences?.scheme ?? 'light'
  if (typeof brand.logo === 'string') return brand.logo
  return brand.logo[scheme]
}

export const getWarpChainAssetLogoUrl = (asset: WarpChainAsset, config?: WarpClientConfig): string | null => {
  if (!asset.logoUrl) return null
  if (typeof asset.logoUrl === 'string') return asset.logoUrl
  const scheme = config?.preferences?.scheme ?? 'light'
  return asset.logoUrl[scheme]
}

export const getWarpChainInfoLogoUrl = (chainInfo: WarpChainInfo, config?: WarpClientConfig): string => {
  if (typeof chainInfo.logoUrl === 'string') return chainInfo.logoUrl
  const scheme = config?.preferences?.scheme ?? 'light'
  return chainInfo.logoUrl[scheme]
}
