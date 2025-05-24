export type TrustStatus = 'unverified' | 'verified' | 'blacklisted'

export type RegistryInfo = {
  hash: string
  alias: string | null
  trust: TrustStatus
  owner: string
  createdAt: number
  upgradedAt: number
  brand: string | null
  upgrade: string | null
}
