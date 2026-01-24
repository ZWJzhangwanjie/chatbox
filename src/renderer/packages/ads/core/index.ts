/**
 * AI Ad Network - 核心模块导出
 *
 * 统一导出所有核心模块，供工程师C使用
 *
 * @module ads/core
 */

// ============================================================================
// 类型导出
// ============================================================================

export type {
  // 触发上下文
  AdTriggerContext,
  CurrentMessageInfo,
  ConversationContext,
  UserData,

  // 请求数据
  AdRequestData,
  SessionInfo,
  ProcessedMemoryData,
  ProcessedProfileData,
  ContextData,

  // 响应数据
  Ad,
  AdContent,
  AdTracking,
  AdMetadata,
  AdApiResponse,

  // 收集结果
  DataCollectionResult,
} from './types';

// ============================================================================
// 控制器导出
// ============================================================================

export { FrequencyController, createFrequencyController } from './FrequencyController';
export type { FrequencyStats } from './FrequencyController';

// 新增：持久化频率控制器
export { PersistentFrequencyController, createPersistentFrequencyController } from './PersistentFrequencyController';
export type { FrequencyStats as PersistentFrequencyStats } from './PersistentFrequencyController';

export { DataCollector, createDataCollector } from './DataCollector';

export { AdController, createAdController } from './AdController';
export type {
  FetchAdsOptions,
  FetchAdsResult,
  TriggerCheckResult,
} from './AdController';

export { AdRequestBuilder, createAdRequestBuilder } from './AdRequestBuilder';
export type { BuildRequestOptions, BuildRequestResult } from './AdRequestBuilder';

// 新增：改进的缓存管理器
export { ImprovedAdCacheManager, createImprovedAdCacheManager } from './ImprovedAdCacheManager';
export type { CachedAds, CacheOptions, CacheStats } from './ImprovedAdCacheManager';

// 新增：防抖缓存管理器
export { DebounceCacheManager, createDebounceCacheManager } from './DebounceCacheManager';
export type { DebounceStats, DebounceResult } from './DebounceCacheManager';

// 新增：配置事件管理器
export { AdConfigEventManager } from './AdConfigEventManager';
export type { ConfigChangeEvent, ConfigChangeListener, ConfigChangeEventType } from './AdConfigEventManager';

// ============================================================================
// 默认导出
// ============================================================================

// 注意：types.ts 不再有默认导出（接口不能作为值导出）
// 所有类型都通过 'export type' 导出，请使用具名导入
