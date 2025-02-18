import { bigIntToHex, utf8ToHex } from '@multiversx/sdk-core/out/utils.codec'
import { WarpConfig, WarpContractAction } from './types'
import { WarpActionExecutor } from './WarpActionExecutor'

const Config: WarpConfig = {
  env: 'devnet',
  userAddress: 'erd1kc7v0lhqu0sclywkgeg4um8ea5nvch9psf2lf8t96j3w622qss8sav2zl8',
}

describe('WarpActionExecutor', () => {
  it('createTransactionForExecute - creates a native transfer with message', async () => {
    Config.currentUrl = 'https://example.com'
    const subject = new WarpActionExecutor(Config)

    const action: WarpContractAction = {
      type: 'contract',
      label: 'test',
      description: 'test',
      address: 'erd1kc7v0lhqu0sclywkgeg4um8ea5nvch9psf2lf8t96j3w622qss8sav2zl8',
      func: null,
      args: [],
      gasLimit: 1000000,
      inputs: [{ name: 'message', type: 'string', position: 'arg:1', source: 'field' }],
    }

    const actual = subject.createTransactionForExecute(action, ['string:hello'], [])

    expect(actual.data?.toString()).toBe('hello')
  })

  it('createTransactionForExecute - creates a contract call with scaled value from field', async () => {
    Config.currentUrl = 'https://example.com'
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

    const actual = subject.createTransactionForExecute(action, ['biguint:1'], [])

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

    const actual = subject.createTransactionForExecute(action, [], [])

    expect(actual.data?.toString()).toBe(`issue@${utf8ToHex('WarpToken')}@${utf8ToHex('WAPT')}@${bigIntToHex('1000000000000000000000')}@12`)
  })

  it('getTxComponentsFromInputs - gets the value from the field', async () => {
    Config.currentUrl = 'https://example.com'
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

    const { args, value, transfers } = subject.getTxComponentsFromInputs(action, ['biguint:2'], [])

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

    const { value } = subject.getTxComponentsFromInputs(action, [], [])

    expect(value.toString()).toBe('2000000000000000000')
  })

  it('getTxComponentsFromInputs - scales an arg by fixed amount', async () => {
    Config.currentUrl = 'https://example.com'
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

    const { args } = subject.getTxComponentsFromInputs(action, ['string:hello', 'biguint:1'], [])

    expect(args[0].toString()).toBe('string:hello')
    expect(args[1].toString()).toBe('biguint:1000000000000000000')
  })

  it('getTxComponentsFromInputs - scales a inputs with decimals', async () => {
    Config.currentUrl = 'https://example.com'
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

    const { args, value } = subject.getTxComponentsFromInputs(action, ['biguint:2.2', 'biguint:0.1'], [])

    expect(value.toString()).toBe('100000000000000000')
    expect(args[0].toString()).toBe('biguint:2200000000000000000')
  })

  it('getTxComponentsFromInputs - scales a value by another input field', async () => {
    Config.currentUrl = 'https://example.com'
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

    const { args } = subject.getTxComponentsFromInputs(action, ['biguint:1', 'uint8:18'], [])

    expect(args[0].toString()).toBe('string:hello')
    expect(args[1].toString()).toBe('biguint:1000000000000000000')
    expect(args[2].toString()).toBe('uint8:18')
  })

  it('getTxComponentsFromInputs - sorts the args by position index', async () => {
    Config.currentUrl = 'https://example.com'
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

    const { args, value } = subject.getTxComponentsFromInputs(action, ['biguint:1', 'biguint:5', 'string:four', 'string:one'], [])

    expect(args).toEqual(['string:one', 'string:two', 'biguint:500', 'string:four'])
    expect(value.toString()).toEqual('1000000000000000000')
  })
})
