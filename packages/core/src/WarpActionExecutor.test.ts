import { SmartContractResult, TransactionEvent, TransactionLogs, TransactionOnNetwork } from '@multiversx/sdk-core/out'
import { bigIntToHex, utf8ToHex } from '@multiversx/sdk-core/out/core/utils.codec'
import { promises as fs, PathLike } from 'fs'
import { Warp, WarpCollectAction, WarpConfig, WarpContractAction, WarpTransferAction } from './types'
import { WarpActionExecutor } from './WarpActionExecutor'

const Config: WarpConfig = {
  env: 'devnet',
  userAddress: 'erd1kc7v0lhqu0sclywkgeg4um8ea5nvch9psf2lf8t96j3w622qss8sav2zl8',
  currentUrl: 'https://example.com',
}

describe('WarpActionExecutor', () => {
  it('createTransactionForExecute - creates a native transfer with message', async () => {
    const subject = new WarpActionExecutor(Config)

    const action: WarpTransferAction = {
      type: 'transfer',
      label: 'test',
      description: 'test',
      address: 'erd1kc7v0lhqu0sclywkgeg4um8ea5nvch9psf2lf8t96j3w622qss8sav2zl8',
      data: 'string:hello',
    }

    const actual = await subject.createTransactionForExecute(action, [])

    expect(Buffer.from(actual.data).toString('utf-8')).toBe('hello')
  })

  it('createTransactionForExecute - creates a native transfer with message from input', async () => {
    const subject = new WarpActionExecutor(Config)

    const action: WarpTransferAction = {
      type: 'transfer',
      label: 'test',
      description: 'test',
      address: 'erd1kc7v0lhqu0sclywkgeg4um8ea5nvch9psf2lf8t96j3w622qss8sav2zl8',
      inputs: [{ name: 'message', type: 'string', position: 'data', source: 'field' }],
    }

    const actual = await subject.createTransactionForExecute(action, ['string:hello'])

    expect(Buffer.from(actual.data).toString('utf-8')).toBe('hello')
  })

  it('createTransactionForExecute - creates a native transfer field-based receiver', async () => {
    const subject = new WarpActionExecutor(Config)

    const action: WarpTransferAction = {
      type: 'transfer',
      label: 'test',
      description: 'test',
      value: '1000000000000000000',
      inputs: [{ name: 'Receiver', type: 'address', position: 'receiver', source: 'field' }],
    }

    const actual = await subject.createTransactionForExecute(action, [
      'address:erd1kc7v0lhqu0sclywkgeg4um8ea5nvch9psf2lf8t96j3w622qss8sav2zl8',
    ])

    expect(actual.receiver.toString()).toBe('erd1kc7v0lhqu0sclywkgeg4um8ea5nvch9psf2lf8t96j3w622qss8sav2zl8')
    expect(actual.data?.toString()).toBe('')
    expect(actual.value.toString()).toBe('1000000000000000000')
  })

  it('createTransactionForExecute - creates a native transfer with esdt from field', async () => {
    const subject = new WarpActionExecutor(Config)

    const action: WarpTransferAction = {
      type: 'transfer',
      label: 'test',
      description: 'test',
      address: 'erd1kc7v0lhqu0sclywkgeg4um8ea5nvch9psf2lf8t96j3w622qss8sav2zl8',
      inputs: [{ name: 'token', type: 'esdt', position: 'transfer', source: 'field' }],
    }

    const actual = await subject.createTransactionForExecute(action, ['esdt:WARP-123456|0|1000000000000000000'])

    expect(actual.data?.toString()).toBe('ESDTTransfer@574152502d313233343536@0de0b6b3a7640000')
  })

  it('createTransactionForExecute - creates a contract call with esdt transfer from field', async () => {
    const subject = new WarpActionExecutor(Config)

    const action: WarpContractAction = {
      type: 'contract',
      label: 'test',
      description: 'test',
      address: 'erd1qqqqqqqqqqqqqqqpqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqplllst77y4l',
      func: 'testFunc',
      args: [],
      gasLimit: 1000000,
      inputs: [{ name: 'token', type: 'esdt', position: 'transfer', source: 'field' }],
    }

    const actual = await subject.createTransactionForExecute(action, ['esdt:WARP-123456|0|1000000000000000000'])

    expect(actual.data?.toString()).toBe('ESDTTransfer@574152502d313233343536@0de0b6b3a7640000@7465737446756e63')
  })

  it('createTransactionForExecute - creates a contract call with scaled value from field', async () => {
    const subject = new WarpActionExecutor(Config)

    const action: WarpContractAction = {
      type: 'contract',
      label: 'stake',
      address: 'erd1qqqqqqqqqqqqqqqpqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqplllst77y4l',
      func: 'delegate',
      args: [],
      gasLimit: 1000000,
      inputs: [{ name: 'value', type: 'biguint', position: 'value', source: 'field', modifier: 'scale:18' }],
    }

    const actual = await subject.createTransactionForExecute(action, ['biguint:1'])

    expect(actual.value.toString()).toBe('1000000000000000000')
  })

  it('createTransactionForExecute - creates a contract call with modified values from url', async () => {
    Config.currentUrl = 'https://example.com/issue?name=WarpToken&ticker=WAPT&supply=1000&decimals=18'
    const subject = new WarpActionExecutor(Config)

    const action: WarpContractAction = {
      type: 'contract',
      label: 'Create Token',
      address: 'erd1qqqqqqqqqqqqqqqpqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqzllls8a5w6u',
      func: 'issue',
      args: [],
      gasLimit: 1000000,
      inputs: [
        { name: 'name', type: 'string', position: 'arg:1', source: 'query' },
        { name: 'ticker', type: 'string', position: 'arg:2', source: 'query' },
        { name: 'supply', type: 'biguint', position: 'arg:3', source: 'query', modifier: 'scale:decimals' },
        { name: 'decimals', type: 'uint8', position: 'arg:4', source: 'query' },
      ],
    }

    const actual = await subject.createTransactionForExecute(action, [])

    expect(actual.data?.toString()).toBe(`issue@${utf8ToHex('WarpToken')}@${utf8ToHex('WAPT')}@${bigIntToHex('1000000000000000000000')}@12`)
  })

  it('getExecutionResults - gets the results and messages from the transaction', async () => {
    const subject = new WarpActionExecutor(Config)
    const mockFetch = jest.fn()
    const originalFetch = global.fetch
    global.fetch = mockFetch

    mockFetch.mockImplementation(async (url) => {
      return Promise.resolve({
        json: async () => await loadAbiContents('./src/testdata/test.abi.json'),
      })
    })

    const action: WarpContractAction = {
      type: 'contract',
      label: 'test',
      description: 'test',
      address: 'erd1kc7v0lhqu0sclywkgeg4um8ea5nvch9psf2lf8t96j3w622qss8sav2zl8',
      func: 'register',
      args: [],
      abi: 'https://mock.com/esdt-safe.abi.json',
      gasLimit: 1000000,
    }

    const warp = {
      actions: [action],
      results: {
        firstEvent: 'event.registeredWithToken.1',
        secondEvent: 'event.registeredWithToken.2',
        thirdEvent: 'event.registeredWithToken.3',
        fourthEvent: 'event.registeredWithToken.4',
        firstOut: 'out.0',
        secondOut: 'out.1',
        thirdOut: 'out.2',
      },
      messages: {
        success: 'You have successfully registered {{firstEvent}} with duration {{thirdEvent}}',
        identifier: 'Your registration has the id: {{secondOut}}',
      },
      next: 'some-warp',
    } as any as Warp

    const transactionOnNetwork = new TransactionOnNetwork({
      nonce: 7n,
      smartContractResults: [
        new SmartContractResult({
          data: Buffer.from('@6f6b@10'),
          logs: new TransactionLogs({
            events: [
              new TransactionEvent({
                identifier: 'register',
                topics: [
                  Buffer.from('cmVnaXN0ZXJlZFdpdGhUb2tlbg==', 'base64'),
                  Buffer.from('AAAAAAAAAAAFAPWuOkANricr0lRon9WkT4jj8pSeV4c=', 'base64'),
                  Buffer.from('QUJDLTEyMzQ1Ng==', 'base64'),
                  Buffer.from('REVGLTEyMzQ1Ng==', 'base64'),
                  Buffer.from('EnUA', 'base64'),
                ],
                additionalData: [Buffer.from('AAAAAAAAA9sAAAA=', 'base64')],
              }),
            ],
          }),
        }),
      ],
    })

    const actual = await subject.getExecutionResults(warp, 1, transactionOnNetwork)

    expect(actual.results.firstEvent).toBe('ABC-123456')
    expect(actual.results.secondEvent).toBe('DEF-123456')
    expect(actual.results.thirdEvent).toBe('1209600')
    expect(actual.results.fourthEvent).toBeNull()
    expect(actual.results.firstOut).toBeNull()
    expect(actual.results.secondOut).toBe('16')
    expect(actual.results.thirdOut).toBeNull()

    expect(actual.messages.success).toBe('You have successfully registered ABC-123456 with duration 1209600')
    expect(actual.messages.identifier).toBe('Your registration has the id: 16')

    global.fetch = originalFetch
  })

  it('executeCollect - creates correct input payload structure', async () => {
    Config.currentUrl = 'https://example.com?queryParam=testValue'
    const subject = new WarpActionExecutor(Config)
    const mockFetch = jest.fn()
    const originalFetch = global.fetch
    global.fetch = mockFetch

    const action: WarpCollectAction = {
      type: 'collect',
      label: 'test',
      description: 'test',
      destination: {
        url: 'https://example.com/collect',
        method: 'POST',
        headers: {},
      },
      inputs: [
        { name: 'amount', type: 'biguint', source: 'field', position: 'arg:1' },
        { name: 'token', type: 'esdt', source: 'field', position: 'arg:2' },
        { name: 'address', type: 'address', source: 'user_wallet', position: 'arg:3' },
        { name: 'queryParam', type: 'string', source: 'query', position: 'arg:4' },
      ],
    }

    await subject.executeCollect(action, ['biguint:1000', 'esdt:WARP-123456|0|1000000000000000000'])

    expect(mockFetch).toHaveBeenCalledWith(
      'https://example.com/collect',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          inputs: {
            amount: '1000',
            token: { token: 'WARP-123456', nonce: '0', amount: '1000000000000000000' },
            address: 'erd1kc7v0lhqu0sclywkgeg4um8ea5nvch9psf2lf8t96j3w622qss8sav2zl8',
            queryParam: 'testValue',
          },
        }),
      })
    )

    global.fetch = originalFetch
  })

  it('getTxComponentsFromInputs - gets the value from the field', async () => {
    const subject = new WarpActionExecutor(Config)

    const action: WarpContractAction = {
      type: 'contract',
      label: 'test',
      description: 'test',
      address: 'erd1kc7v0lhqu0sclywkgeg4um8ea5nvch9psf2lf8t96j3w622qss8sav2zl8',
      func: null,
      args: [],
      gasLimit: 1000000,
      inputs: [{ name: 'myvalue', type: 'biguint', position: 'value', source: 'field', modifier: 'scale:18' }],
    }

    const { args, value, transfers } = await subject.getTxComponentsFromInputs(action, ['biguint:2'])

    expect(value.toString()).toBe('2000000000000000000')
    expect(args).toEqual([])
    expect(transfers).toEqual([])
  })

  it('getTxComponentsFromInputs - gets the value from the url', async () => {
    Config.currentUrl = 'https://example.com?myvalue=2000000000000000000'
    const subject = new WarpActionExecutor(Config)

    const action: WarpContractAction = {
      type: 'contract',
      label: 'test',
      description: 'test',
      address: 'erd1kc7v0lhqu0sclywkgeg4um8ea5nvch9psf2lf8t96j3w622qss8sav2zl8',
      func: null,
      args: [],
      value: '0',
      gasLimit: 1000000,
      inputs: [{ name: 'myvalue', type: 'biguint', position: 'value', source: 'query' }],
    }

    const { value } = await subject.getTxComponentsFromInputs(action, [])

    expect(value.toString()).toBe('2000000000000000000')
  })

  it('getTxComponentsFromInputs - scales an arg by fixed amount', async () => {
    const subject = new WarpActionExecutor(Config)

    const action: WarpContractAction = {
      type: 'contract',
      label: 'test',
      description: 'test',
      address: 'erd1kc7v0lhqu0sclywkgeg4um8ea5nvch9psf2lf8t96j3w622qss8sav2zl8',
      func: null,
      args: [],
      value: '0',
      gasLimit: 1000000,
      inputs: [
        { name: 'first', type: 'string', position: 'arg:1', source: 'field' },
        { name: 'second', type: 'biguint', position: 'arg:2', source: 'field', modifier: 'scale:18' },
      ],
    }

    const { args } = await subject.getTxComponentsFromInputs(action, ['string:hello', 'biguint:1'])

    expect(args[0].toString()).toBe('string:hello')
    expect(args[1].toString()).toBe('biguint:1000000000000000000')
  })

  it('getTxComponentsFromInputs - scales a inputs with decimals', async () => {
    const subject = new WarpActionExecutor(Config)

    const action: WarpContractAction = {
      type: 'contract',
      label: 'test',
      description: 'test',
      address: 'erd1kc7v0lhqu0sclywkgeg4um8ea5nvch9psf2lf8t96j3w622qss8sav2zl8',
      func: null,
      args: [],
      value: '0',
      gasLimit: 1000000,
      inputs: [
        { name: 'one', type: 'biguint', position: 'arg:1', source: 'field', modifier: 'scale:18' },
        { name: 'two', type: 'biguint', position: 'value', source: 'field', modifier: 'scale:18' },
      ],
    }

    const { args, value } = await subject.getTxComponentsFromInputs(action, ['biguint:2.2', 'biguint:0.1'])

    expect(value.toString()).toBe('100000000000000000')
    expect(args[0].toString()).toBe('biguint:2200000000000000000')
  })

  it('getTxComponentsFromInputs - scales a value by another input field', async () => {
    const subject = new WarpActionExecutor(Config)

    const action: WarpContractAction = {
      type: 'contract',
      label: 'test',
      description: 'test',
      address: 'erd1kc7v0lhqu0sclywkgeg4um8ea5nvch9psf2lf8t96j3w622qss8sav2zl8',
      func: null,
      args: ['string:hello'],
      value: '0',
      gasLimit: 1000000,
      inputs: [
        { name: 'supply', type: 'biguint', position: 'arg:2', source: 'field', modifier: 'scale:decimals' },
        { name: 'decimals', type: 'uint8', position: 'arg:3', source: 'field' },
      ],
    }

    const { args } = await subject.getTxComponentsFromInputs(action, ['biguint:1', 'uint8:18'])

    expect(args[0].toString()).toBe('string:hello')
    expect(args[1].toString()).toBe('biguint:1000000000000000000')
    expect(args[2].toString()).toBe('uint8:18')
  })

  it('getTxComponentsFromInputs - sorts the args by position index', async () => {
    const subject = new WarpActionExecutor(Config)

    const action: WarpContractAction = {
      type: 'contract',
      label: 'test',
      description: 'test',
      address: 'erd1kc7v0lhqu0sclywkgeg4um8ea5nvch9psf2lf8t96j3w622qss8sav2zl8',
      func: null,
      args: ['string:two'],
      value: '0',
      gasLimit: 1000000,
      inputs: [
        { name: 'myvalue', type: 'string', position: 'value', source: 'field', modifier: 'scale:18' },
        { name: 'three', type: 'biguint', position: 'arg:3', source: 'field', modifier: 'scale:2' },
        { name: 'four', type: 'string', position: 'arg:4', source: 'field' },
        { name: 'one', type: 'string', position: 'arg:1', source: 'field' },
      ],
    }

    const { args, value } = await subject.getTxComponentsFromInputs(action, ['biguint:1', 'biguint:5', 'string:four', 'string:one'])

    expect(args).toEqual(['string:one', 'string:two', 'biguint:500', 'string:four'])
    expect(value.toString()).toEqual('1000000000000000000')
  })

  it('getTxComponentsFromInputs - resolves esdt decimal places when no provided', async () => {
    Config.chainApiUrl = 'https://api.multiversx.com'
    const subject = new WarpActionExecutor(Config)

    const action: WarpContractAction = {
      type: 'contract',
      label: 'test',
      description: 'test',
      address: 'erd1kc7v0lhqu0sclywkgeg4um8ea5nvch9psf2lf8t96j3w622qss8sav2zl8',
      func: null,
      args: [],
      gasLimit: 1000000,
      inputs: [
        { name: 'token', type: 'esdt', position: 'arg:1', source: 'field' }, // in arguments
        { name: 'token', type: 'esdt', position: 'arg:2', source: 'field' }, // in arguments with decimal
        { name: 'token', type: 'esdt', position: 'transfer', source: 'field' }, // in transfers
      ],
    }

    const { args, transfers } = await subject.getTxComponentsFromInputs(action, [
      'esdt:USH-111e09|0|1000',
      'esdt:USH-111e09|0|1.2',
      'esdt:USH-111e09|0|1.5',
    ])

    expect(args).toEqual(['esdt:USH-111e09|0|1000000000000000000000|18', 'esdt:USH-111e09|0|1200000000000000000|18'])

    expect(transfers.length).toEqual(1)
    expect(transfers[0].token.identifier).toEqual('USH-111e09')
    expect(transfers[0].token.nonce.toString()).toEqual('0')
    expect(transfers[0].amount.toString()).toEqual('1500000000000000000')
  })

  it('getTxComponentsFromInputs - does not resolve esdt decimal places when decimal is provided', async () => {
    Config.chainApiUrl = 'https://api.multiversx.com'
    const subject = new WarpActionExecutor(Config)

    const action: WarpContractAction = {
      type: 'contract',
      label: 'test',
      description: 'test',
      address: 'erd1kc7v0lhqu0sclywkgeg4um8ea5nvch9psf2lf8t96j3w622qss8sav2zl8',
      func: null,
      args: [],
      gasLimit: 1000000,
      inputs: [{ name: 'token', type: 'esdt', position: 'arg:1', source: 'field' }],
    }

    const { args } = await subject.getTxComponentsFromInputs(action, ['esdt:USH-111e09|0|1000|2'])

    expect(args).toEqual(['esdt:USH-111e09|0|1000|2'])
  })
})

export const loadAbiContents = async (path: PathLike): Promise<any> => {
  let jsonContent: string = await fs.readFile(path, { encoding: 'utf8' })
  return JSON.parse(jsonContent)
}
