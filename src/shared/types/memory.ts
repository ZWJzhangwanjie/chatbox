import { z } from 'zod'

/**
 * 记忆类型枚举
 */
export enum MemoryType {
  // 显式记忆（用户明确添加的）
  EXPLICIT_PREFERENCE = 'explicit_preference',    // 明确偏好
  EXPLICIT_FACT = 'explicit_fact',                // 明确事实

  // 隐式记忆（AI 提取的）
  IMPLICIT_PATTERN = 'implicit_pattern',          // 行为模式
  IMPLICIT_INTEREST = 'implicit_interest',        // 兴趣标签
  IMPLICIT_CONTEXT = 'implicit_context',          // 上下文信息
}

/**
 * 记忆来源
 */
export enum MemorySource {
  EXPLICIT = 'explicit',       // 用户明确添加
  IMPLICIT = 'implicit',       // AI 自动提取
  INFERRED = 'inferred',       // AI 推断得出
}

/**
 * 记忆优先级
 */
export enum MemoryPriority {
  LOW = 1,
  MEDIUM = 2,
  HIGH = 3,
  CRITICAL = 4,
}

/**
 * 单个记忆项
 */
export interface Memory {
  id: string
  userId: string              // 用户 ID，默认 'default'
  type: MemoryType
  source: MemorySource

  // 记忆内容
  content: string            // 记忆的文本描述
  summary?: string            // 简短摘要（用于显示）

  // 向量嵌入
  embeddingId?: string        // 向量数据库中的 ID

  // 元数据
  importance: number         // 0-1，重要性评分
  confidence: number         // 0-1，AI 提取的置信度
  priority: MemoryPriority   // 优先级
  category?: string          // 分类标签（如：工作、学习、娱乐等）

  // 时间戳
  createdAt: number
  updatedAt: number
  lastAccessedAt: number
  accessCount: number

  // 关联信息
  relatedSessionId?: string  // 来源会话
  relatedModelId?: string    // 相关模型
  tags?: string[]            // 用户标签

  // 有效期
  expiresAt?: number         // 过期时间，null = 永久

  // 状态
  archived?: boolean        // 是否已归档
  pinned?: boolean          // 是否置顶
}

/**
 * 记忆摘要（用于显示给用户）
 */
export interface MemorySummary {
  totalCount: number
  byType: Partial<Record<MemoryType, number>>
  byCategory: Record<string, number>
  recentMemories: Memory[]
  pinnedCount: number
  archivedCount: number
}

/**
 * 记忆提取结果
 */
export interface MemoryExtraction {
  memories: Omit<Memory, 'embeddingId'>[]
  confidence: number          // 整体置信度
  reasoning?: string         // 提取原因和过程
}

/**
 * 记忆提取配置
 */
export interface ExtractionConfig {
  // 提取规则
  extractExplicitPreferences?: boolean   // 提取明确偏好（"我喜欢..."）
  extractImplicitPatterns?: boolean      // 提取行为模式
  extractFactualInfo?: boolean           // 提取事实信息
  extractTopics?: boolean                // 提取话题标签

  // 质量控制
  minConfidence?: number                 // 最小置信度 (0-1)
  maxMemoriesPerSession?: number         // 每次会话最多提取数量
  maxHistoryLength?: number              // 分析的历史消息数量

  // 提取时机
  extractOnMessageCount?: number         // 每发送多少条消息后提取一次
  extractOnSessionEnd?: boolean          // 会话结束时提取
}

/**
 * 记忆搜索选项
 */
export interface MemorySearchOptions {
  limit?: number
  offset?: number
  types?: MemoryType[]
  categories?: string[]
  minImportance?: number
  includeArchived?: boolean
  startDate?: number
  endDate?: number
}

/**
 * 记忆注入配置
 */
export interface MemoryInjectionConfig {
  maxTokens: number                  // 记忆占用的最大 token 数
  minRelevance?: number               // 最小相关性阈值 (0-1)
  maxMemories?: number                // 最多注入的记忆数量
  timeDecay?: boolean                // 是否启用时间衰减
  boostPinned?: boolean              // 是否提升置顶记忆的权重
}

/**
 * 记忆统计
 */
export interface MemoryStats {
  total: number
  byType: Record<MemoryType, number>
  bySource: Record<MemorySource, number>
  byCategory: Record<string, number>
  thisWeek: number
  thisMonth: number
}

/**
 * Zod Schema 验证
 */

// MemoryType Schema
export const MemoryTypeSchema = z.nativeEnum(MemoryType)

// MemorySource Schema
export const MemorySourceSchema = z.nativeEnum(MemorySource)

// MemoryPriority Schema
export const MemoryPrioritySchema = z.nativeEnum(MemoryPriority)

// Memory Schema
export const MemorySchema = z.object({
  id: z.string(),
  userId: z.string().default('default'),
  type: MemoryTypeSchema,
  source: MemorySourceSchema,

  content: z.string().min(1),
  summary: z.string().optional(),

  embeddingId: z.string().optional(),

  importance: z.number().min(0).max(1),
  confidence: z.number().min(0).max(1),
  priority: MemoryPrioritySchema,
  category: z.string().optional(),

  createdAt: z.number(),
  updatedAt: z.number(),
  lastAccessedAt: z.number(),
  accessCount: z.number().min(0),

  relatedSessionId: z.string().optional(),
  relatedModelId: z.string().optional(),
  tags: z.array(z.string()).optional(),

  expiresAt: z.number().optional(),

  archived: z.boolean().default(false),
  pinned: z.boolean().default(false),
})

// ExtractionConfig Schema
export const ExtractionConfigSchema = z.object({
  extractExplicitPreferences: z.boolean().default(true),
  extractImplicitPatterns: z.boolean().default(true),
  extractFactualInfo: z.boolean().default(true),
  extractTopics: z.boolean().default(false),

  minConfidence: z.number().min(0).max(1).default(0.6),
  maxMemoriesPerSession: z.number().positive().default(10),
  maxHistoryLength: z.number().positive().default(20),

  extractOnMessageCount: z.number().positive().optional(),
  extractOnSessionEnd: z.boolean().default(true),
})

// MemorySearchOptions Schema
export const MemorySearchOptionsSchema = z.object({
  limit: z.number().positive().default(50),
  offset: z.number().min(0).default(0),
  types: z.array(MemoryTypeSchema).optional(),
  categories: z.array(z.string()).optional(),
  minImportance: z.number().min(0).max(1).optional(),
  includeArchived: z.boolean().default(false),
  startDate: z.number().optional(),
  endDate: z.number().optional(),
})

// MemoryInjectionConfig Schema
export const MemoryInjectionConfigSchema = z.object({
  maxTokens: z.number().positive().default(500),
  minRelevance: z.number().min(0).max(1).default(0.5),
  maxMemories: z.number().positive().default(5),
  timeDecay: z.boolean().default(true),
  boostPinned: z.boolean().default(true),
})

/**
 * 类型导出
 */
export type MemoryTypeType = z.infer<typeof MemoryTypeSchema>
export type MemorySourceType = z.infer<typeof MemorySourceSchema>
export type MemoryPriorityType = z.infer<typeof MemoryPrioritySchema>
export type MemoryTypeType = z.infer<typeof MemorySchema>
export type ExtractionConfigType = z.infer<typeof ExtractionConfigSchema>
export type MemorySearchOptionsType = z.infer<typeof MemorySearchOptionsSchema>
export type MemoryInjectionConfigType = z.infer<typeof MemoryInjectionConfigSchema>

/**
 * 默认配置
 */
export const DEFAULT_EXTRACTION_CONFIG: ExtractionConfig = {
  extractExplicitPreferences: true,
  extractImplicitPatterns: true,
  extractFactualInfo: true,
  extractTopics: false,

  minConfidence: 0.6,
  maxMemoriesPerSession: 10,
  maxHistoryLength: 20,

  extractOnSessionEnd: true,
}

export const DEFAULT_INJECTION_CONFIG: MemoryInjectionConfig = {
  maxTokens: 500,
  minRelevance: 0.5,
  maxMemories: 5,
  timeDecay: true,
  boostPinned: true,
}

/**
 * 辅助函数
 */

/**
 * 生成记忆 ID
 */
export function generateMemoryId(): string {
  return `memory_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
}

/**
 * 计算记忆过期时间
 */
export function calculateExpiryDate(daysFromNow: number): number {
  if (daysFromNow <= 0) return 0 // 永久不过期
  return Date.now() + daysFromNow * 24 * 60 * 60 * 1000
}

/**
 * 判断记忆是否过期
 */
export function isMemoryExpired(memory: Memory): boolean {
  if (!memory.expiresAt) return false
  return Date.now() > memory.expiresAt
}

/**
 * 更新记忆访问时间
 */
export function updateMemoryAccess(memory: Memory): Memory {
  return {
    ...memory,
    lastAccessedAt: Date.now(),
    accessCount: memory.accessCount + 1,
  }
}

/**
 * 格式化记忆内容为上下文
 */
export function formatMemoryForContext(memory: Memory): string {
  const parts = []

  if (memory.summary) {
    parts.push(memory.summary)
  } else {
    parts.push(memory.content)
  }

  return parts.join(' | ')
}
