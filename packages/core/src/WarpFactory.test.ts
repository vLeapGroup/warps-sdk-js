import { WarpConstants } from './constants'
import { WarpAction, WarpChainInfo, WarpInitConfig } from './types'
import { WarpFactory } from './WarpFactory'
import { WarpUtils } from './WarpUtils'

describe('WarpFactory', () => {
  const config: WarpInitConfig = {
    env: 'devnet',
    user: { wallet: 'erd1testwallet' },
    currentUrl: 'https://example.com?foo=bar',
  }
  const chain: WarpChainInfo = {
    name: 'multiversx',
    displayName: 'MultiversX',
    chainId: 'D',
    blockTime: 6,
    addressHrp: 'erd',
    apiUrl: 'https://api',
    explorerUrl: 'https://explorer',
    nativeToken: 'EGLD',
  }

  let chainInfoMock: jest.SpyInstance
  beforeEach(() => {
    chainInfoMock = jest.spyOn(WarpUtils, 'getChainInfoForAction').mockResolvedValue(chain)
  })
  afterEach(() => {
    chainInfoMock.mockRestore()
  })

  it('createExecutable returns expected structure', async () => {
    const factory = new WarpFactory(config)
    const warp: any = {
      meta: { hash: 'abc' },
      chain: 'multiversx',
      actions: [
        {
          type: 'transfer',
          label: 'Test',
          chain: 'multiversx',
          address: 'erd1dest',
          value: '42',
          inputs: [
            { name: 'receiver', type: 'address', position: 'arg:1', source: 'field' },
            { name: 'amount', type: 'biguint', position: 'value', source: 'field' },
          ],
        },
      ],
    }
    const result = await factory.createExecutable(warp, 1, ['address:erd1dest', 'biguint:123'])
    expect(result.destination).toBe('erd1dest')
    expect(result.value).toBe(BigInt(123))
    expect(result.args.length).toBeGreaterThan(0)
  })

  it('getResolvedInputs resolves query and user wallet', async () => {
    const factory = new WarpFactory(config)
    const action: WarpAction = {
      type: 'transfer',
      label: 'Test',
      chain: 'multiversx',
      address: 'erd1dest',
      value: '0',
      inputs: [
        { name: 'foo', type: 'string', source: 'query' } as any,
        { name: 'wallet', type: 'address', source: WarpConstants.Source.UserWallet } as any,
      ],
    }
    const result = await factory.getResolvedInputs(chain, action, ['string:ignored', 'address:ignored'])
    expect(result[0].value).toBe('string:bar')
    expect(result[1].value).toBe('address:erd1testwallet')
  })

  it('getModifiedInputs applies scale modifier', () => {
    const factory = new WarpFactory(config)
    const inputs = [{ input: { name: 'amount', type: 'biguint', modifier: 'scale:2' }, value: 'biguint:5' }]
    const result = factory.getModifiedInputs(inputs as any)
    expect(result[0].value).toBe('biguint:500')
  })

  it('preprocessInput returns input as-is for non-esdt', async () => {
    const factory = new WarpFactory(config)
    const result = await factory.preprocessInput(chain, 'biguint:123')
    expect(result).toBe('biguint:123')
  })
})
