/**
 * AI Ad Network - 默认广告配置
 *
 * 定义广告系统的默认配置值
 * 这些默认值会在以下情况使用：
 * 1. 首次启动时
 * 2. 重置配置时
 * 3. 配置验证失败回退时
 */

import type { AdConfig } from './adConfigSchema';
import { AdFormatEnum, AdPlacementEnum, ActionCardVariantEnum, SuffixVariantEnum, FollowUpVariantEnum, SourceVariantEnum, LeadGenFieldTypeEnum } from './adConfigSchema';

// ============================================================================
// 环境变量辅助函数（兼容 webpack 和 Vite）
// ============================================================================

/**
 * 安全获取环境变量
 * 兼容 webpack 和 Vite 两种构建方式
 */
function getEnv(key: string, fallback: string = ''): string {
  // 优先检查 webpack 的 process.env
  if (typeof process !== 'undefined' && process.env?.[key]) {
    return process.env[key] as string;
  }
  // 其次检查 Vite 的 import.meta.env
  // @ts-expect-error - import.meta.env 可能在 webpack 中不存在
  if (typeof import.meta !== 'undefined' && import.meta.env?.[key]) {
    // @ts-expect-error - import.meta.env 可能在 webpack 中不存在
    return import.meta.env[key];
  }
  return fallback;
}

/**
 * 检查是否为开发环境
 */
function isDevEnv(): boolean {
  // webpack: process.env.NODE_ENV
  if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') {
    return true;
  }
  // Vite: import.meta.env.DEV
  // @ts-expect-error - import.meta.env 可能在 webpack 中不存在
  if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) {
    return true;
  }
  return false;
}

// ============================================================================
// 默认配置
// ============================================================================

/**
 * 获取默认广告配置
 *
 * 设计原则：
 * - 默认关闭所有广告（用户主动开启）
 * - 保守的数据收集策略（仅收集必要的 query 和 response）
 * - 启用隐私保护
 * - 合理的频率控制（避免过度打扰用户）
 */
export function getDefaultAdConfig(): AdConfig {
  return {
    // ========== 全局开关 ==========
    // 默认启用广告系统
    enabled: true,

    // ========== API 配置 ==========
    api: {
      // 默认 API 地址（本地开发）
      baseUrl: getEnv('VITE_AD_API_BASE_URL', 'http://localhost:3000/api/v1'),
      // API Key 需要用户配置或从服务端获取
      apiKey: getEnv('VITE_AD_API_KEY', ''),
      // 5秒超时
      timeout: 5000,
      // 默认不使用 Mock（生产环境）
      useMock: isDevEnv(),
    },

    // ========== 数据收集配置 ==========
    dataCollection: {
      // 默认收集用户输入（广告匹配必需）
      includeQuery: true,
      // 默认收集 AI 响应（广告匹配必需）
      includeResponse: true,
      // 默认不收集完整上下文（隐私考虑）
      includeFullContext: false,
      // 默认不收集用户记忆（隐私考虑）
      includeMemory: false,
      // 默认不收集用户画像（隐私考虑）
      includeProfile: false,
      // 最近 10 轮对话（足够理解上下文）
      contextWindow: 10,
      // 默认启用数据脱敏
      enableAnonymization: true,
    },

    // ========== 广告格式配置 ==========
    formats: {
      // --- ActionCard (卡片广告) ---
      actionCard: {
        // 默认启用
        enabled: true,
        // 横向卡片（桌面端友好）
        variant: 'horizontal',
        // 放在 AI 响应后
        placement: 'post_response',
        // 每 3 条消息展示一次（不频繁）
        frequency: 3,
        // 单次会话最多 5 次
        maxPerSession: 5,
        // 显示评分和价格
        showRating: true,
        showPrice: true,
      },

      // --- Suffix (后缀广告) ---
      suffix: {
        // 默认关闭
        enabled: false,
        // 块级显示
        variant: 'block',
        // 块级布局
        placement: 'block',
        // 每 5 条消息展示一次（低频）
        frequency: 5,
        // 单次会话最多 3 次
        maxPerSession: 3,
        // 显示分隔线
        showDivider: true,
      },

      // --- FollowUp (跟进问题广告) ---
      followup: {
        // 默认关闭
        enabled: false,
        // 气泡样式
        variant: 'bubble',
        // 混在建议问题中
        placement: 'inline_questions',
        // 每 5 条消息展示一次
        frequency: 5,
        // 单次会话最多 3 次
        maxPerSession: 3,
        // 混合位置：第 2 个位置
        mixPosition: 2,
      },

      // --- SponsoredSource (赞助来源) ---
      source: {
        // 默认关闭
        enabled: false,
        // 卡片样式
        variant: 'card',
        // 每 5 条消息展示一次
        frequency: 5,
        // 单次会话最多 3 次
        maxPerSession: 3,
        // 混合位置：第 1 个位置
        mixPosition: 1,
        // 显示赞助标签（透明度要求）
        showSponsoredLabel: true,
      },

      // --- Static (静态横幅) ---
      static: {
        // 默认关闭
        enabled: false,
        // 侧边栏位置
        placement: 'sidebar',
        // 220x100 适配侧边栏宽度
        width: 220,
        height: 100,
        // 不自动刷新
        refreshInterval: 0,
        // 允许关闭
        dismissible: true,
      },

      // --- LeadGen (线索收集) ---
      leadGen: {
        // 默认关闭
        enabled: false,
        // 放在 AI 响应后
        placement: 'post_response',
        // 每 10 条消息展示一次（低频）
        frequency: 10,
        // 单次会话最多 1 次（避免打扰）
        maxPerSession: 1,
        // 默认收集邮箱（必填）和姓名（选填）
        fields: [
          {
            type: 'email',
            required: true,
            placeholder: 'your@email.com',
          },
          {
            type: 'name',
            required: false,
            placeholder: 'Your name',
          },
        ],
      },

      // --- EntityLink (实体链接广告) ---
      entityLink: {
        // 默认关闭
        enabled: false,
        // 每 5 条消息展示一次
        frequency: 5,
        // 单次会话最多 5 次
        maxPerSession: 5,
        // 最多 3 个链接
        maxLinks: 3,
        // 70% 置信度阈值
        minConfidence: 0.7,
        // † 符号（最不突兀）
        badgeStyle: 'subtle',
        // 优先长实体
        overlapStrategy: 'longest',
        // 内联显示（替换原始文本）
        placement: 'inline',
      },
    },

    // ========== 隐私保护配置 ==========
    privacy: {
      // 默认启用隐私保护
      enabled: true,
      // 默认需要用户同意
      requireConsent: true,
      // 不保留数据（0 天）
      dataRetentionDays: 0,
      // 允许收集的数据类型（包含记忆和画像）
      allowedDataTypes: ['query', 'response', 'context', 'memory', 'profile'],
    },

    // ========== 调试模式 ==========
    // 默认启用调试模式
    debug: true,
  };
}

// ============================================================================
// 预设配置
// ============================================================================

/**
 * 开发环境预设配置
 *
 * 用于开发和测试，特点：
 * - 启用 Mock 模式
 * - 启用调试模式
 * - 启用所有广告格式
 * - 较低的频率限制（便于测试）
 */
export function getDevPresetConfig(): Partial<AdConfig> {
  return {
    enabled: true,
    api: {
      useMock: true,
      timeout: 3000,
    },
    dataCollection: {
      includeQuery: true,
      includeResponse: true,
      includeFullContext: true, // 开发时收集更多数据
      contextWindow: 5, // 较小的窗口
      enableAnonymization: false, // 开发时不脱敏
    },
    formats: {
      actionCard: {
        enabled: true,
        frequency: 2, // 更频繁
        maxPerSession: 10,
      },
      suffix: {
        enabled: true,
        frequency: 2,
        maxPerSession: 5,
      },
      followup: {
        enabled: true,
        frequency: 2,
        maxPerSession: 5,
      },
      source: {
        enabled: true,
        frequency: 2,
        maxPerSession: 5,
      },
      static: {
        enabled: true,
      },
      leadGen: {
        enabled: true,
        frequency: 3,
        maxPerSession: 3,
      },
      entityLink: {
        enabled: true,
        frequency: 2,
        maxPerSession: 8,
        maxLinks: 5,
        badgeStyle: 'hover',
      },
    },
    privacy: {
      enabled: false, // 开发时关闭隐私保护
      requireConsent: false,
    },
    debug: true,
  };
}

/**
 * 演示/演示环境预设配置
 *
 * 用于产品演示，特点：
 * - 启用所有广告格式
 * - 适中的频率控制
 * - 启用隐私保护
 * - 关闭调试模式
 */
export function getDemoPresetConfig(): Partial<AdConfig> {
  return {
    enabled: true,
    api: {
      useMock: true, // 演示使用 Mock 数据
    },
    formats: {
      actionCard: {
        enabled: true,
        frequency: 3,
        maxPerSession: 5,
      },
      suffix: {
        enabled: true,
        frequency: 5,
        maxPerSession: 3,
      },
      followup: {
        enabled: true,
        frequency: 5,
        maxPerSession: 3,
      },
      source: {
        enabled: true,
        frequency: 5,
        maxPerSession: 3,
      },
      static: {
        enabled: true,
      },
      leadGen: {
        enabled: true,
        frequency: 10,
        maxPerSession: 1,
      },
      entityLink: {
        enabled: true,
        frequency: 3,
        maxPerSession: 5,
        maxLinks: 3,
        badgeStyle: 'explicit',
      },
    },
    debug: false,
  };
}

/**
 * 最小化配置
 *
 * 仅启用必要的功能，特点：
 * - 仅启用 ActionCard 广告
 * - 最小数据收集
 * - 最大隐私保护
 */
export function getMinimalPresetConfig(): Partial<AdConfig> {
  return {
    enabled: true,
    dataCollection: {
      includeQuery: true,
      includeResponse: true,
      includeFullContext: false,
      includeMemory: false,
      includeProfile: false,
      contextWindow: 5,
      enableAnonymization: true,
    },
    formats: {
      actionCard: {
        enabled: true,
        frequency: 5, // 较低频率
        maxPerSession: 3,
      },
      // 其他格式保持默认（关闭）
      suffix: {},
      followup: {},
      source: {},
      static: {},
      leadGen: {},
    },
    privacy: {
      enabled: true,
      requireConsent: true,
      dataRetentionDays: 0,
      allowedDataTypes: ['query', 'response'],
    },
  };
}

// ============================================================================
// 配置合并辅助函数
// ============================================================================

/**
 * 合并配置（预设覆盖默认值）
 *
 * @param preset 预设配置
 * @returns 合并后的完整配置
 */
export function mergePreset(preset: Partial<AdConfig>): AdConfig {
  const defaults = getDefaultAdConfig();

  return {
    ...defaults,
    ...preset,
    api: { ...defaults.api, ...preset.api },
    dataCollection: { ...defaults.dataCollection, ...preset.dataCollection },
    formats: {
      actionCard: { ...defaults.formats.actionCard, ...preset.formats?.actionCard },
      suffix: { ...defaults.formats.suffix, ...preset.formats?.suffix },
      followup: { ...defaults.formats.followup, ...preset.formats?.followup },
      source: { ...defaults.formats.source, ...preset.formats?.source },
      static: { ...defaults.formats.static, ...preset.formats?.static },
      leadGen: { ...defaults.formats.leadGen, ...preset.formats?.leadGen },
      entityLink: { ...defaults.formats.entityLink, ...preset.formats?.entityLink },
    },
    privacy: { ...defaults.privacy, ...preset.privacy },
    debug: preset.debug ?? defaults.debug,
  };
}

// ============================================================================
// 导出默认实例
// ============================================================================

/**
 * 默认配置实例
 * 可直接用于初始化 Store
 */
export const defaultAdConfig = getDefaultAdConfig();

/**
 * 开发环境配置实例
 */
export const devAdConfig = mergePreset(getDevPresetConfig());

/**
 * 演示环境配置实例
 */
export const demoAdConfig = mergePreset(getDemoPresetConfig());

/**
 * 最小化配置实例
 */
export const minimalAdConfig = mergePreset(getMinimalPresetConfig());
