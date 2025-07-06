// Playground for testing warps in isolation
import { Address, DevnetEntrypoint, TransactionComputer, UserSigner } from '@multiversx/sdk-core'
import { getWarpActionByIndex, WarpExecution, WarpInterpolator } from '@vleap/warps-core'
import * as fs from 'fs'
import * as path from 'path'

const walletFileName = 'wallet.pem'
const warpInputs: string[] = []

const warpsDir = path.join(__dirname, 'warps')

const runWarp = async (warpFile: string) => {
  const warpPath = path.join(warpsDir, warpFile)
  if (!warpFile.endsWith('.json')) {
    return
  }

  const pemPath = path.join(__dirname, walletFileName)
  const pemText = await fs.promises.readFile(pemPath, { encoding: 'utf8' })
  const signer = UserSigner.fromPem(pemText)

  const warpRaw = fs.readFileSync(warpPath, 'utf-8')

  const config: WarpConfig = {
    env: 'devnet',
    currentUrl: 'https://usewarp.to',
    user: {
      wallet: signer.getAddress().toBech32(),
    },
  }

  const actionIndex = 1

  const builder = new WarpBuilder(config)
  const executor = new WarpActionExecutor(config)

  const warp = await builder.createFromRaw(warpRaw)
  const preparedWarp = await WarpInterpolator.apply(config, warp)
  const action = getWarpActionByIndex(preparedWarp, actionIndex)
  let execution: WarpExecution | null = null

  if (action.type === 'contract') {
    const entrypoint = new DevnetEntrypoint(undefined, 'api', 'warp-test-playground')
    const provider = entrypoint.createNetworkProvider()
    const userAddress = Address.newFromBech32(config.user?.wallet || '')
    const account = await provider.getAccount(userAddress)
    const tx = await executor.createTransactionForExecute(warp, actionIndex, warpInputs)
    tx.nonce = account.nonce
    const serializedTx = new TransactionComputer().computeBytesForSigning(tx)
    tx.signature = await signer.sign(serializedTx)
    const txHash = await provider.sendTransaction(tx)
    console.log(`Sent tx: https://devnet-explorer.multiversx.com/transactions/${txHash}`)
    await provider.awaitTransactionCompleted(txHash)
    const txOnNetwork = await provider.getTransaction(txHash)
    execution = await executor.getTransactionExecutionResults(warp, actionIndex, txOnNetwork)
  } else if (action.type === 'query') {
    execution = await executor.executeQuery(preparedWarp, actionIndex, [])
  } else if (action.type === 'collect') {
    execution = await executor.executeCollect(preparedWarp, actionIndex, [])
  }

  console.log('Execution:', execution)
}

const listWarps = () => fs.readdirSync(warpsDir).filter((f) => f.endsWith('.ts') || f.endsWith('.js') || f.endsWith('.json'))

const warps = listWarps()
if (warps.length === 0) {
  console.log('No warps found in playground/warps.')
  process.exit(1)
}

const warpToRun = warps.find((f) => f === 'colombia-staking-user-stake-calculation.json') || warps[0]
runWarp(warpToRun)
