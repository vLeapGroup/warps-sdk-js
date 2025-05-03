import { WarpMessageName, WarpResultName } from './warp'

export type WarpExecutionResult = {
  redirectUrl: string | null
  results: Record<WarpResultName, any | null>
  messages: Record<WarpMessageName, string | null>
}
