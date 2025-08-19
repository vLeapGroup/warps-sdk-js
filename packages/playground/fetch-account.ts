#!/usr/bin/env ts-node

import { WarpClient, WarpClientConfig } from '@vleap/warps'
import { getArbitrumAdapter, getBaseAdapter, getEthereumAdapter } from '@vleap/warps-adapter-evm'
import { getFastsetAdapter } from '@vleap/warps-adapter-fastset'
import { getMultiversxAdapter } from '@vleap/warps-adapter-multiversx'
import { getSuiAdapter } from '@vleap/warps-adapter-sui'

// Available chains
const AVAILABLE_CHAINS = ['ethereum', 'arbitrum', 'base', 'multiversx', 'sui', 'fastset']

// Help function
function showHelp() {
  console.log(`
💰 Warps Account Fetcher - Get Account Balance

Usage:
  npm run fetchaccount <chain> <address>

Available chains:
  ${AVAILABLE_CHAINS.join(', ')}

Examples:
  npm run fetchaccount ethereum 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045
  npm run fetchaccount multiversx erd1qqqqqqqqqqqqqpgqje2f99vr6r7sk54thg03c9suzcvwr4nfl3tsfkdl36
  npm run fetchaccount sui 0x0000000000000000000000000000000000000000000000000000000000000006
`)
}

// Main fetch function
async function fetchAccount(chainName: string, address: string) {
  try {
    console.log(`💰 Fetching account balance for ${chainName} address: ${address}`)
    console.log('='.repeat(60))

    // Initialize config
    const config: WarpClientConfig = {
      env: 'mainnet',
      cache: { type: 'memory' },
    }

    // Initialize adapters
    const multiversxAdapter = getMultiversxAdapter(config)
    const adapters = [
      multiversxAdapter,
      getSuiAdapter(config),
      getEthereumAdapter(config, multiversxAdapter),
      getArbitrumAdapter(config, multiversxAdapter),
      getBaseAdapter(config, multiversxAdapter),
      getFastsetAdapter(config, multiversxAdapter),
    ]

    const client = new WarpClient(config, adapters)

    // Find the adapter for this chain
    const adapter = adapters.find((a) => a.chainInfo.name === chainName)
    if (!adapter) {
      throw new Error(`❌ Chain "${chainName}" not supported. Available: ${AVAILABLE_CHAINS.join(', ')}`)
    }

    console.log(`✅ Using adapter: ${adapter.chainInfo.name}`)

    // Fetch account data
    console.log('\n📊 Account Information:')
    console.log('-'.repeat(30))
    const account = await adapter.dataLoader.getAccount(address)

    const nativeSymbol = adapter.chainInfo.nativeToken || 'tokens'
    const formattedBalance = account.balance.toString()

    console.log(`Address: ${account.address}`)
    console.log(`Balance: ${formattedBalance} ${nativeSymbol}`)

    // Format balance for better readability (using 18 decimals as default for most chains)
    const decimals = 18 // Most chains use 18 decimals
    const humanReadable = (Number(account.balance) / Math.pow(10, decimals)).toFixed(6)
    console.log(`Formatted: ${humanReadable} ${nativeSymbol}`)

    console.log('\n✅ Account fetch completed successfully!')
  } catch (error) {
    console.error(`❌ Error fetching account: ${error}`)
    process.exit(1)
  }
}

// Parse command line arguments
const args = process.argv.slice(2)

if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
  showHelp()
  process.exit(0)
}

if (args.length !== 2) {
  console.error('❌ Error: Please provide exactly 2 arguments: <chain> <address>')
  console.error('Example: npm run fetchaccount ethereum 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045')
  process.exit(1)
}

const [chainName, address] = args

if (!AVAILABLE_CHAINS.includes(chainName)) {
  console.error(`❌ Error: Invalid chain "${chainName}"`)
  console.error(`Available chains: ${AVAILABLE_CHAINS.join(', ')}`)
  process.exit(1)
}

// Run the fetch
fetchAccount(chainName, address)
