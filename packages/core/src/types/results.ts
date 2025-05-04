import { WarpMessageName, WarpResultName } from './warp'

export type WarpExecutionResult = {
  success: boolean
  redirectUrl: string | null
  values: any[]
  results: WarpExecutionResults
  messages: WarpExecutionMessages
}

export type WarpExecutionResults = Record<WarpResultName, any | null>

export type WarpExecutionMessages = Record<WarpMessageName, string | null>
