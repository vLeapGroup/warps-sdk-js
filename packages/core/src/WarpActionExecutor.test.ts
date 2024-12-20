import {
  Address,
  AddressValue,
  BigUIntValue,
  BooleanValue,
  BytesValue,
  U16Value,
  U32Value,
  U64Value,
  U8Value,
} from '@multiversx/sdk-core/out'
import { WarpConfig, WarpContractAction } from './types'
import { WarpActionExecutor } from './WarpActionExecutor'

const Config: WarpConfig = {
  env: 'devnet',
  userAddress: 'erd1kc7v0lhqu0sclywkgeg4um8ea5nvch9psf2lf8t96j3w622qss8sav2zl8',
}

describe('WarpActionExecutor', () => {
  it('getNativeValueFromField - gets the value from the field', async () => {
    const subject = new WarpActionExecutor(Config, 'https://example.com')

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

    const modified = subject.getModifiedInputs(action, ['biguint:2'])

    const actual = subject.getNativeValueFromField(action, modified)

    expect(actual).toBe('2000000000000000000')
  })

  it('getNativeValueFromUrl - gets the value from the url', async () => {
    const subject = new WarpActionExecutor(Config, 'https://example.com?myvalue=2000000000000000000')

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

    const actual = subject.getNativeValueFromUrl(action)

    expect(actual).toBe('2000000000000000000')
  })

  it('getNativeValueFromUrl - returns null if the value is not found', async () => {
    const subject = new WarpActionExecutor(Config, 'https://example.com')

    const actual = subject.getNativeValueFromUrl({} as WarpContractAction)

    expect(actual).toBeNull()
  })

  it('getTypedArgsFromInput - returns the typed args', async () => {
    const subject = new WarpActionExecutor(Config, 'https://example.com')

    const actual = subject.getTypedArgsFromInput([
      'string:hello',
      'uint8:1',
      'uint16:2',
      'uint32:3',
      'uint64:4',
      'biguint:5',
      'boolean:true',
      'address:erd1kc7v0lhqu0sclywkgeg4um8ea5nvch9psf2lf8t96j3w622qss8sav2zl8',
    ])

    expect(actual).toEqual([
      BytesValue.fromUTF8('hello'),
      new U8Value(1),
      new U16Value(2),
      new U32Value(3),
      new U64Value(4),
      new BigUIntValue(5),
      new BooleanValue(true),
      new AddressValue(Address.fromBech32('erd1kc7v0lhqu0sclywkgeg4um8ea5nvch9psf2lf8t96j3w622qss8sav2zl8')),
    ])
  })

  it('getModifiedInputArgs - scales a value', async () => {
    const subject = new WarpActionExecutor(Config, 'https://example.com')

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

    const actual = subject.getModifiedInputs(action, ['string:hello', 'biguint:1'])

    expect(actual[0].toString()).toBe('string:hello')
    expect(actual[1].toString()).toBe('biguint:1000000000000000000')
  })

  it('getModifiedInputArgs - scales a value by another input field', async () => {
    const subject = new WarpActionExecutor(Config, 'https://example.com')

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

    const combined = subject.getCombinedInputs(action, ['biguint:1', 'uint8:18'])
    const actual = subject.getModifiedInputs(action, combined)

    expect(actual[0].toString()).toBe('string:hello')
    expect(actual[1].toString()).toBe('biguint:1000000000000000000')
    expect(actual[2].toString()).toBe('uint8:18')
  })

  it('getCombinedInputs - sorts the args by position index', async () => {
    const subject = new WarpActionExecutor(Config, 'https://example.com')

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
        { name: 'myvalue', type: 'string', position: 'value', source: 'field' },
        { name: 'three', type: 'string', position: 'arg:3', source: 'field' },
        { name: 'four', type: 'string', position: 'arg:4', source: 'field' },
        { name: 'mytransfer', type: 'string', position: 'transfer', source: 'field' },
        { name: 'one', type: 'string', position: 'arg:1', source: 'field' },
      ],
    }

    const actual = subject.getCombinedInputs(action, ['string:three', 'string:four', 'string:one'])

    expect(actual).toEqual(['string:one', 'string:two', 'string:three', 'string:four'])
  })
})
