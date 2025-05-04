import { Warp, WarpConfig } from './types'
import { WarpValidator } from './WarpValidator'

describe('WarpValidator', () => {
  const defaultConfig: WarpConfig = {
    env: 'devnet',
    userAddress: 'erd1kc7v0lhqu0sclywkgeg4um8ea5nvch9psf2lf8t96j3w622qss8sav2zl8',
    currentUrl: 'https://example.com',
  }

  const createWarp = (overrides: Partial<Warp> = {}): Warp => ({
    protocol: 'test',
    name: 'test',
    title: 'test',
    description: 'test',
    actions: [],
    ...overrides,
  })

  it('validates a valid warp', async () => {
    const validator = new WarpValidator(defaultConfig)
    const warp = createWarp()
    await expect(validator.validate(warp)).resolves.not.toThrow()
  })

  describe('ensureMaxOneValuePosition', () => {
    it('allows zero value position actions', async () => {
      const validator = new WarpValidator(defaultConfig)
      const warp = createWarp({
        actions: [
          { type: 'transfer', label: 'test', description: 'test', address: 'erd1...' },
          { type: 'transfer', label: 'test', description: 'test', address: 'erd1...' },
        ],
      })
      await expect(validator.validate(warp)).resolves.not.toThrow()
    })

    it('allows one value position action', async () => {
      const validator = new WarpValidator(defaultConfig)
      const warp = createWarp({
        actions: [
          {
            type: 'transfer',
            label: 'test',
            description: 'test',
            address: 'erd1...',
            inputs: [{ name: 'value', type: 'biguint', position: 'value', source: 'field' }],
          },
          { type: 'transfer', label: 'test', description: 'test', address: 'erd1...' },
        ],
      })
      await expect(validator.validate(warp)).resolves.not.toThrow()
    })

    it('throws when multiple value position actions exist', async () => {
      const validator = new WarpValidator(defaultConfig)
      const warp = createWarp({
        actions: [
          {
            type: 'transfer',
            label: 'test',
            description: 'test',
            address: 'erd1...',
            inputs: [{ name: 'value', type: 'biguint', position: 'value', source: 'field' }],
          },
          {
            type: 'transfer',
            label: 'test',
            description: 'test',
            address: 'erd1...',
            inputs: [{ name: 'value', type: 'biguint', position: 'value', source: 'field' }],
          },
        ],
      })
      await expect(validator.validate(warp)).rejects.toThrow('WarpBuilder: only one value position action is allowed')
    })
  })

  describe('ensureVariableNamesAndResultNamesUppercase', () => {
    it('allows uppercase variable names', async () => {
      const validator = new WarpValidator(defaultConfig)
      const warp = createWarp({
        vars: {
          TEST: 'value',
          ANOTHER_TEST: 'value',
        },
      })
      await expect(validator.validate(warp)).resolves.not.toThrow()
    })

    it('allows uppercase result names', async () => {
      const validator = new WarpValidator(defaultConfig)
      const warp = createWarp({
        results: {
          TEST: 'value',
          ANOTHER_TEST: 'value',
        },
      })
      await expect(validator.validate(warp)).resolves.not.toThrow()
    })

    it('throws when variable name is not uppercase', async () => {
      const validator = new WarpValidator(defaultConfig)
      const warp = createWarp({
        vars: {
          test: 'value',
        },
      })
      await expect(validator.validate(warp)).rejects.toThrow("WarpValidator: variable/result name 'test' must be uppercase")
    })

    it('throws when result name is not uppercase', async () => {
      const validator = new WarpValidator(defaultConfig)
      const warp = createWarp({
        results: {
          test: 'value',
        },
      })
      await expect(validator.validate(warp)).rejects.toThrow("WarpValidator: variable/result name 'test' must be uppercase")
    })
  })

  describe('ensureAbiIsSetIfApplicable', () => {
    it('allows contract action with results', async () => {
      const validator = new WarpValidator(defaultConfig)
      const warp = createWarp({
        actions: [
          {
            type: 'contract',
            label: 'test',
            description: 'test',
            address: 'erd1...',
            func: 'test',
            args: [],
            gasLimit: 1000000,
          },
        ],
        results: {
          TEST: 'value',
        },
      })
      await expect(validator.validate(warp)).resolves.not.toThrow()
    })

    it('allows query action with results', async () => {
      const validator = new WarpValidator(defaultConfig)
      const warp = createWarp({
        actions: [
          {
            type: 'query',
            label: 'test',
            description: 'test',
            address: 'erd1...',
            func: 'test',
            args: [],
          },
        ],
        results: {
          TEST: 'value',
        },
      })
      await expect(validator.validate(warp)).resolves.not.toThrow()
    })

    it('throws when contract action has no results', async () => {
      const validator = new WarpValidator(defaultConfig)
      const warp = createWarp({
        actions: [
          {
            type: 'contract',
            label: 'test',
            description: 'test',
            address: 'erd1...',
            func: 'test',
            args: [],
            gasLimit: 1000000,
          },
        ],
      })
      await expect(validator.validate(warp)).rejects.toThrow('WarpValidator: results are required if there are contract or query actions')
    })

    it('throws when query action has no results', async () => {
      const validator = new WarpValidator(defaultConfig)
      const warp = createWarp({
        actions: [
          {
            type: 'query',
            label: 'test',
            description: 'test',
            address: 'erd1...',
            func: 'test',
            args: [],
          },
        ],
      })
      await expect(validator.validate(warp)).rejects.toThrow('WarpValidator: results are required if there are contract or query actions')
    })
  })

  describe('ensureValidSchema', () => {
    it('validates against schema', async () => {
      const validator = new WarpValidator(defaultConfig)
      const warp = createWarp()
      await expect(validator.validate(warp)).resolves.not.toThrow()
    })

    it('throws when schema validation fails', async () => {
      const validator = new WarpValidator(defaultConfig)
      const warp = createWarp({
        actions: [
          // @ts-expect-error - intentionally invalid action type
          { type: 'invalid', label: 'test', description: 'test' },
        ],
      })
      await expect(validator.validate(warp)).rejects.toThrow('WarpValidator: schema validation failed')
    })
  })
})
