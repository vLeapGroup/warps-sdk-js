type AdapterLoader = () => Promise<any> | any

type AdapterEntry = {
  chain: string
  executor: AdapterLoader
  results: AdapterLoader
}

type AdapterComponents = {
  executor: AdapterLoader
  results: AdapterLoader
}

const adapters: AdapterEntry[] = []

export function registerAdapter(chain: string, components: AdapterComponents) {
  adapters.push({ chain: chain.toLowerCase(), ...components })
}

export function getAdapter(chain: string): AdapterComponents | null {
  const entry = adapters.find((a) => a.chain === chain.toLowerCase())
  return entry || null
}

export function getAllAdapters(): AdapterEntry[] {
  return adapters.slice()
}

// Register Multiversx adapter by default
try {
  const { WarpMultiversxExecutor } = require('@vleap/warps-adapter-multiversx')
  const { WarpMultiversxResults } = require('@vleap/warps-adapter-multiversx')
  registerAdapter('multiversx', {
    executor: () => WarpMultiversxExecutor,
    results: () => WarpMultiversxResults,
  })
} catch {}

// Register Sui adapter if available
try {
  const { WarpSuiExecutor } = require('@vleap/warps-adapter-sui')
  const { WarpSuiResults } = require('@vleap/warps-adapter-sui')
  registerAdapter('sui', {
    executor: () => WarpSuiExecutor,
    results: () => WarpSuiResults,
  })
} catch {}
