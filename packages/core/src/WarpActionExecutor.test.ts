import { SmartContractResult, TransactionEvent, TransactionLogs, TransactionOnNetwork } from '@multiversx/sdk-core/out'
import { bigIntToHex, utf8ToHex } from '@multiversx/sdk-core/out/core/utils.codec'
import { promises as fs, PathLike } from 'fs'
import { setupHttpMock } from './test-utils/mockHttp'
import { Warp, WarpCollectAction, WarpInitConfig as WarpConfig, WarpContractAction, WarpQueryAction, WarpTransferAction } from './types'
import { WarpActionExecutor } from './WarpActionExecutor'
import { WarpUtils } from './WarpUtils'

const testConfig: WarpConfig = {
  env: 'devnet',
  user: {
    wallet: 'erd1kc7v0lhqu0sclywkgeg4um8ea5nvch9psf2lf8t96j3w622qss8sav2zl8',
  },
  currentUrl: 'https://example.com',
}

describe('WarpActionExecutor', () => {
  it('createTransactionForExecute - creates a native transfer with message', async () => {
    const subject = new WarpActionExecutor(testConfig)

    const action: WarpTransferAction = {
      type: 'transfer',
      label: 'test',
      description: 'test',
      address: 'erd1kc7v0lhqu0sclywkgeg4um8ea5nvch9psf2lf8t96j3w622qss8sav2zl8',
      data: 'string:hello',
    }

    const warp = {
      actions: [action],
    } as any as Warp

    const actual = await subject.createTransactionForExecute(warp, 1, [])

    expect(Buffer.from(actual.data).toString('utf-8')).toBe('hello')
  })

  it('createTransactionForExecute - creates a native transfer with message from input', async () => {
    const subject = new WarpActionExecutor(testConfig)

    const action: WarpTransferAction = {
      type: 'transfer',
      label: 'test',
      description: 'test',
      address: 'erd1kc7v0lhqu0sclywkgeg4um8ea5nvch9psf2lf8t96j3w622qss8sav2zl8',
      inputs: [{ name: 'message', type: 'string', position: 'data', source: 'field' }],
    }

    const warp = {
      actions: [action],
    } as any as Warp

    const actual = await subject.createTransactionForExecute(warp, 1, ['string:hello'])

    expect(Buffer.from(actual.data).toString('utf-8')).toBe('hello')
  })

  it('createTransactionForExecute - creates a native transfer field-based receiver', async () => {
    const subject = new WarpActionExecutor(testConfig)

    const action: WarpTransferAction = {
      type: 'transfer',
      label: 'test',
      description: 'test',
      value: '1000000000000000000',
      inputs: [{ name: 'Receiver', type: 'address', position: 'receiver', source: 'field' }],
    }

    const warp = {
      actions: [action],
    } as any as Warp

    const actual = await subject.createTransactionForExecute(warp, 1, [
      'address:erd1kc7v0lhqu0sclywkgeg4um8ea5nvch9psf2lf8t96j3w622qss8sav2zl8',
    ])

    expect(actual.receiver.toString()).toBe('erd1kc7v0lhqu0sclywkgeg4um8ea5nvch9psf2lf8t96j3w622qss8sav2zl8')
    expect(actual.data?.toString()).toBe('')
    expect(actual.value.toString()).toBe('1000000000000000000')
  })

  it('createTransactionForExecute - creates a native transfer with esdt from field', async () => {
    const subject = new WarpActionExecutor(testConfig)

    const action: WarpTransferAction = {
      type: 'transfer',
      label: 'test',
      description: 'test',
      address: 'erd1kc7v0lhqu0sclywkgeg4um8ea5nvch9psf2lf8t96j3w622qss8sav2zl8',
      inputs: [{ name: 'token', type: 'esdt', position: 'transfer', source: 'field' }],
    }

    const warp = {
      actions: [action],
    } as any as Warp

    const actual = await subject.createTransactionForExecute(warp, 1, ['esdt:WARP-123456|0|1000000000000000000'])

    expect(actual.data?.toString()).toBe('ESDTTransfer@574152502d313233343536@0de0b6b3a7640000')
  })

  it('createTransactionForExecute - creates a contract call with esdt transfer from field', async () => {
    const subject = new WarpActionExecutor(testConfig)

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

    const warp = {
      actions: [action],
    } as any as Warp

    const actual = await subject.createTransactionForExecute(warp, 1, ['esdt:WARP-123456|0|1000000000000000000'])

    expect(actual.data?.toString()).toBe('ESDTTransfer@574152502d313233343536@0de0b6b3a7640000@7465737446756e63')
  })

  it('createTransactionForExecute - creates a contract call with scaled value from field', async () => {
    const subject = new WarpActionExecutor(testConfig)

    const action: WarpContractAction = {
      type: 'contract',
      label: 'stake',
      address: 'erd1qqqqqqqqqqqqqqqpqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqplllst77y4l',
      func: 'delegate',
      args: [],
      gasLimit: 1000000,
      inputs: [{ name: 'value', type: 'biguint', position: 'value', source: 'field', modifier: 'scale:18' }],
    }

    const warp = {
      actions: [action],
    } as any as Warp

    const actual = await subject.createTransactionForExecute(warp, 1, ['biguint:1'])

    expect(actual.value.toString()).toBe('1000000000000000000')
  })

  it('createTransactionForExecute - creates a contract call with modified values from url', async () => {
    testConfig.currentUrl = 'https://example.com/issue?name=WarpToken&ticker=WAPT&supply=1000&decimals=18'
    const subject = new WarpActionExecutor(testConfig)

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

    const warp = {
      actions: [action],
    } as any as Warp

    const actual = await subject.createTransactionForExecute(warp, 1, [])

    expect(actual.data?.toString()).toBe(`issue@${utf8ToHex('WarpToken')}@${utf8ToHex('WAPT')}@${bigIntToHex('1000000000000000000000')}@12`)
  })

  it('getTransactionExecutionResults - gets the results and messages from the transaction', async () => {
    const subject = new WarpActionExecutor(testConfig)
    const httpMock = setupHttpMock()

    httpMock.registerResponse('https://mock.com/test.abi.json', await loadAbiContents('./src/testdata/test.abi.json'))

    const action: WarpContractAction = {
      type: 'contract',
      label: 'test',
      description: 'test',
      address: 'erd1kc7v0lhqu0sclywkgeg4um8ea5nvch9psf2lf8t96j3w622qss8sav2zl8',
      func: 'register',
      args: [],
      abi: 'https://mock.com/test.abi.json',
      gasLimit: 1000000,
    }

    const warp = {
      actions: [action],
      results: {
        FIRST_EVENT: 'event.registeredWithToken.1',
        SECOND_EVENT: 'event.registeredWithToken.2',
        THIRD_EVENT: 'event.registeredWithToken.3',
        FOURTH_EVENT: 'event.registeredWithToken.4',
        FIRST_OUT: 'out.0',
        SECOND_OUT: 'out.1',
        THIRD_OUT: 'out.2',
      },
      messages: {
        success: 'You have successfully registered {{FIRST_EVENT}} with duration {{THIRD_EVENT}}',
        identifier: 'Your registration has the id: {{SECOND_OUT}}',
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

    const actual = await subject.getTransactionExecutionResults(warp, 1, transactionOnNetwork)

    expect(actual.results.FIRST_EVENT).toBe('ABC-123456')
    expect(actual.results.SECOND_EVENT).toBe('DEF-123456')
    expect(actual.results.THIRD_EVENT).toBe('1209600')
    expect(actual.results.FOURTH_EVENT).toBeNull()
    expect(actual.results.FIRST_OUT).toBeNull()
    expect(actual.results.SECOND_OUT).toBe('16')
    expect(actual.results.THIRD_OUT).toBeNull()

    expect(actual.messages.success).toBe('You have successfully registered ABC-123456 with duration 1209600')
    expect(actual.messages.identifier).toBe('Your registration has the id: 16')

    httpMock.cleanup()
  })

  it('executeQuery - gets the results and messages from the query', async () => {
    const subject = new WarpActionExecutor(testConfig)
    const httpMock = setupHttpMock()

    httpMock.registerResponse('https://mock.com/test.abi.json', await loadAbiContents('./src/testdata/test.abi.json'))

    httpMock.registerResponse('https://devnet-api.multiversx.com/query', {
      returnData: [
        'Ws6WB9vXH5fBJp/xjWSWUfa+go9DW+GQDTDNStbt/Fc=',
        'cGVlcm1laHEsNi42LA==',
        '958gsNBuF5QBNaIFhb2fl82RcrLbYSGVSupM21xiVRA=',
        'Y2hlc3N1Y2F0aW9uLDYuNiUs',
        '+ypwllq05g8Zsgoeib5g8iq9DSTD0EiU481+Y0cXQEc=',
        'bWljaGF2aWVfLDYuNiUs',
        'X/+USeMmAVTAiBjLU9K17JkjQ6PBCqkwMx79ObB2mD4=',
        'dGhlZXdlYjNnZWVrICxDLA==',
        'YQyiqQwRK+AlBa64eUiYgfUWbG29grdGiwH3Hwpquhw=',
        'QHhzeWxsYV8sNi42JSw=',
        'EkcdYkCE6/s0qapeAJE1OEzs0lBwEy4NXdQZeGYxcjs=',
        'ZHZ6X0FJLEMpIDYuNiUsZHZ6X0FJLEMpIDYuNiUs',
      ],
      returnCode: 'ok',
      gasRemaining: 299996465215,
      gasRefund: 0,
      outputAccounts: {
        '00000000000000000500badf3bafd1cb915d98679b4e565027c246494be9fc57': {
          address: 'erd1qqqqqqqqqqqqqpgqht0nht73ewg4mxr8nd89v5p8cfryjjlfl3tskqtqpw',
          nonce: 0,
          balanceDelta: 0,
          storageUpdates: {},
          callType: 0,
        },
      },
    })

    const action: WarpQueryAction = {
      type: 'query',
      label: 'test',
      description: 'test',
      address: 'erd1qqqqqqqqqqqqqqqpqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqplllst77y4l',
      func: 'getParticipations',
      args: ['uint64:1'],
      abi: 'https://mock.com/test.abi.json',
    }

    const warp = {
      actions: [action],
      results: {
        FIRST_ADDRESS: 'out.1.1.1',
        FIRST_VALUE: 'out.1.1.2',
        SECOND_ADDRESS: 'out.1.2.1',
        SECOND_VALUE: 'out.1.2.2',
        THIRD_ADDRESS: 'out.1.3.1',
        THIRD_VALUE: 'out.1.3.2',
        NULL_VALUE: 'out.2.1.1',
      },
      messages: {
        first: '{{FIRST_ADDRESS}} has {{FIRST_VALUE}}',
        second: '{{SECOND_ADDRESS}} has {{SECOND_VALUE}}',
        third: '{{THIRD_ADDRESS}} has {{THIRD_VALUE}}',
      },
    } as any as Warp

    const actual = await subject.executeQuery(warp, 1, ['address:erd1kc7v0lhqu0sclywkgeg4um8ea5nvch9psf2lf8t96j3w622qss8sav2zl8'])

    expect(actual.results.FIRST_ADDRESS).toEqual('erd1tt8fvp7m6u0e0sfxnlcc6eyk28mtaq50gdd7ryqdxrx544hdl3tsqqk9uw')
    expect(actual.results.FIRST_VALUE).toEqual('706565726d6568712c362e362c')
    expect(actual.results.SECOND_ADDRESS).toEqual('erd1770jpvxsdctegqf45gzct0vljlxezu4jmdsjr922afxdkhrz25gqv9qcsw')
    expect(actual.results.SECOND_VALUE).toEqual('636865737375636174696f6e2c362e36252c')
    expect(actual.results.THIRD_ADDRESS).toEqual('erd1lv48p9j6knnq7xdjpg0gn0nq7g4t6rfyc0gy398re4lxx3chgprsx5hmfu')
    expect(actual.results.THIRD_VALUE).toEqual('6d696368617669655f2c362e36252c')
    expect(actual.results.NULL_VALUE).toBeNull()

    expect(actual.messages.first).toEqual('erd1tt8fvp7m6u0e0sfxnlcc6eyk28mtaq50gdd7ryqdxrx544hdl3tsqqk9uw has 706565726d6568712c362e362c')
    expect(actual.messages.second).toEqual(
      'erd1770jpvxsdctegqf45gzct0vljlxezu4jmdsjr922afxdkhrz25gqv9qcsw has 636865737375636174696f6e2c362e36252c'
    )

    httpMock.cleanup()
  })

  it('executeCollect - creates correct input payload structure', async () => {
    testConfig.currentUrl = 'https://example.com?queryParam=testValue'
    const subject = new WarpActionExecutor(testConfig)
    const httpMock = setupHttpMock()

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
        { name: 'address', type: 'address', source: 'user:wallet', position: 'arg:3' },
        { name: 'queryParam', type: 'string', source: 'query', position: 'arg:4' },
      ],
    }

    const warp = {
      actions: [action],
      results: {
        USERNAME: 'out.data.username',
        ID: 'out.data.id',
        ALL: 'out',
      },
      messages: {
        successRegistration: 'Your registration has the username: {{USERNAME}}',
        successIdentifier: 'Your registration has the id: {{ID}}',
      },
    } as any as Warp

    httpMock.registerResponse('https://example.com/collect', {
      data: {
        username: 'abcdef',
        id: '12',
      },
    })

    const actual = await subject.executeCollect(warp, 1, ['biguint:1000', 'esdt:WARP-123456|0|1000000000000000000|18'])

    httpMock.assertCall('https://example.com/collect', {
      method: 'POST',
      body: {
        amount: '1000',
        token: { token: 'WARP-123456', nonce: '0', amount: '1000000000000000000' },
        address: 'erd1kc7v0lhqu0sclywkgeg4um8ea5nvch9psf2lf8t96j3w622qss8sav2zl8',
        queryParam: 'testValue',
      },
    })

    expect(actual.success).toBe(true)
    expect(actual.results).toEqual({
      USERNAME: 'abcdef',
      ID: '12',
      ALL: { username: 'abcdef', id: '12' },
      _DATA: {
        data: {
          username: 'abcdef',
          id: '12',
        },
      },
    })
    expect(actual.messages).toEqual({
      successRegistration: 'Your registration has the username: abcdef',
      successIdentifier: 'Your registration has the id: 12',
    })

    httpMock.cleanup()
  })

  it('getTxComponentsFromInputs - gets the value from the field', async () => {
    const subject = new WarpActionExecutor(testConfig)

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
    testConfig.currentUrl = 'https://example.com?myvalue=2000000000000000000'
    const subject = new WarpActionExecutor(testConfig)

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
    const subject = new WarpActionExecutor(testConfig)

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
    const subject = new WarpActionExecutor(testConfig)

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
    const subject = new WarpActionExecutor(testConfig)

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
    const subject = new WarpActionExecutor(testConfig)

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

  it('getTxComponentsFromInputs - resolves esdt decimal places from network when no provided', async () => {
    const config: WarpConfig = { ...testConfig, env: 'mainnet' }
    const subject = new WarpActionExecutor(config)
    const httpMock = setupHttpMock()

    httpMock.registerResponse('https://api.multiversx.com/tokens/USH-111e09', {
      identifier: 'USH-111e09',
      name: 'Test Token',
      decimals: 18,
    })

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

    httpMock.cleanup()
  })

  it('getTxComponentsFromInputs - resolves esdt decimal places from known tokens when no provided', async () => {
    const config: WarpConfig = { ...testConfig, env: 'mainnet' }
    const subject = new WarpActionExecutor(config)

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
      'esdt:EGLD-000000|0|1000',
      'esdt:EGLD-000000|0|1.2',
      'esdt:EGLD-000000|0|1.5',
    ])

    expect(args).toEqual(['esdt:EGLD-000000|0|1000000000000000000000|18', 'esdt:EGLD-000000|0|1200000000000000000|18'])

    expect(transfers.length).toEqual(1)
    expect(transfers[0].token.identifier).toEqual('EGLD-000000')
    expect(transfers[0].token.nonce.toString()).toEqual('0')
    expect(transfers[0].amount.toString()).toEqual('1500000000000000000')
  })

  it('getTxComponentsFromInputs - does not resolve esdt decimal places when decimal is provided', async () => {
    const subject = new WarpActionExecutor(testConfig)

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

  it('getTxComponentsFromInputs - converts single native token ESDT transfer to native value', async () => {
    const subject = new WarpActionExecutor(testConfig)

    const action: WarpContractAction = {
      type: 'contract',
      label: 'test',
      description: 'test',
      address: 'erd1kc7v0lhqu0sclywkgeg4um8ea5nvch9psf2lf8t96j3w622qss8sav2zl8',
      func: null,
      args: [],
      gasLimit: 1000000,
      inputs: [{ name: 'nativeTransfer', type: 'esdt', position: 'transfer', source: 'field' }],
    }

    const { value, transfers } = await subject.getTxComponentsFromInputs(action, ['esdt:EGLD-000000|0|1.5'])

    expect(value.toString()).toBe('1500000000000000000')
    expect(transfers).toEqual([])
  })

  it('getTxComponentsFromInputs - does not convert native ESDT when other ESDT tokens present', async () => {
    const subject = new WarpActionExecutor(testConfig)

    const action: WarpContractAction = {
      type: 'contract',
      label: 'test',
      description: 'test',
      address: 'erd1kc7v0lhqu0sclywkgeg4um8ea5nvch9psf2lf8t96j3w622qss8sav2zl8',
      func: null,
      args: [],
      gasLimit: 1000000,
      inputs: [
        { name: 'tokenArg', type: 'esdt', position: 'arg:1', source: 'field' },
        { name: 'nativeTransfer', type: 'esdt', position: 'transfer', source: 'field' },
      ],
    }

    const { value, transfers } = await subject.getTxComponentsFromInputs(action, ['esdt:USDC-c76f1f|0|1000000', 'esdt:EGLD-000000|0|1.5'])

    expect(value.toString()).toBe('0')
    expect(transfers.length).toBe(1)
    expect(transfers[0].token.identifier).toBe('EGLD-000000')
  })

  it('getTxComponentsFromInputs - converts native ESDT and adds to existing value', async () => {
    const subject = new WarpActionExecutor(testConfig)

    const action: WarpContractAction = {
      type: 'contract',
      label: 'test',
      description: 'test',
      address: 'erd1kc7v0lhqu0sclywkgeg4um8ea5nvch9psf2lf8t96j3w622qss8sav2zl8',
      func: null,
      args: [],
      value: '500000000000000000',
      gasLimit: 1000000,
      inputs: [{ name: 'nativeTransfer', type: 'esdt', position: 'transfer', source: 'field' }],
    }

    const { value, transfers } = await subject.getTxComponentsFromInputs(action, ['esdt:EGLD-000000|0|1'])

    expect(value.toString()).toBe('1500000000000000000')
    expect(transfers).toEqual([])
  })

  it('getTxComponentsFromInputs - does not convert native ESDT when multiple transfers exist', async () => {
    const subject = new WarpActionExecutor(testConfig)

    const action: WarpContractAction = {
      type: 'contract',
      label: 'test',
      description: 'test',
      address: 'erd1kc7v0lhqu0sclywkgeg4um8ea5nvch9psf2lf8t96j3w622qss8sav2zl8',
      func: null,
      args: [],
      gasLimit: 1000000,
      inputs: [
        { name: 'nativeTransfer', type: 'esdt', position: 'transfer', source: 'field' },
        { name: 'tokenTransfer', type: 'esdt', position: 'transfer', source: 'field' },
      ],
    }

    const { value, transfers } = await subject.getTxComponentsFromInputs(action, ['esdt:EGLD-000000|0|1.5', 'esdt:USDC-c76f1f|0|1000000'])

    expect(value.toString()).toBe('0')
    expect(transfers.length).toBe(2)
    expect(transfers[0].token.identifier).toBe('EGLD-000000')
    expect(transfers[0].amount.toString()).toBe('1500000000000000000')
    expect(transfers[1].token.identifier).toBe('USDC-c76f1f')
    expect(transfers[1].amount.toString()).toBe('1000000')
  })

  it('getTxComponentsFromInputs - does not convert native ESDT when transfers come from action definition', async () => {
    const subject = new WarpActionExecutor(testConfig)

    const action: WarpContractAction = {
      type: 'contract',
      label: 'test',
      description: 'test',
      address: 'erd1kc7v0lhqu0sclywkgeg4um8ea5nvch9psf2lf8t96j3w622qss8sav2zl8',
      func: null,
      args: [],
      gasLimit: 1000000,
      transfers: [
        { token: 'EGLD-000000', nonce: 0, amount: '1500000000000000000' },
        { token: 'USDC-c76f1f', nonce: 0, amount: '1000000' },
      ],
    }

    const { value, transfers } = await subject.getTxComponentsFromInputs(action, [])

    expect(value.toString()).toBe('0')
    expect(transfers.length).toBe(2)
    expect(transfers[0].token.identifier).toBe('EGLD-000000')
    expect(transfers[0].amount.toString()).toBe('1500000000000000000')
    expect(transfers[1].token.identifier).toBe('USDC-c76f1f')
    expect(transfers[1].amount.toString()).toBe('1000000')
  })

  describe('transform results', () => {
    it('evaluates transform results from collect action', async () => {
      const subject = new WarpActionExecutor(testConfig)
      const httpMock = setupHttpMock()
      httpMock.registerResponse('https://api.example.com/data', {
        users: [
          { name: 'Alice', amount: 100 },
          { name: 'Bob', amount: 200 },
        ],
      })

      const action: WarpCollectAction = {
        type: 'collect',
        label: 'Get Users',
        destination: {
          url: 'https://api.example.com/data',
        },
      }

      const warp = {
        actions: [action],
        results: {
          USERS: 'out.users',
          TOTAL: 'transform:() => { return result.USERS.reduce((sum, user) => sum + user.amount, 0) }',
          COUNT: 'transform:() => result.USERS.length',
        },
      } as any as Warp

      const execution = await subject.executeCollect(warp, 1, [])

      expect(execution.success).toBe(true)
      expect(execution.results.USERS).toEqual([
        { name: 'Alice', amount: 100 },
        { name: 'Bob', amount: 200 },
      ])
      expect(execution.results.TOTAL).toBe(300)
      expect(execution.results.COUNT).toBe(2)

      httpMock.cleanup()
    })

    it('evaluates multiple transform results that depend on each other', async () => {
      const subject = new WarpActionExecutor(testConfig)
      const httpMock = setupHttpMock()
      httpMock.registerResponse('https://api.example.com/data', { value: 10 })

      const action: WarpCollectAction = {
        type: 'collect',
        label: 'Get Value',
        destination: {
          url: 'https://api.example.com/data',
        },
      }

      const warp = {
        actions: [action],
        results: {
          BASE_VALUE: 'out.value',
          DOUBLED: 'transform:() => { return result.BASE_VALUE * 2 }',
          FINAL: 'transform:() => { return result.DOUBLED + 5 }',
        },
      } as any as Warp

      const execution = await subject.executeCollect(warp, 1, [])

      expect(execution.success).toBe(true)
      expect(execution.results.BASE_VALUE).toBe(10)
      expect(execution.results.DOUBLED).toBe(20)
      expect(execution.results.FINAL).toBe(25)

      httpMock.cleanup()
    })

    it('handles transform errors gracefully', async () => {
      const subject = new WarpActionExecutor(testConfig)
      const httpMock = setupHttpMock()
      httpMock.registerResponse('https://api.example.com/data', { value: 10 })

      const action: WarpCollectAction = {
        type: 'collect',
        label: 'Get Value',
        destination: {
          url: 'https://api.example.com/data',
        },
      }

      const warp = {
        actions: [action],
        results: {
          BASE_VALUE: 'out.value',
          ERROR_RESULT: 'transform:() => { throw new Error("Test error") }',
          VALID_RESULT: 'transform:() => { return result.BASE_VALUE * 3 }',
        },
      } as any as Warp

      const execution = await subject.executeCollect(warp, 1, [])

      expect(execution.success).toBe(true)
      expect(execution.results.BASE_VALUE).toBe(10)
      expect(execution.results.ERROR_RESULT).toBeNull()
      expect(execution.results.VALID_RESULT).toBe(30)

      httpMock.cleanup()
    })
  })

  describe('default values', () => {
    it('uses default value when input is not provided', async () => {
      const subject = new WarpActionExecutor(testConfig)

      const action: WarpContractAction = {
        type: 'contract',
        label: 'test',
        description: 'test',
        address: 'erd1qqqqqqqqqqqqqqqpqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqplllst77y4l',
        func: 'testFunc',
        args: [],
        gasLimit: 1000000,
        inputs: [
          { name: 'amount', type: 'biguint', position: 'value', source: 'field', default: 1000 },
          { name: 'message', type: 'string', position: 'data', source: 'field', default: 'hello world' },
        ],
      }

      const chain = await WarpUtils.getChainInfoForAction(testConfig, action, [])
      const resolvedInputs = await subject.getResolvedInputs(chain, action, [])

      expect(resolvedInputs).toHaveLength(2)
      expect(resolvedInputs[0].value).toBe('biguint:1000')
      expect(resolvedInputs[1].value).toBe('string:hello world')
    })

    it('prioritizes actual input over default value', async () => {
      const subject = new WarpActionExecutor(testConfig)

      const action: WarpContractAction = {
        type: 'contract',
        label: 'test',
        description: 'test',
        address: 'erd1qqqqqqqqqqqqqqqpqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqplllst77y4l',
        func: 'testFunc',
        args: [],
        gasLimit: 1000000,
        inputs: [{ name: 'amount', type: 'biguint', position: 'value', source: 'field', default: 1000 }],
      }

      const chain = await WarpUtils.getChainInfoForAction(testConfig, action, [])
      const resolvedInputs = await subject.getResolvedInputs(chain, action, ['biguint:2000'])

      expect(resolvedInputs).toHaveLength(1)
      expect(resolvedInputs[0].value).toBe('biguint:2000') // Should use actual input, not default
    })

    it('handles multiple input types with defaults', async () => {
      const subject = new WarpActionExecutor(testConfig)

      const action: WarpContractAction = {
        type: 'contract',
        label: 'test',
        description: 'test',
        address: 'erd1qqqqqqqqqqqqqqqpqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqplllst77y4l',
        func: 'testFunc',
        args: [],
        gasLimit: 1000000,
        inputs: [
          { name: 'stringField', type: 'string', position: 'arg:1', source: 'field', default: 'defaultString' },
          { name: 'numberField', type: 'uint64', position: 'arg:2', source: 'field', default: 42 },
          { name: 'boolField', type: 'bool', position: 'arg:3', source: 'field', default: false },
        ],
      }

      const chain = await WarpUtils.getChainInfoForAction(testConfig, action, [])
      const resolvedInputs = await subject.getResolvedInputs(chain, action, [])

      expect(resolvedInputs).toHaveLength(3)
      expect(resolvedInputs[0].value).toBe('string:defaultString')
      expect(resolvedInputs[1].value).toBe('uint64:42')
      expect(resolvedInputs[2].value).toBe('bool:false')
    })

    it('does not use default when no default is specified', async () => {
      const subject = new WarpActionExecutor(testConfig)

      const action: WarpContractAction = {
        type: 'contract',
        label: 'test',
        description: 'test',
        address: 'erd1qqqqqqqqqqqqqqqpqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqplllst77y4l',
        func: 'testFunc',
        args: [],
        gasLimit: 1000000,
        inputs: [
          { name: 'amount', type: 'biguint', position: 'value', source: 'field' }, // No default
        ],
      }

      const chain = await WarpUtils.getChainInfoForAction(testConfig, action, [])
      const resolvedInputs = await subject.getResolvedInputs(chain, action, [])

      expect(resolvedInputs).toHaveLength(1)
      expect(resolvedInputs[0].value).toBeNull()
    })
  })
})

const loadAbiContents = async (path: PathLike): Promise<any> => {
  let jsonContent: string = await fs.readFile(path, { encoding: 'utf8' })
  return JSON.parse(jsonContent)
}
