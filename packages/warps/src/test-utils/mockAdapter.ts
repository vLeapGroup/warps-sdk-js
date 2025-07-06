import { extractCollectResults } from '../helpers/results'
import { IChainAdapter } from '../types/adapter'
import { WarpInitConfig } from '../types/warp'

export const createMockAdapter = (config: WarpInitConfig): IChainAdapter => ({
  config,
  serializer: () => ({ stringToTyped: (arg: string) => arg }),
  factory: () => ({
    createTransfer: async (components: any) => {
      const isEsdtTransfer =
        components.data == null &&
        Array.isArray(components.transfers) &&
        components.transfers.length === 1 &&
        components.transfers[0]?.token?.identifier === 'WARP-123456' &&
        components.transfers[0]?.amount === 1000000000000000000n
      if (isEsdtTransfer) {
        return {
          ...components,
          receiver: { toString: () => components.destination?.toString?.() ?? components.destination ?? '' },
          data: Buffer.from('ESDTTransfer@574152502d313233343536@0de0b6b3a7640000'),
          value: { toString: () => components.value?.toString?.() ?? String(components.value ?? '') },
        }
      }
      if (components.data && typeof components.data === 'string' && components.data.startsWith('string:')) {
        return {
          ...components,
          receiver: { toString: () => components.destination?.toString?.() ?? components.destination ?? '' },
          data: Buffer.from(components.data.split(':')[1], 'utf-8'),
          value: { toString: () => components.value?.toString?.() ?? String(components.value ?? '') },
        }
      }
      return {
        ...components,
        receiver: { toString: () => components.destination?.toString?.() ?? components.destination ?? '' },
        data: Buffer.from(components.data ?? ''),
        value: { toString: () => components.value?.toString?.() ?? String(components.value ?? '') },
      }
    },
    createContractCall: async (components: any) => {
      const isEsdtContractCall =
        components.data == null &&
        Array.isArray(components.transfers) &&
        components.transfers.length === 1 &&
        components.transfers[0]?.token?.identifier === 'WARP-123456' &&
        components.transfers[0]?.amount === 1000000000000000000n
      if (isEsdtContractCall) {
        return {
          ...components,
          receiver: { toString: () => components.destination?.toString?.() ?? components.destination ?? '' },
          data: Buffer.from('ESDTTransfer@574152502d313233343536@0de0b6b3a7640000@7465737446756e63'),
          value: { toString: () => components.value?.toString?.() ?? String(components.value ?? '') },
        }
      }
      if (!components.data && Array.isArray(components.args) && components.args[0]?.startsWith('string:WarpToken')) {
        return {
          ...components,
          receiver: { toString: () => components.destination?.toString?.() ?? components.destination ?? '' },
          data: Buffer.from('issue@57617270546f6b656e@57415054@3635c9adc5dea00000@12'),
          value: { toString: () => components.value?.toString?.() ?? String(components.value ?? '') },
        }
      }
      return {
        ...components,
        receiver: { toString: () => components.destination?.toString?.() ?? components.destination ?? '' },
        data: Buffer.from(components.data ?? ''),
        value: { toString: () => components.value?.toString?.() ?? String(components.value ?? '') },
      }
    },
    executeQuery: async (_components: any) => {
      const results = {
        FIRST_ADDRESS: 'erd1tt8fvp7m6u0e0sfxnlcc6eyk28mtaq50gdd7ryqdxrx544hdl3tsqqk9uw',
        FIRST_VALUE: '706565726d6568712c362e362c',
        SECOND_ADDRESS: 'erd1770jpvxsdctegqf45gzct0vljlxezu4jmdsjr922afxdkhrz25gqv9qcsw',
        SECOND_VALUE: '636865737375636174696f6e2c362e36252c',
        THIRD_ADDRESS: 'erd1lv48p9j6knnq7xdjpg0gn0nq7g4t6rfyc0gy398re4lxx3chgprsx5hmfu',
        THIRD_VALUE: '6d696368617669655f2c362e36252c',
        NULL_VALUE: null,
        messages: {
          first: 'erd1tt8fvp7m6u0e0sfxnlcc6eyk28mtaq50gdd7ryqdxrx544hdl3tsqqk9uw has 706565726d6568712c362e362c',
          second: 'erd1770jpvxsdctegqf45gzct0vljlxezu4jmdsjr922afxdkhrz25gqv9qcsw has 636865737375636174696f6e2c362e36252c',
        },
      }
      return { ...results, values: [], results, success: true, txHash: '' }
    },
    createCollect: async (components: any) => ({ success: true, results: {}, messages: {} }),
  }),
  results: () => ({
    extractContractResults: async (_executor, warp, _action, _tx, _actionIndex, _inputs) => {
      const results: any = {}
      for (const key of Object.keys(warp.results || {})) {
        if (key === 'FIRST_EVENT') results[key] = 'ABC-123456'
        else if (key === 'SECOND_EVENT') results[key] = 'DEF-123456'
        else if (key === 'THIRD_EVENT') results[key] = '1209600'
        else if (key === 'FOURTH_EVENT') results[key] = null
        else if (key === 'FIRST_OUT') results[key] = null
        else if (key === 'SECOND_OUT') results[key] = '16'
        else if (key === 'THIRD_OUT') results[key] = null
        else results[key] = undefined
      }
      return { values: [], results, success: true, txHash: '' }
    },
    extractQueryResults: async (_executor, warp, tx, _actionIndex, _inputs) => {
      const results = {
        FIRST_ADDRESS: 'erd1tt8fvp7m6u0e0sfxnlcc6eyk28mtaq50gdd7ryqdxrx544hdl3tsqqk9uw',
        FIRST_VALUE: '706565726d6568712c362e362c',
        SECOND_ADDRESS: 'erd1770jpvxsdctegqf45gzct0vljlxezu4jmdsjr922afxdkhrz25gqv9qcsw',
        SECOND_VALUE: '636865737375636174696f6e2c362e36252c',
        THIRD_ADDRESS: 'erd1lv48p9j6knnq7xdjpg0gn0nq7g4t6rfyc0gy398re4lxx3chgprsx5hmfu',
        THIRD_VALUE: '6d696368617669655f2c362e36252c',
        NULL_VALUE: null,
        messages: {
          first: 'erd1tt8fvp7m6u0e0sfxnlcc6eyk28mtaq50gdd7ryqdxrx544hdl3tsqqk9uw has 706565726d6568712c362e362c',
          second: 'erd1770jpvxsdctegqf45gzct0vljlxezu4jmdsjr922afxdkhrz25gqv9qcsw has 636865737375636174696f6e2c362e36252c',
        },
      }
      return { ...results, values: [], results, success: true, txHash: '' }
    },
    extractCollectResults: async (_executor, warp, response, actionIndex, inputs) => {
      const { values, results } = await extractCollectResults(warp, response, actionIndex, inputs)
      for (const key of Object.keys(warp.results || {})) {
        if (!(key in results)) results[key] = undefined
      }
      return { values, results, success: true, txHash: '' }
    },
  }),
})
