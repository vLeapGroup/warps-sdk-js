export type WarpTrustStatus = 'unverified' | 'verified' | 'blacklisted'

export type WarpRegistryInfo = {
  hash: string
  alias: string | null
  trust: WarpTrustStatus
  owner: string
  createdAt: number
  upgradedAt: number
  brand: string | null
  upgrade: string | null
}

export type WarpRegistryConfigInfo = {
  unitPrice: bigint
  admins: string[]
}
