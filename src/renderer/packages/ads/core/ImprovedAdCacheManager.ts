/**
 * AI Ad Network - 改进的广告缓存管理器
 *
 * 核心改进：
 * - LRU 淘汰策略
 * - 区分真实/Mock 数据来源（Mock 不缓存）
 * - 改进的缓存键（hash + sessionId）
 * - 支持 TTL 配置
 *
 * @see AdController.ts - 使用此缓存管理器
 */

import type { AdConfig } from '../config/adConfigSchema';
import type { Ad, AdTriggerContext } from './types';
import storage from '../../../storage';
import { generateCacheKey } from '../utils/hash';

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 缓存的广告数据
 */
export interface CachedAds {
  /** 广告列表 */
  ads: Ad[];
  /** 缓存时间戳 */
  timestamp: number;
  /** 是否为 Mock 数据 */
  isMock: boolean;
  /** TTL（毫秒） */
  ttl: number;
}

/**
 * 缓存选项
 */
export interface CacheOptions {
  /** 是否为 Mock 数据 */
  isMock: boolean;
  /** 自定义 TTL（毫秒） */
  ttl?: number;
}

/**
 * 缓存统计信息
 */
export interface CacheStats {
  /** 当前缓存大小 */
  size: number;
  /** 缓存命中率 */
  hitRate: number;
  /** Mock 数据数量 */
  mockCount: number;
  /** 真实数据数量 */
  realCount: number;
  /** 总命中次数 */
  totalHits: number;
  /** 总未命中次数 */
  totalMisses: number;
}

/**
 * LRU 缓存节点
 */
interface CacheNode {
  /** 缓存键 */
  key: string;
  /** 缓存数据 */
  data: CachedAds;
  /** 前驱节点 */
  prev: CacheNode | null;
  /** 后继节点 */
  next: CacheNode | null;
}

// ============================================================================
// 改进的广告缓存管理器
// ============================================================================

/**
 * 改进的广告缓存管理器
 *
 * 功能：
 * - LRU 淘汰策略
 * - 区分真实/Mock 数据来源（Mock 不缓存）
 * - 改进的缓存键（hash + sessionId）
 * - 支持 TTL 配置
 * - 定期清理过期缓存
 *
 * @example
 * ```ts
 * const manager = new ImprovedAdCacheManager(config, storage);
 *
 * // 获取缓存
 * const cached = await manager.get(context, ['actionCard']);
 * if (cached) {
 *   console.log('Cache hit:', cached.ads);
 * }
 *
 * // 设置缓存
 * await manager.set(context, ['actionCard'], ads, { isMock: false });
 *
 * // 清除缓存
 * await manager.clear();
 * ```
 */
export class ImprovedAdCacheManager {
  // ========== LRU 缓存 ==========
  /** 缓存 Map（key -> node） */
  private cache = new Map<string, CacheNode>();
  /** LRU 链表头节点 */
  private head: CacheNode | null = null;
  /** LRU 链表尾节点 */
  private tail: CacheNode | null = null;

  // ========== 配置 ==========
  /** 默认 TTL（毫秒） */
  private readonly DEFAULT_TTL_MS = 5 * 60 * 1000; // 5分钟
  /** 最大缓存大小 */
  private readonly MAX_CACHE_SIZE = 100;
  /** 清理定时器 */
  private cleanupTimer?: ReturnType<typeof setInterval>;

  // ========== 统计信息 ==========
  private stats = {
    totalHits: 0,
    totalMisses: 0,
  };

  // ========== 存储键前缀 ==========
  private readonly STORAGE_PREFIX = 'ad:cache:';

  // ========== 构造函数 ==========
  constructor(
    private config: AdConfig,
    /** 存储接口 */
    private storageInstance: ReturnType<typeof storage>,
    options?: {
      maxCacheSize?: number;
      defaultTTL?: number;
    }
  ) {
    if (options?.maxCacheSize) {
      (this as any).MAX_CACHE_SIZE = options.maxCacheSize;
    }

    // 启动定期清理任务
    this.startCleanupScheduler();
  }

  // ========== 公共方法 ==========

  /**
   * 获取缓存
   *
   * @param context - 广告触发上下文
   * @param formats - 广告格式列表
   * @returns 缓存的广告或 null
   *
   * @example
   * ```ts
   * const cached = await manager.get(context, ['actionCard']);
   * if (cached) {
   *   console.log('Cache hit:', cached.ads);
   * }
   * ```
   */
  async get(
    context: AdTriggerContext,
    formats: string[]
  ): Promise<CachedAds | null> {
    const key = this.generateCacheKey(context, formats);
    const node = this.cache.get(key);

    if (!node) {
      this.stats.totalMisses++;

      if (this.config.debug) {
        console.log('[ImprovedAdCacheManager] Cache miss', { key });
      }

      return null;
    }

    // 检查是否过期
    const now = Date.now();
    if (now - node.data.timestamp > node.data.ttl) {
      // 过期，删除缓存
      this.removeNode(node);
      this.cache.delete(key);

      this.stats.totalMisses++;

      if (this.config.debug) {
        console.log('[ImprovedAdCacheManager] Cache expired', { key });
      }

      return null;
    }

    // 缓存命中，移动到 LRU 链表头部
    this.moveToFront(node);

    this.stats.totalHits++;

    if (this.config.debug) {
      console.log('[ImprovedAdCacheManager] Cache hit', {
        key,
        adsCount: node.data.ads.length,
        isMock: node.data.isMock,
      });
    }

    return node.data;
  }

  /**
   * 设置缓存
   *
   * @param context - 广告触发上下文
   * @param formats - 广告格式列表
   * @param ads - 广告列表
   * @param options - 缓存选项
   *
   * @example
   * ```ts
   * // 缓存真实数据
   * await manager.set(context, ['actionCard'], realAds, { isMock: false });
   *
   * // Mock 数据不会被缓存
   * await manager.set(context, ['actionCard'], mockAds, { isMock: true });
   * ```
   */
  async set(
    context: AdTriggerContext,
    formats: string[],
    ads: Ad[],
    options: CacheOptions
  ): Promise<void> {
    // 关键改进：Mock 数据不缓存
    if (options.isMock) {
      if (this.config.debug) {
        console.log('[ImprovedAdCacheManager] Skipping mock data cache');
      }
      return;
    }

    const key = this.generateCacheKey(context, formats);
    const ttl = options.ttl ?? this.DEFAULT_TTL_MS;

    // 检查是否已存在
    const existingNode = this.cache.get(key);
    if (existingNode) {
      // 更新现有节点
      existingNode.data = {
        ads,
        timestamp: Date.now(),
        isMock: options.isMock,
        ttl,
      };
      this.moveToFront(existingNode);

      if (this.config.debug) {
        console.log('[ImprovedAdCacheManager] Cache updated', { key, adsCount: ads.length });
      }

      return;
    }

    // 创建新节点
    const node: CacheNode = {
      key,
      data: {
        ads,
        timestamp: Date.now(),
        isMock: options.isMock,
        ttl,
      },
      prev: null,
      next: null,
    };

    // 添加到缓存和 LRU 链表头部
    this.cache.set(key, node);
    this.addToFront(node);

    // 检查缓存大小
    if (this.cache.size > (this as any).MAX_CACHE_SIZE) {
      this.removeTail();
    }

    if (this.config.debug) {
      console.log('[ImprovedAdCacheManager] Cache set', {
        key,
        adsCount: ads.length,
        cacheSize: this.cache.size,
      });
    }
  }

  /**
   * 删除缓存
   *
   * @param context - 广告触发上下文
   * @param formats - 广告格式列表
   */
  async delete(context: AdTriggerContext, formats: string[]): Promise<void> {
    const key = this.generateCacheKey(context, formats);
    const node = this.cache.get(key);

    if (node) {
      this.removeNode(node);
      this.cache.delete(key);

      if (this.config.debug) {
        console.log('[ImprovedAdCacheManager] Cache deleted', { key });
      }
    }
  }

  /**
   * 清除所有缓存
   */
  async clear(): Promise<void> {
    const size = this.cache.size;
    this.cache.clear();
    this.head = null;
    this.tail = null;
  }

  /**
   * 清除 Mock 数据缓存
   */
  async clearMockCache(): Promise<void> {
    const mockKeys: string[] = [];

    for (const [key, node] of Array.from(this.cache.entries())) {
      if (node.data.isMock) {
        mockKeys.push(key);
      }
    }

    for (const key of mockKeys) {
      const node = this.cache.get(key);
      if (node) {
        this.removeNode(node);
        this.cache.delete(key);
      }
    }

    if (this.config.debug && mockKeys.length > 0) {
      console.log('[ImprovedAdCacheManager] Cleared mock cache', { count: mockKeys.length });
    }
  }

  /**
   * 获取缓存统计
   */
  getStats(): CacheStats {
    let mockCount = 0;
    let realCount = 0;

    for (const node of Array.from(this.cache.values())) {
      if (node.data.isMock) {
        mockCount++;
      } else {
        realCount++;
      }
    }

    const totalRequests = this.stats.totalHits + this.stats.totalMisses;
    const hitRate = totalRequests > 0 ? this.stats.totalHits / totalRequests : 0;

    return {
      size: this.cache.size,
      hitRate,
      mockCount,
      realCount,
      totalHits: this.stats.totalHits,
      totalMisses: this.stats.totalMisses,
    };
  }

  /**
   * 销毁缓存管理器
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }

    this.cache.clear();
    this.head = null;
    this.tail = null;

    console.log('[ImprovedAdCacheManager] Destroyed');
  }

  // ========== 私有方法 ==========

  /**
   * 生成缓存键
   *
   * @param context - 广告触发上下文
   * @param formats - 广告格式列表
   * @returns 缓存键
   */
  private generateCacheKey(context: AdTriggerContext, formats: string[]): string {
    const sessionId = context.conversationContext?.sessionId || 'default';
    const query = context.currentMessage?.query || '';

    // 使用 hash 工具生成键
    // 格式：ad:cache:{sessionId}:{hash}
    return generateCacheKey(`${this.STORAGE_PREFIX}${sessionId}`, [
      query,
      ...formats.sort(),
    ]);
  }

  /**
   * LRU：将节点移到头部
   *
   * @param node - 要移动的节点
   */
  private moveToFront(node: CacheNode): void {
    // 移除节点
    if (node.prev) {
      node.prev.next = node.next;
    }
    if (node.next) {
      node.next.prev = node.prev;
    }

    // 如果是尾节点
    if (this.tail === node) {
      this.tail = node.prev;
    }

    // 添加到头部
    this.addToFront(node);
  }

  /**
   * LRU：从尾部移除节点
   */
  private removeTail(): void {
    if (!this.tail) {
      return;
    }

    this.cache.delete(this.tail.key);

    if (this.tail.prev) {
      this.tail.prev.next = null;
    }

    this.tail = this.tail.prev;

    if (!this.tail) {
      this.head = null;
    }

    if (this.config.debug) {
      console.log('[ImprovedAdCacheManager] Removed tail (LRU eviction)');
    }
  }

  /**
   * LRU：在头部添加节点
   *
   * @param node - 要添加的节点
   */
  private addToFront(node: CacheNode): void {
    node.prev = null;
    node.next = this.head;

    if (this.head) {
      this.head.prev = node;
    }

    this.head = node;

    if (!this.tail) {
      this.tail = node;
    }
  }

  /**
   * LRU：移除节点
   *
   * @param node - 要移除的节点
   */
  private removeNode(node: CacheNode): void {
    if (node.prev) {
      node.prev.next = node.next;
    }
    if (node.next) {
      node.next.prev = node.prev;
    }

    if (this.head === node) {
      this.head = node.next;
    }
    if (this.tail === node) {
      this.tail = node.prev;
    }
  }

  /**
   * 启动定期清理任务
   */
  private startCleanupScheduler(): void {
    // 每分钟清理一次过期缓存
    const cleanupInterval = 60 * 1000;

    this.cleanupTimer = setInterval(() => {
      this.cleanupExpired();
    }, cleanupInterval);

    if (this.config.debug) {
      console.log('[ImprovedAdCacheManager] Cleanup scheduler started', {
        intervalMs: cleanupInterval,
      });
    }
  }

  /**
   * 清理过期缓存
   */
  private cleanupExpired(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, node] of Array.from(this.cache.entries())) {
      if (now - node.data.timestamp > node.data.ttl) {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) {
      const node = this.cache.get(key);
      if (node) {
        this.removeNode(node);
        this.cache.delete(key);
      }
    }

    if (this.config.debug && expiredKeys.length > 0) {
      console.log('[ImprovedAdCacheManager] Cleaned up expired cache', {
        count: expiredKeys.length,
      });
    }
  }
}

// ============================================================================
// 便捷函数
// ============================================================================

/**
 * 创建改进的缓存管理器（工厂函数）
 *
 * @param config - 广告配置
 * @param options - 可选配置
 * @returns 缓存管理器实例
 *
 * @example
 * ```ts
 * import { createImprovedAdCacheManager } from '@/packages/ads/core/ImprovedAdCacheManager';
 *
 * const manager = createImprovedAdCacheManager(config, { maxCacheSize: 200 });
 * ```
 */
export function createImprovedAdCacheManager(
  config: AdConfig,
  options?: {
    maxCacheSize?: number;
    defaultTTL?: number;
  }
): ImprovedAdCacheManager {
  return new ImprovedAdCacheManager(config, storage, options);
}

// ============================================================================
// 导出
// ============================================================================

export default ImprovedAdCacheManager;
