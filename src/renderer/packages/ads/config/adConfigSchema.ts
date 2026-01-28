/**
 * AI Ad Network - 广告配置 Schema
 *
 * 使用 Zod v4 进行配置验证和类型推断
 * 提供完整的广告系统配置，包括：
 * - API 配置
 * - 数据收集配置
 * - 6种广告格式的独立配置
 * - 隐私保护配置
 */

import { z } from 'zod';

// ============================================================================
// 枚举类型定义
// ============================================================================

/**
 * 广告格式类型
 * - action_card: 卡片广告，产品推荐
 * - suffix: 后缀广告，附加在回答末尾
 * - followup: 跟进问题广告
 * - source: 赞助来源广告
 * - static: 静态横幅广告
 * - lead_gen: 线索收集广告
 * - entity_link: 实体链接广告
 */
export const AdFormatEnum = z.enum([
  'action_card',
  'suffix',
  'followup',
  'source',
  'static',
  'lead_gen',
  'entity_link',
]);

export type AdFormat = z.infer<typeof AdFormatEnum>;

/**
 * 广告展示位置
 * - post_response: AI 响应后
 * - inline: 消息流中内联
 * - sidebar: 侧边栏
 * - header: 顶部横幅
 * - footer: 底部横幅
 */
export const AdPlacementEnum = z.enum([
  'post_response',
  'inline',
  'sidebar',
  'header',
  'footer',
]);

export type AdPlacement = z.infer<typeof AdPlacementEnum>;

/**
 * ActionCard 变体
 */
export const ActionCardVariantEnum = z.enum(['horizontal', 'vertical', 'compact']);

/**
 * Suffix 变体
 */
export const SuffixVariantEnum = z.enum(['block', 'inline', 'minimal']);

/**
 * FollowUp 变体
 */
export const FollowUpVariantEnum = z.enum(['bubble', 'pill', 'underline']);

/**
 * SponsoredSource 变体
 */
export const SourceVariantEnum = z.enum(['card', 'minimal', 'list_item']);

/**
 * LeadGen 字段类型
 */
export const LeadGenFieldTypeEnum = z.enum([
  'email',
  'name',
  'phone',
  'company',
  'website',
  'message',
]);

// ============================================================================
// 子 Schema 定义
// ============================================================================

/**
 * API 配置
 */
const ApiConfigSchema = z.object({
  /** API 基础 URL */
  baseUrl: z.string().url('Invalid API base URL'),
  /** API 密钥，格式: ak_tenant_key */
  apiKey: z.string().min(1, 'API key is required'),
  /** 请求超时时间（毫秒） */
  timeout: z.number().int().positive().default(5000),
  /** 是否启用 Mock 模式（开发调试用） */
  useMock: z.boolean().default(false),
  /** 是否使用 SDK 采集 ClientInfo（默认启用） */
  useSdkClientInfo: z.boolean().default(true),
});

/**
 * 数据收集配置
 */
const DataCollectionConfigSchema = z.object({
  /** 是否收集用户输入文本 */
  includeQuery: z.boolean().default(true),
  /** 是否收集 AI 响应文本 */
  includeResponse: z.boolean().default(true),
  /** 是否收集完整上下文（多轮对话） */
  includeFullContext: z.boolean().default(false),
  /** 是否收集用户记忆信息 */
  includeMemory: z.boolean().default(false),
  /** 是否收集用户画像信息 */
  includeProfile: z.boolean().default(false),
  /** 上下文窗口大小（最近N轮对话） */
  contextWindow: z.number().int().min(1).max(100).default(10),
  /** 是否启用数据脱敏 */
  enableAnonymization: z.boolean().default(true),
});

/**
 * ActionCard 格式配置
 */
const ActionCardFormatConfigSchema = z.object({
  /** 是否启用 */
  enabled: z.boolean().default(false),
  /** 视觉变体 */
  variant: ActionCardVariantEnum.default('horizontal'),
  /** 展示位置 */
  placement: AdPlacementEnum.default('post_response'),
  /** 频率控制：每N条消息展示一次 */
  frequency: z.number().int().min(1).max(20).default(3),
  /** 单次会话最大展示次数 */
  maxPerSession: z.number().int().min(1).max(20).default(5),
  /** 是否显示评分 */
  showRating: z.boolean().default(true),
  /** 是否显示价格 */
  showPrice: z.boolean().default(true),
});

/**
 * Suffix 格式配置
 */
const SuffixFormatConfigSchema = z.object({
  /** 是否启用 */
  enabled: z.boolean().default(false),
  /** 视觉变体 */
  variant: SuffixVariantEnum.default('block'),
  /** 展示位置 */
  placement: z.enum(['inline', 'block']).default('block'),
  /** 频率控制 */
  frequency: z.number().int().min(1).max(20).default(5),
  /** 单次会话最大展示次数 */
  maxPerSession: z.number().int().min(1).max(10).default(3),
  /** 是否显示分隔线 */
  showDivider: z.boolean().default(true),
});

/**
 * FollowUp 格式配置
 */
const FollowUpFormatConfigSchema = z.object({
  /** 是否启用 */
  enabled: z.boolean().default(false),
  /** 视觉变体 */
  variant: FollowUpVariantEnum.default('bubble'),
  /** 展示位置 */
  placement: z.enum(['inline_questions', 'bottom']).default('inline_questions'),
  /** 频率控制 */
  frequency: z.number().int().min(1).max(20).default(5),
  /** 单次会话最大展示次数 */
  maxPerSession: z.number().int().min(1).max(10).default(3),
  /** 混合位置（在建议问题中的位置，-1 表示随机） */
  mixPosition: z.number().int().min(-1).max(10).default(2),
});

/**
 * SponsoredSource 格式配置
 */
const SourceFormatConfigSchema = z.object({
  /** 是否启用 */
  enabled: z.boolean().default(false),
  /** 视觉变体 */
  variant: SourceVariantEnum.default('card'),
  /** 频率控制 */
  frequency: z.number().int().min(1).max(20).default(5),
  /** 单次会话最大展示次数 */
  maxPerSession: z.number().int().min(1).max(10).default(3),
  /** 混合位置（在来源列表中的位置） */
  mixPosition: z.number().int().min(0).max(10).default(1),
  /** 是否显示赞助标签 */
  showSponsoredLabel: z.boolean().default(true),
});

/**
 * Static 格式配置
 */
const StaticFormatConfigSchema = z.object({
  /** 是否启用 */
  enabled: z.boolean().default(false),
  /** 展示位置 */
  placement: z.enum(['sidebar', 'header', 'footer']).default('sidebar'),
  /** 宽度（像素） */
  width: z.number().int().min(100).max(1920).default(300),
  /** 高度（像素） */
  height: z.number().int().min(50).max(1080).default(250),
  /** 刷新间隔（秒，0表示不自动刷新） */
  refreshInterval: z.number().int().min(0).max(3600).default(0),
  /** 是否可关闭 */
  dismissible: z.boolean().default(true),
});

/**
 * LeadGen 格式配置
 */
const LeadGenFormatConfigSchema = z.object({
  /** 是否启用 */
  enabled: z.boolean().default(false),
  /** 展示位置 */
  placement: AdPlacementEnum.default('post_response'),
  /** 频率控制 */
  frequency: z.number().int().min(1).max(50).default(10),
  /** 单次会话最大展示次数 */
  maxPerSession: z.number().int().min(1).max(5).default(1),
  /** 收集字段配置 */
  fields: z.array(z.object({
    type: LeadGenFieldTypeEnum,
    required: z.boolean().default(false),
    placeholder: z.string().optional(),
  })).default([
    { type: 'email', required: true, placeholder: 'your@email.com' },
    { type: 'name', required: false, placeholder: 'Your name' },
  ]),
});

/**
 * Entity Link 格式配置
 */
const EntityLinkFormatConfigSchema = z.object({
  /** 是否启用 */
  enabled: z.boolean().default(false),
  /** 展示频率：每N条消息展示一次 */
  frequency: z.number().int().min(1, '展示频率至少为 1').max(20, '展示频率不能超过 20').default(5),
  /** 每会话最多展示次数 */
  maxPerSession: z.number().int().min(1, '每会话至少展示 1 次').max(20, '每会话最多展示 20 次').default(5),
  /** 最大链接数（1-10）*/
  maxLinks: z.number().int().min(1, '至少显示 1 个链接').max(10, '最多显示 10 个链接').default(3),
  /** 最小置信度（0-1）*/
  minConfidence: z.number().min(0, '置信度范围为 0-1').max(1, '置信度范围为 0-1').default(0.7),
  /** 徽章样式 */
  badgeStyle: z.enum(['subtle', 'hover', 'explicit', 'none']).default('subtle'),
  /** 重叠策略 */
  overlapStrategy: z.enum(['longest', 'first', 'all']).default('longest'),
  /** 展示位置 */
  placement: z.enum(['inline', 'below_message']).default('inline'),
});

/**
 * 隐私保护配置
 */
const PrivacyConfigSchema = z.object({
  /** 是否启用隐私保护 */
  enabled: z.boolean().default(true),
  /** 是否在发送数据前获得用户同意 */
  requireConsent: z.boolean().default(true),
  /** 数据保留期限（天数，0表示不保留） */
  dataRetentionDays: z.number().int().min(0).default(0),
  /** 允许的数据收集项 */
  allowedDataTypes: z.array(z.enum([
    'query',
    'response',
    'context',
    'memory',
    'profile',
  ])).default(['query', 'response', 'context', 'memory', 'profile']),
});

// ============================================================================
// 主 Schema
// ============================================================================

/**
 * 广告配置 Schema
 *
 * 这是整个广告系统的核心配置结构
 */
export const adConfigSchema = z.object({
  /** 全局开关：是否启用广告系统 */
  enabled: z.boolean().default(false),

  /** API 配置 */
  api: ApiConfigSchema,

  /** 数据收集配置 */
  dataCollection: DataCollectionConfigSchema,

  /** 各广告格式配置 */
  formats: z.object({
    actionCard: ActionCardFormatConfigSchema,
    suffix: SuffixFormatConfigSchema,
    followup: FollowUpFormatConfigSchema,
    source: SourceFormatConfigSchema,
    static: StaticFormatConfigSchema,
    leadGen: LeadGenFormatConfigSchema,
    entityLink: EntityLinkFormatConfigSchema,
  }),

  /** 隐私保护配置 */
  privacy: PrivacyConfigSchema,

  /** 调试模式 */
  debug: z.boolean().default(false),

  /** 高级配置 */
  advanced: z.object({
    /** 请求重试次数 */
    maxRetries: z.number().int().min(0).max(5).default(2),
    /** 缓存时间（秒） */
    cacheTime: z.number().int().min(0).max(3600).default(300),
    /** 是否启用性能监控 */
    enablePerformanceTracking: z.boolean().default(true),
    /** 自定义请求头 */
    customHeaders: z.record(z.string()).optional(),
    /** 是否禁用持久化缓存（用于回滚） */
    disablePersistentCache: z.boolean().default(false),
  }).optional(),
});

// ============================================================================
// 类型导出
// ============================================================================

/**
 * 完整的广告配置类型
 */
export type AdConfig = z.infer<typeof adConfigSchema>;

/**
 * API 配置类型
 */
export type ApiConfig = z.infer<typeof ApiConfigSchema>;

/**
 * 数据收集配置类型
 */
export type DataCollectionConfig = z.infer<typeof DataCollectionConfigSchema>;

/**
 * 各格式配置类型
 */
export type ActionCardFormatConfig = z.infer<typeof ActionCardFormatConfigSchema>;
export type SuffixFormatConfig = z.infer<typeof SuffixFormatConfigSchema>;
export type FollowUpFormatConfig = z.infer<typeof FollowUpFormatConfigSchema>;
export type SourceFormatConfig = z.infer<typeof SourceFormatConfigSchema>;
export type StaticFormatConfig = z.infer<typeof StaticFormatConfigSchema>;
export type LeadGenFormatConfig = z.infer<typeof LeadGenFormatConfigSchema>;
export type EntityLinkFormatConfig = z.infer<typeof EntityLinkFormatConfigSchema>;

/**
 * 隐私配置类型
 */
export type PrivacyConfig = z.infer<typeof PrivacyConfigSchema>;

// ============================================================================
// 验证辅助函数
// ============================================================================

/**
 * 验证配置对象
 * @param config 待验证的配置
 * @returns 验证结果
 */
export function validateAdConfig(config: unknown) {
  return adConfigSchema.safeParse(config);
}

/**
 * 验证配置对象（抛出异常版本）
 * @param config 待验证的配置
 * @returns 验证后的配置
 * @throws ZodError 如果验证失败
 */
export function parseAdConfig(config: unknown): AdConfig {
  return adConfigSchema.parse(config);
}

/**
 * 获取配置验证错误信息
 * @param config 待验证的配置
 * @returns 错误信息数组，无错误时返回空数组
 */
export function getAdConfigErrors(config: unknown): string[] {
  const result = adConfigSchema.safeParse(config);
  if (result.success) {
    return [];
  }
  return result.error.errors.map((error) => {
    const path = error.path.join('.');
    return `${path}: ${error.message}`;
  });
}

// ============================================================================
// 默认值导出（用于参考，实际默认值在 defaultConfig.ts 中定义）
// ============================================================================

/**
 * 获取 Schema 中定义的默认值
 */
export function getSchemaDefaults(): AdConfig {
  return adConfigSchema.parse({
    enabled: false,
    api: {
      baseUrl: 'https://api.ad-network.com/v1',
      apiKey: '',
      timeout: 5000,
      useMock: false,
    },
    dataCollection: {
      includeQuery: true,
      includeResponse: true,
      includeFullContext: false,
      includeMemory: false,
      includeProfile: false,
      contextWindow: 10,
      enableAnonymization: true,
    },
    formats: {
      actionCard: {},
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
      allowedDataTypes: ['query', 'response', 'context', 'memory', 'profile'],
    },
    debug: false,
  });
}
