import { z } from 'zod'

/**
 * 回复风格预设
 * precise: 精确模式，追求准确和简洁
 * creative: 创意模式，鼓励多样性和创造性
 * balanced: 平衡模式，在精确和创意之间取得平衡
 */
export enum ResponseStyle {
  Precise = 'precise',
  Creative = 'creative',
  Balanced = 'balanced',
}

/**
 * 自定义指令
 * 用户可以为特定模型预设可复用的指令片段
 */
export interface CustomInstruction {
  id: string
  title: string // 指令标题，如"代码审查模式"
  content: string // 指令内容
  enabled: boolean // 是否启用
}

/**
 * 模型个性化配置
 * 为每个 AI 模型单独配置的个性化参数
 */
export interface ModelPersonalization {
  provider: string // 提供商 ID
  modelId: string // 模型 ID

  // 基础参数个性化
  systemPrompt?: string // 自定义系统提示词，覆盖默认提示
  temperature?: number // 温度参数 (0-2)
  maxTokens?: number // 最大输出 tokens
  topP?: number // top-p 采样参数

  // 风格和指令
  responseStyle?: ResponseStyle // 回复风格预设
  customInstructions?: CustomInstruction[] // 自定义指令列表

  // 功能开关
  enableMemory?: boolean // 是否为该模型启用记忆功能（未来实现）
}

/**
 * Zod Schema 验证
 */

// 回复风格枚举 Schema
export const ResponseStyleSchema = z.nativeEnum(ResponseStyle)

// 自定义指令 Schema
export const CustomInstructionSchema = z.object({
  id: z.string(),
  title: z.string().min(1, 'Instruction title is required'),
  content: z.string().min(1, 'Instruction content is required'),
  enabled: z.boolean().default(true),
})

// 模型个性化配置 Schema
export const ModelPersonalizationSchema = z.object({
  provider: z.string().min(1, 'Provider is required'),
  modelId: z.string().min(1, 'Model ID is required'),

  // 基础参数
  systemPrompt: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().positive().optional(),
  topP: z.number().min(0).max(1).optional(),

  // 风格和指令
  responseStyle: ResponseStyleSchema.optional(),
  customInstructions: z.array(CustomInstructionSchema).optional().default([]),

  // 功能开关
  enableMemory: z.boolean().optional().default(false),
})

/**
 * 类型导出
 */
export type ResponseStyleType = z.infer<typeof ResponseStyleSchema>
export type CustomInstructionType = z.infer<typeof CustomInstructionSchema>
export type ModelPersonalizationType = z.infer<typeof ModelPersonalizationSchema>

/**
 * 辅助函数
 */

/**
 * 生成模型个性化配置的唯一键
 */
export function getModelPersonalizationKey(provider: string, modelId: string): string {
  return `${provider}:${modelId}`
}

/**
 * 从键值解析提供商和模型 ID
 */
export function parseModelPersonalizationKey(key: string): { provider: string; modelId: string } | null {
  const parts = key.split(':')
  if (parts.length !== 2) return null
  return { provider: parts[0], modelId: parts[1] }
}

/**
 * 合并个性化配置到会话设置
 * 将个性化配置应用到会话的基础设置上
 */
export function mergePersonalizationToSessionSettings(
  baseSettings: Record<string, unknown>,
  personalization: ModelPersonalization
): Record<string, unknown> {
  const merged: Record<string, unknown> = { ...baseSettings }

  // 应用基础参数
  if (personalization.temperature !== undefined) {
    merged.temperature = personalization.temperature
  }
  if (personalization.maxTokens !== undefined) {
    merged.maxTokens = personalization.maxTokens
  }
  if (personalization.topP !== undefined) {
    merged.topP = personalization.topP
  }

  // 系统提示词需要特殊处理
  if (personalization.systemPrompt) {
    merged.systemPrompt = personalization.systemPrompt
  }

  // 自定义指令
  if (personalization.customInstructions && personalization.customInstructions.length > 0) {
    const enabledInstructions = personalization.customInstructions
      .filter((inst) => inst.enabled)
      .map((inst) => inst.content)
      .join('\n\n')

    if (enabledInstructions) {
      // 合并自定义指令到系统提示
      const existingPrompt = merged.systemPrompt as string | undefined
      merged.systemPrompt = existingPrompt
        ? `${enabledInstructions}\n\n${existingPrompt}`
        : enabledInstructions
    }
  }

  return merged
}
