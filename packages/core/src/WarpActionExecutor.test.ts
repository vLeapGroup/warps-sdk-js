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
  it('getPositionValueFromUrl - gets the value from the url', async () => {
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
      inputs: [
        {
          name: 'myvalue',
          type: 'biguint',
          position: 'value',
          source: 'query',
        },
      ],
    }

    const actual = subject.getPositionValueFromUrl(action, 'value')

    expect(actual).toBe('2000000000000000000')
  })

  it('getPositionValueFromUrl - returns null if the value is not found', async () => {
    const subject = new WarpActionExecutor(Config, 'https://example.com')

    const actual = subject.getPositionValueFromUrl({} as WarpContractAction, 'value')

    expect(actual).toBeNull()
  })

  it('getTypedArgsWithInputs - returns the typed args', async () => {
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
})
