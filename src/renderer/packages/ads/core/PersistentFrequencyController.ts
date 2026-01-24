/**
 * AI Ad Network - 持久化频率控制器
 *
 * 负责控制广告展示频率，支持持久化存储
 * 核心改进：
 * - 使用 storage 持久化展示记录
 * - 页面刷新后数据不丢失
 * - 支持会话过期清理
 * - 防抖保存（2秒批量写入）
 *
 * @see FrequencyController.ts - 原始内存版本（作为参考）
 * @see AdController.ts - 使用此控制器
 */

import type { AdConfig } from '../config/adConfigSchema';
import storage from '../../../storage';

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 频率统计信息
 */
export interface FrequencyStats {
  /** 当前会话消息总数 */
  messageCount: number;
  /** 当前会话广告展示总数 */
  adCount: number;
  /** 上次展示广告的时间戳 */
  lastAdTime: number;
  /** 各格式的展示计数 */
  formatCounters: Record<string, number>;
  /** 各格式的上次展示时间 */
  formatLastShown: Record<string, number>;
}

/**
 * 会话数据（存储格式）
 */
interface SessionData {
  sessionId: string;
  messageCount: number;
  adCount: number;
  formatCounters: Record<string, number>;
  formatLastShown: Record<string, number>;
  lastActivity: number;
}

/**
 * 格式特定的频率配置
 */
interface FormatFrequencyConfig {
  enabled: boolean;
  frequency?: number;
  maxPerSession?: number;
  probability?: number;
}

// ============================================================================
// 存储键定义
// ============================================================================

/**
 * 存储键前缀
 */
const STORAGE_PREFIX = 'ad:freq:';

/**
 * 生成存储键
 */
function getStorageKey(sessionId: string, suffix: string): string {
  return `${STORAGE_PREFIX}${sessionId}:${suffix}`;
}

// ============================================================================
// 防抖保存函数
// ============================================================================

/**
 * 创建防抖保存函数
 */
type DebouncedSaveFunc = () => void & { cancel(): void };

function createDebouncedSave(
  saveFn: () => Promise<void>,
  delay: number
): DebouncedSaveFunc {
  let timer: ReturnType<typeof setTimeout> | null = null;

  const fn = (() => {
    if (timer) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => {
      saveFn();
      timer = null;
    }, delay);
  }) as DebouncedSaveFunc;

  fn.cancel = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  };

  return fn;
}

// ============================================================================
// 持久化频率控制器
// ============================================================================

/**
 * 持久化频率控制器
 *
 * 功能：
 * - 按格式独立计数
 * - 支持频率控制（每N条消息展示一次）
 * - 支持概率控制（随机展示）
 * - 支持单次会话最大展示次数限制
 * - 数据持久化到 storage
 * - 支持会话过期清理
 *
 * @example
 * ```ts
 * const controller = new PersistentFrequencyController(config, storage, 'session_123');
 *
 * // 记录消息和广告展示
 * controller.recordMessage();
 * await controller.recordImpression('actionCard');
 *
 * // 检查是否应该展示
 * if (controller.shouldShow('actionCard')) {
 *   // 展示广告
 * }
 *
 * // 切换会话
 * await controller.switchSession('session_456');
 * ```
 */
export class PersistentFrequencyController {
  // ========== 内存状态（快速访问） ==========
  /** 当前会话 ID */
  private currentSessionId: string;
  /** 消息计数器 */
  private messageCount = 0;
  /** 广告计数器 */
  private adCount = 0;
  /** 上次展示广告的时间戳 */
  private lastAdTime = 0;
  /** 各格式的计数器 */
  private formatCounters: Map<string, number> = new Map();
  /** 各格式的上次展示时间 */
  private formatLastShown: Map<string, number> = new Map();

  // ========== 配置 ==========
  /** 会话过期时间（毫秒）默认 24 小时 */
  private readonly SESSION_EXPIRY_MS = 24 * 60 * 60 * 1000;
  /** 防抖保存延迟（毫秒）默认 2 秒 */
  private readonly DEBOUNCE_SAVE_MS = 2000;
  /** 清理定时器 */
  private cleanupTimer?: ReturnType<typeof setInterval>;

  // ========== 防抖保存函数 ==========
  private debouncedSave?: DebouncedSaveFunc;

  // ========== 构造函数 ==========
  constructor(
    private config: AdConfig,
    /** 存储接口 */
    private storageInstance: ReturnType<typeof storage>,
    sessionId: string
  ) {
    this.currentSessionId = sessionId;

    // 初始化防抖保存
    this.debouncedSave = createDebouncedSave(
      () => this.saveToStorage(),
      this.DEBOUNCE_SAVE_MS
    );

    // 加载数据并启动清理任务
    this.initialize();
  }

  // ========== 初始化 ==========
  /**
   * 初始化控制器
   */
  private async initialize(): Promise<void> {
    // 从存储加载当前会话数据
    await this.loadFromStorage();

    // 初始化格式计数器
    this.initializeFormatCounters();

    // 启动定期清理任务（每小时）
    this.startCleanupScheduler();

    if (this.config.debug) {
      console.log('[PersistentFrequencyController] Initialized', {
        sessionId: this.currentSessionId,
        messageCount: this.messageCount,
        adCount: this.adCount,
      });
    }
  }

  /**
   * 初始化格式计数器
   */
  private initializeFormatCounters(): void {
    const formats: (keyof AdConfig['formats'])[] = [
      'actionCard',
      'suffix',
      'followup',
      'source',
      'static',
      'leadGen',
    ];

    for (const format of formats) {
      if (!this.formatCounters.has(format)) {
        this.formatCounters.set(format, 0);
      }
      if (!this.formatLastShown.has(format)) {
        this.formatLastShown.set(format, 0);
      }
    }
  }

  // ========== 公共方法 ==========

  /**
   * 判断是否应该展示广告
   *
   * @param format - 可选，指定要检查的广告格式
   * @returns 是否应该展示
   *
   * @example
   * ```ts
   * // 检查是否有任何广告应该展示
   * const shouldShow = controller.shouldShow();
   *
   * // 检查特定格式是否应该展示
   * const shouldShowActionCard = controller.shouldShow('actionCard');
   * ```
   */
  shouldShow(format?: string): boolean {
    if (this.config.debug) {
      console.log('[PersistentFrequencyController.shouldShow CALLED]', {
        format,
        messageCount: this.messageCount,
        adCount: this.adCount,
      });
    }

    // 如果指定了格式，检查该格式
    if (format) {
      const result = this.shouldShowFormat(format);
      if (this.config.debug) {
        console.log('[PersistentFrequencyController.shouldShowFormat result]', { format, result });
      }
      return result;
    }

    // 检查所有启用的格式
    const activeFormats = this.getActiveFormats();

    if (this.config.debug) {
      console.log('[PersistentFrequencyController] Active formats', activeFormats);
    }

    for (const formatName of activeFormats) {
      if (this.shouldShowFormat(formatName)) {
        if (this.config.debug) {
          console.log('[PersistentFrequencyController] shouldShow = TRUE', formatName);
        }
        return true;
      }
    }

    if (this.config.debug) {
      console.log('[PersistentFrequencyController] shouldShow = FALSE', 'No format passed checks');
    }
    return false;
  }

  /**
   * 记录一条消息
   *
   * 每次用户发送或接收消息时调用
   */
  recordMessage(): void {
    this.messageCount++;

    if (this.config.debug) {
      console.log('[PersistentFrequencyController.recordMessage]', {
        newTotal: this.messageCount,
        previousTotal: this.messageCount - 1,
      });
    }

    // 保存到存储
    this.triggerSave();
  }

  /**
   * 记录广告展示（持久化）
   *
   * @param format - 可选，指定展示的广告格式
   */
  async recordImpression(format?: string): Promise<void> {
    this.adCount++;
    this.lastAdTime = Date.now();

    if (format) {
      const currentCount = this.formatCounters.get(format) || 0;
      this.formatCounters.set(format, currentCount + 1);
      this.formatLastShown.set(format, Date.now());
    }

    if (this.config.debug) {
      console.log('[PersistentFrequencyController] Ad impression recorded', {
        format,
        total: this.adCount,
        formatCount: format ? this.formatCounters.get(format) : undefined,
      });
    }

    // 立即保存（不使用防抖，确保数据不丢失）
    await this.saveToStorage();
  }

  /**
   * 获取统计信息
   *
   * @returns 频率统计信息
   */
  getStats(): FrequencyStats {
    return {
      messageCount: this.messageCount,
      adCount: this.adCount,
      lastAdTime: this.lastAdTime,
      formatCounters: Object.fromEntries(this.formatCounters),
      formatLastShown: Object.fromEntries(this.formatLastShown),
    };
  }

  /**
   * 重置当前会话计数器
   *
   * 通常在配置更新或手动重置时调用
   */
  async reset(): Promise<void> {
    this.messageCount = 0;
    this.adCount = 0;
    this.lastAdTime = 0;
    this.formatCounters.clear();
    this.formatLastShown.clear();
    this.initializeFormatCounters();

    // 保存到存储
    await this.saveToStorage();

    if (this.config.debug) {
      console.log('[PersistentFrequencyController] Counters reset');
    }
  }

  /**
   * 重置特定格式的计数器
   *
   * @param format - 要重置的广告格式
   */
  async resetFormat(format: string): Promise<void> {
    this.formatCounters.set(format, 0);
    this.formatLastShown.set(format, 0);

    // 保存到存储
    await this.saveToStorage();

    if (this.config.debug) {
      console.log(`[PersistentFrequencyController] Format "${format}" counter reset`);
    }
  }

  /**
   * 更新配置
   *
   * @param config - 新的配置
   */
  updateConfig(config: AdConfig): void {
    this.config = config;

    if (this.config.debug) {
      console.log('[PersistentFrequencyController] Config updated');
    }
  }

  /**
   * 切换会话
   *
   * 切换到新的 sessionId，加载新会话的数据
   *
   * @param newSessionId - 新的会话 ID
   */
  async switchSession(newSessionId: string): Promise<void> {
    if (newSessionId === this.currentSessionId) {
      return;
    }

    // 保存当前会话数据
    await this.saveToStorage();

    // 切换到新会话
    this.currentSessionId = newSessionId;

    // 重置计数器
    this.messageCount = 0;
    this.adCount = 0;
    this.lastAdTime = 0;
    this.formatCounters.clear();
    this.formatLastShown.clear();

    // 加载新会话数据
    await this.loadFromStorage();
    this.initializeFormatCounters();

    if (this.config.debug) {
      console.log('[PersistentFrequencyController] Session switched', {
        oldSessionId: this.currentSessionId,
        newSessionId,
      });
    }
  }

  /**
   * 清理过期会话数据
   */
  async cleanupExpiredSessions(): Promise<void> {
    try {
      const allData = await this.storageInstance.getAll();
      const now = Date.now();
      const expiredSessions = new Set<string>();

      // 找出所有过期的会话
      for (const [key, value] of Object.entries(allData)) {
        if (!key.startsWith(STORAGE_PREFIX)) continue;
        if (!key.endsWith(':timestamp')) continue;

        const sessionData = value as SessionData;
        if (now - sessionData.lastActivity > this.SESSION_EXPIRY_MS) {
          // 提取 sessionId
          const parts = key.split(':');
          if (parts.length >= 3) {
            expiredSessions.add(parts[2]);
          }
        }
      }

      // 删除过期会话的所有数据
      for (const sessionId of expiredSessions) {
        await this.clearSessionData(sessionId);
      }

      if (this.config.debug && expiredSessions.size > 0) {
        console.log('[PersistentFrequencyController] Cleaned up expired sessions', {
          count: expiredSessions.size,
        });
      }
    } catch (error) {
      console.error('[PersistentFrequencyController] Cleanup failed:', error);
    }
  }

  /**
   * 销毁控制器
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }

    if (this.debouncedSave) {
      this.debouncedSave.cancel();
    }

    console.log('[PersistentFrequencyController] Destroyed');
  }

  // ========== 私有方法 ==========

  /**
   * 检查特定格式是否应该展示
   *
   * @param format - 广告格式
   * @returns 是否应该展示
   */
  private shouldShowFormat(format: string): boolean {
    const formatConfig = this.getFormatConfig(format);

    // 检查格式是否启用
    if (!formatConfig?.enabled) {
      return false;
    }

    // 必须有至少一条消息才能展示广告
    if (this.messageCount === 0) {
      return false;
    }

    // 检查单次会话最大展示次数
    if (formatConfig.maxPerSession !== undefined) {
      const currentCount = this.formatCounters.get(format) || 0;
      if (currentCount >= formatConfig.maxPerSession) {
        if (this.config.debug) {
          console.log(`[PersistentFrequencyController] Format "${format}" reached max per session limit`);
        }
        return false;
      }
    }

    // 频率控制（每N条消息展示一次）
    if (formatConfig.frequency !== undefined) {
      if (this.messageCount % formatConfig.frequency === 0) {
        // 检查是否有足够的间隔（避免连续展示）
        if (this.shouldShowWithInterval(format)) {
          return true;
        }
      }
    }

    // 概率控制
    if (formatConfig.probability !== undefined) {
      if (Math.random() < formatConfig.probability) {
        if (this.shouldShowWithInterval(format)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * 获取当前启用的广告格式列表
   */
  private getActiveFormats(): string[] {
    const formats: string[] = [];

    if (this.config.formats.actionCard.enabled) formats.push('actionCard');
    if (this.config.formats.suffix.enabled) formats.push('suffix');
    if (this.config.formats.followup.enabled) formats.push('followup');
    if (this.config.formats.source.enabled) formats.push('source');
    if (this.config.formats.static.enabled) formats.push('static');
    if (this.config.formats.leadGen.enabled) formats.push('leadGen');

    return formats;
  }

  /**
   * 获取格式的频率配置
   *
   * @param format - 广告格式
   * @returns 格式配置
   */
  private getFormatConfig(format: string): FormatFrequencyConfig | undefined {
    const formatKeyMap: Record<string, keyof AdConfig['formats']> = {
      actionCard: 'actionCard',
      action_card: 'actionCard',
      suffix: 'suffix',
      followup: 'followUp',
      follow_up: 'followUp',
      followUp: 'followUp',
      source: 'source',
      sponsored_source: 'source',
      sponsoredSource: 'source',
      static: 'static',
      leadGen: 'leadGen',
      lead_gen: 'leadGen',
    };

    const configKey = formatKeyMap[format] || (format as keyof AdConfig['formats']);
    return this.config.formats[configKey];
  }

  /**
   * 检查是否应该展示（考虑间隔）
   *
   * 避免同一格式广告连续展示过于频繁
   *
   * @param format - 广告格式
   * @returns 是否应该展示
   */
  private shouldShowWithInterval(format: string): boolean {
    const lastShown = this.formatLastShown.get(format) || 0;
    const now = Date.now();
    const minInterval = 30000; // 最小间隔30秒

    if (now - lastShown < minInterval) {
      if (this.config.debug) {
        console.log(`[PersistentFrequencyController] Format "${format}" too soon since last show`);
      }
      return false;
    }

    return true;
  }

  /**
   * 从存储加载当前会话数据
   */
  private async loadFromStorage(): Promise<void> {
    try {
      const key = getStorageKey(this.currentSessionId, 'data');
      const data = await this.storageInstance.getItem<SessionData | null>(key, null);

      if (data) {
        this.messageCount = data.messageCount;
        this.adCount = data.adCount;
        this.lastAdTime = data.formatLastShown
          ? Object.values(data.formatLastShown)[0] || 0
          : 0;

        // 加载格式计数器
        for (const [format, count] of Object.entries(data.formatCounters)) {
          this.formatCounters.set(format, count);
        }

        // 加载格式最后展示时间
        for (const [format, time] of Object.entries(data.formatLastShown)) {
          this.formatLastShown.set(format, time);
        }

        if (this.config.debug) {
          console.log('[PersistentFrequencyController] Loaded from storage', {
            sessionId: this.currentSessionId,
            messageCount: this.messageCount,
            adCount: this.adCount,
          });
        }
      } else {
        // 新会话，使用默认值
        this.messageCount = 0;
        this.adCount = 0;
        this.lastAdTime = 0;
      }
    } catch (error) {
      console.error('[PersistentFrequencyController] Failed to load from storage:', error);
      // 使用默认值
      this.messageCount = 0;
      this.adCount = 0;
      this.lastAdTime = 0;
    }
  }

  /**
   * 保存到存储
   */
  private async saveToStorage(): Promise<void> {
    try {
      const now = Date.now();

      // 准备数据
      const sessionData: SessionData = {
        sessionId: this.currentSessionId,
        messageCount: this.messageCount,
        adCount: this.adCount,
        formatCounters: Object.fromEntries(this.formatCounters),
        formatLastShown: Object.fromEntries(this.formatLastShown),
        lastActivity: now,
      };

      // 保存数据
      const dataKey = getStorageKey(this.currentSessionId, 'data');
      await this.storageInstance.setItem(dataKey, sessionData);

      // 保存时间戳
      const timestampKey = getStorageKey(this.currentSessionId, 'timestamp');
      await this.storageInstance.setItem(timestampKey, { lastActivity: now });

      if (this.config.debug) {
        console.log('[PersistentFrequencyController] Saved to storage', {
          sessionId: this.currentSessionId,
          messageCount: this.messageCount,
          adCount: this.adCount,
        });
      }
    } catch (error) {
      console.error('[PersistentFrequencyController] Failed to save to storage:', error);
    }
  }

  /**
   * 触发防抖保存
   */
  private triggerSave(): void {
    if (this.debouncedSave) {
      this.debouncedSave();
    }
  }

  /**
   * 清除会话的所有数据
   *
   * @param sessionId - 会话 ID
   */
  private async clearSessionData(sessionId: string): Promise<void> {
    const dataKey = getStorageKey(sessionId, 'data');
    const timestampKey = getStorageKey(sessionId, 'timestamp');

    await this.storageInstance.removeItem(dataKey);
    await this.storageInstance.removeItem(timestampKey);
  }

  /**
   * 启动定期清理任务
   */
  private startCleanupScheduler(): void {
    // 每小时清理一次过期会话
    const cleanupInterval = 60 * 60 * 1000;

    this.cleanupTimer = setInterval(() => {
      this.cleanupExpiredSessions();
    }, cleanupInterval);

    if (this.config.debug) {
      console.log('[PersistentFrequencyController] Cleanup scheduler started', {
        intervalMs: cleanupInterval,
      });
    }
  }
}

// ============================================================================
// 工厂函数
// ============================================================================

/**
 * 创建持久化频率控制器
 *
 * @param config - 广告配置
 * @param sessionId - 会话 ID
 * @returns 频率控制器实例
 */
export function createPersistentFrequencyController(
  config: AdConfig,
  sessionId: string
): PersistentFrequencyController {
  return new PersistentFrequencyController(config, storage, sessionId);
}

// ============================================================================
// 导出
// ============================================================================

export default PersistentFrequencyController;
