/**
 * AI Ad Network - 广告数据 Hook
 *
 * 提供广告数据获取和状态管理
 * 自动处理加载状态、错误处理、缓存
 *
 * @see AdController.ts - 核心控制器
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAdConfigStore } from '../config/adConfigStore';
import { AdController } from '../core/AdController';
import type { AdTriggerContext, Ad } from '../core/types';
import type { FetchAdsOptions } from '../core/AdController';

// ============================================================================
// Hook 返回类型
// ============================================================================

/**
 * 广告数据状态
 */
export interface AdDataState {
  /** 广告列表 */
  ads: Ad[];
  /** 是否正在加载 */
  isLoading: boolean;
  /** 是否有错误 */
  isError: boolean;
  /** 错误对象 */
  error: Error | null;
  /** 是否使用了Mock数据 */
  isMock: boolean;
  /** 上次更新时间 */
  lastUpdated: number | null;
}

/**
 * 广告数据操作
 */
export interface AdDataActions {
  /** 刷新广告 */
  refresh: () => Promise<void>;
  /** 清除广告 */
  clear: () => void;
  /** 重试获取 */
  retry: () => Promise<void>;
}

/**
 * useAdData Hook 返回值
 */
export type UseAdDataReturn = AdDataState & AdDataActions;

// ============================================================================
// 默认状态
// ============================================================================

const defaultState: AdDataState = {
  ads: [],
  isLoading: false,
  isError: false,
  error: null,
  isMock: false,
  lastUpdated: null,
};

// ============================================================================
// Hook 实现
// ============================================================================

/**
 * 广告数据 Hook
 *
 * 根据上下文自动获取和管理广告数据
 *
 * @param context - 广告触发上下文（可选，传入时自动获取）
 * @param options - 获取选项
 * @returns 广告数据状态和操作
 *
 * @example
 * ```tsx
 * // 自动获取模式
 * function ChatMessage({ query, response }) {
 *   const context = {
 *     currentMessage: { query, response, timestamp: Date.now(), ... },
 *   };
 *   const { ads, isLoading, isError, error } = useAdData(context, {
 *     formats: ['action_card'],
 *   });
 *
 *   if (isLoading) return <div>Loading...</div>;
 *   if (isError) return <div>Error: {error.message}</div>;
 *
 *   return (
 *     <div>
 *       {ads.map(ad => <ActionCardAd key={ad.id} ad={ad} />)}
 *     </div>
 *   );
 * }
 *
 * // 手动获取模式
 * function ChatMessage() {
 *   const { ads, refresh } = useAdData();
 *
 *   const handleClick = () => {
 *     refresh();
 *   };
 *
 *   return <div onClick={handleClick}>Show Ads</div>;
 * }
 * ```
 */
export function useAdData(
  context?: AdTriggerContext,
  options?: FetchAdsOptions
): UseAdDataReturn {
  // 获取配置
  const config = useAdConfigStore();

  // 调试日志：useAdData hook 被调用
  console.log('[🔌 useAdData HOOK CALLED]', {
    hasContext: !!context,
    contextQuery: context?.currentMessage?.query?.substring(0, 50),
    contextResponse: context?.currentMessage?.response?.substring(0, 50),
    optionsFormats: options?.formats,
    configEnabled: config.enabled,
  })

  // 状态
  const [state, setState] = useState<AdDataState>(defaultState);

  // 控制器引用
  const controllerRef = useRef<AdController | null>(null);
  const contextRef = useRef<AdTriggerContext | undefined>(context);
  const optionsRef = useRef<FetchAdsOptions | undefined>(options);

  // 更新引用
  useEffect(() => {
    contextRef.current = context;
    optionsRef.current = options;
  }, [context, options]);

  // 初始化控制器
  useEffect(() => {
    if (!controllerRef.current) {
      controllerRef.current = new AdController(config as any);
    }
  }, []);

  // 监听配置变化
  useEffect(() => {
    if (controllerRef.current) {
      controllerRef.current.updateConfig(config as any);
    }
  }, [config]);

  /**
   * 获取广告数据
   */
  const fetchAds = useCallback(async (): Promise<void> => {
    const currentContext = contextRef.current;
    const controller = controllerRef.current;

    console.log('[🚀 useAdData fetchAds CALLED]', {
      hasContext: !!currentContext,
      hasController: !!controller,
      query: currentContext?.currentMessage?.query?.substring(0, 50),
      formats: optionsRef.current?.formats,
    });

    if (!currentContext || !controller) {
      console.log('[❌ fetchAds ABORTED]', 'Missing context or controller');
      return;
    }

    // 开始加载
    console.log('[⏳ fetchAds STARTING]');
    setState((prev) => ({ ...prev, isLoading: true, isError: false, error: null }));

    try {
      const result = await controller.fetchAds(currentContext, optionsRef.current);

      console.log('[✅ fetchAds SUCCESS]', {
        adsCount: result.ads.length,
        isMock: result.isMock,
        duration: result.duration,
        hasError: !!result.error,
      });

      setState({
        ads: result.ads,
        isLoading: false,
        isError: result.error !== null,
        error: result.error,
        isMock: result.isMock,
        lastUpdated: Date.now(),
      });
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      console.log('[❌ fetchAds ERROR]', err.message);

      setState({
        ads: [],
        isLoading: false,
        isError: true,
        error: err,
        isMock: false,
        lastUpdated: Date.now(),
      });
    }
  }, []);

  /**
   * 刷新广告
   */
  const refresh = useCallback(async () => {
    await fetchAds();
  }, [fetchAds]);

  /**
   * 清除广告
   */
  const clear = useCallback(() => {
    setState(defaultState);
  }, []);

  /**
   * 重试获取
   */
  const retry = useCallback(async () => {
    setState((prev) => ({ ...prev, isError: false, error: null }));
    await fetchAds();
  }, [fetchAds]);

  // 自动获取（当context存在时）
  useEffect(() => {
    console.log('[🔄 useAdData EFFECT]', {
      hasContext: !!context,
      enabled: config.enabled,
      query: context?.currentMessage?.query?.substring(0, 50),
      willFetch: !!(context && config.enabled),
    });

    if (context && config.enabled) {
      fetchAds();
    }
  }, [context, config.enabled]); // 只在context或启用状态变化时获取

  return {
    ...state,
    refresh,
    clear,
    retry,
  };
}

/**
 * 简化版广告数据 Hook
 *
 * 只返回广告列表，不处理加载状态
 *
 * @param context - 广告触发上下文
 * @param options - 获取选项
 * @returns 广告列表
 *
 * @example
 * ```tsx
 * function ChatMessage({ query, response }) {
 *   const context = {
 *     currentMessage: { query, response, timestamp: Date.now(), ... },
 *   };
 *   const ads = useAdList(context, { formats: ['action_card'] });
 *
 *   return (
 *     <div>
 *       {ads.map(ad => <ActionCardAd key={ad.id} ad={ad} />)}
 *     </div>
 *   );
 * }
 * ```
 */
export function useAdList(
  context: AdTriggerContext,
  options?: FetchAdsOptions
): Ad[] {
  const { ads } = useAdData(context, options);
  return ads;
}

/**
 * 广告加载状态 Hook
 *
 * 只返回加载状态信息
 *
 * @param context - 广告触发上下文
 * @param options - 获取选项
 * @returns 加载状态
 *
 * @example
 * ```tsx
 * function ChatMessage({ query, response }) {
 *   const context = {
 *     currentMessage: { query, response, timestamp: Date.now(), ... },
 *   };
 *   const { isLoading, isError, error } = useAdLoading(context);
 *
 *   if (isLoading) return <Spinner />;
 *   if (isError) return <ErrorDisplay error={error} />;
 *   return <div>{response}</div>;
 * }
 * ```
 */
export function useAdLoading(
  context?: AdTriggerContext,
  options?: FetchAdsOptions
): {
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  hasAds: boolean;
} {
  const { isLoading, isError, error, ads } = useAdData(context, options);

  return {
    isLoading,
    isError,
    error,
    hasAds: ads.length > 0,
  };
}

// ============================================================================
// 导出
// ============================================================================

export default useAdData;
