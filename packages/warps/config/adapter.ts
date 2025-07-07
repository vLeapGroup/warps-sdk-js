type AdapterLoader = () => Promise<any> | any

interface AdapterEntry {
  chain: string
  loader: AdapterLoader
}

const adapters: AdapterEntry[] = []

export function registerAdapter(chain: string, loader: AdapterLoader) {
  adapters.push({ chain: chain.toLowerCase(), loader })
}

export function getAdapter(chain: string): AdapterLoader | null {
  const entry = adapters.find((a) => a.chain === chain.toLowerCase())
  return entry?.loader || null
}

export function getAllAdapters(): AdapterEntry[] {
  return adapters.slice()
}

// Register Multiversx adapter by default
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { WarpMultiversxExecutor } = require('@vleap/warps-adapter-multiversx')
  registerAdapter('multiversx', () => WarpMultiversxExecutor)
} catch {}

// Register Sui adapter if available
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { WarpSuiExecutor } = require('@vleap/warps-adapter-sui')
  registerAdapter('sui', () => WarpSuiExecutor)
} catch {}
