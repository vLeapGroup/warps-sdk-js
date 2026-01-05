# @warps/playground

Development playground for testing and experimenting with the Warps SDK. This package is private and not published to npm.

## Overview

The playground provides a local development environment for:
- Testing Warp execution
- Debugging adapter implementations
- Experimenting with new features
- Validating Warp definitions

## Usage

```bash
npm run start
```

## Features

- Test Warps across all supported chains
- Execute transactions on devnet/testnet
- Debug transaction creation and execution
- Validate Warp JSON definitions
- Test wallet integrations

## Configuration

Configure the playground using environment variables or a `.env` file:

```env
PRIVATE_KEY=0x...
COINBASE_API_KEY_ID=...
COINBASE_API_KEY_SECRET=...
COINBASE_WALLET_SECRET=...
```

## Note

This package is for development purposes only and is not intended for production use.
