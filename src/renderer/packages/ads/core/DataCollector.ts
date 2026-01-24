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
      context.userData?.memory &&
      this.isDataTypeAllowed('memory')
    ) {
      requestData.userMemory = this.processMemory(context.userData.memory);
      summary.hasMemory = true;
    } else if (this.config.dataCollection.includeMemory) {
      warnings.push('Memory collection is disabled by privacy config');
    }

    // 收集用户画像（涉及隐私）
    if (
      this.config.dataCollection.includeProfile &&
      context.userData?.profile &&
      this.isDataTypeAllowed('profile')
    ) {
      requestData.userProfile = this.processProfile(context.userData.profile);
      summary.hasProfile = true;
    } else if (this.config.dataCollection.includeProfile) {
      warnings.push('Profile collection is disabled by privacy config');
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
