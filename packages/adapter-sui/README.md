# @vleap/warps-adapter-sui

Sui blockchain adapter for the Warps SDK. Enables Warp execution on the Sui network.

## Installation

```bash
npm install @vleap/warps-adapter-sui
```

## Usage

```typescript
import { WarpClient, withAdapterFallback } from '@vleap/warps'
import { SuiAdapter } from '@vleap/warps-adapter-sui'
import { MultiversxAdapter } from '@vleap/warps-adapter-multiversx'

// Sui adapter requires a fallback adapter
const client = new WarpClient(config, {
  chains: [withAdapterFallback(SuiAdapter, MultiversxAdapter)],
})
```

## Features

- Transaction creation and execution
- Move package interaction
- Token transfers
- Query object state
- Transaction signing and execution
- Explorer integration
- ABI and brand builders

## Wallet Providers

Supports multiple wallet providers:
- Private key
- Mnemonic
- Read-only (for queries)
