import { WarpInitConfig } from '@vleap/warps'
import { WarpBuilder } from './WarpBuilder'

const Config: WarpInitConfig = {
  env: 'devnet',
  user: {
    wallet: 'erd1kc7v0lhqu0sclywkgeg4um8ea5nvch9psf2lf8t96j3w622qss8sav2zl8',
  },
  repository: {
    chain: 'testchain',
    builder: class {
      createInscriptionTransaction() {
        return {}
      }
      createFromTransaction() {
        return Promise.resolve({ protocol: '', name: '', title: '', description: '', actions: [] })
      }
      createFromTransactionHash() {
        return Promise.resolve(null)
      }
    },
    executor: class {
      createTransaction() {
        return Promise.resolve({})
      }
      preprocessInput() {
        return Promise.resolve('')
      }
    },
    results: class {
      getTransactionExecutionResults() {
        return Promise.resolve({
          success: true,
          warp: { protocol: '', name: '', title: '', description: '', actions: [] },
          action: 0,
          user: null,
          txHash: null,
          next: null,
          values: [],
          results: {},
          messages: {},
        })
      }
    },
    serializer: class {
      typedToString() {
        return ''
      }
      typedToNative() {
        return ['', ''] as [string, any]
      }
      nativeToTyped() {
        return ''
      }
      nativeToType() {
        return ''
      }
      stringToTyped() {
        return ''
      }
      stringToNative(value: string) {
        return ['', '']
      }
    },
    registry: class {
      createWarpRegisterTransaction() {
        return {}
      }
      createWarpUnregisterTransaction() {
        return {}
      }
      createWarpUpgradeTransaction() {
        return {}
      }
      createWarpAliasSetTransaction() {
        return {}
      }
      createWarpVerifyTransaction() {
        return {}
      }
      createWarpTransferOwnershipTransaction() {
        return {}
      }
      createBrandRegisterTransaction() {
        return {}
      }
      createWarpBrandingTransaction() {
        return {}
      }
      getInfoByAlias() {
        return Promise.resolve({ registryInfo: null, brand: null })
      }
      getInfoByHash() {
        return Promise.resolve({ registryInfo: null, brand: null })
      }
      getUserWarpRegistryInfos() {
        return Promise.resolve([])
      }
      getUserBrands() {
        return Promise.resolve([])
      }
      getChainInfos() {
        return Promise.resolve([])
      }
      getChainInfo() {
        return Promise.resolve(null)
      }
      setChain() {
        return Promise.resolve({})
      }
      removeChain() {
        return Promise.resolve({})
      }
      fetchBrand() {
        return Promise.resolve(null)
      }
    },
  },
  adapters: [],
}

describe('WarpBuilder', () => {
  it('creates a warp', async () => {
    const warp = await new WarpBuilder(Config)
      .setName('testname')
      .setTitle('test title')
      .setDescription('test description')
      .setPreview('test preview')
      .addAction({
        type: 'link',
        label: 'test link',
        url: 'https://test.com',
      })
      .build()

    expect(warp.name).toBe('testname')
    expect(warp.title).toBe('test title')
    expect(warp.description).toBe('test description')
    expect(warp.preview).toBe('test preview')
    expect(warp.actions).toEqual([{ type: 'link', label: 'test link', url: 'https://test.com' }])
  })

  it('getDescriptionPreview - strips all html', () => {
    const preview = new WarpBuilder(Config).getDescriptionPreview('<p>test<br />preview description</p>')
    expect(preview).toBe('test preview description')
  })
})
