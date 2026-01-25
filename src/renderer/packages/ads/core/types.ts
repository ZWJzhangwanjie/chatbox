/**
 * AI Ad Network - 核心类型定义
 *
 * 定义广告触发上下文、请求数据结构等核心类型
 */

import type { AdFormat, AdPlacement } from '../config/adConfigSchema';

// ============================================================================
// 广告触发上下文
// ============================================================================

/**
 * 当前消息信息
 */
export interface CurrentMessageInfo {
  /** 用户输入的查询文本 */
  query: string;
  /** AI 的响应文本 */
  response: string;
  /** 消息时间戳 */
  timestamp: number;
  /** 使用的模型 */
  model: string;
  /** 模型提供商 */
  provider: string;
  /** 是否正在流式输出 */
  isStreaming: boolean;
}

/**
 * 对话上下文信息
 */
export interface ConversationContext {
  /** 会话ID */
  sessionId: string;
  /** 消息总数 */
  messageCount: number;
  /** 历史消息列表 */
  messages: ConversationMessage[];
  /** 识别的对话主题（可选） */
  topic?: string;
}

/**
 * 对话消息
 */
export interface ConversationMessage {
  /** 消息角色 */
  role: 'user' | 'assistant' | 'system';
  /** 消息内容 */
  content: string;
  /** 消息时间戳 */
  timestamp: number;
}

/**
 * 用户记忆信息
 */
export interface UserMemory {
  /** 短期记忆 */
  shortTerm: Record<string, unknown>;
  /** 长期记忆 */
  longTerm: Record<string, unknown>;
}

/**
 * 用户画像信息
 */
export interface UserProfile {
  /** 兴趣标签 */
  interests: string[];
  /** 人口统计信息（脱敏后） */
  demographics?: {
    ageRange?: string;
    language?: string;
    timezone?: string;
  };
  /** 行为模式 */
  behaviorPattern?: {
    preferredTopics: string[];
    interactionStyle: string;
  };
}

/**
 * 用户偏好设置
 */
export interface UserPreferences {
  /** 语言设置 */
  language: string;
  /** 主题设置 */
  theme: string;
  /** 自定义设置 */
  customSettings: Record<string, unknown>;
}

/**
 * 用户数据
 */
export interface UserData {
  /** 用户记忆 */
  memory: UserMemory;
  /** 用户画像 */
  profile: UserProfile;
  /** 用户偏好 */
  preferences: UserPreferences;
}

/**
 * 广告触发上下文
 *
 * 包含所有可能用于广告决策的数据
 */
export interface AdTriggerContext {
  /** 当前消息信息 */
  currentMessage: CurrentMessageInfo;
  /** 对话上下文（可选） */
  conversationContext?: ConversationContext;
  /** 用户数据（可选，涉及隐私） */
  userData?: UserData;
}

// ============================================================================
// 广告请求数据
// ============================================================================

/**
 * 处理后的记忆数据（用于发送）
 */
export interface ProcessedMemoryData {
  /** 提取的话题标签 */
  topics: string[];
  /** 实体信息（已脱敏） */
  entities: Record<string, string>;
}

/**
 * 处理后的画像数据（用于发送）
 */
export interface ProcessedProfileData {
  /** 兴趣标签 */
  interests: string[];
  /** 行为模式 */
  behaviorPattern: string;
}

/**
 * 上下文数据（用于发送）
 */
export interface ContextData {
  /** 消息列表 */
  messages: Array<{
    role: string;
    content: string;
  }>;
  /** 消息数量 */
  messageCount: number;
}

/**
 * 会话信息´
 */
export interface SessionInfo {
  /** 模型名称 */
  model: string;
  /** 提供商名称 */
  provider: string;
  /** 时间戳 */
  timestamp: number;
}

/**
 * 广告请求数据
 *
 * 发送到广告API的数据结构
 */
export interface AdRequestData {
  /** 用户输入（可选） */
  query?: string;
  /** AI响应（可选） */
  response?: string;
  /** 上下文（可选） */
  context?: ContextData;
  /** 用户记忆（可选） */
  userMemory?: ProcessedMemoryData;
  /** 用户画像（可选） */
  userProfile?: ProcessedProfileData;
  /** 会话信息 */
  sessionInfo: SessionInfo;
  /** 期望的广告格式 */
  adFormats: AdFormat[];
  /** 广告展示位置 */
  placement: AdPlacement;
}

// ============================================================================
// 广告响应数据
// ============================================================================

/**
 * 广告内容
 *
 * 注意：所有广告类型都使用 title 作为主要显示字段
 * SDK 组件直接从 content.title 读取主要文本内容
 *
 * 各格式字段映射：
 * - action_card: title, body, image, cta_text, price, rating, link
 * - suffix: title (从 adapted.body 映射), body, link
 * - followup: title (从 adapted.body 映射), body, link
 * - source: title, link/url, favicon
 * - static: title, body, image, link
 * - lead_gen: title, body, image, lead_gen_fields
 */
export interface AdContent {
  /** 标题（所有格式通用） */
  title?: string;
  /** 描述文本 */
  body?: string;
  /** 图片URL */
  image?: string;
  /** 行动号召文本 */
  cta_text?: string;
  /** 价格 */
  price?: string;
  /** 评分 */
  rating?: number;
  /** 链接URL */
  link?: string;
  /** URL（用于 source 类型，与 link 互为别名） */
  url?: string;
  /** 网站图标（用于 source 类型） */
  favicon?: string;
  /** 表单字段（LeadGen广告） */
  lead_gen_fields?: Array<{
    type: string;
    placeholder: string;
    required: boolean;
  }>;
}

/**
 * 广告追踪信息
 */
export interface AdTracking {
  /** 点击追踪URL */
  click_url?: string;
  /** 展示追踪URL */
  impression_url?: string;
}

/**
 * 广告元数据
 */
export interface AdMetadata {
  /** 广告分类 */
  category?: string;
  /** eCPM（千次展示收益） */
  ecpm?: number;
  /** 广告来源 */
  source?: string;
}

/**
 * 广告建议信息（来自后端）
 */
export interface AdSuggestions {
  /** 建议的布局方式 */
  layout?: string;
  /** 其他建议 */
  [key: string]: unknown;
}

// ============================================================================
// Slot-Based 响应结构（新增）
// ============================================================================

/**
 * Slot 级别的建议信息
 */
export interface SlotSuggestions {
  /** 建议的布局方式 */
  layout?: string;
  /** 建议的样式变体 */
  variant?: string;
  /** 建议的展示位置 */
  position?: number;
  /** 展示时机（用于 lead_gen） */
  timing?: {
    showAfter?: number;
    requiresInterest?: string[];
  };
  /** 内容风格建议（用于 suffix/followup） */
  tone?: 'casual' | 'professional' | 'friendly' | 'technical';
}

/**
 * Slot 响应状态
 *
 * 注意：API 返回的是 'no_fill'，但为了向后兼容，代码中应该同时支持两种状态
 */
export type SlotStatus = 'filled' | 'empty' | 'no_fill' | 'error';

/**
 * Slot 响应状态（旧版，用于向后兼容）
 * @deprecated 使用 SlotStatus 代替
 */
export type LegacySlotStatus = 'filled' | 'empty' | 'error';

/**
 * 单个 Slot 的响应
 *
 * 对应 API 返回的 slots 数组中的单个 slot
 * 支持 v2 API 的额外字段
 */
export interface SlotResponse {
  /** Slot ID（与请求中的 slotId 对应） */
  slotId: string;
  /** Slot 状态 */
  status: SlotStatus;
  /** 错误信息（仅当 status='error' 时） */
  error?: string;
  /** 该 slot 的广告列表 */
  ads?: ApiAd[];
  /** 该 slot 的建议信息 */
  suggestions?: SlotSuggestions;
  /** 该 slot 的元数据 */
  metadata?: {
    /** 决策理由（可以是字符串或数组） */
    reasoning?: string | Array<{
      reason: string;
      confidence: number;
    }>;
    /** 置信度 (0-1) */
    confidence?: number;
    /** v2 新增：决策建议 */
    suggestions?: {
      layout?: string;
      variant?: string;
      position?: number;
      timing?: {
        showAfter?: number;
        requiresInterest?: string[];
      };
      tone?: 'casual' | 'professional' | 'friendly' | 'technical';
    };
  };
}

/**
 * API 返回的单个广告
 *
 * 根据 API 文档 v2，adapted 字段包含更多结构化信息
 */
export interface ApiAd {
  /** 原始广告数据 */
  original: {
    id: string;
    type: string;
    score?: number;
  };
  /** 转换后的广告数据（支持 v2 API 结构） */
  adapted: {
    title?: string;
    body?: string;
    image?: string;
    link?: string;
    url?: string;
    price?: string;
    rating?: number;
    cta_text?: string;
    category?: string;

    // v2 API 新增字段（支持结构化数据）
    ctaText?: string;           // 行动号召文本（驼峰命名）
    brand?: string;            // 品牌名
    styling?: {                // 样式建议
      backgroundColor?: string;
      textColor?: string;
      accentColor?: string;
      borderRadius?: string;
      padding?: string;
    };

    [key: string]: unknown;
  };
  /** 追踪信息（支持 v2 API 结构） */
  tracking: {
    clickUrl?: string;         // 驼峰命名（v2）
    click_url?: string;        // 下划线命名（兼容）
    impressionUrl?: string;    // 驼峰命名（v2）
    impression_url?: string;   // 下划线命名（兼容）
    viewToken?: string;        // 视图令牌（v2 新增）
  };
}

/**
 * Slot-Based API 响应
 *
 * 对应 v2 API 的实际返回格式
 */
export interface AdApiResponseWithSlots {
  /** 是否成功 */
  success: boolean;
  /** 数据 */
  data?: {
    /** v2 新增：请求唯一标识 */
    requestId?: string;
    /** v2 新增：响应时间戳 */
    timestamp?: number;
    /** v2 新增：识别的意图 */
    intent?: {
      type: 'shopping' | 'lead_gen' | 'software' | 'content' | 'generic';
      confidence: number;
      keywords: string[];
      reasoning?: string;
    };
    /** Slot 数组 */
    slots: SlotResponse[];
    /** v2 新增：全局建议 */
    globalSuggestions?: {
      priority?: string[];
      hideIfNoFill?: string[];
    };
    /** v2 新增：响应元数据 */
    metadata?: {
      detectedStage?: 'pre_request' | 'post_response' | 'unknown';
      availableContext?: {
        hasQuery: boolean;
        hasResponse: boolean;
        hasHistory: boolean;
        hasProfile: boolean;
        historyLength?: number;
      };
      reasoning?: string;
    };
  };
  /** 错误信息 */
  error?: {
    code: string;
    message: string;
  };
}

/**
 * 单个广告
 */
export interface Ad {
  /** 广告ID */
  id: string;
  /** 广告类型 */
  type: AdFormat;
  /** 相关性评分 (0-1) */
  score: number;
  /** 广告来源 */
  source: string;
  /** 广告内容 */
  content: AdContent;
  /** 追踪信息 */
  tracking: AdTracking;
  /** 元数据 */
  metadata: AdMetadata;
  /** 广告建议信息（来自后端） */
  suggestions?: AdSuggestions;
}

/**
 * 广告API响应
 */
export interface AdApiResponse {
  /** 是否成功 */
  success: boolean;
  /** 广告列表 */
  ads: Ad[];
  /** 意图识别结果（可选） */
  intent?: {
    type: string;
    confidence: number;
    keywords: string[];
  };
  /** 路由信息（可选） */
  routing?: {
    primarySource: string;
    fallbackTriggered: boolean;
  };
}

// ============================================================================
// 数据收集结果
// ============================================================================

/**
 * 数据收集结果
 *
 * DataCollector 的返回值
 */
export interface DataCollectionResult {
  /** 收集到的请求数据 */
  requestData: AdRequestData;
  /** 收集过程中的警告信息 */
  warnings: string[];
  /** 收集到的数据摘要（用于调试） */
  summary: {
    hasQuery: boolean;
    hasResponse: boolean;
    hasContext: boolean;
    hasMemory: boolean;
    hasProfile: boolean;
    contextSize: number;
    dataSize: number;
  };
}

// ============================================================================
// 导出
// ============================================================================

// 注意：接口(interface)是类型层面的，不能在运行时作为值导出
// 所有类型已通过 'export interface' 导出
// 这里只导出运行时可用的值（如果有）

// 如果需要统一导出类型，在其他文件中使用：
// import type { ... } from './types';
