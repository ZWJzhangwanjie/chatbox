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
