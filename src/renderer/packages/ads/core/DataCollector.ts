/**
 * AI Ad Network - 数据收集器
 *
 * 负责根据配置收集广告请求数据
 * 支持选择性收集、上下文窗口限制、隐私保护
 *
 * @see adConfigSchema.ts - 配置定义
 * @see types.ts - 类型定义
 */

import type { AdConfig, AdFormat, AdPlacement } from '../config/adConfigSchema';
import type {
  AdTriggerContext,
  AdRequestData,
  DataCollectionResult,
  ConversationContext,
  ContextData,
  ProcessedMemoryData,
  ProcessedProfileData,
  SessionInfo,
} from './types';
import { anonymizeMemory, anonymizeProfile, anonymizeMessages } from '../utils/privacy';
import { getMemoryCache } from './MemoryCache';
import type { Memory } from '@/shared/types';

// ============================================================================
// 数据收集器
// ============================================================================

/**
 * 数据收集器
 *
 * 功能：
 * - 根据配置选择性收集数据
 * - 应用上下文窗口限制
 * - 预留隐私保护接口
 * - 提供数据收集摘要
 */
export class DataCollector {
  // ========== 构造函数 ==========
  private memoryCache = getMemoryCache();

  constructor(private config: AdConfig) {}

  // ========== 公共方法 ==========

  /**
   * 收集广告请求数据
   *
   * @param context - 广告触发上下文
   * @param options - 收集选项
   * @returns 收集结果
   *
   * @example
   * ```ts
   * const collector = new DataCollector(config);
   * const result = collector.collect(context, {
   *   formats: ['action_card', 'suffix'],
   *   placement: 'post_response',
   * });
   * console.log(result.requestData);
   * console.log(result.summary);
   * ```
   */
  collect(
    context: AdTriggerContext,
    options: {
      formats?: AdFormat[];
      placement?: AdPlacement;
    } = {}
  ): DataCollectionResult {
    const warnings: string[] = [];
    const summary = {
      hasQuery: false,
      hasResponse: false,
      hasContext: false,
      hasMemory: false,
      hasProfile: false,
      contextSize: 0,
      dataSize: 0,
    };

    // 构建请求数据
    const requestData: AdRequestData = {
      sessionInfo: this.extractSessionInfo(context.currentMessage),
      adFormats: options.formats ?? this.getActiveFormats(),
      placement: options.placement ?? this.determinePlacement(context),
    };

    // 收集基础数据
    if (this.config.dataCollection.includeQuery) {
      requestData.query = context.currentMessage.query;
      summary.hasQuery = true;
    }

    if (this.config.dataCollection.includeResponse) {
      requestData.response = context.currentMessage.response;
      summary.hasResponse = true;
    }

    // 收集上下文数据
    if (
      this.config.dataCollection.includeFullContext &&
      context.conversationContext
    ) {
      requestData.context = this.extractContext(context.conversationContext);
      summary.hasContext = true;
      summary.contextSize = requestData.context.messages.length;
    }

    // 收集用户记忆（涉及隐私）
    if (
      this.config.dataCollection.includeMemory &&
      this.isDataTypeAllowed('memory')
    ) {
      // 从缓存同步获取记忆数据
      const memories = this.memoryCache.getMemories();

      // 调试：输出配置和缓存状态
      console.log('[DataCollector] 记忆收集检查:', {
        includeMemory: this.config.dataCollection.includeMemory,
        allowedDataTypes: this.config.privacy.allowedDataTypes,
        isMemoryAllowed: this.isDataTypeAllowed('memory'),
        cacheStatus: this.memoryCache.getStatus(),
        memoriesCount: memories.length,
      });

      if (memories.length > 0) {
        const userMemory = this.convertMemoriesToUserMemory(memories);
        requestData.userMemory = this.processMemory(userMemory);
        summary.hasMemory = true;

        console.log('[DataCollector] 记忆数据已收集:', {
          count: memories.length,
          userMemory: requestData.userMemory,
          types: this.countByType(memories),
        });
      } else {
        console.warn('[DataCollector] 记忆缓存为空，将在后台刷新');
        warnings.push('记忆缓存为空，将在后台刷新');
      }
    } else {
      console.log('[DataCollector] 记忆收集未启用:', {
        includeMemory: this.config.dataCollection.includeMemory,
        allowedDataTypes: this.config.privacy.allowedDataTypes,
        isMemoryAllowed: this.isDataTypeAllowed('memory'),
      });
    }

    // 收集用户画像（涉及隐私）
    // 注意：当前画像数据暂未从记忆系统提取，暂不收集
    if (
      this.config.dataCollection.includeProfile &&
      this.isDataTypeAllowed('profile')
    ) {
      // TODO: 从记忆中提取用户画像数据
      warnings.push('用户画像收集暂未实现');
    }

    // 计算数据大小（估算）
    summary.dataSize = this.estimateDataSize(requestData);

    // 输出调试信息
    if (this.config.debug) {
      console.log('[DataCollector] Collection result:', {
        summary,
        warnings,
        requestDataKeys: Object.keys(requestData),
      });
    }

    return {
      requestData,
      warnings,
      summary,
    };
  }

  /**
   * 更新配置
   *
   * @param config - 新的配置
   */
  updateConfig(config: AdConfig): void {
    this.config = config;

    if (this.config.debug) {
      console.log('[DataCollector] Config updated');
    }
  }

  // ========== 私有方法 ==========

  /**
   * 提取会话信息
   *
   * @param message - 当前消息信息
   * @returns 会话信息
   */
  private extractSessionInfo(message: {
    model: string;
    provider: string;
    timestamp?: number;
  }): SessionInfo {
    return {
      model: message.model,
      provider: message.provider,
      timestamp: message.timestamp ?? Date.now(),
    };
  }

  /**
   * 提取上下文数据
   *
   * 应用上下文窗口限制和数据脱敏
   *
   * @param conversationContext - 对话上下文
   * @returns 上下文数据
   */
  private extractContext(conversationContext: ConversationContext): ContextData {
    const window = this.config.dataCollection.contextWindow;
    const messages = conversationContext.messages.slice(-window);

    // 应用数据脱敏（如果启用）
    const processedMessages = this.config.dataCollection.enableAnonymization
      ? anonymizeMessages(messages.map((m) => ({ role: m.role, content: m.content })))
      : messages.map((m) => ({ role: m.role, content: m.content }));

    return {
      messages: processedMessages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      messageCount: conversationContext.messageCount,
    };
  }

  /**
   * 处理用户记忆
   *
   * 提取关键信息并应用脱敏
   *
   * @param memory - 用户记忆
   * @returns 处理后的记忆数据
   */
  private processMemory(memory: {
    shortTerm: Record<string, unknown>;
    longTerm: Record<string, unknown>;
  }): ProcessedMemoryData {
    // 应用数据脱敏（如果启用）
    const anonymizedMemory = this.config.dataCollection.enableAnonymization
      ? anonymizeMemory(memory)
      : {
          topics: this.extractTopics(memory),
          entities: this.extractEntities(memory),
          anonymized: false,
        };

    return {
      topics: anonymizedMemory.topics,
      entities: anonymizedMemory.entities,
    };
  }

  /**
   * 处理用户画像
   *
   * 提取关键信息并应用脱敏
   *
   * @param profile - 用户画像
   * @returns 处理后的画像数据
   */
  private processProfile(profile: {
    interests: string[];
    behaviorPattern?: {
      preferredTopics: string[];
      interactionStyle: string;
    };
  }): ProcessedProfileData {
    // 应用数据脱敏（如果启用）
    const anonymizedProfile = this.config.dataCollection.enableAnonymization
      ? anonymizeProfile(profile)
      : {
          interests: profile.interests,
          behaviorPattern: profile.behaviorPattern?.interactionStyle || 'unknown',
          anonymized: false,
        };

    return {
      interests: anonymizedProfile.interests,
      behaviorPattern: anonymizedProfile.behaviorPattern,
    };
  }

  /**
   * 从记忆中提取话题
   *
   * @param memory - 用户记忆
   * @returns 话题列表
   */
  private extractTopics(memory: {
    shortTerm: Record<string, unknown>;
    longTerm: Record<string, unknown>;
  }): string[] {
    const topics: string[] = [];

    // 从短期记忆中提取
    for (const value of Object.values(memory.shortTerm)) {
      if (typeof value === 'string' && value.length < 50) {
        topics.push(value);
      }
    }

    // 从长期记忆中提取
    for (const value of Object.values(memory.longTerm)) {
      if (typeof value === 'string' && value.length < 50) {
        topics.push(value);
      }
    }

    // 去重并限制数量
    return [...new Set(topics)].slice(0, 10);
  }

  /**
   * 从记忆中提取实体
   *
   * @param memory - 用户记忆
   * @returns 实体映射
   */
  private extractEntities(memory: {
    shortTerm: Record<string, unknown>;
    longTerm: Record<string, unknown>;
  }): Record<string, string> {
    const entities: Record<string, string> = {};

    // 简单的实体提取逻辑
    // TODO: 集成更智能的实体识别
    const allData = { ...memory.shortTerm, ...memory.longTerm };

    for (const [key, value] of Object.entries(allData)) {
      if (
        typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean'
      ) {
        // 存储实体值，后续脱敏
        entities[key] = String(value);
      }
    }

    return entities;
  }

  /**
   * 获取当前启用的广告格式
   *
   * @returns 广告格式列表
   */
  private getActiveFormats(): AdFormat[] {
    const formats: AdFormat[] = [];

    if (this.config.formats.actionCard.enabled) formats.push('action_card');
    if (this.config.formats.suffix.enabled) formats.push('suffix');
    if (this.config.formats.followup.enabled) formats.push('followup');
    if (this.config.formats.source.enabled) formats.push('source');
    if (this.config.formats.static.enabled) formats.push('static');
    if (this.config.formats.leadGen.enabled) formats.push('lead_gen');

    return formats;
  }

  /**
   * 确定广告展示位置
   *
   * @param context - 广告触发上下文
   * @returns 广告位置
   */
  private determinePlacement(context: AdTriggerContext): AdPlacement {
    // 根据当前上下文确定最佳位置
    // 默认使用 post_response
    return 'post_response';
  }

  /**
   * 检查数据类型是否被允许收集
   *
   * @param dataType - 数据类型
   * @returns 是否允许
   */
  private isDataTypeAllowed(
    dataType: 'query' | 'response' | 'context' | 'memory' | 'profile'
  ): boolean {
    return this.config.privacy.allowedDataTypes.includes(dataType);
  }

  /**
   * 估算数据大小（字节）
   *
   * @param data - 请求数据
   * @returns 估算的数据大小
   */
  private estimateDataSize(data: AdRequestData): number {
    let size = 0;

    if (data.query) size += data.query.length * 2; // UTF-16
    if (data.response) size += data.response.length * 2;
    if (data.context) {
      size += data.context.messages.reduce(
        (sum, m) => sum + m.content.length * 2,
        0
      );
    }
    if (data.userMemory) {
      size += JSON.stringify(data.userMemory).length * 2;
    }
    if (data.userProfile) {
      size += JSON.stringify(data.userProfile).length * 2;
    }

    return size;
  }

  /**
   * 将 Memory[] 转换为 UserMemory 格式
   *
   * @param memories - 记忆数组
   * @returns UserMemory 格式的数据
   *
   * @description
   * - 只传递脱敏数据（category, tags, summary），不传递原始 content
   * - 按类型分类为短期记忆和长期记忆
   */
  private convertMemoriesToUserMemory(memories: Memory[]): {
    shortTerm: Record<string, unknown>;
    longTerm: Record<string, unknown>;
  } {
    const shortTerm: Record<string, unknown> = {};
    const longTerm: Record<string, unknown> = {};

    // 记忆类型分类
    const SHORT_TERM_TYPES = ['implicit_pattern'];
    const LONG_TERM_TYPES = ['explicit_preference', 'explicit_fact', 'implicit_interest'];

    for (const memory of memories) {
      const key = `${memory.type}_${memory.id}`;

      // 只传递脱敏数据，不传递原始 content（保护隐私）
      const value = {
        category: memory.category,
        tags: memory.tags,
        summary: memory.summary,
        importance: memory.importance,
      };

      if (SHORT_TERM_TYPES.includes(memory.type)) {
        shortTerm[key] = value;
      } else if (LONG_TERM_TYPES.includes(memory.type)) {
        longTerm[key] = value;
      }
    }

    return { shortTerm, longTerm };
  }

  /**
   * 按类型统计记忆数量
   *
   * @param memories - 记忆数组
   * @returns 类型到数量的映射
   */
  private countByType(memories: Memory[]): Record<string, number> {
    return memories.reduce((acc, m) => {
      acc[m.type] = (acc[m.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }
}

// ============================================================================
// 工厂函数
// ============================================================================

/**
 * 创建数据收集器
 *
 * @param config - 广告配置
 * @returns 数据收集器实例
 */
export function createDataCollector(config: AdConfig): DataCollector {
  return new DataCollector(config);
}

// ============================================================================
// 导出
// ============================================================================

export default DataCollector;
