import { getWarpPrimaryAction } from './general'
import { Warp, WarpAction, WarpActionType } from '../types'

describe('getWarpPrimaryAction', () => {
  const createMockWarp = (actions: WarpAction[], meta?: { hash: string }): Warp => ({
    protocol: 'warp:1.0.0',
    chain: 'ethereum',
    name: 'test-warp',
    title: 'Test Warp',
    description: 'Test description',
    actions,
    meta,
  })

  const createMockAction = (
    type: WarpActionType,
    primary?: boolean,
    label = 'Test Action'
  ): WarpAction => ({
    type,
    label,
    primary,
  })

  describe('when an action has primary: true', () => {
    it('should return the action with primary: true', () => {
      const primaryAction = createMockAction('transfer', true, 'Primary Transfer')
      const secondaryAction = createMockAction('contract', false, 'Secondary Contract')
      const warp = createMockWarp([secondaryAction, primaryAction])

      const result = getWarpPrimaryAction(warp)

      expect(result).toBe(primaryAction)
      expect(result.label).toBe('Primary Transfer')
    })

    it('should return the first action with primary: true when multiple exist', () => {
      const firstPrimary = createMockAction('transfer', true, 'First Primary')
      const secondPrimary = createMockAction('contract', true, 'Second Primary')
      const warp = createMockWarp([firstPrimary, secondPrimary])

      const result = getWarpPrimaryAction(warp)

      expect(result).toBe(firstPrimary)
      expect(result.label).toBe('First Primary')
    })
  })

  describe('when no action has primary: true', () => {
    it('should return the last detectable action (transfer)', () => {
      const linkAction = createMockAction('link', false, 'Link Action')
      const transferAction = createMockAction('transfer', false, 'Transfer Action')
      const contractAction = createMockAction('contract', false, 'Contract Action')
      const warp = createMockWarp([linkAction, transferAction, contractAction])

      const result = getWarpPrimaryAction(warp)

      expect(result).toBe(contractAction)
      expect(result.label).toBe('Contract Action')
    })

    it('should return the last detectable action (query)', () => {
      const linkAction = createMockAction('link', false, 'Link Action')
      const queryAction = createMockAction('query', false, 'Query Action')
      const warp = createMockWarp([linkAction, queryAction])

      const result = getWarpPrimaryAction(warp)

      expect(result).toBe(queryAction)
      expect(result.label).toBe('Query Action')
    })

    it('should return the last detectable action (collect)', () => {
      const linkAction = createMockAction('link', false, 'Link Action')
      const collectAction = createMockAction('collect', false, 'Collect Action')
      const warp = createMockWarp([linkAction, collectAction])

      const result = getWarpPrimaryAction(warp)

      expect(result).toBe(collectAction)
      expect(result.label).toBe('Collect Action')
    })

    it('should return the last detectable action when mixed with non-detectable types', () => {
      const linkAction1 = createMockAction('link', false, 'Link Action 1')
      const transferAction = createMockAction('transfer', false, 'Transfer Action')
      const linkAction2 = createMockAction('link', false, 'Link Action 2')
      const contractAction = createMockAction('contract', false, 'Contract Action')
      const warp = createMockWarp([linkAction1, transferAction, linkAction2, contractAction])

      const result = getWarpPrimaryAction(warp)

      expect(result).toBe(contractAction)
      expect(result.label).toBe('Contract Action')
    })
  })

  describe('when no detectable actions exist', () => {
    it('should throw an error when only link actions exist', () => {
      const linkAction1 = createMockAction('link', false, 'Link Action 1')
      const linkAction2 = createMockAction('link', false, 'Link Action 2')
      const warp = createMockWarp([linkAction1, linkAction2], { hash: 'test-hash' })

      expect(() => getWarpPrimaryAction(warp)).toThrow('Warp has no primary action: test-hash')
    })

    it('should throw an error when actions array is empty', () => {
      const warp = createMockWarp([], { hash: 'empty-hash' })

      expect(() => getWarpPrimaryAction(warp)).toThrow('Warp has no primary action: empty-hash')
    })

    it('should throw an error without hash when meta is undefined', () => {
      const linkAction = createMockAction('link', false, 'Link Action')
      const warp = createMockWarp([linkAction])

      expect(() => getWarpPrimaryAction(warp)).toThrow('Warp has no primary action: undefined')
    })
  })

  describe('edge cases', () => {
    it('should handle single detectable action', () => {
      const transferAction = createMockAction('transfer', false, 'Single Transfer')
      const warp = createMockWarp([transferAction])

      const result = getWarpPrimaryAction(warp)

      expect(result).toBe(transferAction)
      expect(result.label).toBe('Single Transfer')
    })

    it('should handle single primary action', () => {
      const primaryAction = createMockAction('link', true, 'Primary Link')
      const warp = createMockWarp([primaryAction])

      const result = getWarpPrimaryAction(warp)

      expect(result).toBe(primaryAction)
      expect(result.label).toBe('Primary Link')
    })

    it('should prioritize primary flag over detectable types', () => {
      const detectableAction = createMockAction('transfer', false, 'Detectable Transfer')
      const primaryLinkAction = createMockAction('link', true, 'Primary Link')
      const warp = createMockWarp([detectableAction, primaryLinkAction])

      const result = getWarpPrimaryAction(warp)

      expect(result).toBe(primaryLinkAction)
      expect(result.label).toBe('Primary Link')
    })
  })
})
