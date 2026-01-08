# @joai/warps-mcp

Model Context Protocol (MCP) integration for the Warps SDK. Enables fetching and converting MCP tools into Warps.

## Installation

```bash
npm install @joai/warps-mcp
```

## Prerequisites

- `@joai/warps` core package
- `@modelcontextprotocol/sdk` (peer dependency)

## Usage

```typescript
import { WarpMcp } from '@joai/warps-mcp'
import { WarpClient } from '@joai/warps'

const config = {
  env: 'mainnet',
  // ... your config
}

const mcp = new WarpMcp(config)

// Fetch Warps from an MCP server
const warps = await mcp.getWarpsFromTools('https://mcp-server.example.com', {
  Authorization: 'Bearer token',
})

// Use the Warps with WarpClient
const client = new WarpClient(config, { chains: [...] })
for (const warp of warps) {
  await client.execute(warp, inputs)
}
```

## Features

- Connect to MCP servers
- List available tools
- Convert MCP tools to Warps
- Execute Warps from MCP sources

## MCP Actions

Warps support `mcp` action types that can execute MCP tools directly:

```typescript
{
  type: 'mcp',
  destination: {
    url: 'https://mcp-server.example.com',
    tool: 'tool-name',
    headers: { Authorization: 'Bearer token' }
  }
}
```
