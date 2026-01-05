# @vleap/warps-adapter-fastset

Fastset blockchain adapter for the Warps SDK. Enables Warp execution on the Fastset network.

## Installation

```bash
npm install @vleap/warps-adapter-fastset
```

## Usage

```typescript
import { WarpClient, withAdapterFallback } from '@vleap/warps'
import { FastsetAdapter } from '@vleap/warps-adapter-fastset'
import { MultiversxAdapter } from '@vleap/warps-adapter-multiversx'

// Fastset adapter requires a fallback adapter
const client = new WarpClient(config, {
  chains: [withAdapterFallback(FastsetAdapter, MultiversxAdapter)],
})
```

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
