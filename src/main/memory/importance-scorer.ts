/**
 * 记忆重要性评分器
 *
 * 自动评估记忆的重要性，用于排序和清理
 */

import type { Memory } from 'src/shared/types'
import { getLogger } from '../util'

const log = getLogger('memory:importance-scorer')

/**
 * 重要性评分配置
 */
export interface ImportanceScoringConfig {
  // 访问频率权重
  accessFrequencyWeight?: number

  // 时间衰减权重
  timeDecayWeight?: number

  // 记忆类型权重
  typeWeight?: Record<string, number>

  // 重要性衰减周期（毫秒）
  decayPeriod?: number
}

/**
 * 默认评分配置
 */
const DEFAULT_CONFIG: ImportanceScoringConfig = {
  accessFrequencyWeight: 0.3,
  timeDecayWeight: 0.4,
  typeWeight: {
    explicit_preference: 0.9, // 明确偏好最重要
    explicit_fact: 0.8, // 事实信息
    implicit_pattern: 0.6, // 行为模式
    implicit_interest: 0.7, // 兴趣
    implicit_context: 0.5, // 上下文信息
  },
  decayPeriod: 30 * 24 * 60 * 60 * 1000, // 30天
}

/**
 * 计算记忆重要性得分
 */
export function calculateImportanceScore(
  memory: Memory,
  config: ImportanceScoringConfig = {}
): number {
  const finalConfig = { ...DEFAULT_CONFIG, ...config }

  // 1. 基础重要性（用户/系统设置）
  let baseScore = memory.importance || 0.5

  // 2. 类型权重
  const typeScore = finalConfig.typeWeight?.[memory.type] || 0.5

  // 3. 访问频率得分
  const accessScore = calculateAccessScore(memory)

  // 4. 时间衰减得分
  const timeScore = calculateTimeDecayScore(memory, finalConfig.decayPeriod!)

  // 5. 置顶加分
  const pinnedBonus = memory.pinned ? 0.2 : 0

  // 6. 归档减分
  const archivedPenalty = memory.archived ? -0.3 : 0

  // 综合得分
  const score =
    baseScore * 0.2 + // 原始重要性占20%
    typeScore * finalConfig.accessFrequencyWeight! + // 类型权重占30%
    accessScore * 0.2 + // 访问频率占20%
    timeScore * finalConfig.timeDecayWeight! + // 时间占30%
    pinnedBonus +
    archivedPenalty

  // 限制在 0-1 范围内
  return Math.max(0, Math.min(1, score))
}

/**
 * 计算访问频率得分
 */
function calculateAccessScore(memory: Memory): number {
  const accessCount = memory.accessCount || 0
  const daysSinceLastAccess = (Date.now() - memory.lastAccessedAt) / (24 * 60 * 60 * 1000)

  // 访问次数越多，得分越高（对数衰减）
  const frequencyScore = Math.log10(accessCount + 1) / 5

  // 最近访问过的得分更高
  const recencyScore = Math.max(0, 1 - daysSinceLastAccess / 30)

  return (frequencyScore + recencyScore) / 2
}

/**
 * 计算时间衰减得分
 */
function calculateTimeDecayScore(memory: Memory, decayPeriod: number): number {
  const age = Date.now() - memory.createdAt

  // 越新的记忆得分越高
  return Math.max(0.1, 1 - age / decayPeriod)
}

/**
 * 批量计算记忆重要性
 */
export function calculateImportanceScores(
  memories: Memory[],
  config: ImportanceScoringConfig = {}
): Map<string, number> {
  const scores = new Map<string, number>()

  for (const memory of memories) {
    scores.set(memory.id, calculateImportanceScore(memory, config))
  }

  return scores
}

/**
 * 按重要性排序记忆
 */
export function sortMemoriesByImportance(
  memories: Memory[],
  config: ImportanceScoringConfig = {}
): Memory[] {
  const scores = calculateImportanceScores(memories, config)

  return [...memories].sort((a, b) => {
    // 置顶的排前面
    if (a.pinned && !b.pinned) return -1
    if (!a.pinned && b.pinned) return 1

    // 按计算得分排序
    const scoreA = scores.get(a.id) || 0
    const scoreB = scores.get(b.id) || 0

    return scoreB - scoreA
  })
}

/**
 * 筛选低重要性记忆
 */
export function filterLowImportanceMemories(
  memories: Memory[],
  threshold: number = 0.3,
  config: ImportanceScoringConfig = {}
): Memory[] {
  return memories.filter((memory) => {
    const score = calculateImportanceScore(memory, config)
    return score >= threshold
  })
}

/**
 * 获取建议清理的记忆
 */
export function getMemoriesToCleanup(
  memories: Memory[],
  options: {
    keepCount?: number // 保留数量
    threshold?: number // 重要性阈值
    minAge?: number // 最小年龄（毫秒）
  } = {}
): Memory[] {
  const { keepCount = 100, threshold = 0.2, minAge = 90 * 24 * 60 * 60 * 1000 } = options

  // 过滤出：非置顶、非归档、达到最小年龄的记忆
  const candidates = memories.filter(
    (m) => !m.pinned && !m.archived && Date.now() - m.createdAt > minAge
  )

  // 计算重要性得分
  const sorted = sortMemoriesByImportance(candidates)

  // 筛选出低于阈值的记忆（考虑保留数量）
  const toCleanup: Memory[] = []
  const toKeep: Memory[] = []

  for (const memory of sorted) {
    const score = calculateImportanceScore(memory)

    // 如果需要保留足够的记忆，或者重要性高于阈值
    if (toKeep.length < keepCount || score >= threshold) {
      toKeep.push(memory)
    } else {
      toCleanup.push(memory)
    }
  }

  return toCleanup
}

/**
 * 更新记忆重要性（基于访问）
 */
export function updateMemoryImportanceOnAccess(memory: Memory): Memory {
  const now = Date.now()

  // 增加访问计数
  const accessCount = (memory.accessCount || 0) + 1

  // 基于访问频率略微提升重要性
  const importanceBoost = Math.min(0.05, accessCount * 0.01)
  const newImportance = Math.min(1, (memory.importance || 0.5) + importanceBoost)

  return {
    ...memory,
    accessCount,
    lastAccessedAt: now,
    importance: newImportance,
    updatedAt: now,
  }
}

/**
 * 计算记忆衰减后的重要性
 */
export function calculateDecayedImportance(
  memory: Memory,
  decayPeriod: number = DEFAULT_CONFIG.decayPeriod!
): number {
  const originalImportance = memory.importance || 0.5
  const age = Date.now() - memory.createdAt

  // 指数衰减
  const decayFactor = Math.exp(-age / decayPeriod)

  return originalImportance * decayFactor
}
