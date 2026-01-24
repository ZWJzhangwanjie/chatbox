/**
 * AI Ad Network - 防抖缓存管理器
 *
 * 管理广告请求的防抖标记
 * 解决的问题：
 * - 请求失败后缓存标记不清除，无法重试
 * - 防抖缓存无过期清理，内存泄漏风险
 *
 * @see AdController.ts - 在 fetchRealAds 中使用此管理器
 */

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 请求状态
 */
export type RequestStatus = 'pending' | 'success' | 'failed';

/**
 * 防抖缓存条目
 */
interface DebounceEntry {
  /** 请求开始时间 */
  startTime: number;
  /** 请求状态 */
  status: RequestStatus;
  /** 过期时间戳 */
  expiresAt: number;
  /** 防抖持续时间（毫秒） */
  debounceMs: number;
}

/**
 * 防抖统计信息
 */
export interface DebounceStats {
  /** 总条目数 */
  totalEntries: number;
  /** 等待中的请求数 */
  pendingCount: number;
  /** 成功的请求数 */
  successCount: number;
  /** 失败的请求数 */
  failedCount: number;
  /** 过期的条目数 */
  expiredCount: number;
}

/**
 * 防抖结果
 */
export interface DebounceResult {
  /** 是否应该防抖 */
  shouldDebounce: boolean;
  /** 原因 */
  reason?: 'pending' | 'withinDebounceWindow';
  /** 剩余时间（毫秒） */
  remainingMs?: number;
}

// ============================================================================
// 防抖缓存管理器
// ============================================================================

/**
 * 防抖缓存管理器
 *
 * 功能：
 * - 跟踪请求状态（pending/success/failed）
 * - 请求失败自动清除标记
 * - 定期清理过期条目
 * - 支持可配置的防抖时间
 *
 * @example
 * ```ts
 * const manager = new DebounceCacheManager(20000); // 20秒防抖
 *
 * // 检查是否应该防抖
 * if (manager.shouldDebounce('session123:actionCard')) {
 *   return; // 跳过请求
 * }
 *
 * // 标记请求开始
 * manager.markRequestStart('session123:actionCard');
 *
 * try {
 *   await fetchAds();
 *   manager.markRequestSuccess('session123:actionCard');
 * } catch (error) {
 *   manager.markRequestFailure('session123:actionCard'); // 关键：失败时清除
 * }
 * ```
 */
export class DebounceCacheManager {
  // ========== 防抖缓存 ==========
  private cache = new Map<string, DebounceEntry>();

  // ========== 清理定时器 ==========
  private cleanupTimer?: ReturnType<typeof setInterval>;

  // ========== 统计信息 ==========
  private stats = {
    totalCreated: 0,
    totalSuccess: 0,
    totalFailed: 0,
    totalExpired: 0,
  };

  // ========== 构造函数 ==========
  constructor(
    /** 防抖时间（毫秒） */
    private readonly debounceMs: number = 20000,
    /** 清理间隔（毫秒） */
    private readonly cleanupIntervalMs: number = 60000,
    /** 是否启用调试日志 */
    private readonly debug: boolean = false
  ) {
    this.startCleanupScheduler();
    console.log('[DebounceCacheManager] Initialized', {
      debounceMs,
      cleanupIntervalMs,
    });
  }

  // ========== 公共方法 ==========

  /**
   * 检查是否应该防抖
   *
   * @param key - 防抖键
   * @returns 防抖结果
   *
   * @example
   * ```ts
   * const result = manager.shouldDebounce('session123:actionCard');
   * if (result.shouldDebounce) {
   *   console.log('Debounced, remaining:', result.remainingMs);
   * }
   * ```
   */
  shouldDebounce(key: string): DebounceResult {
    const entry = this.cache.get(key);

    if (!entry) {
      return { shouldDebounce: false };
    }

    const now = Date.now();

    // 检查是否过期
    if (now > entry.expiresAt) {
      this.cache.delete(key);
      this.stats.totalExpired++;
      return { shouldDebounce: false };
    }

    // 检查是否在防抖窗口内
    if (entry.status === 'pending') {
      const remainingMs = entry.expiresAt - now;
      if (this.debug) {
        console.log('[DebounceCacheManager] Request is pending', { key, remainingMs });
      }
      return {
        shouldDebounce: true,
        reason: 'pending',
        remainingMs,
      };
    }

    // 检查是否在成功后的防抖窗口内
    const timeSinceSuccess = now - entry.startTime;
    if (timeSinceSuccess < this.debounceMs) {
      const remainingMs = this.debounceMs - timeSinceSuccess;
      if (this.debug) {
        console.log('[DebounceCacheManager] Within debounce window', { key, remainingMs });
      }
      return {
        shouldDebounce: true,
        reason: 'withinDebounceWindow',
        remainingMs,
      };
    }

    // 超过防抖时间，允许请求
    this.cache.delete(key);
    return { shouldDebounce: false };
  }

  /**
   * 标记请求开始
   *
   * @param key - 防抖键
   *
   * @example
   * ```ts
   * manager.markRequestStart('session123:actionCard');
   * await fetchAds();
   * ```
   */
  markRequestStart(key: string): void {
    const now = Date.now();

    this.cache.set(key, {
      startTime: now,
      status: 'pending',
      expiresAt: now + this.debounceMs,
      debounceMs: this.debounceMs,
    });

    this.stats.totalCreated++;

    if (this.debug) {
      console.log('[DebounceCacheManager] Request started', {
        key,
        expiresAt: new Date(this.cache.get(key)!.expiresAt).toISOString(),
      });
    }
  }

  /**
   * 标记请求成功
   *
   * @param key - 防抖键
   *
   * @example
   * ```ts
   * try {
   *   await fetchAds();
   *   manager.markRequestSuccess('session123:actionCard');
   * } catch (error) {
   *   manager.markRequestFailure('session123:actionCard');
   * }
   * ```
   */
  markRequestSuccess(key: string): void {
    const entry = this.cache.get(key);

    if (!entry) {
      if (this.debug) {
        console.warn('[DebounceCacheManager] Key not found for success', { key });
      }
      return;
    }

    entry.status = 'success';
    this.stats.totalSuccess++;

    if (this.debug) {
      console.log('[DebounceCacheManager] Request succeeded', { key });
    }
  }

  /**
   * 标记请求失败（关键：立即清除防抖标记）
   *
   * @param key - 防抖键
   *
   * @example
   * ```ts
   * try {
   *   await fetchAds();
   *   manager.markRequestSuccess(key);
   * } catch (error) {
   *   manager.markRequestFailure(key); // 立即清除，允许重试
   * }
   * ```
   */
  markRequestFailure(key: string): void {
    const deleted = this.cache.delete(key);

    if (deleted) {
      this.stats.totalFailed++;

      if (this.debug) {
        console.log('[DebounceCacheManager] Request failed, cache cleared', { key });
      }
    } else if (this.debug) {
      console.warn('[DebounceCacheManager] Key not found for failure', { key });
    }
  }

  /**
   * 清除所有标记
   */
  clear(): void {
    const size = this.cache.size;
    this.cache.clear();

    console.log('[DebounceCacheManager] Cleared all entries', { previousSize: size });
  }

  /**
   * 清除特定键的标记
   *
   * @param key - 防抖键
   */
  clearKey(key: string): void {
    const deleted = this.cache.delete(key);

    if (this.debug && deleted) {
      console.log('[DebounceCacheManager] Cleared key', { key });
    }
  }

  /**
   * 获取统计信息
   */
  getStats(): DebounceStats {
    const pendingCount = Array.from(this.cache.values()).filter(
      (entry) => entry.status === 'pending'
    ).length;

    const successCount = Array.from(this.cache.values()).filter(
      (entry) => entry.status === 'success'
    ).length;

    return {
      totalEntries: this.cache.size,
      pendingCount,
      successCount,
      failedCount: this.stats.totalFailed,
      expiredCount: this.stats.totalExpired,
    };
  }

  /**
   * 销毁管理器（清理定时器）
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }

    this.cache.clear();

    console.log('[DebounceCacheManager] Destroyed');
  }

  // ========== 私有方法 ==========

  /**
   * 启动定期清理任务
   */
  private startCleanupScheduler(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanupExpired();
    }, this.cleanupIntervalMs);

    if (this.debug) {
      console.log('[DebounceCacheManager] Cleanup scheduler started', {
        intervalMs: this.cleanupIntervalMs,
      });
    }
  }

  /**
   * 清理过期条目
   */
  private cleanupExpired(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, entry] of Array.from(this.cache.entries())) {
      if (now > entry.expiresAt) {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) {
      this.cache.delete(key);
      this.stats.totalExpired++;
    }

    if (this.debug && expiredKeys.length > 0) {
      console.log('[DebounceCacheManager] Cleaned up expired entries', {
        count: expiredKeys.length,
      });
    }
  }
}

// ============================================================================
// 便捷函数
// ============================================================================

/**
 * 创建防抖缓存管理器（工厂函数）
 *
 * @param debounceMs - 防抖时间（毫秒）
 * @param cleanupIntervalMs - 清理间隔（毫秒）
 * @returns 防抖缓存管理器实例
 *
 * @example
 * ```ts
 * import { createDebounceCacheManager } from '@/packages/ads/core/DebounceCacheManager';
 *
 * const manager = createDebounceCacheManager(20000, 60000);
 * ```
 */
export function createDebounceCacheManager(
  debounceMs: number = 20000,
  cleanupIntervalMs: number = 60000
): DebounceCacheManager {
  return new DebounceCacheManager(debounceMs, cleanupIntervalMs);
}

// ============================================================================
// 导出
// ============================================================================

export default DebounceCacheManager;
