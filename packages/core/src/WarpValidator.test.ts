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
    const result = await validator.validate(warp)
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  describe('validateMaxOneValuePosition', () => {
    it('allows zero value position actions', async () => {
      const validator = new WarpValidator(defaultConfig)
      const warp = createWarp({
        actions: [
          { type: 'transfer', label: 'test', description: 'test', address: 'erd1...' },
          { type: 'transfer', label: 'test', description: 'test', address: 'erd1...' },
        ],
      })
      const result = await validator.validate(warp)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
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
      const result = await validator.validate(warp)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('returns error when multiple value position actions exist', async () => {
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
      const result = await validator.validate(warp)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Only one value position action is allowed')
    })
  })

  describe('validateVariableNamesAndResultNamesUppercase', () => {
    it('allows uppercase variable names', async () => {
      const validator = new WarpValidator(defaultConfig)
      const warp = createWarp({
        vars: {
          TEST: 'value',
          ANOTHER_TEST: 'value',
        },
      })
      const result = await validator.validate(warp)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('allows uppercase result names', async () => {
      const validator = new WarpValidator(defaultConfig)
      const warp = createWarp({
        results: {
          TEST: 'value',
          ANOTHER_TEST: 'value',
        },
      })
      const result = await validator.validate(warp)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('returns error when variable name is not uppercase', async () => {
      const validator = new WarpValidator(defaultConfig)
      const warp = createWarp({ vars: { test: 'value' } })
      const result = await validator.validate(warp)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain("Variable name 'test' must be uppercase")
    })

    it('returns error when result name is not uppercase', async () => {
      const validator = new WarpValidator(defaultConfig)
      const warp = createWarp({ results: { test: 'value' } })
      const result = await validator.validate(warp)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain("Result name 'test' must be uppercase")
    })
  })

  describe('validateAbiIsSetIfApplicable', () => {
    it('allows contract action with results and ABI', async () => {
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
            abi: 'hashOfAbi',
          },
        ],
        results: {
          TEST: 'value',
        },
      })
      const result = await validator.validate(warp)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('allows query action with results and ABI', async () => {
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
            abi: 'hashOfAbi',
          },
        ],
        results: {
          TEST: 'value',
        },
      })
      const result = await validator.validate(warp)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('allows contract action without results and without ABI', async () => {
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
      const result = await validator.validate(warp)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('allows query action without results and without ABI', async () => {
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
      const result = await validator.validate(warp)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('returns error when contract action has results but no ABI', async () => {
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
      const result = await validator.validate(warp)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('ABI is required when results are present for contract or query actions')
    })

    it('returns error when query action has results but no ABI', async () => {
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
      const result = await validator.validate(warp)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('ABI is required when results are present for contract or query actions')
    })
  })

  describe('validateSchema', () => {
    it('validates against schema', async () => {
      const validator = new WarpValidator(defaultConfig)
      const warp = createWarp()
      const result = await validator.validate(warp)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('returns error when schema validation fails', async () => {
      const validator = new WarpValidator(defaultConfig)
      const warp = createWarp({
        actions: [
          // @ts-expect-error - intentionally invalid action type
          { type: 'invalid', label: 'test', description: 'test' },
        ],
      })
      const result = await validator.validate(warp)
      expect(result.valid).toBe(false)
      expect(result.errors[0]).toContain('Schema validation failed')
    })
  })
})
