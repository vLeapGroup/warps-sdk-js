# @vleap/warps-vm-node

Node.js VM runtime for Warps SDK output transformations. Safely executes transformation code using vm2 in a sandboxed environment.

## Installation

```bash
npm install @vleap/warps-vm-node
```

**Note:** This package requires `vm2` as an optional dependency. Install it separately:

```bash
npm install vm2
```

## Usage

```typescript
import { createNodeTransformRunner } from '@vleap/warps-vm-node'
import { WarpClient } from '@vleap/warps'

const config = {
  env: 'mainnet',
  transform: {
    runner: createNodeTransformRunner(),
  },
  // ... rest of config
}

const client = new WarpClient(config, { chains: [...] })
```

## Features

- Safe code execution using vm2
- Sandboxed environment
- Supports arrow functions, regular functions, and expressions
- Error handling and timeout protection

## How It Works

The Node.js VM uses vm2 to execute transformation code in an isolated sandbox, preventing access to Node.js globals and ensuring security.

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

## Security

The vm2 sandbox provides isolation from the Node.js runtime, preventing unauthorized access to system resources.
