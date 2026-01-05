# @vleap/warps-adapter-near

NEAR Protocol adapter for the Warps SDK. Enables Warp execution on NEAR mainnet and testnet.

## Installation

```bash
npm install @vleap/warps-adapter-near
```

## Usage

```typescript
import { WarpClient, withAdapterFallback } from '@vleap/warps'
import { NearAdapter } from '@vleap/warps-adapter-near'
import { MultiversxAdapter } from '@vleap/warps-adapter-multiversx'

// NEAR adapter requires a fallback adapter
const client = new WarpClient(config, {
  chains: [withAdapterFallback(NearAdapter, MultiversxAdapter)],
})
```

## Supported Networks

- **NEAR Mainnet**
- **NEAR Testnet**

## Features

- Transaction creation and execution
- Smart contract interaction
- Token transfers
- Query contract state
- Transaction signing and broadcasting
- Explorer integration

## Wallet Providers

Supports multiple wallet providers:
- Private key
- Mnemonic
- Read-only (for queries)
