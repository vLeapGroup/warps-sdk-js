import { WarpChainName } from './constants'
import { createMockAdapter, createMockWarp } from './test-utils/sharedMocks'
import { Warp, WarpClientConfig } from './types'
import { WarpExecutor } from './WarpExecutor'

jest.mock('./helpers/x402', () => ({
  handleX402Payment: jest.fn((response) => response),
}))

describe('WarpExecutor - Prompt Actions', () => {
  const handlers = { onExecuted: jest.fn(), onError: jest.fn(), onActionExecuted: jest.fn() }
  const warp: Warp = createMockWarp()

  const config: WarpClientConfig = {
    env: 'devnet',
    user: { wallets: { multiversx: 'erd1...' } },
    clientUrl: 'https://anyclient.com',
    currentUrl: 'https://anyclient.com',
  }
  const adapters = [createMockAdapter(WarpChainName.Multiversx)]
  let executor: WarpExecutor // Declare executor here

  beforeEach(() => {
    jest.clearAllMocks()
    executor = new WarpExecutor(config, adapters, handlers) // Initialize executor here
  })

  it('should successfully execute a simple prompt action without inputs', async () => {
    const simplePromptWarp: Warp = {
      ...warp,
      actions: [
        {
          type: 'prompt',
          label: 'Get Simple Prompt',
          prompt: 'This is a simple static prompt.',
          primary: true,
          auto: true,
        },
      ],
      output: {
        prompt: '$.prompt',
      },
    }

    const result = await executor.execute(simplePromptWarp, [])

    expect(result).toBeDefined()
    expect(result.immediateExecutions).toHaveLength(1)
    const execution = result.immediateExecutions[0]
    expect(execution.status).toBe('success')
    expect(execution.output.prompt).toBe('This is a simple static prompt.')
    expect(execution.values.string).toEqual(['This is a simple static prompt.'])
    expect(execution.values.native).toEqual(['This is a simple static prompt.'])
    expect(execution.values.mapped).toEqual({ prompt: 'This is a simple static prompt.' })
    expect(handlers.onActionExecuted).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 1,
        execution: expect.objectContaining({
          status: 'success',
          output: { prompt: 'This is a simple static prompt.' },
        }),
      })
    )
  })

  it('should successfully execute a prompt action with inputs and interpolation', async () => {
    const interpolatedPromptWarp: Warp = {
      ...warp,
      actions: [
        {
          type: 'prompt',
          label: 'Generate Personalized Prompt',
          prompt: 'Hello {{name}}! You are {{age}} years old.',
          inputs: [
            {
              name: 'Name',
              as: 'name',
              type: 'string',
              source: 'field',
              required: true,
            },
            {
              name: 'Age',
              as: 'age',
              type: 'uint32',
              source: 'field',
              required: true,
            },
          ],
          primary: true,
          auto: true,
        },
      ],
      output: {
        prompt: '$.prompt',
      },
    }

    const inputs = ['string:John Doe', 'uint32:30']
    const result = await executor.execute(interpolatedPromptWarp, inputs)

    expect(result).toBeDefined()
    expect(result.immediateExecutions).toHaveLength(1)
    const execution = result.immediateExecutions[0]
    expect(execution.status).toBe('success')
    expect(execution.output.prompt).toBe('Hello John Doe! You are 30 years old.')
    expect(execution.values.string).toEqual(['Hello John Doe! You are 30 years old.'])
    expect(execution.values.native).toEqual(['Hello John Doe! You are 30 years old.'])
    expect(execution.values.mapped).toEqual({ prompt: 'Hello John Doe! You are 30 years old.' })
    expect(handlers.onActionExecuted).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 1,
        execution: expect.objectContaining({
          status: 'success',
          output: { prompt: 'Hello John Doe! You are 30 years old.' },
        }),
      })
    )
  })

  it('should handle errors during prompt action execution', async () => {
    const errorWarp: Warp = {
      protocol: 'warp',
      name: 'error-test-warp',
      title: 'Error Test Warp',
      description: 'Warp for testing error handling',
      actions: [
        {
          type: 'prompt',
          label: 'Error Prompt',
          prompt: 'This is a prompt.',
          primary: true,
          auto: true,
        },
      ],
      output: {
        prompt: '$.prompt',
      },
    }

    const errorMessage = 'Simulated error during prompt execution'

    // Mock factory.getChainInfoForWarp to throw an error
    jest.spyOn(executor['factory'], 'getChainInfoForWarp').mockRejectedValue(new Error(errorMessage))

    const result = await executor.execute(errorWarp, [])

    expect(result).toBeDefined()
    expect(result.immediateExecutions).toHaveLength(1)
    const execution = result.immediateExecutions[0]
    expect(execution.status).toBe('error')
    expect(execution.output._DATA).toBeInstanceOf(Error)
    expect(execution.output._DATA.message).toBe(errorMessage)
    expect(handlers.onError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: errorMessage,
        result: expect.objectContaining({
          status: 'error',
          output: expect.objectContaining({
            _DATA: expect.objectContaining({ message: errorMessage }),
          }),
        }),
      })
    )
  })
})
