import { WarpClient } from '@vleap/warps'
import { getAllEvmAdapters } from '@vleap/warps-adapter-evm'
import { getFastsetAdapter } from '@vleap/warps-adapter-fastset'
import { getAllMultiversxAdapters, getMultiversxAdapter } from '@vleap/warps-adapter-multiversx'
import { getSuiAdapter } from '@vleap/warps-adapter-sui'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const Chain = 'base'
const WarpToTest = 'test.json'
const WarpInputs: string[] = [
  'string:base',
  'address:0x5A92C4763dDAc3119a65f8882a53234C9988Efd9',
  'asset:0x808456652fdb597867f38412077A9182bf77359F|0.01',
] // e.g. 'address:abc', 'asset:EGLD|0.5'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const warpsDir = path.join(__dirname, 'warps')

const runWarp = async (warpFile: string) => {
  const warpPath = path.join(warpsDir, warpFile)
  if (!warpFile.endsWith('.json')) return
  const warpRaw = fs.readFileSync(warpPath, 'utf-8')
  const walletData = await loadWallet(Chain)
  const privateKey = walletData.privateKey || (await loadFile(Chain))

  console.log('🔑 Wallet data loaded:', { address: walletData?.address, privateKey })

  const config: any = {
    env: 'devnet',
    currentUrl: 'https://usewarp.to',
    user: { wallets: { [Chain]: { ...walletData, privateKey } } },
  }

  const client = new WarpClient(config, [
    ...getAllMultiversxAdapters(config),
    ...getAllEvmAdapters(config, getMultiversxAdapter(config)),
    getSuiAdapter(config),
    getFastsetAdapter(config, getMultiversxAdapter(config)),
  ])

  const executor = client.createExecutor({
    onExecuted: (result) => console.log('Executed:', result),
    onError: (result) => console.log('Error:', result),
  })

  const address = client.getWallet(Chain).getAddress()
  const dataLoader = client.getDataLoader(Chain)
  const accountAssets = await dataLoader.getAccountAssets(address)

  console.log('Account assets:', accountAssets)

  const warp = await client.createBuilder(Chain).createFromRaw(warpRaw)
  const { tx } = await executor.execute(warp, WarpInputs)
  const signedTx = await client.getWallet(Chain).signTransaction(tx)
  const sentTxHash = await client.getWallet(Chain).sendTransaction(signedTx)
  console.log('Sent transaction hash:', sentTxHash)
  const remoteTx = await client.getDataLoader(Chain).getAction(sentTxHash, true)

  executor.evaluateResults(warp, Chain, remoteTx)
  console.log('Remote transaction:', remoteTx)
}

const listWarps = () => fs.readdirSync(warpsDir).filter((f) => f.endsWith('.ts') || f.endsWith('.js') || f.endsWith('.json'))

const loadWallet = async (chain: string): Promise<any> => {
  const walletPath = path.join(__dirname, 'wallets', `${chain}.json`)
  const wallet = await fs.promises.readFile(walletPath, { encoding: 'utf8' })
  return JSON.parse(wallet)
}

const loadFile = async (chain: string): Promise<string | null> => {
  const filePath = path.join(__dirname, 'wallets', `${chain}.txt`)
  if (!fs.existsSync(filePath)) return null
  const file = await fs.promises.readFile(filePath, { encoding: 'utf8' })
  return file || null
}

const warps = listWarps()
if (warps.length === 0) {
  console.log('No warps found in playground/warps.')
  process.exit(1)
}

const warpToRun = warps.find((w) => w === WarpToTest) || warps[0]

console.log(`🎯 Testing warp: ${warpToRun}`)

runWarp(warpToRun)
