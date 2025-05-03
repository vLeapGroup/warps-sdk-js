export type TrustStatus = 'unverified' | 'verified' | 'blacklisted'

export type RegistryInfo = {
  hash: string
  alias: string | null
  trust: TrustStatus
  creator: string
  createdAt: number
  brand: string | null
  upgrade: string | null
}
