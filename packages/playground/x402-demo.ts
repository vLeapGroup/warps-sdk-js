import { WarpClient } from '@vleap/warps'
import { getAllEvmAdapters } from '@vleap/warps-adapter-evm'
import { getMultiversxAdapter } from '@vleap/warps-adapter-multiversx'
import { ethers } from 'ethers'

const wallet = ethers.Wallet.createRandom()
const config = {
  env: 'devnet' as const,
  currentUrl: 'https://usewarp.to',
  user: { wallets: { ethereum: { address: wallet.address, privateKey: wallet.privateKey } } },
}
const client = new WarpClient(config, getAllEvmAdapters(config, getMultiversxAdapter(config)))

const { immediateExecutions } = await client.executeWarp(
  {
    name: 'x402',
    chain: 'ethereum',
    actions: [{ type: 'collect', destination: { url: 'https://www.x402.org/protected', method: 'GET' }, inputs: [] }],
  },
  []
)

console.log('✅ x402 integration working!')
console.log('Executions:', immediateExecutions)
