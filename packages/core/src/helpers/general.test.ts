import { Warp, WarpAction, WarpActionType } from '../types'
import { getWarpPrimaryAction } from './general'

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

  const createMockAction = (type: WarpActionType, primary?: boolean, label = 'Test Action'): WarpAction => ({
    type,
    label,
    primary,
  })

  describe('when an action has primary: true', () => {
    it('should return the action with primary: true and correct index', () => {
      const primaryAction = createMockAction('transfer', true, 'Primary Transfer')
      const secondaryAction = createMockAction('contract', false, 'Secondary Contract')
      const warp = createMockWarp([secondaryAction, primaryAction])

      const result = getWarpPrimaryAction(warp)

      expect(result.action).toBe(primaryAction)
      expect(result.action.label).toBe('Primary Transfer')
      expect(result.index).toBe(1) // primaryAction is at index 1
    })

    it('should return the first action with primary: true when multiple exist', () => {
      const firstPrimary = createMockAction('transfer', true, 'First Primary')
      const secondPrimary = createMockAction('contract', true, 'Second Primary')
      const warp = createMockWarp([firstPrimary, secondPrimary])

      const result = getWarpPrimaryAction(warp)

      expect(result.action).toBe(firstPrimary)
      expect(result.action.label).toBe('First Primary')
      expect(result.index).toBe(0) // firstPrimary is at index 0
    })
  })

  describe('when no action has primary: true', () => {
    it('should return the last detectable action (transfer) and correct index', () => {
      const linkAction = createMockAction('link', false, 'Link Action')
      const transferAction = createMockAction('transfer', false, 'Transfer Action')
      const contractAction = createMockAction('contract', false, 'Contract Action')
      const warp = createMockWarp([linkAction, transferAction, contractAction])

      const result = getWarpPrimaryAction(warp)

      expect(result.action).toBe(contractAction)
      expect(result.action.label).toBe('Contract Action')
      expect(result.index).toBe(2) // contractAction is at index 2
    })

    it('should return the last detectable action (query) and correct index', () => {
      const linkAction = createMockAction('link', false, 'Link Action')
      const queryAction = createMockAction('query', false, 'Query Action')
      const warp = createMockWarp([linkAction, queryAction])

      const result = getWarpPrimaryAction(warp)

      expect(result.action).toBe(queryAction)
      expect(result.action.label).toBe('Query Action')
      expect(result.index).toBe(1) // queryAction is at index 1
    })

    it('should return the last detectable action (collect) and correct index', () => {
      const linkAction = createMockAction('link', false, 'Link Action')
      const collectAction = createMockAction('collect', false, 'Collect Action')
      const warp = createMockWarp([linkAction, collectAction])

      const result = getWarpPrimaryAction(warp)

      expect(result.action).toBe(collectAction)
      expect(result.action.label).toBe('Collect Action')
      expect(result.index).toBe(1) // collectAction is at index 1
    })

    it('should return the last detectable action when mixed with non-detectable types', () => {
      const linkAction1 = createMockAction('link', false, 'Link Action 1')
      const transferAction = createMockAction('transfer', false, 'Transfer Action')
      const linkAction2 = createMockAction('link', false, 'Link Action 2')
      const contractAction = createMockAction('contract', false, 'Contract Action')
      const warp = createMockWarp([linkAction1, transferAction, linkAction2, contractAction])

      const result = getWarpPrimaryAction(warp)

      expect(result.action).toBe(contractAction)
      expect(result.action.label).toBe('Contract Action')
      expect(result.index).toBe(3) // contractAction is at index 3
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

      expect(result.action).toBe(transferAction)
      expect(result.action.label).toBe('Single Transfer')
      expect(result.index).toBe(0) // single action at index 0
    })

    it('should handle single primary action', () => {
      const primaryAction = createMockAction('link', true, 'Primary Link')
      const warp = createMockWarp([primaryAction])

      const result = getWarpPrimaryAction(warp)

      expect(result.action).toBe(primaryAction)
      expect(result.action.label).toBe('Primary Link')
      expect(result.index).toBe(0) // single action at index 0
    })

    it('should prioritize primary flag over detectable types', () => {
      const detectableAction = createMockAction('transfer', false, 'Detectable Transfer')
      const primaryLinkAction = createMockAction('link', true, 'Primary Link')
      const warp = createMockWarp([detectableAction, primaryLinkAction])

      const result = getWarpPrimaryAction(warp)

      expect(result.action).toBe(primaryLinkAction)
      expect(result.action.label).toBe('Primary Link')
      expect(result.index).toBe(1) // primaryLinkAction is at index 1
    })

    it('should not modify the original actions array when finding last detectable action', () => {
      const linkAction = createMockAction('link', false, 'Link Action')
      const transferAction = createMockAction('transfer', false, 'Transfer Action')
      const contractAction = createMockAction('contract', false, 'Contract Action')
      const originalActions = [linkAction, transferAction, contractAction]
      const warp = createMockWarp(originalActions)

      const result = getWarpPrimaryAction(warp)

      expect(result.action).toBe(contractAction)
      expect(result.index).toBe(2) // contractAction is at index 2
      expect(warp.actions).toEqual(originalActions) // original array should not be modified
    })
  })
})
