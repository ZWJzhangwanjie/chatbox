/**
 * AI Ad Network - 记忆数据缓存
 *
 * 提供同步读取的记忆数据缓存层
 * - 后台异步刷新，前台同步读取
 * - TTL 过期控制
 * - 单例模式
 *
 * @description 解决记忆获取是异步的，但 DataCollector.collect() 需要保持同步的问题
 */

import platform from '@/platform'
import type { Memory } from '@/shared/types'

// ============================================================================
// 缓存类
// ============================================================================

/**
 * 记忆数据缓存
 *
 * 提供：
 * - 同步读取 getMemories()
 * - 异步刷新 refresh()
 * - TTL 过期控制（30秒）
 */
export class MemoryCache {
  /** 缓存的记忆数据 */
  private cache: Memory[] = []
  /** 上次获取时间戳 */
  private lastFetchTime = 0
  /** 是否正在刷新 */
  private isRefreshing = false
  /** 刷新 Promise */
  private refreshPromise: Promise<void> | null = null

  // 缓存配置
  /** 缓存过期时间（毫秒） */
  private readonly TTL = 30000 // 30秒
  /** 最多缓存多少条记忆 */
  private readonly MAX_ITEMS = 50

  /**
   * 同步获取记忆数据
   *
   * @returns 记忆数组（可能为空）
   *
   * @description
   * - 如果缓存有效，直接返回缓存数据
   * - 如果缓存过期或为空，触发后台异步刷新，返回当前缓存（可能为空）
   */
  getMemories(): Memory[] {
    const now = Date.now()
    const isExpired = now - this.lastFetchTime > this.TTL
    const isEmpty = this.cache.length === 0

    if (isExpired || isEmpty) {
      // 缓存过期或为空，触发异步刷新（不等待）
      this.refresh().catch(() => {
        // 静默失败
      })
    }

    return this.cache
  }

  /**
   * 异步刷新缓存
   *
   * @returns Promise，刷新完成时 resolve
   *
   * @description
   * - 防止并发刷新
   * - 刷新失败时保持旧缓存
   */
  async refresh(): Promise<void> {
    // 防止并发刷新
    if (this.isRefreshing) {
      return this.refreshPromise
    }

    this.isRefreshing = true
    this.refreshPromise = this.doRefresh()

    try {
      await this.refreshPromise
    } finally {
      this.isRefreshing = false
      this.refreshPromise = null
    }
  }

  /**
   * 执行刷新
   */
  private async doRefresh(): Promise<void> {
    const startTime = Date.now()

    try {
      const memories = await platform.getAllMemories()

      // 排序：置顶优先 → 重要性高 → 时间近
      const sortedMemories = memories.sort((a, b) => {
        // 置顶的优先
        if (a.pinned && !b.pinned) return -1
        if (!a.pinned && b.pinned) return 1

        // 重要性高的优先
        const aImportance = a.importance ?? 0.5
        const bImportance = b.importance ?? 0.5
        if (Math.abs(bImportance - aImportance) > 0.01) {
          return bImportance - aImportance
        }

        // 最近的优先
        return b.createdAt - a.createdAt
      })

      // 限制数量
      this.cache = sortedMemories.slice(0, this.MAX_ITEMS)
      this.lastFetchTime = Date.now()
    } catch (error) {
      // 保持旧缓存，不清空
    }
  }

  /**
   * 获取缓存状态
   */
  getStatus(): {
    count: number
    lastFetch: number
    age: number
    isRefreshing: boolean
  } {
    return {
      count: this.cache.length,
      lastFetch: this.lastFetchTime,
      age: this.lastFetchTime > 0 ? Date.now() - this.lastFetchTime : 0,
      isRefreshing: this.isRefreshing,
    }
  }

  /**
   * 按类型统计记忆数量
   */
  private countByType(memories: Memory[]): Record<string, number> {
    return memories.reduce((acc, m) => {
      acc[m.type] = (acc[m.type] || 0) + 1
      return acc
    }, {} as Record<string, number>)
  }

  /**
   * 清空缓存
   */
  clear(): void {
    this.cache = []
    this.lastFetchTime = 0
  }
}

// ============================================================================
// 单例模式
// ============================================================================

let cacheInstance: MemoryCache | null = null

/**
 * 获取记忆缓存单例
 */
export function getMemoryCache(): MemoryCache {
  if (!cacheInstance) {
    cacheInstance = new MemoryCache()
  }
  return cacheInstance
}

/**
 * 重置缓存单例（用于测试）
 */
export function resetMemoryCache(): void {
  if (cacheInstance) {
    cacheInstance.clear()
  }
  cacheInstance = null
}
