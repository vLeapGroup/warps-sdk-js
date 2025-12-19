import {
  Warp,
  WarpActionInput,
  WarpActionInputType,
  WarpBuilder,
  WarpClientConfig,
  WarpCollectAction,
  WarpContractAction,
  WarpMcpAction,
  WarpQueryAction,
  WarpText,
  WarpTransferAction,
  getWarpPrimaryAction,
} from '@vleap/warps'
import { z } from 'zod'

export const convertMcpToolToWarp = async (
  config: WarpClientConfig,
  tool: { name: string; description?: string; inputSchema?: any; outputSchema?: any },
  url: string,
  headers?: Record<string, string>
): Promise<Warp> => {
  const inputs: WarpActionInput[] = []

  if (tool.inputSchema?.properties) {
    const properties = tool.inputSchema.properties
    const required = tool.inputSchema.required || []

    Object.entries(properties).forEach(([key, value]: [string, any]) => {
      const isRequired = required.includes(key)
      const inputType = convertJsonSchemaTypeToWarpType(value.type, value.format)

      const inputDef: WarpActionInput = {
        name: key,
        label: value.title || { en: key },
        description: value.description ? { en: value.description.trim() } : null,
        type: inputType,
        position: `payload:${key}`,
        source: 'field',
        required: isRequired,
        default: value.default,
      }

      inputs.push(inputDef)
    })
  }

  const output: Record<string, string> = {}
  if (tool.outputSchema?.properties) {
    Object.keys(tool.outputSchema.properties).forEach((key) => {
      output[key] = `out.${key}`
    })
  }

  const mcpAction: WarpMcpAction = {
    type: 'mcp',
    label: { en: tool.name },
    description: tool.description ? { en: tool.description.trim() } : null,
    destination: { url, tool: tool.name, headers },
    inputs,
  }

  return await new WarpBuilder(config)
    .setName(tool.name)
    .setTitle({ en: tool.name })
    .setDescription(tool.description ? { en: tool.description.trim() } : null)
    .addAction(mcpAction)
    .setOutput(Object.keys(output).length > 0 ? output : null)
    .build(false)
}

export const convertWarpToMcpCapabilities = (warp: Warp): { tools: any[]; resources?: any[] } => {
  const tools: any[] = []
  const warpDescription = extractText(warp.description)

  let primaryActionInputs: WarpActionInput[] | undefined
  try {
    const { action: primaryAction } = getWarpPrimaryAction(warp)
    primaryActionInputs = primaryAction.inputs
    console.log(`[MCP] Warp ${warp.name} - primaryActionInputs:`, primaryActionInputs?.length || 0, primaryActionInputs?.map(i => ({ name: i.name, source: i.source, position: i.position })))
  } catch (error) {
    console.log(`[MCP] Warp ${warp.name} - failed to get primary action:`, error)
    primaryActionInputs = undefined
  }

  warp.actions.forEach((action, index) => {
    const actionDescription = extractText(action.description)
    const description = warpDescription || actionDescription

    if (action.type === 'mcp') {
      const mcpAction = action as WarpMcpAction
      if (mcpAction.destination) {
        const tool = convertMcpActionToTool(mcpAction, description, primaryActionInputs)
        tools.push(tool)
      }
    } else {
      const tool = convertActionToTool(warp, action, description, index, primaryActionInputs)
      tools.push(tool)
    }
  })

  console.log(`[MCP] convertWarpToMcpCapabilities - warp: ${warp.name}, tools: ${tools.length}, tools with schema:`, tools.filter(t => t.inputSchema).length)
  return { tools, resources: [] }
}

const extractText = (text: WarpText | null | undefined): string | undefined => {
  if (!text) return undefined
  if (typeof text === 'string') return text
  if (typeof text === 'object' && 'en' in text) return text.en
  return undefined
}

const buildZodSchemaFromInput = (input: WarpActionInput): z.ZodTypeAny => {
  let schema: z.ZodTypeAny

  const inputType = input.type.toLowerCase()
  if (inputType === 'string' || inputType === 'address' || inputType === 'hex') {
    schema = z.string()
  } else if (
    inputType === 'number' ||
    inputType === 'uint8' ||
    inputType === 'uint16' ||
    inputType === 'uint32' ||
    inputType === 'uint64' ||
    inputType === 'uint128' ||
    inputType === 'uint256'
  ) {
    schema = z.number()
  } else if (inputType === 'bool' || inputType === 'boolean') {
    schema = z.boolean()
  } else if (inputType === 'biguint') {
    schema = z.string()
  } else {
    schema = z.string()
  }

  if (typeof input.min === 'number') {
    if (schema instanceof z.ZodNumber) {
      schema = schema.min(input.min)
    }
  }

  if (typeof input.max === 'number') {
    if (schema instanceof z.ZodNumber) {
      schema = schema.max(input.max)
    }
  }

  if (input.pattern) {
    if (schema instanceof z.ZodString) {
      schema = schema.regex(new RegExp(input.pattern))
    }
  }

  const enumValues = extractEnumValues(input.options)
  if (enumValues && enumValues.length > 0) {
    if (schema instanceof z.ZodString) {
      schema = z.enum(enumValues as [string, ...string[]])
    } else if (schema instanceof z.ZodNumber) {
      const numberValues = enumValues.map((v) => Number(v)).filter((v) => !isNaN(v))
      if (numberValues.length > 0) {
        schema = schema.refine((val) => numberValues.includes(val), {
          message: `Value must be one of: ${numberValues.join(', ')}`,
        })
      }
    }
  }

  const descriptionParts: string[] = []
  const inputDescription = extractText(input.description)
  if (inputDescription) {
    descriptionParts.push(inputDescription)
  }

  if (input.bot) {
    descriptionParts.push(input.bot)
  }

  descriptionParts.push(`Type: ${input.type}`)
  descriptionParts.push(input.required ? 'Required' : 'Optional')

  if (enumValues && enumValues.length > 0) {
    descriptionParts.push(`Options: ${enumValues.join(', ')}`)
  }

  const patternDesc = extractText(input.patternDescription)
  if (patternDesc) {
    descriptionParts.push(patternDesc)
  }

  const fullDescription = descriptionParts.join('. ')
  if (fullDescription) {
    schema = schema.describe(fullDescription)
  }

  if (input.required !== true) {
    schema = schema.optional()
  }

  return schema
}

const buildZodInputSchema = (inputs: WarpActionInput[]): Record<string, z.ZodTypeAny> | undefined => {
  const shape: Record<string, z.ZodTypeAny> = {}

  for (const input of inputs) {
    if (input.source === 'hidden') continue
    if (input.source !== 'field') continue

    const key = input.as || input.name
    shape[key] = buildZodSchemaFromInput(input)
  }

  console.log('[MCP] buildZodInputSchema - inputs:', inputs.length, 'shape keys:', Object.keys(shape))
  return Object.keys(shape).length > 0 ? shape : undefined
}

const convertActionToTool = (
  warp: Warp,
  action: WarpTransferAction | WarpContractAction | WarpCollectAction | WarpQueryAction,
  description: string | undefined,
  index: number,
  primaryActionInputs?: WarpActionInput[]
): any => {
  const inputsToUse = primaryActionInputs || action.inputs || []
  const inputSchema = buildZodInputSchema(inputsToUse)
  const name = sanitizeMcpName(`${warp.name}_${index}`)

  console.log(`[MCP] convertActionToTool - tool: ${name}, inputsToUse: ${inputsToUse.length}, inputSchema keys:`, inputSchema ? Object.keys(inputSchema) : 'undefined')

  return {
    name,
    description,
    inputSchema,
  }
}

const convertMcpActionToTool = (action: WarpMcpAction, description: string | undefined, primaryActionInputs?: WarpActionInput[]): any => {
  const inputsToUse = primaryActionInputs || action.inputs || []
  const inputSchema = buildZodInputSchema(inputsToUse)
  const toolName = action.destination!.tool

  return {
    name: sanitizeMcpName(toolName),
    description,
    inputSchema,
  }
}


const extractEnumValues = (options: string[] | { [key: string]: WarpText } | undefined): string[] | undefined => {
  if (!options) return undefined
  if (Array.isArray(options)) return options
  if (typeof options === 'object') return Object.keys(options)
  return undefined
}

const sanitizeMcpName = (name: string): string => {
  return name
    .replace(/\s+/g, '_')
    .replace(/:/g, '_')
    .replace(/[^A-Za-z0-9_.-]/g, '_')
    .replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/g, '')
    .replace(/_+/g, '_')
}

const convertJsonSchemaTypeToWarpType = (type: string, format?: string): WarpActionInputType => {
  if (format === 'date-time' || format === 'date') return 'string'
  if (type === 'string') return 'string'
  if (type === 'number') return 'uint256'
  if (type === 'integer') return 'uint256'
  if (type === 'boolean') return 'bool'
  if (type === 'array') return 'string'
  if (type === 'object') return 'string'
  return 'string'
}
