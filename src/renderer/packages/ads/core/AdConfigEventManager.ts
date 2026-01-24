/**
 * AI Ad Network - 配置事件管理器
 *
 * 使用事件订阅模式替代循环导入
 * 当广告配置变化时通知所有订阅者
 *
 * 解决的问题：
 * - adConfigStore.ts 动态导入 useAds 造成的循环依赖
 * - 配置更新时缓存清除的时序问题
 *
 * @see adConfigStore.ts - 配置发出事件
 * @see useAds.ts - 监听配置变化并清除缓存
 */

import type { AdConfig } from '../config/adConfigSchema';

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 配置变化事件类型
 */
export type ConfigChangeEventType = 'update' | 'reset' | 'formatToggle' | 'enabledToggle';

/**
 * 配置变化事件
 */
export interface ConfigChangeEvent {
  /** 事件类型 */
  type: ConfigChangeEventType;
  /** 更新后的配置 */
  config: AdConfig;
  /** 事件时间戳 */
  timestamp: number;
  /** 变更的内容（可选） */
  changes?: Partial<AdConfig>;
  /** 变更的格式（仅 formatToggle 类型） */
  format?: keyof AdConfig['formats'];
}

/**
 * 配置变化监听器
 */
export type ConfigChangeListener = (event: ConfigChangeEvent) => void;

/**
 * 监听器选项
 */
export interface ListenerOptions {
  /** 是否只监听特定类型的事件 */
  eventTypes?: ConfigChangeEventType[];
  /** 是否只在调试模式下调用 */
  debugOnly?: boolean;
  /** 监听器名称（用于调试） */
  name?: string;
}

/**
 * 带选项的监听器
 */
interface WrappedListener {
  listener: ConfigChangeListener;
  options: ListenerOptions;
  unsubscribe: () => void;
}

// ============================================================================
// 配置事件管理器
// ============================================================================

/**
 * 配置事件管理器
 *
 * 单例模式，管理所有配置变化事件的订阅和分发
 *
 * @example
 * ```ts
 * // 订阅配置变化
 * const unsubscribe = AdConfigEventManager.getInstance().subscribe((event) => {
 *   console.log('Config changed:', event.type);
 *   clearAllAdsCache();
 * });
 *
 * // 发出事件（在 adConfigStore 中）
 * AdConfigEventManager.getInstance().emit({
 *   type: 'update',
 *   config: newConfig,
 *   timestamp: Date.now(),
 *   changes: { enabled: true },
 * });
 *
 * // 取消订阅
 * unsubscribe();
 * ```
 */
export class AdConfigEventManager {
  // ========== 单例实例 ==========
  private static instance: AdConfigEventManager | null = null;

  // ========== 监听器管理 ==========
  private listeners = new Set<WrappedListener>();
  private listenerIdCounter = 0;

  // ========== 统计信息 ==========
  private stats = {
    totalEmitted: 0,
    totalListeners: 0,
    totalErrors: 0,
  };

  // ========== 构造函数（私有） ==========
  private constructor() {
    console.log('[AdConfigEventManager] Initialized');
  }

  // ========== 公共方法 ==========

  /**
   * 获取单例实例
   */
  static getInstance(): AdConfigEventManager {
    if (!AdConfigEventManager.instance) {
      AdConfigEventManager.instance = new AdConfigEventManager();
    }
    return AdConfigEventManager.instance;
  }

  /**
   * 订阅配置变化
   *
   * @param listener - 监听器函数
   * @param options - 监听器选项
   * @returns 取消订阅函数
   *
   * @example
   * ```ts
   * // 基本订阅
   * const unsubscribe = manager.subscribe((event) => {
   *   console.log('Config changed');
   * });
   *
   * // 带选项的订阅
   * const unsubscribe = manager.subscribe(
   *   (event) => { console.log('Only updates'); },
   *   { eventTypes: ['update'] }
   * );
   * ```
   */
  subscribe(listener: ConfigChangeListener, options: ListenerOptions = {}): () => void {
    const wrappedListener: WrappedListener = {
      listener,
      options,
      unsubscribe: () => {
        this.listeners.delete(wrappedListener);
        this.stats.totalListeners--;

        if (options.name) {
          console.log(`[AdConfigEventManager] Listener "${options.name}" unsubscribed`);
        }
      },
    };

    this.listeners.add(wrappedListener);
    this.stats.totalListeners++;

    if (options.name || this.isDebugEnabled()) {
      console.log('[AdConfigEventManager] Listener subscribed', {
        name: options.name || 'anonymous',
        eventTypes: options.eventTypes,
        debugOnly: options.debugOnly,
        totalListeners: this.listeners.size,
      });
    }

    // 返回取消订阅函数
    return wrappedListener.unsubscribe;
  }

  /**
   * 发出配置变化事件
   *
   * @param event - 配置变化事件
   *
   * @example
   * ```ts
   * manager.emit({
   *   type: 'update',
   *   config: newConfig,
   *   timestamp: Date.now(),
   *   changes: { enabled: true },
   * });
   * ```
   */
  emit(event: ConfigChangeEvent): void {
    this.stats.totalEmitted++;

    if (this.isDebugEnabled()) {
      console.log('[AdConfigEventManager] Emitting event', {
        type: event.type,
        timestamp: event.timestamp,
        changes: event.changes,
        format: event.format,
        listenerCount: this.listeners.size,
      });
    }

    // 通知所有监听器
    for (const wrappedListener of Array.from(this.listeners)) {
      // 检查事件类型过滤
      if (wrappedListener.options.eventTypes) {
        if (!wrappedListener.options.eventTypes.includes(event.type)) {
          continue;
        }
      }

      // 检查调试模式过滤
      if (wrappedListener.options.debugOnly && !event.config.debug) {
        continue;
      }

      // 异步调用监听器，避免阻塞
      setTimeout(() => {
        try {
          wrappedListener.listener(event);
        } catch (error) {
          this.stats.totalErrors++;
          console.error('[AdConfigEventManager] Listener error:', {
            name: wrappedListener.options.name,
            error,
            event,
          });
        }
      }, 0);
    }
  }

  /**
   * 取消所有订阅
   */
  unsubscribeAll(): void {
    const count = this.listeners.size;
    this.listeners.clear();
    this.stats.totalListeners = 0;

    console.log(`[AdConfigEventManager] Unsubscribed all listeners (${count})`);
  }

  /**
   * 获取统计信息
   */
  getStats() {
    return {
      ...this.stats,
      currentListeners: this.listeners.size,
    };
  }

  /**
   * 重置统计信息
   */
  resetStats(): void {
    this.stats = {
      totalEmitted: 0,
      totalListeners: this.stats.totalListeners,
      totalErrors: 0,
    };
  }

  // ========== 私有方法 ==========

  /**
   * 检查是否在调试模式
   */
  private isDebugEnabled(): boolean {
    // 检查是否有任何监听器启用了调试
    for (const listener of Array.from(this.listeners)) {
      if (listener.options.name) {
        return true;
      }
    }
    return false;
  }
}

// ============================================================================
// 便捷函数
// ============================================================================

/**
 * 订阅配置变化（便捷函数）
 *
 * @param listener - 监听器函数
 * @param options - 监听器选项
 * @returns 取消订阅函数
 *
 * @example
 * ```ts
 * import { subscribeToConfigChanges } from '@/packages/ads/core/AdConfigEventManager';
 *
 * const unsubscribe = subscribeToConfigChanges((event) => {
 *   if (event.type === 'update') {
 *     clearAllAdsCache();
 *   }
 * });
 * ```
 */
export function subscribeToConfigChanges(
  listener: ConfigChangeListener,
  options?: ListenerOptions
): () => void {
  return AdConfigEventManager.getInstance().subscribe(listener, options);
}

/**
 * 发出配置变化事件（便捷函数）
 *
 * @param event - 配置变化事件
 *
 * @example
 * ```ts
 * import { emitConfigChange } from '@/packages/ads/core/AdConfigEventManager';
 *
 * emitConfigChange({
 *   type: 'update',
 *   config: newConfig,
 *   timestamp: Date.now(),
 * });
 * ```
 */
export function emitConfigChange(event: ConfigChangeEvent): void {
  AdConfigEventManager.getInstance().emit(event);
}

/**
 * 获取事件管理器统计信息（便捷函数）
 */
export function getEventManagerStats() {
  return AdConfigEventManager.getInstance().getStats();
}

// ============================================================================
// 导出
// ============================================================================

export default AdConfigEventManager;
