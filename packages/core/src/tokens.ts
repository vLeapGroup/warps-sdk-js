export type KnownToken = {
  id: string
  name: string
  decimals: number
}

// Used to quickly retrieve information without needing external network requests
// Please only add your token if 'widely' used
export const KnownTokens: KnownToken[] = [
  { id: 'EGLD', name: 'eGold', decimals: 18 },
  { id: 'EGLD-000000', name: 'eGold', decimals: 18 },
  { id: 'VIBE-000000', name: 'VIBE', decimals: 18 },
]

export const findKnownTokenById = (id: string): KnownToken | null => KnownTokens.find((token) => token.id === id) || null
