import { getWarpPrimaryAction, Warp, WarpActionInput, WarpSerializer } from '@vleap/warps'

export const convertMcpArgsToWarpInputs = (warp: Warp, args: Record<string, any>): string[] => {
  const { action } = getWarpPrimaryAction(warp)
  if (!action.inputs) return []

  const serializer = new WarpSerializer()
  return action.inputs.map((input: WarpActionInput) => {
    const key = input.as || input.name
    const value = args[key] ?? input.default ?? null

    if (value === null && input.type === 'bool') {
      return serializer.nativeToString(input.type, false)
    }

    return serializer.nativeToString(input.type, value)
  })
}
