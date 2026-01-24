/**
 * AI Ad Network - 用户记忆数据集成 Hook
 *
 * 从项目记忆系统获取数据，转换为广告系统需要的格式
 *
 * 注意：当前实现为存根版本，返回空数据
 * 要启用真实的用户记忆集成，需要：
 * 1. 确保 jotai 和 jotai-tanstack-query 已安装
 * 2. 取消下面的注释以启用真实实现
 */

import type { UserData, UserPreferences } from '../core/types'

// ============================================================================
// 类型定义
// ============================================================================

/**
 * Hook 返回值
 */
export interface UseMemoryForAdsResult {
  /** 用户数据 */
  userData: UserData | null
  /** 是否正在加载 */
  isLoading: boolean
  /** 记忆数量 */
  memoryCount: number
}

// ============================================================================
// 默认用户数据
// ============================================================================

/**
 * 创建默认用户数据
 */
function createDefaultUserData(): UserData {
  return {
    memory: {
      shortTerm: {},
      longTerm: {},
    },
    profile: {
      interests: [],
      behaviorPattern: {
        preferredTopics: [],
        interactionStyle: 'conversational',
      },
    },
    preferences: {
      language: 'en',
      theme: 'light',
      customSettings: {},
    },
  }
}

// ============================================================================
// Hook 实现（存根版本）
// ============================================================================

/**
 * 用户记忆数据 Hook
 *
 * 当前为存根实现，返回 null
 *
 * 要启用真实的用户记忆集成：
 * 1. 确保 jotai 和 jotai-tanstack-query 已安装
 * 2. 在下方取消 REAL_IMPLEMENTATION 的注释
 *
 * @returns 用户数据（当前为 null）
 */
export function useMemoryForAds(): UseMemoryForAdsResult {
  // 存根实现：返回空数据
  // 这样广告系统可以正常工作，只是没有用户个性化数据
  return {
    userData: null,
    isLoading: false,
    memoryCount: 0,
  }
}

/* ===========================================================================
 * 真实实现（需要 jotai 和 jotai-tanstack-query）
 * ===========================================================================
 *
 * 要启用此实现，请：
 * 1. 安装依赖：npm install jotai jotai-tanstack-query
 * 2. 将上面的存根函数替换为下面的代码
 * 3. 取消下面的注释
 *
 * ---------------------------------------------------------------------------
 *
 * import { useAtomValue } from 'jotai'
 * import type { Memory } from 'src/shared/types'
 * import { memoriesAtom } from '../../../stores/atoms/memoryAtoms'
 *
 * const SHORT_TERM_TYPES = ['implicit_context', 'implicit_pattern']
 * const LONG_TERM_TYPES = ['explicit_preference', 'explicit_fact', 'implicit_interest']
 *
 * function extractTopicsFromMemory(memory: Memory): string[] {
 *   const topics: string[] = []
 *   if (memory.category) topics.push(memory.category)
 *   if (memory.tags?.length) topics.push(...memory.tags)
 *   return topics
 * }
 *
 * function transformMemoryForAds(memories: Memory[]): UserData {
 *   const shortTerm: Record<string, unknown> = {}
 *   const longTerm: Record<string, unknown> = {}
 *   const interests = new Set<string>()
 *
 *   for (const memory of memories) {
 *     const key = `${memory.type}_${memory.id}`
 *     if (SHORT_TERM_TYPES.includes(memory.type)) {
 *       shortTerm[key] = { content: memory.content, ... }
 *     } else if (LONG_TERM_TYPES.includes(memory.type)) {
 *       longTerm[key] = { content: memory.content, ... }
 *       const topics = extractTopicsFromMemory(memory)
 *       topics.forEach(t => interests.add(t))
 *     }
 *   }
 *
 *   return {
 *     memory: { shortTerm, longTerm },
 *     profile: {
 *       interests: Array.from(interests).slice(0, 20),
 *       behaviorPattern: {
 *         preferredTopics: [],
 *         interactionStyle: 'conversational',
 *       },
 *     },
 *     preferences: { language: 'en', theme: 'light', customSettings: {} },
 *   }
 * }
 *
 * export function useMemoryForAds(): UseMemoryForAdsResult {
 *   try {
 *     const memories = useAtomValue(memoriesAtom) ?? []
 *     const userData = memories.length > 0 ? transformMemoryForAds(memories) : null
 *     return { userData, isLoading: false, memoryCount: memories.length }
 *   } catch (error) {
 *     console.warn('[useMemoryForAds] Memory system not available:', error)
 *     return { userData: null, isLoading: false, memoryCount: 0 }
 *   }
 * }
 *
 * ---------------------------------------------------------------------------
 */

// ============================================================================
// 导出
// ============================================================================

export default useMemoryForAds
