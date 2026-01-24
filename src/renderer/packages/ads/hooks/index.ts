/**
 * AI Ad Network - Hooks 统一导出
 *
 * 统一导出所有 React Hooks，供工程师C使用
 *
 * @module ads/hooks
 */

// ============================================================================
// 工程师A提供的配置Hooks
// ============================================================================

export * from './useAdConfig';

// ============================================================================
// 工程师B提供的广告Hooks
// ============================================================================

export { useAdTrigger } from './useAdTrigger';
export type { UseAdTriggerReturn } from './useAdTrigger';

export { useAdData, useAdList, useAdLoading } from './useAdData';
export type { UseAdDataReturn, AdDataState, AdDataActions } from './useAdData';

// 统一广告数据 Hook
export { useAds, clearAllAdsCache } from './useAds';

// 用户记忆数据集成 Hook
export { useMemoryForAds } from './useMemoryForAds';
export type { UseMemoryForAdsResult } from './useMemoryForAds';

// ============================================================================
// 默认导出
// ============================================================================

export { default } from './useAdConfig';
