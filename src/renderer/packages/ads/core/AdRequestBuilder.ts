/**
 * AI Ad Network - 广告请求构建器
 *
 * 负责构建符合API要求的广告请求数据
 * 集成数据收集器，提供便捷的构建接口
 *
 * @see adConfigSchema.ts - 配置定义
 * @see types.ts - 类型定义
 */

import type { AdConfig, AdFormat, AdPlacement } from '../config/adConfigSchema';
import type {
  AdTriggerContext,
  AdRequestData,
  DataCollectionResult,
} from './types';
import { DataCollector } from './DataCollector';

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 请求构建选项
 */
export interface BuildRequestOptions {
  /** 指定要请求的广告格式（可选） */
  formats?: AdFormat[];
  /** 指定广告位置（可选） */
  placement?: AdPlacement;
  /** 是否忽略隐私配置（仅用于调试） */
  ignorePrivacy?: boolean;
  /** 自定义请求元数据 */
  metadata?: Record<string, unknown>;
}

/**
 * 请求构建结果
 */
export interface BuildRequestResult {
  /** 构建好的请求数据 */
  requestData: AdRequestData;
  /** 数据收集结果 */
  collectionResult: DataCollectionResult;
  /** 构建过程中的警告 */
  warnings: string[];
}

// ============================================================================
// 广告请求构建器
// ============================================================================

/**
 * 广告请求构建器
 *
 * 功能：
 * - 构建符合SDK API要求的请求数据
 * - 集成数据收集器
 * - 支持自定义选项
 * - 提供构建过程日志
 */
export class AdRequestBuilder {
  // ========== 子组件 ==========
  private dataCollector: DataCollector;

  // ========== 构造函数 ==========
  constructor(private config: AdConfig) {
    this.dataCollector = new DataCollector(config);
  }

  // ========== 公共方法 ==========

  /**
   * 构建广告请求数据
   *
   * @param context - 广告触发上下文
   * @param options - 构建选项
   * @returns 构建结果
   *
   * @example
   * ```ts
   * const builder = new AdRequestBuilder(config);
   * const result = builder.build(context, {
   *   formats: ['action_card', 'suffix'],
   *   placement: 'post_response',
   * });
   * console.log(result.requestData);
   * ```
   */
  build(
    context: AdTriggerContext,
    options: BuildRequestOptions = {}
  ): BuildRequestResult {
    const warnings: string[] = [];
    const collectionResult = this.dataCollector.collect(context, {
      formats: options.formats,
      placement: options.placement,
    });

    // 收集警告
    warnings.push(...collectionResult.warnings);

    // 构建请求数据
    const requestData: AdRequestData = {
      ...collectionResult.requestData,
      // 使用选项中的格式，如果没有则使用收集器返回的格式
      adFormats: options.formats ?? collectionResult.requestData.adFormats,
      placement: options.placement ?? collectionResult.requestData.placement,
    };

    // 添加自定义元数据
    if (options.metadata) {
      // 元数据作为扩展字段添加
      // 注意：标准API可能不接受额外字段，这里预留接口
      if (this.config.debug) {
        console.log('[AdRequestBuilder] Custom metadata provided:', options.metadata);
      }
    }

    // 调试输出
    if (this.config.debug) {
      console.log('[AdRequestBuilder] Build result:', {
        formats: requestData.adFormats,
        placement: requestData.placement,
        hasQuery: !!requestData.query,
        hasResponse: !!requestData.response,
        hasContext: !!requestData.context,
        hasMemory: !!requestData.userMemory,
        hasProfile: !!requestData.userProfile,
        dataSize: collectionResult.summary.dataSize,
        warnings,
      });
    }

    return {
      requestData,
      collectionResult,
      warnings,
    };
  }

  /**
   * 构建简单的广告请求（仅基础数据）
   *
   * @param query - 用户查询
   * @param response - AI响应
   * @param options - 构建选项
   * @returns 请求数据
   *
   * @example
   * ```ts
   * const requestData = builder.buildSimple('Hello', 'Hi there!', {
   *   formats: ['action_card'],
   * });
   * ```
   */
  buildSimple(
    query: string,
    response: string,
    options: Omit<BuildRequestOptions, 'ignorePrivacy' | 'metadata'> = {}
  ): AdRequestData {
    const context: AdTriggerContext = {
      currentMessage: {
        query,
        response,
        timestamp: Date.now(),
        model: 'unknown',
        provider: 'unknown',
        isStreaming: false,
      },
    };

    const result = this.build(context, options);
    return result.requestData;
  }

  /**
   * 获取当前启用的广告格式
   *
   * @returns 广告格式列表
   */
  getActiveFormats(): AdFormat[] {
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
   * 根据上下文确定最佳广告位置
   *
   * @param context - 广告触发上下文
   * @returns 广告位置
   */
  determinePlacement(context: AdTriggerContext): AdPlacement {
    // 默认使用 post_response
    // 可以根据上下文智能选择位置

    // 如果有对话上下文，可以考虑 inline
    if (context.conversationContext && context.conversationContext.messageCount > 2) {
      return 'inline';
    }

    return 'post_response';
  }

  /**
   * 验证请求数据
   *
   * @param requestData - 请求数据
   * @returns 验证结果
   */
  validateRequest(requestData: AdRequestData): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // 检查是否有至少一种格式
    if (!requestData.adFormats || requestData.adFormats.length === 0) {
      errors.push('At least one ad format is required');
    }

    // 检查是否有内容数据
    if (!requestData.query && !requestData.response && !requestData.context) {
      errors.push('At least one of query, response, or context is required');
    }

    // 检查会话信息
    if (!requestData.sessionInfo) {
      errors.push('Session info is required');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * 更新配置
   *
   * @param config - 新的配置
   */
  updateConfig(config: AdConfig): void {
    this.config = config;
    this.dataCollector.updateConfig(config);

    if (this.config.debug) {
      console.log('[AdRequestBuilder] Config updated');
    }
  }
}

// ============================================================================
// 工厂函数
// ============================================================================

/**
 * 创建广告请求构建器
 *
 * @param config - 广告配置
 * @returns 请求构建器实例
 */
export function createAdRequestBuilder(config: AdConfig): AdRequestBuilder {
  return new AdRequestBuilder(config);
}

// ============================================================================
// 辅助函数
// ============================================================================

/**
 * 快速构建广告请求（使用默认配置）
 *
 * @param context - 广告触发上下文
 * @param formats - 广告格式列表
 * @returns 请求数据
 *
 * @example
 * ```ts
 * const requestData = buildAdRequest(context, ['action_card']);
 * ```
 */
export function buildAdRequest(
  context: AdTriggerContext,
  formats: AdFormat[]
): AdRequestData {
  // 这个函数需要从 store 获取配置
  // 暂时抛出错误，等待 hooks 实现
  throw new Error(
    'buildAdRequest requires config. Use AdRequestBuilder directly or wait for hooks implementation.'
  );
}

// ============================================================================
// 导出
// ============================================================================

export default AdRequestBuilder;
