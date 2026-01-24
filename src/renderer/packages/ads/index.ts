/**
 * AI Ad Network - 统一导出入口
 *
 * 提供给工程师B和工程师C使用的所有类型、接口和工具
 *
 * 使用示例：
 * ```tsx
 * // 导入类型
 * import type { AdConfig, AdFormat } from '@/packages/ads';
 *
 * // 导入 Store hooks
 * import { useAdConfigStore, useAdConfig, useIsAdEnabled } from '@/packages/ads';
 *
 * // 导入配置工具
 * import { validateAdConfig, getDefaultAdConfig } from '@/packages/ads';
 * ```
 */

// ============================================================================
// 配置 Schema 和类型
// ============================================================================

export * from './config/adConfigSchema';

// 重新导出核心类型（方便工程师B、C使用）
export type {
  AdConfig,
  ApiConfig,
  DataCollectionConfig,
  ActionCardFormatConfig,
  SuffixFormatConfig,
  FollowUpFormatConfig,
  SourceFormatConfig,
  StaticFormatConfig,
  LeadGenFormatConfig,
  PrivacyConfig,
} from './config/adConfigSchema';

// 重新导出枚举类型
export {
  AdFormatEnum,
  AdPlacementEnum,
  ActionCardVariantEnum,
  SuffixVariantEnum,
  FollowUpVariantEnum,
  SourceVariantEnum,
  LeadGenFieldTypeEnum,
} from './config/adConfigSchema';

// 导出类型别名（更简洁的使用方式）
export type AdFormat = ReturnType<typeof AdFormatEnum.parse>;
export type AdPlacement = ReturnType<typeof AdPlacementEnum.parse>;

// ============================================================================
// 配置 Store
// ============================================================================

export * from './config/adConfigStore';

// 重新导出 Store 实例（工程师B需要）
export { useAdConfigStore, initAdConfigStore } from './config/adConfigStore';

// ============================================================================
// 默认配置
// ============================================================================

export * from './config/defaultConfig';

// ============================================================================
// 验证工具
// ============================================================================

export { validateAdConfig, parseAdConfig, getAdConfigErrors, getSchemaDefaults } from './config/adConfigSchema';

// ============================================================================
// AdProvider 组件
// ============================================================================

export { AdProviderWrapper } from './AdProviderWrapper';

// ============================================================================
// React Hooks (工程师A + 工程师B)
// ============================================================================

// 工程师A提供的配置Hooks
export * from './hooks/useAdConfig';
export { default as useAdConfigHooks } from './hooks/useAdConfig';

// 工程师B提供的广告Hooks
export { useAdTrigger, useAdData, useAdList, useAdLoading } from './hooks';
export type { UseAdTriggerReturn, UseAdDataReturn, AdDataState, AdDataActions } from './hooks';

// ============================================================================
// 核心逻辑层 (工程师B)
// ============================================================================

// 核心类型
export * from './core/types';

// 核心模块
export * from './core/index';

// ============================================================================
// 工具函数 (工程师B)
// ============================================================================

export * from './utils/index';

// ============================================================================
// 类型工具
// ============================================================================

/**
 * 提取广告格式的配置类型
 *
 * @example
 * type ActionCardConfig = AdFormatConfig<'actionCard'>;
 */
export type AdFormatConfig<T extends keyof AdConfig['formats']> = AdConfig['formats'][T];

/**
 * 所有广告格式类型的联合
 */
export type AllFormatConfigs = AdConfig['formats'][keyof AdConfig['formats']];

/**
 * 广告触发上下文（工程师B需要）
 *
 * 这是触发广告请求时需要提供的上下文信息
 */
export interface AdTriggerContext {
  /** 用户输入/查询 */
  query: string;
  /** AI 响应 */
  response?: string;
  /** 会话ID */
  sessionId?: string;
  /** 消息ID */
  messageId?: string;
  /** 是否正在流式输出 */
  isStreaming?: boolean;
  /** 完整上下文（可选，根据配置决定是否收集） */
  fullContext?: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
  }>;
  /** 用户记忆（可选，根据配置决定是否收集） */
  memory?: {
    preferences?: string[];
    history?: string[];
  };
  /** 用户画像（可选，根据配置决定是否收集） */
  profile?: {
    interests?: string[];
    expertise?: string;
  };
}

/**
 * 广告数据结构（来自SDK）
 *
 * 这是SDK返回的广告数据格式
 */
export interface Ad {
  /** 广告ID */
  id: string;
  /** 广告类型 */
  type: string;
  /** 相关性分数 */
  score?: number;
  /** 广告来源 */
  source?: 'internal' | 'external';
  /** 广告内容 */
  content: Record<string, unknown>;
  /** 追踪信息 */
  tracking?: {
    clickUrl?: string;
    impressionUrl?: string;
  };
  /** 元数据 */
  metadata?: {
    category?: string;
    ecpm?: number;
  };
}

/**
 * 频率统计信息（工程师B需要）
 */
export interface FrequencyStats {
  /** 当前会话已展示次数 */
  sessionImpressions: number;
  /** 总消息数 */
  totalMessages: number;
  /** 每种格式的展示次数 */
  formatCounts: Record<string, number>;
  /** 上次展示时间戳 */
  lastImpressionTime?: number;
}

// ============================================================================
// UI 组件 (工程师C)
// ============================================================================

export * from './components';

// ============================================================================
// 常量
// ============================================================================

/**
 * 支持的所有广告格式列表
 */
export const SUPPORTED_AD_FORMATS = [
  'action_card',
  'suffix',
  'followup',
  'source',
  'static',
  'lead_gen',
] as const;

/**
 * 支持的所有广告展示位置
 */
export const SUPPORTED_AD_PLACEMENTS = [
  'post_response',
  'inline',
  'sidebar',
  'header',
  'footer',
] as const;

/**
 * 广告格式对应的组件名称映射
 * (供工程师C参考)
 */
export const AD_FORMAT_COMPONENT_MAP: Record<string, string> = {
  action_card: 'ActionCardAd',
  suffix: 'SuffixAd',
  followup: 'FollowUpAd',
  source: 'SponsoredSource',
  static: 'StaticAd',
  lead_gen: 'LeadGenAd',
} as const;
