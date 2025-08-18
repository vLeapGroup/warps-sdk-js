export interface TransformRunner {
  run(code: string, context: any): Promise<any>
}

export type TransformConfig = {
  runner?: TransformRunner | null
}
