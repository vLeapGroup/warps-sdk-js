import { Warp, WarpMessageName, WarpResultName } from './warp'

export type WarpExecutionResult = {
  success: boolean
  warp: Warp
  action: number
  user: string | null
  txHash: string | null
  next: WarpExecutionNextInfo | null
  values: any[]
  results: WarpExecutionResults
  messages: WarpExecutionMessages
}

export type WarpExecutionNextInfo = { identifier: string | null; url: string }

export type WarpExecutionResults = Record<WarpResultName, any | null>

export type WarpExecutionMessages = Record<WarpMessageName, string | null>
