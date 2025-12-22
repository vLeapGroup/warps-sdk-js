import { x402Client } from '@x402/core/client'
import { x402HTTPClient } from '@x402/core/http'
import { ChainAdapter } from '../types'
import { WarpLogger } from '../WarpLogger'

export async function handleX402Payment(
  response: Response,
  url: string,
  method: string,
  body: string | undefined,
  adapters: ChainAdapter[]
): Promise<Response> {
  const paymentHeaders = await processX402Payment(response, adapters)
  if (!paymentHeaders) return response

  const retryHeaders = new Headers()
  if (body) retryHeaders.set('Content-Type', 'application/json')
  retryHeaders.set('Accept', 'application/json')
  Object.entries(paymentHeaders).forEach(([key, value]) => {
    retryHeaders.set(key, value)
  })

  WarpLogger.debug('WarpExecutor: Retrying request with payment headers')
  const retryResponse = await fetch(url, { method, headers: retryHeaders, body })
  WarpLogger.debug('WarpExecutor: Payment processed, new response status', { status: retryResponse.status })
  return retryResponse
}

const processX402Payment = async (response: Response, adapters: ChainAdapter[]): Promise<Record<string, string> | null> => {
  const responseBody = await parseResponseBody(response)
  const client = new x402HTTPClient(new x402Client())

  let paymentRequired = client.getPaymentRequiredResponse((name: string) => response.headers.get(name), responseBody)
  if (!paymentRequired?.accepts?.length) return null

  for (const adapter of adapters) {
    if (!adapter.wallet.registerX402Handlers) continue

    try {
      const coreClient = new x402Client()
      const handlers = await adapter.wallet.registerX402Handlers(coreClient)

      const matchingScheme = paymentRequired.accepts.find((accept) => accept?.network && handlers[accept.network])
      if (!matchingScheme?.network) continue

      handlers[matchingScheme.network]()
      const adapterClient = new x402HTTPClient(coreClient)

      const paymentPayload = await adapterClient.createPaymentPayload(paymentRequired)
      if (!paymentPayload || typeof paymentPayload !== 'object') continue

      const paymentHeaders = adapterClient.encodePaymentSignatureHeader(paymentPayload)
      if (!paymentHeaders || typeof paymentHeaders !== 'object') continue

      WarpLogger.debug(`WarpExecutor: x402 payment processed with ${adapter.chainInfo.name} adapter using ${matchingScheme.network} scheme`)
      return paymentHeaders
    } catch {
      continue
    }
  }

  return null
}

const parseResponseBody = async (response: Response): Promise<Record<string, unknown>> => {
  try {
    const text = await response.clone().text()
    return text ? JSON.parse(text) : {}
  } catch {
    return {}
  }
}
