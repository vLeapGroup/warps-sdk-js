import {
  Warp,
  WarpActionInput,
  WarpCollectAction,
  WarpContractAction,
  WarpMcpAction,
  WarpQueryAction,
  WarpText,
  WarpTransferAction,
} from '@vleap/warps'
import { z } from 'zod'

const extractText = (text: WarpText | null | undefined): string | undefined => {
  if (!text) return undefined
  if (typeof text === 'string') return text
  if (typeof text === 'object' && 'en' in text) return text.en
  return undefined
}

const extractEnumValues = (options: string[] | { [key: string]: WarpText } | undefined): string[] | undefined => {
  if (!options) return undefined
  if (Array.isArray(options)) return options
  if (typeof options === 'object') return Object.keys(options)
  return undefined
}

const sanitizeMcpName = (name: string): string => {
  const nameAfterColon = name.includes(':') ? name.split(':').slice(1).join(':').trim() : name
  return nameAfterColon
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/:/g, '_')
    .replace(/[^a-z0-9_.-]/g, '_')
    .replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, '')
    .replace(/_+/g, '_')
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
  if (inputDescription) descriptionParts.push(inputDescription)
  if (input.bot) descriptionParts.push(input.bot)
  descriptionParts.push(`Type: ${input.type}`)
  descriptionParts.push(input.required ? 'Required' : 'Optional')
  if (enumValues && enumValues.length > 0) descriptionParts.push(`Options: ${enumValues.join(', ')}`)

  const patternDesc = extractText(input.patternDescription)
  if (patternDesc) descriptionParts.push(patternDesc)

  const fullDescription = descriptionParts.join('. ')
  if (fullDescription) schema = schema.describe(fullDescription)
  if (input.required !== true) schema = schema.optional()

  return schema
}

export const buildZodInputSchema = (inputs: WarpActionInput[]): Record<string, z.ZodTypeAny> | undefined => {
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

export const convertActionToTool = (
  warp: Warp,
  action: WarpTransferAction | WarpContractAction | WarpCollectAction | WarpQueryAction,
  description: string | undefined,
  primaryActionInputs?: WarpActionInput[],
  outputTemplateUri?: string
): any => {
  const inputsToUse = primaryActionInputs || action.inputs || []
  const inputSchema = buildZodInputSchema(inputsToUse)
  const name = sanitizeMcpName(warp.name)

  console.log(
    `[MCP] convertActionToTool - tool: ${name}, inputsToUse: ${inputsToUse.length}, inputSchema keys:`,
    inputSchema ? Object.keys(inputSchema) : 'undefined'
  )

  const tool: any = {
    name,
    description,
    inputSchema,
  }

  if (outputTemplateUri) {
    tool._meta = {
      'openai/outputTemplate': outputTemplateUri,
    }
  }

  return tool
}

export const convertMcpActionToTool = (
  action: WarpMcpAction,
  description: string | undefined,
  primaryActionInputs?: WarpActionInput[],
  outputTemplateUri?: string
): any => {
  const inputsToUse = primaryActionInputs || action.inputs || []
  const inputSchema = buildZodInputSchema(inputsToUse)
  const toolName = action.destination!.tool

  const tool: any = {
    name: sanitizeMcpName(toolName),
    description,
    inputSchema,
  }

  if (outputTemplateUri) {
    tool._meta = {
      'openai/outputTemplate': outputTemplateUri,
    }
  }

  return tool
}
