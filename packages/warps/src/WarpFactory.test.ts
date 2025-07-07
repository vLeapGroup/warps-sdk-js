import { Warp, WarpChainEnv, WarpCollectAction, WarpInitConfig } from '@vleap/warps-core'
import { setupHttpMock } from './test-utils/mockHttp'
import { WarpFactory } from './WarpFactory'

const testConfig: WarpInitConfig = {
  env: 'devnet' as WarpChainEnv,
  user: {
    wallet: 'erd1kc7v0lhqu0sclywkgeg4um8ea5nvch9psf2lf8t96j3w622qss8sav2zl8',
  },
  currentUrl: 'https://example.com',
}

describe('WarpFactory', () => {
  it('executeCollect - creates correct input payload structure', async () => {
    testConfig.currentUrl = 'https://example.com?queryParam=testValue'
    const subject = new WarpFactory(testConfig)
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
        token: {}, // TODO: implement handling for custom adapter types
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
})
