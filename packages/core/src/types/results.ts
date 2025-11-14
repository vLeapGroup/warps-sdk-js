import { WarpAdapterGenericTransaction } from './config'
import { Warp, WarpMessageName, WarpNativeValue, WarpResultName } from './warp'

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
  results: WarpExecutionResults
  messages: WarpExecutionMessages
}

export type WarpExecutionNextInfo = { identifier: string | null; url: string }[]

export type WarpExecutionResults = Record<WarpResultName, any | null>

export type WarpExecutionMessages = Record<WarpMessageName, string | null>
