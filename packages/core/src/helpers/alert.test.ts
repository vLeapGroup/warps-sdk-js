import { getEventNameFromWarp } from './alert'
import { Warp } from '../types'
import { WarpConstants } from '../constants'

describe('getEventNameFromWarp', () => {
  const makeWarp = (alerts?: Warp['alerts']): Warp => ({
    protocol: 'test',
    name: 'warp',
    title: 'Test',
    description: null,
    actions: [],
    alerts,
  })

  it('returns null when no alerts are defined', () => {
    const warp = makeWarp(undefined)
    expect(getEventNameFromWarp(warp, 'any')).toBeNull()
  })

  it('returns null when the alert is missing', () => {
    const warp = makeWarp({})
    expect(getEventNameFromWarp(warp, 'missing')).toBeNull()
  })

  it("returns null when trigger doesn't start with the event prefix", () => {
    const warp = makeWarp({
      notice: {
        label: 'Label',
        trigger: 'time:now',
        subject: 'Subject',
        body: 'Body',
      },
    })
    expect(getEventNameFromWarp(warp, 'notice')).toBeNull()
  })

  it('returns null when trigger is empty event prefix', () => {
    const warp = makeWarp({
      empty: {
        label: 'Label',
        trigger: `${WarpConstants.Alerts.TriggerEventPrefix}${WarpConstants.ArgParamsSeparator}`,
        subject: 'Subject',
        body: 'Body',
      },
    })
    expect(getEventNameFromWarp(warp, 'empty')).toBeNull()
  })

  it('returns the event name when trigger is valid', () => {
    const warp = makeWarp({
      transferAlert: {
        label: 'Label',
        trigger: `${WarpConstants.Alerts.TriggerEventPrefix}${WarpConstants.ArgParamsSeparator}Transfer`,
        subject: 'Subject',
        body: 'Body',
      },
    })
    expect(getEventNameFromWarp(warp, 'transferAlert')).toBe('Transfer')
  })

  it('returns the full suffix after the event prefix when extra segments provided', () => {
    const warp = makeWarp({
      multi: {
        label: 'Label',
        trigger: `${WarpConstants.Alerts.TriggerEventPrefix}${WarpConstants.ArgParamsSeparator}Approval${WarpConstants.ArgParamsSeparator}extra${WarpConstants.ArgParamsSeparator}data`,
        subject: 'Subject',
        body: 'Body',
      },
    })
    expect(getEventNameFromWarp(warp, 'multi')).toBe(`Approval${WarpConstants.ArgParamsSeparator}extra${WarpConstants.ArgParamsSeparator}data`)
  })
})
