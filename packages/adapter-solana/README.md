# @vleap/warps-adapter-solana

Solana blockchain adapter for the Warps SDK. Enables Warp execution on Solana mainnet, testnet, and devnet.

## Installation

```bash
npm install @vleap/warps-adapter-solana
```

## Usage

```typescript
import { WarpClient, withAdapterFallback } from '@vleap/warps'
import { SolanaAdapter } from '@vleap/warps-adapter-solana'
import { MultiversxAdapter } from '@vleap/warps-adapter-multiversx'

// Solana adapter requires a fallback adapter
const client = new WarpClient(config, {
  chains: [withAdapterFallback(SolanaAdapter, MultiversxAdapter)],
})
```

## Supported Networks

- **Solana Mainnet**
- **Solana Testnet**
- **Solana Devnet**

## Features

- Transaction creation and execution
- Program (smart contract) interaction
- Token transfers (SPL tokens)
- Query program state
- Transaction signing and sending
- Explorer integration

## Wallet Providers

Supports multiple wallet providers:
- Private key
- Mnemonic
- Read-only (for queries)
