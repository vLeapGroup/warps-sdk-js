# @vleap/warps-vm-browser

Browser VM runtime for Warps SDK output transformations. Safely executes transformation code in a Web Worker sandbox.

## Installation

```bash
npm install @vleap/warps-vm-browser
```

## Usage

```typescript
import { createBrowserTransformRunner } from '@vleap/warps-vm-browser'
import { WarpClient } from '@vleap/warps'

const config = {
  env: 'mainnet',
  transform: {
    runner: createBrowserTransformRunner(),
  },
  // ... rest of config
}

const client = new WarpClient(config, { chains: [...] })
```

## Features

- Safe code execution in Web Workers
- Sandboxed environment
- Supports arrow functions, regular functions, and expressions
- Error handling and isolation

## How It Works

The browser VM uses Web Workers to execute transformation code in isolation, preventing access to the main thread's context and ensuring security.

## Example Transformation

```typescript
// Warp output transformation
const transform = (results) => {
  return {
    value: results.amount * 2,
    formatted: `$${results.amount.toFixed(2)}`
  }
}
```
