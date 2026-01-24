/**
 * AI Ad Network - 频率控制器
 *
 * 负责控制广告展示频率，避免用户过度暴露于广告
 * 支持按格式独立计数、频率控制、概率控制
 *
 * @see adConfigSchema.ts - 配置定义
 */

import type { AdConfig, AdFormat } from '../config/adConfigSchema';

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
 * 格式特定的频率配置
 */
interface FormatFrequencyConfig {
  enabled: boolean;
  frequency?: number;
  maxPerSession?: number;
  probability?: number;
}

// ============================================================================
// 频率控制器
// ============================================================================

/**
 * 频率控制器
 *
 * 功能：
 * - 按格式独立计数
 * - 支持频率控制（每N条消息展示一次）
 * - 支持概率控制（随机展示）
 * - 支持单次会话最大展示次数限制
 * - 提供统计信息查询
 */
export class FrequencyController {
  // ========== 状态 ==========
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

  // ========== 构造函数 ==========
  constructor(private config: AdConfig) {
    // 初始化格式计数器
    this.initializeFormatCounters();
  }

  // ========== 初始化 ==========
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

    formats.forEach((format) => {
      this.formatCounters.set(format, 0);
      this.formatLastShown.set(format, 0);
    });
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
   * const shouldShowActionCard = controller.shouldShow('action_card');
   * ```
   */
  shouldShow(format?: string): boolean {
    console.log('[📊 FrequencyController.shouldShow CALLED]', {
      format,
      messageCount: this.messageCount,
      adCount: this.adCount,
    });

    // 如果指定了格式，检查该格式
    if (format) {
      const result = this.shouldShowFormat(format);
      console.log('[📊 shouldShowFormat result]', { format, result });
      return result;
    }

    // 检查所有启用的格式
    const activeFormats = this.getActiveFormats();
    console.log('[📊 Active formats]', activeFormats);

    for (const formatName of activeFormats) {
      if (this.shouldShowFormat(formatName)) {
        console.log('[✅ shouldShow = TRUE]', formatName);
        return true;
      }
    }

    console.log('[❌ shouldShow = FALSE]', 'No format passed checks');
    return false;
  }

  /**
   * 检查特定格式是否应该展示
   *
   * @param format - 广告格式
   * @returns 是否应该展示
   */
  shouldShowFormat(format: string): boolean {
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
          console.log(`[FrequencyController] Format "${format}" reached max per session limit (${formatConfig.maxPerSession})`);
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
   * 记录一条消息
   *
   * 每次用户发送或接收消息时调用
   */
  recordMessage(): void {
    this.messageCount++;

    console.log('[📈 FrequencyController.recordMessage]', {
      newTotal: this.messageCount,
      previousTotal: this.messageCount - 1,
      debug: this.config.debug,
    });

    if (this.config.debug) {
      console.log(`[FrequencyController] Message recorded. Total: ${this.messageCount}`);
    }
  }

  /**
   * 记录广告展示
   *
   * @param format - 可选，指定展示的广告格式
   */
  recordImpression(format?: string): void {
    this.adCount++;
    this.lastAdTime = Date.now();

    if (format) {
      const currentCount = this.formatCounters.get(format) || 0;
      this.formatCounters.set(format, currentCount + 1);
      this.formatLastShown.set(format, Date.now());
    }

    if (this.config.debug) {
      console.log(`[FrequencyController] Ad impression recorded${format ? ` for "${format}"` : ''}. Total: ${this.adCount}`);
    }
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
   * 重置所有计数器
   *
   * 通常在会话开始或配置更新时调用
   */
  reset(): void {
    this.messageCount = 0;
    this.adCount = 0;
    this.lastAdTime = 0;
    this.formatCounters.clear();
    this.formatLastShown.clear();
    this.initializeFormatCounters();

    if (this.config.debug) {
      console.log('[FrequencyController] Counters reset');
    }
  }

  /**
   * 重置特定格式的计数器
   *
   * @param format - 要重置的广告格式
   */
  resetFormat(format: string): void {
    this.formatCounters.set(format, 0);
    this.formatLastShown.set(format, 0);

    if (this.config.debug) {
      console.log(`[FrequencyController] Format "${format}" counter reset`);
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
      console.log('[FrequencyController] Config updated');
    }
  }

  // ========== 私有方法 ==========

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
    // 支持带下划线的格式名映射
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

    const configKey = formatKeyMap[format] || format as keyof AdConfig['formats'];
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
        console.log(`[FrequencyController] Format "${format}" too soon since last show`);
      }
      return false;
    }

    return true;
  }
}

// ============================================================================
// 工厂函数
// ============================================================================

/**
 * 创建频率控制器
 *
 * @param config - 广告配置
 * @returns 频率控制器实例
 */
export function createFrequencyController(config: AdConfig): FrequencyController {
  return new FrequencyController(config);
}

// ============================================================================
// 导出
// ============================================================================

export default FrequencyController;
