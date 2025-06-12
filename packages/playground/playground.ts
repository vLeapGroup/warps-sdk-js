// Playground for testing warps in isolation
import { getWarpActionByIndex, WarpActionExecutor, WarpBuilder, WarpConfig, WarpExecution } from '@vleap/warps'
import * as fs from 'fs'
import * as path from 'path'

const warpsDir = path.join(__dirname, 'warps')

const runWarp = async (warpFile: string) => {
  const warpPath = path.join(warpsDir, warpFile)
  if (!warpFile.endsWith('.json')) {
    return
  }

  const warpRaw = fs.readFileSync(warpPath, 'utf-8')

  const config: WarpConfig = {
    env: 'devnet',
    currentUrl: 'https://usewarp.to',
  }

  const actionIndex = 1

  const builder = new WarpBuilder(config)
  const executor = new WarpActionExecutor(config)

  const warp = await builder.createFromRaw(warpRaw)
  const action = getWarpActionByIndex(warp, actionIndex)
  let execution: WarpExecution | null = null

  if (action.type === 'query') {
    execution = await executor.executeQuery(warp, actionIndex, [])
  } else if (action.type === 'collect') {
    execution = await executor.executeCollect(warp, actionIndex, [])
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
