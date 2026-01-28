/**
 * AI Ad Network - 广告控制器
 *
 * 核心调度器，负责：
 * - 判断是否应该触发广告
 * - 协调数据收集和广告获取
 * - 处理Mock模式和真实API调用
 * - 错误处理和降级
 *
 * @see adConfigSchema.ts - 配置定义
 * @see types.ts - 类型定义
 */

import type { AdConfig } from '../config/adConfigSchema';
import type {
  AdTriggerContext,
  Ad,
  AdApiResponse,
  SlotResponse,
  ApiAd,
  SlotStatus
} from './types';
import { FrequencyController } from './FrequencyController';
import { DataCollector } from './DataCollector';
import { AdRequestBuilder } from './AdRequestBuilder';

// 新增：改进的管理器
import { PersistentFrequencyController } from './PersistentFrequencyController';
import { ImprovedAdCacheManager } from './ImprovedAdCacheManager';
import { DebounceCacheManager } from './DebounceCacheManager';
import storage from '../../../storage';

// SDK ClientInfo 集成
import { getSdkClientInfo } from '../sdk/clientInfoAdapter';
import type { SdkClientInfo } from '../sdk/clientInfoAdapter';

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 广告获取选项
 */
export interface FetchAdsOptions {
  /** 指定要获取的广告格式（可选，默认使用配置中启用的格式） */
  formats?: string[];
  /** 指定广告位置（可选） */
  placement?: string;
  /** 是否强制忽略频率控制（用于调试） */
  skipFrequencyCheck?: boolean;
  /** 超时时间（毫秒） */
  timeout?: number;
}

/**
 * 广告获取结果（扩展版，支持 slots）
 */
export interface FetchAdsResult {
  /** 获取到的广告列表（扁平化，向后兼容） */
  ads: Ad[];
  /** Slot 原始响应（新增） */
  slots?: SlotResponse[];
  /** 是否使用了Mock数据 */
  isMock: boolean;
  /** 获取过程中的错误（如果有） */
  error: Error | null;
  /** 请求耗时（毫秒） */
  duration: number;
  /** 按 slotId 获取广告的便捷方法（新增） */
  getAdsBySlot?: (slotId: string) => Ad[];
  /** 获取 slot 原始数据的便捷方法（新增） */
  getSlot?: (slotId: string) => SlotResponse | undefined;
}

/**
 * 触发检查结果
 */
export interface TriggerCheckResult {
  /** 是否应该触发广告 */
  shouldTrigger: boolean;
  /** 原因说明 */
  reason?: string;
  /** 建议的广告格式（如果有） */
  suggestedFormats?: string[];
}

// ============================================================================
// 广告控制器
// ============================================================================

/**
 * 广告控制器
 *
 * 功能：
 * - 判断是否应该展示广告
 * - 协调数据收集
 * - 调用广告API获取广告
 * - 支持Mock模式
 * - 错误处理和降级
 */
export class AdController {
  // ========== 子控制器 ==========
  private frequencyController: FrequencyController;
  private dataCollector: DataCollector;

  // ========== 新增：改进的管理器 ==========
  /** 持久化频率控制器（可选，使用配置开关） */
  private persistentFrequencyController?: PersistentFrequencyController;
  /** 改进的缓存管理器（LRU） */
  private adCacheManager?: ImprovedAdCacheManager;
  /** 防抖缓存管理器 */
  private debounceManager?: DebounceCacheManager;

  // ========== 状态 ==========
  private isInitialized = false;
  private lastFetchTime = 0;
  private fetchCache: Map<string, { ads: Ad[]; timestamp: number }> = new Map();
  // 请求防抖缓存：记录每个 sessionId + format 的最后请求时间
  private requestCache: Map<string, number> = new Map();
  // 防抖时间（毫秒）
  private readonly DEBOUNCE_MS = 20000; // 20秒

  // ========== 构造函数 ==========
  constructor(private config: AdConfig, sessionId?: string) {
    this.frequencyController = new FrequencyController(config);
    this.dataCollector = new DataCollector(config);
    this.isInitialized = true;

    // 新增：初始化改进的管理器
    // 检查是否启用持久化缓存（默认启用，可通过配置关闭）
    const usePersistentCache = !config.advanced?.disablePersistentCache;

    if (usePersistentCache) {
      try {
        // 使用持久化频率控制器
        this.persistentFrequencyController = new PersistentFrequencyController(
          config,
          storage,
          sessionId || 'default'
        );

        // 使用改进的缓存管理器
        this.adCacheManager = new ImprovedAdCacheManager(config, storage);

        // 使用防抖缓存管理器
        this.debounceManager = new DebounceCacheManager(this.DEBOUNCE_MS);

        if (config.debug) {
          console.log('[AdController] Using improved cache managers');
        }
      } catch (error) {
        console.error('[AdController] Failed to initialize improved managers:', error);
        // 降级到旧版本
      }
    }
  }

  // ========== 公共方法 ==========

  /**
   * 判断是否应该触发广告
   *
   * @param context - 广告触发上下文
   * @returns 触发检查结果
   *
   * @example
   * ```ts
   * const result = controller.shouldTrigger(context);
   * if (result.shouldTrigger) {
   *   // 触发广告
   * }
   * ```
   */
  shouldTrigger(context: AdTriggerContext): TriggerCheckResult {
    // 🔧 基础日志（始终输出，用于诊断）
    console.log('[AdController] shouldTrigger called:', {
      globalEnabled: this.config.enabled,
      debugMode: this.config.debug,
      hasQuery: !!context.currentMessage.query,
      hasResponse: !!context.currentMessage.response,
      isStreaming: context.currentMessage.isStreaming,
    });

    // 详细调试日志（仅在 debug 模式）
    if (this.config.debug) {
      console.log('[AdController] shouldTrigger check:', {
        enabled: this.config.enabled,
        debug: this.config.debug,
        useMock: this.config.api.useMock,
        query: context.currentMessage.query?.substring(0, 50),
        response: context.currentMessage.response?.substring(0, 50),
        isStreaming: context.currentMessage.isStreaming,
      });
    }

    // 1. 检查全局开关
    if (!this.config.enabled) {
      console.log('[AdController] ❌ Blocked: Ad system is disabled');
      if (this.config.debug) {
        console.log('[AdController] ❌ Ad system is disabled');
      }
      return {
        shouldTrigger: false,
        reason: 'Ad system is disabled',
      };
    }

    // 2. 检查调试模式 - 只要在调试模式就显示（不强制要求 useMock）
    if (this.config.debug) {
      console.log('[AdController] ✅ Debug mode enabled, bypassing all checks');
      return {
        shouldTrigger: true,
        reason: 'Debug mode enabled',
        suggestedFormats: this.getActiveFormats(),
      };
    }

    // 3. 检查是否有启用的广告格式
    const activeFormats = this.getActiveFormats();
    console.log('[AdController] Active formats:', activeFormats);
    if (activeFormats.length === 0) {
      console.log('[AdController] ❌ Blocked: No ad formats are enabled');
      if (this.config.debug) {
        console.log('[AdController] ❌ No ad formats are enabled');
      }
      return {
        shouldTrigger: false,
        reason: 'No ad formats are enabled',
      };
    }

    // 4. 检查频率控制
    const frequencyResult = this.frequencyController.shouldShow();
    console.log('[AdController] Frequency check result:', frequencyResult);
    if (!frequencyResult) {
      console.log('[AdController] ❌ Blocked: Frequency limit not reached');
      if (this.config.debug) {
        console.log('[AdController] ❌ Frequency limit not reached');
      }
      return {
        shouldTrigger: false,
        reason: 'Frequency limit not reached',
      };
    }

    // 5. 检查消息是否为空
    if (!context.currentMessage.query && !context.currentMessage.response) {
      console.log('[AdController] ❌ Blocked: Empty message content');
      if (this.config.debug) {
        console.log('[AdController] ❌ Empty message content');
      }
      return {
        shouldTrigger: false,
        reason: 'Empty message content',
      };
    }

    // 6. 检查是否正在流式输出
    if (context.currentMessage.isStreaming) {
      console.log('[AdController] ❌ Blocked: Response is still streaming');
      if (this.config.debug) {
        console.log('[AdController] ❌ Response is still streaming');
      }
      return {
        shouldTrigger: false,
        reason: 'Response is still streaming',
      };
    }

    // 所有检查通过
    console.log('[AdController] ✅ All checks passed, triggering ad with formats:', activeFormats);
    if (this.config.debug) {
      console.log('[AdController] ✅ All checks passed, triggering ad');
    }
    return {
      shouldTrigger: true,
      suggestedFormats: activeFormats,
    };
  }

  /**
   * 获取广告
   *
   * @param context - 广告触发上下文
   * @param options - 获取选项
   * @returns 获取结果
   *
   * @example
   * ```ts
   * const result = await controller.fetchAds(context, {
   *   formats: ['action_card', 'suffix'],
   *   placement: 'post_response',
   * });
   * console.log(result.ads);
   * ```
   */
  async fetchAds(
    context: AdTriggerContext,
    options: FetchAdsOptions = {}
  ): Promise<FetchAdsResult> {
    const startTime = Date.now();

    try {
      // 记录消息
      this.frequencyController.recordMessage();

      // 判断是否应该触发
      const triggerCheck = this.shouldTrigger(context);
      if (!triggerCheck.shouldTrigger && !options.skipFrequencyCheck) {
        if (this.config.debug) {
          console.log('[AdController] Ads not triggered:', triggerCheck.reason);
        }
        return {
          ads: [],
          slots: [],
          isMock: false,
          error: null,
          duration: Date.now() - startTime,
          getAdsBySlot: () => [],
          getSlot: () => undefined,
        };
      }

      // 确定要获取的格式
      const formats = options.formats ?? triggerCheck.suggestedFormats ?? this.getActiveFormats();

      // 检查缓存
      const cacheKey = this.getCacheKey(context, formats);
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        if (this.config.debug) {
          console.log('[AdController] Using cached ads');
        }
        return {
          ads: cached.ads,
          slots: [],  // Cached data doesn't have slots info
          isMock: cached.isMock,
          error: null,
          duration: Date.now() - startTime,
          getAdsBySlot: () => [],
          getSlot: () => undefined,
        };
      }

      // Mock模式或真实API
      let result: FetchAdsResult;

      if (this.config.api.useMock) {
        result = await this.fetchMockAds(context, formats);
      } else {
        result = await this.fetchRealAds(context, formats, options);
      }

      // 记录展示
      if (result.ads.length > 0) {
        this.frequencyController.recordImpression();
      }

      // 缓存结果
      if (result.error === null) {
        this.addToCache(cacheKey, result.ads, false);
      }

      result.duration = Date.now() - startTime;

      if (this.config.debug) {
        console.log('[AdController] Fetch result:', {
          adsCount: result.ads.length,
          isMock: result.isMock,
          duration: result.duration,
          error: result.error?.message,
        });
      }

      return result;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      console.error('[AdController] Error fetching ads:', err);

      return {
        ads: [],
        slots: [],
        isMock: false,
        error: err,
        duration: Date.now() - startTime,
        getAdsBySlot: () => [],
        getSlot: () => undefined,
      };
    }
  }

  /**
   * 记录消息（不触发广告）
   *
   * 用于更新频率计数器，但不获取广告
   */
  recordMessage(): void {
    this.frequencyController.recordMessage();
  }

  /**
   * 获取频率统计信息
   *
   * @returns 频率统计
   */
  getFrequencyStats() {
    return this.frequencyController.getStats();
  }

  /**
   * 重置控制器状态
   *
   * 清除所有计数器和缓存
   */
  reset(): void {
    this.frequencyController.reset();
    this.fetchCache.clear();
    this.lastFetchTime = 0;

    if (this.config.debug) {
      console.log('[AdController] Reset complete');
    }
  }

  /**
   * 更新配置
   *
   * @param config - 新的配置
   */
  updateConfig(config: AdConfig): void {
    this.config = config;
    this.frequencyController.updateConfig(config);
    this.dataCollector.updateConfig(config);

    // 更新新的管理器
    if (this.persistentFrequencyController) {
      this.persistentFrequencyController.updateConfig(config);
    }

    this.clearCache();

    if (this.config.debug) {
      console.log('[AdController] Config updated');
    }
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    // 清除旧版本缓存
    this.fetchCache.clear();

    // 清除新的缓存管理器
    if (this.adCacheManager) {
      this.adCacheManager.clear();
    }

    if (this.config.debug) {
      console.log('[AdController] Cache cleared');
    }
  }

  // ========== 私有方法 ==========

  /**
   * 从真实API获取广告
   *
   * @param context - 广告触发上下文
   * @param formats - 广告格式列表
   * @param options - 获取选项
   * @returns 获取结果
   */
  private async fetchRealAds(
    context: AdTriggerContext,
    formats: string[],
    options: FetchAdsOptions
  ): Promise<FetchAdsResult> {
    const startTime = Date.now();
    // 生成唯一请求ID用于追踪
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const sessionId = context.conversationContext?.sessionId || 'unknown';

    // ========== 防抖检查：同一 session 下相同 format 在 20 秒内只能请求一次 ==========
    // 为每个 format 创建缓存键（提前定义以便在 catch 块中使用）
    const cacheKeys = formats.map(format => `${sessionId}:${format}`);

    try {

      // 使用新的防抖管理器（如果可用）
      if (this.debounceManager) {
        // 检查是否有任何一个 format 在防抖期内已经请求过
        for (const cacheKey of cacheKeys) {
          const debounceResult = this.debounceManager.shouldDebounce(cacheKey);

          if (debounceResult.shouldDebounce) {
            // 返回空结果，不发送请求
            return {
              ads: [],
              slots: [],
              isMock: false,
              error: null,
              duration: Date.now() - startTime,
              getAdsBySlot: () => [],
              getSlot: () => undefined,
            };
          }
        }

        // 标记所有 format 为已请求（在请求发送前就标记，防止并发请求）
        for (const cacheKey of cacheKeys) {
          this.debounceManager.markRequestStart(cacheKey);
        }
      } else {
        // 降级到旧版本
        const now = Date.now();
        for (const cacheKey of cacheKeys) {
          const lastRequestTime = this.requestCache.get(cacheKey);
          if (lastRequestTime && now - lastRequestTime < this.DEBOUNCE_MS) {
            return {
              ads: [],
              slots: [],
              isMock: false,
              error: null,
              duration: Date.now() - startTime,
              getAdsBySlot: () => [],
              getSlot: () => undefined,
            };
          }
        }

        // 标记所有 format 为已请求
        for (const cacheKey of cacheKeys) {
          this.requestCache.set(cacheKey, now);
        }
      }

      if (this.config.debug) {
        console.log(`[🌐 AdController REQUEST #${requestId}]`, {
          formats,
          query: context.currentMessage?.query?.substring(0, 50),
          response: context.currentMessage?.response?.substring(0, 50),
          baseUrl: this.config.api.baseUrl,
          sessionId,
        });
      }

      const query = context.currentMessage?.query || '';
      const response = context.currentMessage?.response || '';

      // ========== 高级数据收集（上下文、记忆、画像） ==========
      // 使用 AdRequestBuilder 收集高级数据，根据配置决定是否发送
      let advancedData: {
        contextMessages?: Array<{ role: string; content: string }>;
        userMemory?: {
          topics: string[];
          entities: Record<string, string>;
        };
        userProfile?: {
          interests: string[];
          behaviorPattern: string;
        };
      } = {};

      try {
        const requestBuilder = new AdRequestBuilder(this.config);
        const buildResult = requestBuilder.build(context, {
          formats: formats as any, // Type assertion for flexibility
          placement: options.placement as any,
        });

        // 提取高级数据（如果收集成功）
        if (buildResult.requestData.context) {
          advancedData.contextMessages = buildResult.requestData.context.messages;
        }
        if (buildResult.requestData.userMemory) {
          advancedData.userMemory = buildResult.requestData.userMemory;
        }
        if (buildResult.requestData.userProfile) {
          advancedData.userProfile = buildResult.requestData.userProfile;
        }

        if (this.config.debug && Object.keys(advancedData).length > 0) {
          console.log('[AdController] Advanced data collected:', {
            hasContext: !!advancedData.contextMessages,
            contextSize: advancedData.contextMessages?.length || 0,
            hasMemory: !!advancedData.userMemory,
            memoryTopics: advancedData.userMemory?.topics?.length || 0,
            hasProfile: !!advancedData.userProfile,
            profileInterests: advancedData.userProfile?.interests?.length || 0,
            warnings: buildResult.warnings,
          });
        }
      } catch (error) {
        console.warn('[AdController] Failed to collect advanced data, proceeding without it:', error);
        // 继续执行，不阻断广告请求
      }

      // 如果 query 为空，不请求广告（API 会返回 400 错误）
      if (!query || query.trim().length === 0) {
        // 清除缓存标记，因为这次没有实际发送请求
        for (const cacheKey of cacheKeys) {
          this.requestCache.delete(cacheKey);
        }
        return {
          ads: [],
          slots: [],
          isMock: false,
          error: null,
          duration: Date.now() - startTime,
          getAdsBySlot: () => [],
          getSlot: () => undefined,
        };
      }

      // ========== SDK ClientInfo 采集 ==========
      let sdkClientInfo: SdkClientInfo | null = null;

      if (this.config.api.useSdkClientInfo !== false) { // 默认启用
        try {
          sdkClientInfo = await getSdkClientInfo();

          if (this.config.debug && sdkClientInfo) {
            console.log('[AdController] SDK ClientInfo collected:', {
              hasDevice: !!sdkClientInfo.device,
              hasApp: !!sdkClientInfo.app,
              hasUser: !!sdkClientInfo.user,
              hasGeo: !!sdkClientInfo.geo,
              deviceOS: sdkClientInfo.device?.os,
              deviceType: sdkClientInfo.device?.devicetype,
              appBundle: sdkClientInfo.app?.bundle,
              userId: sdkClientInfo.user?.id?.substring(0, 8) + '...',
              country: sdkClientInfo.geo?.country,
            });
          }
        } catch (error) {
          console.warn('[AdController] Failed to collect SDK ClientInfo, proceeding without it:', error);
          // 继续执行，不阻断广告请求
        }
      }

      // 构建符合真实 API 期望格式的请求体
      // 格式参考：http://localhost:5173/api/v1/ads/request
      // 注意：不传 intent 字段，让后端自动识别用户意图
      const requestBody = {
        conversationContext: {
          query: query,
          response: response || undefined,
          // 高级数据：对话历史上下文（如果配置启用）
          ...(advancedData.contextMessages && { messages: advancedData.contextMessages }),
        },
        userContext: {
          sessionId: sessionId,
          demographics: {
            // 优先使用 SDK 的 geo 信息
            country: sdkClientInfo?.geo?.country || 'US',
            language: sdkClientInfo?.geo?.language || sdkClientInfo?.device?.language || 'en',
          },
          // 高级数据：用户记忆（如果配置启用）
          ...(advancedData.userMemory && { memory: advancedData.userMemory }),
          // 高级数据：用户画像（如果配置启用）
          ...(advancedData.userProfile && { profile: advancedData.userProfile }),
        },

        // ========== 新增：SDK ClientInfo 字段 ==========
        ...(sdkClientInfo && { clientInfo: sdkClientInfo }),

        // 调试：输出最终请求体中的 userContext
        ...(this.config.debug && {
          __debug: {
            hasUserMemory: !!advancedData.userMemory,
            userMemoryKeys: advancedData.userMemory ? Object.keys(advancedData.userMemory) : [],
            hasUserProfile: !!advancedData.userProfile,
            hasClientInfo: !!sdkClientInfo,
            clientInfoKeys: sdkClientInfo ? Object.keys(sdkClientInfo) : [],
          },
        }),
        slots: formats.map((format) => {
          // 从配置中获取格式特定的选项
          let formatVariant = 'default';
          let formatOptions: Record<string, any> = {};

          switch (format) {
            case 'action_card':
            case 'actionCard':
              formatVariant = this.config.formats.actionCard.variant || 'horizontal';
              // 直接使用配置值，不使用 ?? 运算符，因为 false 是有效值
              formatOptions = {
                showRating: this.config.formats.actionCard.showRating,
                showPrice: this.config.formats.actionCard.showPrice,
              };
              if (this.config.debug) {
                console.log('[AdController] ActionCard config:', {
                  variant: formatVariant,
                  showPrice: formatOptions.showPrice,
                  showRating: formatOptions.showRating,
                  rawConfig: this.config.formats.actionCard,
                });
              }
              break;
            case 'suffix':
              formatVariant = this.config.formats.suffix.variant || 'block';
              formatOptions = {
                showDivider: this.config.formats.suffix.showDivider,
              };
              break;
            case 'followup':
            case 'followUp':
              formatVariant = this.config.formats.followup.variant || 'bubble';
              formatOptions = {
                mixPosition: this.config.formats.followup.mixPosition,
              };
              break;
            case 'source':
            case 'sponsoredSource':
              formatVariant = this.config.formats.source.variant || 'card';
              formatOptions = {
                showSponsoredLabel: this.config.formats.source.showSponsoredLabel,
                mixPosition: this.config.formats.source.mixPosition,
              };
              break;
            case 'static':
              formatOptions = {
                width: this.config.formats.static.width,
                height: this.config.formats.static.height,
                dismissible: this.config.formats.static.dismissible,
              };
              break;
            case 'lead_gen':
            case 'leadGen':
              formatOptions = {
                fields: this.config.formats.leadGen.fields,
              };
              break;
            case 'entity_link':
            case 'entityLink':
              formatVariant = this.config.formats.entityLink.badgeStyle || 'subtle';
              formatOptions = {
                maxLinks: this.config.formats.entityLink.maxLinks,
                minConfidence: this.config.formats.entityLink.minConfidence,
                badgeStyle: this.config.formats.entityLink.badgeStyle,
                overlapStrategy: this.config.formats.entityLink.overlapStrategy,
                placement: this.config.formats.entityLink.placement,
              };
              if (this.config.debug) {
                console.log('[AdController] EntityLink config:', {
                  badgeStyle: formatVariant,
                  maxLinks: formatOptions.maxLinks,
                  minConfidence: formatOptions.minConfidence,
                  overlapStrategy: formatOptions.overlapStrategy,
                  placement: formatOptions.placement,
                });
              }
              break;
          }

          return {
            slotId: `slot-${format}`,
            slotName: `${format} Slot`,
            format: format,
            variant: formatVariant,
            size: {
              width: 0,
              height: 0,
            },
            count: 1,
            preferences: {
              maxTitleLength: 50,
              maxBodyLength: 100,
              ...formatOptions,
            },
            placement: {
              position: 'above_fold',
              context: options.placement || 'post_response',
            },
          };
        }),
      };

      if (this.config.debug) {
        console.log('[AdController] Sending request:', JSON.stringify(requestBody, null, 2));
      }

      // 调用真实 API
      const response_data = await fetch(`${this.config.api.baseUrl}/ads/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.api.apiKey}`,
          'X-API-Key': this.config.api.apiKey,
        },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(this.config.api.timeout),
      });

      if (!response_data.ok) {
        const errorData = await response_data.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `HTTP ${response_data.status}: ${response_data.statusText}`);
      }

      const responseData = await response_data.json();

      // 解析响应 - 真实 API 返回格式
      if (!responseData.success || !responseData.data) {
        throw new Error(responseData.error?.message || 'Invalid response from ad server');
      }

      // 从 slots 数组中提取广告
      const slots = responseData.data.slots || [];
      const allAds: Ad[] = [];

      for (const slot of slots) {
        if (slot.status === 'filled' && slot.ads) {
          for (const apiAd of slot.ads) {
            // 转换 API 广告格式到我们的 Ad 格式
            const original = apiAd.original || {};
            const adapted = apiAd.adapted || {};
            const tracking = apiAd.tracking || {};

            // 先转换内容格式（传递 tracking 用于降级）
            let content = this.convertAdaptedContentToAdContent(original.type, adapted, tracking);

            // 根据配置过滤内容（移除不需要显示的字段）
            content = this.filterAdContentByConfig(original.type, content);

            if (this.config.debug) {
              console.log('[AdController] Filtered ad content:', {
                type: original.type,
                originalContent: this.convertAdaptedContentToAdContent(original.type, adapted, tracking),
                filteredContent: content,
                config: {
                  showPrice: this.config.formats.actionCard.showPrice,
                  showRating: this.config.formats.actionCard.showRating,
                },
              });
            }

            allAds.push({
              id: original.id || '',
              type: original.type as any,
              score: original.score || 0,
              source: 'external',
              content: content,
              tracking: {
                click_url: tracking.clickUrl || tracking.click_url || '#',
                impression_url: tracking.impressionUrl || tracking.impression_url || '#',
              },
              metadata: {
                category: adapted.category || 'general',
                ecpm: adapted.ecpm || 0,
                source: 'external',
              },
              // 保存后端返回的建议信息（如 layout）
              suggestions: slot.suggestions ? {
                layout: slot.suggestions.layout,
              } : undefined,
            });
          }
        }
      }

      // ========== 新增：构建便捷方法的闭包 ==========
      // 创建一个转换函数，将 ApiAd 转换为 Ad（用于 getAdsBySlot）
      const convertApiAdToAd = (apiAd: ApiAd, slotSuggestions?: SlotResponse['suggestions']): Ad => {
        const original = apiAd.original || {};
        const adapted = apiAd.adapted || {};
        const tracking = apiAd.tracking || {};

        let content = this.convertAdaptedContentToAdContent(original.type, adapted, tracking);
        content = this.filterAdContentByConfig(original.type, content);

        return {
          id: original.id || '',
          type: original.type as any,
          score: original.score || 0,
          source: 'external',
          content: content,
          tracking: {
            click_url: tracking.clickUrl || tracking.click_url || '#',
            impression_url: tracking.impressionUrl || tracking.impression_url || '#',
          },
          metadata: {
            category: adapted.category || 'general',
            ecpm: adapted.ecpm || 0,
            source: 'external',
          },
          suggestions: slotSuggestions ? {
            layout: slotSuggestions.layout,
          } : undefined,
        };
      };

      // getAdsBySlot: 按 slotId 获取转换后的广告列表
      const getAdsBySlot = (slotId: string): Ad[] => {
        const slot = slots.find(s => s.slotId === slotId);
        if (!slot || slot.status !== 'filled' || !slot.ads) {
          return [];
        }
        return slot.ads.map(apiAd => convertApiAdToAd(apiAd, slot.suggestions));
      };

      // getSlot: 获取原始 slot 响应
      const getSlot = (slotId: string): SlotResponse | undefined => {
        return slots.find(s => s.slotId === slotId);
      };

      // ========== 新增：标记请求成功 ==========
      if (this.debounceManager) {
        for (const cacheKey of cacheKeys) {
          this.debounceManager.markRequestSuccess(cacheKey);
        }
      }

      return {
        ads: allAds,
        slots: slots,  // 保留原始 slots 数据
        isMock: false,
        error: null,
        duration: Date.now() - startTime,
        getAdsBySlot: getAdsBySlot,
        getSlot: getSlot,
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      console.error(`[=====ADC_ERROR=====] #${requestId}`, {
        error: err.message,
        duration: Date.now() - startTime,
      });

      // ========== 新增：标记请求失败（清除防抖标记，允许重试）==========
      if (this.debounceManager) {
        for (const cacheKey of cacheKeys) {
          this.debounceManager.markRequestFailure(cacheKey);
        }
      }

      // 降级到Mock
      if (this.config.debug) {
        console.log(`[🔄 AdController #${requestId}] Falling back to mock ads`);
      }
      return this.fetchMockAds(context, formats);
    }
  }

  /**
   * 为 Web Search 获取广告（统一的获取方法）
   *
   * 与 fetchAds() 使用相同的底层逻辑，但：
   * - 专门为 Web Search 场景优化
   * - 接受 query 字符串而非完整的 context
   * - 跳过频率控制（Web Search 自行控制展示时机）
   *
   * @param query - 搜索查询字符串
   * @param options - 可选配置
   * @returns 获取结果
   *
   * @example
   * ```ts
   * const result = await controller.fetchAdsForWebSearch('bluetooth headphones', {
   *   formats: ['source'],
   * });
   * ```
   */
  async fetchAdsForWebSearch(
    query: string,
    options: FetchAdsOptions = {}
  ): Promise<FetchAdsResult> {
    const startTime = Date.now();

    try {
      // 默认 conversationContext
      const defaultConversationContext: AdTriggerContext['conversationContext'] = {
        sessionId: 'web-search',
        messageCount: 1,
        messages: [{ role: 'user', content: query }],
      };

      // 深度合并 conversationContext（而不是简单的 || 运算）
      const conversationContext = options.context?.conversationContext
        ? {
            ...defaultConversationContext,
            ...options.context.conversationContext,
            // 确保 messages 字段存在
            messages: options.context.conversationContext.messages ?? defaultConversationContext.messages,
          }
        : defaultConversationContext;

      // 构建专用的 context
      const context: AdTriggerContext = {
        currentMessage: {
          query: query,
          response: '', // Web Search 阶段还没有 AI 回复
          timestamp: Date.now(),
          model: 'unknown',
          provider: 'web-search',
          isStreaming: false,
        },
        conversationContext,
        userData: options.context?.userData,
      };

      // 确定 format（默认为 source）
      const formats = options.formats ?? ['source'];

      // 检查缓存（共享同一缓存层）
      const cacheKey = this.getCacheKey(context, formats);
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        return {
          ads: cached.ads,
          slots: cached.slots || [],
          isMock: cached.isMock,
          error: null,
          duration: Date.now() - startTime,
          getAdsBySlot: () => cached.ads,
          getSlot: () => undefined,
        };
      }

      // 调用统一的 fetchRealAds 逻辑
      // 注意：skipFrequencyCheck=false，但 shouldTrigger 会被跳过因为 response 为空
      // 这是我们期望的行为 - Web Search 自行控制展示时机
      const result = await this.fetchRealAds(context, formats, {
        ...options,
        placement: 'pre_request',
      });

      // 记录展示（如果有广告返回）
      if (result.ads.length > 0) {
        this.frequencyController.recordImpression();
      }

      // 缓存结果
      if (result.error === null) {
        this.addToCache(cacheKey, result.ads, false);
      }

      result.duration = Date.now() - startTime;

      return result;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      console.error('[AdController] Error fetching ads for web search:', err);

      // 失败时返回空结果，不降级到 mock（Web Search 不需要 mock）
      return {
        ads: [],
        slots: [],
        isMock: false,
        error: err,
        duration: Date.now() - startTime,
        getAdsBySlot: () => [],
        getSlot: () => undefined,
      };
    }
  }

  /**
   * 将 API 返回的 adapted 内容转换为 SDK 组件期望的格式
   *
   * SDK 组件期望所有广告类型都使用 content.title 作为主要字段
   * 参考文档: @ai-ad-network/frontend-sdk
   */
  private convertAdaptedContentToAdContent(type: string, adapted: any, tracking?: any): any {
    const content: any = {};

    switch (type) {
      case 'action_card':
      case 'actionCard':
        content.title = adapted.title;
        content.body = adapted.body;
        content.image = adapted.image?.url;
        content.cta_text = adapted.ctaText;
        content.price = adapted.price?.display || adapted.price?.value;
        content.rating = adapted.rating;
        content.link = adapted.link;
        break;

      case 'suffix':
        // SDK 的 SuffixAd 使用 content.title 生成后缀文本
        content.title = adapted.body || adapted.text;
        content.body = adapted.body;
        content.link = adapted.link;
        break;

      case 'followup':
      case 'followUp':
        // SDK 的 FollowUpAd 使用 content.title 作为跟进问题
        content.title = adapted.body || adapted.question;
        content.body = adapted.body;
        content.link = adapted.link;
        break;

      case 'source':
      case 'sponsoredSource':
        // SDK 的 SponsoredSourceAd 使用 content.title 作为来源标题
        content.title = adapted.title;
        content.link = adapted.link || adapted.url || tracking?.clickUrl;
        content.favicon = adapted.favicon;
        content.url = adapted.link || adapted.url || tracking?.clickUrl;
        break;

      case 'static':
        content.title = adapted.title;
        content.body = adapted.body;
        content.image = adapted.image?.url;
        content.link = adapted.link;
        break;

      case 'lead_gen':
      case 'leadGen':
        content.title = adapted.title;
        content.body = adapted.body;
        content.image = adapted.image?.url;
        // 降级处理：如果后端没有返回 fields，使用默认字段
        content.lead_gen_fields = adapted.fields && adapted.fields.length > 0
          ? adapted.fields
          : [
              { type: 'email', placeholder: 'your@email.com', required: true },
            ];
        // 调试日志
        if (this.config.debug) {
          console.log('[AdController] LeadGen fields:', {
            hasBackendFields: !!(adapted.fields && adapted.fields.length > 0),
            backendFields: adapted.fields,
            finalFields: content.lead_gen_fields,
          });
        }
        break;

      default:
        return adapted;
    }

    return content;
  }

  /**
   * 根据配置过滤广告内容
   *
   * 移除用户不希望显示的字段（如价格、评分等）
   *
   * @param type - 广告类型
   * @param content - 原始广告内容
   * @returns 过滤后的广告内容
   */
  private filterAdContentByConfig(type: string, content: any): any {
    // 创建内容副本，避免修改原始数据
    const filtered = { ...content };

    switch (type) {
      case 'action_card':
      case 'actionCard': {
        const actionCardConfig = this.config.formats.actionCard;
        // 如果配置为不显示价格，删除 price 字段
        if (actionCardConfig.showPrice === false) {
          delete filtered.price;
        }
        // 如果配置为不显示评分，删除 rating 字段
        if (actionCardConfig.showRating === false) {
          delete filtered.rating;
        }
        break;
      }

      case 'suffix': {
        const suffixConfig = this.config.formats.suffix;
        // 可以添加其他过滤逻辑
        break;
      }

      case 'followup':
      case 'followUp': {
        const followupConfig = this.config.formats.followup;
        // 可以添加其他过滤逻辑
        break;
      }

      case 'source':
      case 'sponsoredSource': {
        const sourceConfig = this.config.formats.source;
        // 如果配置为不显示赞助标签，可以添加相应逻辑
        break;
      }

      case 'static': {
        // static 格式的过滤逻辑
        break;
      }

      case 'lead_gen':
      case 'leadGen': {
        // lead_gen 格式的过滤逻辑
        break;
      }
    }

    return filtered;
  }

  /**
   * 获取Mock广告
   *
   * @param context - 广告触发上下文
   * @param formats - 广告格式列表
   * @returns 获取结果
   */
  private async fetchMockAds(
    context: AdTriggerContext,
    formats: string[]
  ): Promise<FetchAdsResult> {
    const ads: Ad[] = [];
    // 为 Mock 模式构建 slots 数据（保持结构一致）
    const mockSlots: SlotResponse[] = [];

    // 为每个格式生成Mock广告
    for (const format of formats) {
      const mockAd = this.generateMockAd(format, context);
      if (mockAd) {
        // 应用配置过滤（虽然 generateMockAd 已经考虑了配置，但这里再次应用确保一致性）
        mockAd.content = this.filterAdContentByConfig(format, mockAd.content);
        ads.push(mockAd);

        // 同时构建对应的 slot
        mockSlots.push({
          slotId: `slot-${format}`,
          status: 'filled',
          ads: [{
            original: {
              id: mockAd.id,
              type: format,
              score: mockAd.score,
            },
            adapted: mockAd.content,
            tracking: mockAd.tracking,
          }],
        });
      }
    }

    // getAdsBySlot for Mock data
    const getAdsBySlot = (slotId: string): Ad[] => {
      const slot = mockSlots.find(s => s.slotId === slotId);
      if (!slot || slot.status !== 'filled' || !slot.ads) {
        return [];
      }
      return slot.ads.map((apiAd: ApiAd) => {
        const ad: Ad = {
          id: apiAd.original.id,
          type: apiAd.original.type as any,
          score: apiAd.original.score || 0,
          source: 'mock',
          content: apiAd.adapted,
          tracking: apiAd.tracking,
          metadata: {
            category: 'mock',
            ecpm: 0,
            source: 'internal',
          },
        };
        return ad;
      });
    };

    const getSlot = (slotId: string): SlotResponse | undefined => {
      return mockSlots.find(s => s.slotId === slotId);
    };

    return {
      ads,
      slots: mockSlots,
      isMock: true,
      error: null,
      duration: 0,
      getAdsBySlot,
      getSlot,
    };
  }

  /**
   * 生成单个Mock广告
   *
   * @param format - 广告格式
   * @param context - 广告触发上下文
   * @returns Mock广告或null
   */
  private generateMockAd(format: string, context: AdTriggerContext): Ad | null {
    const now = Date.now();

    const baseAd: Ad = {
      id: `mock_ad_${format}_${now}`,
      type: format as any,
      score: 0.85,
      source: 'mock',
      content: {},
      tracking: {
        click_url: '#',
        impression_url: '#',
      },
      metadata: {
        category: 'mock',
        ecpm: 1.0,
        source: 'internal',
      },
    };

    // 根据格式填充内容，使用配置选项
    switch (format) {
      case 'action_card':
      case 'actionCard': {
        const actionCardConfig = this.config.formats.actionCard;
        baseAd.content = {
          title: 'Mock Action Card',
          body: 'This is a mock action card advertisement for testing purposes.',
          image: 'https://via.placeholder.com/300x200',
          cta_text: 'Learn More',
          // 根据配置决定是否包含价格和评分
          ...(actionCardConfig.showPrice && { price: '$99.00' }),
          ...(actionCardConfig.showRating && { rating: 4.5 }),
          link: '#',
        };
        break;
      }

      case 'suffix': {
        const suffixConfig = this.config.formats.suffix;
        baseAd.content = {
          suffix_content: {
            text: 'By the way, check out this amazing product!',
            link: '#',
          },
          // 可以根据 variant 调整样式（这里简化处理）
          _variant: suffixConfig.variant,
        };
        break;
      }

      case 'followup':
      case 'followUp': {
        const followupConfig = this.config.formats.followup;
        baseAd.content = {
          followup_content: {
            question: 'Would you like to learn more about our premium services?',
            link: '#',
          },
          _variant: followupConfig.variant,
        };
        break;
      }

      case 'source':
      case 'sponsoredSource': {
        const sourceConfig = this.config.formats.source;
        baseAd.content = {
          source_content: {
            title: 'Sponsored Link - Example.com',
            url: 'https://example.com',
            favicon: 'https://via.placeholder.com/32',
          },
          _showSponsoredLabel: sourceConfig.showSponsoredLabel,
          _variant: sourceConfig.variant,
        };
        break;
      }

      case 'static': {
        const staticConfig = this.config.formats.static;
        baseAd.content = {
          title: 'Static Banner Ad',
          body: 'This is a static banner advertisement.',
          image: `https://via.placeholder.com/${staticConfig.width}x${staticConfig.height}`,
          link: '#',
          _dismissible: staticConfig.dismissible,
        };
        break;
      }

      case 'lead_gen':
      case 'leadGen': {
        const leadGenConfig = this.config.formats.leadGen;
        baseAd.content = {
          title: 'Subscribe to Our Newsletter',
          body: 'Get the latest updates delivered to your inbox.',
          lead_gen_fields: leadGenConfig.fields || [
            { type: 'email', placeholder: 'your@email.com', required: true },
            { type: 'name', placeholder: 'Your name', required: false },
          ],
        };
        break;
      }

      case 'entity_link':
      case 'entityLink': {
        const entityLinkConfig = this.config.formats.entityLink;
        // 从响应文本中提取一些示例实体
        const responseText = context.currentMessage.response || '';
        const mockEntities: any[] = [];

        // 根据常见产品/品牌生成模拟实体
        const mockProductPatterns = [
          { text: 'iPhone', type: 'product' as const, url: 'https://example.com/iphone' },
          { text: 'MacBook', type: 'product' as const, url: 'https://example.com/macbook' },
          { text: 'Sony', type: 'brand' as const, url: 'https://example.com/sony' },
          { text: 'Samsung', type: 'brand' as const, url: 'https://example.com/samsung' },
          { text: 'ChatGPT', type: 'product' as const, url: 'https://example.com/chatgpt' },
          { text: 'Notion', type: 'product' as const, url: 'https://example.com/notion' },
        ];

        let entityIndex = 0;
        for (const pattern of mockProductPatterns) {
          const pos = responseText.indexOf(pattern.text);
          if (pos !== -1 && entityIndex < (entityLinkConfig.maxLinks || 3)) {
            mockEntities.push({
              text: pattern.text,
              type: pattern.type,
              startPosition: pos,
              endPosition: pos + pattern.text.length,
              confidence: 0.85,
              category: 'technology',
              brand: pattern.type === 'brand' ? pattern.text : undefined,
              affiliateUrl: pattern.url,
              trackingId: `mock_track_${entityIndex}`,
            });
            entityIndex++;
          }
        }

        baseAd.content = {
          // 使用与 API 相同的结构
          entities: mockEntities,
          replacements: mockEntities.map((e: any) => ({
            originalText: e.text,
            affiliateUrl: e.affiliateUrl,
            trackingId: e.trackingId,
          })),
          maxLinks: entityLinkConfig.maxLinks || 3,
          minConfidence: entityLinkConfig.minConfidence || 0.7,
          badgeStyle: entityLinkConfig.badgeStyle || 'subtle',
          overlapStrategy: entityLinkConfig.overlapStrategy || 'longest',
        };
        break;
      }

      default:
        return null;
    }

    return baseAd;
  }

  /**
   * 获取当前启用的广告格式
   *
   * @returns 广告格式列表
   */
  private getActiveFormats(): string[] {
    const formats: string[] = [];

    if (this.config.formats.actionCard.enabled) formats.push('action_card');
    if (this.config.formats.suffix.enabled) formats.push('suffix');
    if (this.config.formats.followup.enabled) formats.push('followup');
    if (this.config.formats.source.enabled) formats.push('source');
    if (this.config.formats.static.enabled) formats.push('static');
    if (this.config.formats.leadGen.enabled) formats.push('lead_gen');
    if (this.config.formats.entityLink.enabled) formats.push('entity_link');

    return formats;
  }

  /**
   * 生成缓存键
   *
   * @param context - 广告触发上下文
   * @param formats - 广告格式列表
   * @returns 缓存键
   */
  private getCacheKey(context: AdTriggerContext, formats: string[]): string {
    // 简单的缓存键生成策略
    // 可以根据实际需求优化
    const queryHash = context.currentMessage.query.slice(0, 50);
    const formatsKey = formats.sort().join(',');
    return `${queryHash}_${formatsKey}`;
  }

  /**
   * 从缓存获取
   *
   * @param key - 缓存键
   * @returns 缓存的广告或null
   */
  private getFromCache(key: string): { ads: Ad[]; isMock: boolean } | null {
    const cached = this.fetchCache.get(key);
    if (!cached) {
      return null;
    }

    const cacheTime = this.config.advanced?.cacheTime ?? 300;
    const now = Date.now();

    if (now - cached.timestamp > cacheTime * 1000) {
      this.fetchCache.delete(key);
      return null;
    }

    return {
      ads: cached.ads,
      isMock: true, // 缓存的视为Mock（用于调试目的）
    };
  }

  /**
   * 添加到缓存
   *
   * @param key - 缓存键
   * @param ads - 广告列表
   * @param isMock - 是否为Mock数据
   */
  private addToCache(key: string, ads: Ad[], isMock: boolean): void {
    this.fetchCache.set(key, {
      ads,
      timestamp: Date.now(),
    });

    // 限制缓存大小
    const maxCacheSize = 100;
    if (this.fetchCache.size > maxCacheSize) {
      const firstKey = this.fetchCache.keys().next().value;
      if (firstKey) {
        this.fetchCache.delete(firstKey);
      }
    }
  }
}

// ============================================================================
// 工厂函数
// ============================================================================

/**
 * 创建广告控制器
 *
 * @param config - 广告配置
 * @returns 广告控制器实例
 */
export function createAdController(config: AdConfig): AdController {
  return new AdController(config);
}

// ============================================================================
// 导出
// ============================================================================

export default AdController;
