export type KnownToken = {
  id: string
  name: string
  decimals: number
  logoUrl: string
}

// Used to quickly retrieve information without needing external network requests
// Please only add your token if 'widely' used
export const KnownTokens: KnownToken[] = [
  { id: 'EGLD', name: 'eGold', decimals: 18, logoUrl: 'https://tools.multiversx.com/assets-cdn/tokens/EGLD-000000/icon.pngsvg' },
  { id: 'EGLD-000000', name: 'eGold', decimals: 18, logoUrl: 'https://tools.multiversx.com/assets-cdn/tokens/EGLD-000000/icon.png' },
  { id: 'VIBE', name: 'VIBE', decimals: 18, logoUrl: 'https://vleap.ai/images/tokens/vibe.svg' },
  { id: 'VIBE-000000', name: 'VIBE', decimals: 18, logoUrl: 'https://vleap.ai/images/tokens/vibe.svg' },
]

export const findKnownTokenById = (id: string): KnownToken | null => KnownTokens.find((token) => token.id === id) || null
