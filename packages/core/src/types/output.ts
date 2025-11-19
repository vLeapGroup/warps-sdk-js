import { WarpAdapterGenericTransaction } from './config'
import { Warp, WarpMessageName, WarpNativeValue, WarpOutputName } from './warp'

export type WarpActionExecutionStatus = 'success' | 'error' | 'unhandled'

export type WarpActionExecutionResult = {
  status: WarpActionExecutionStatus
  warp: Warp
  action: number
  user: string | null
  txHash: string | null
  tx: WarpAdapterGenericTransaction | null
  next: WarpExecutionNextInfo | null
  values: { string: string[]; native: WarpNativeValue[] }
  output: WarpExecutionOutput
  messages: WarpExecutionMessages
  destination: string | null
}

export type WarpExecutionNextInfo = { identifier: string | null; url: string }[]

export type WarpExecutionOutput = Record<WarpOutputName, any | null>

export type WarpExecutionMessages = Record<WarpMessageName, string | null>
