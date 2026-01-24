/**
 * AI Ad Network - 广告触发 Hook
 *
 * 提供广告触发判断和获取功能
 * 封装 AdController，提供 React Hook 接口
 *
 * @see AdController.ts - 核心控制器
 */

import { useCallback, useEffect, useRef } from 'react';
import { useAdConfigStore } from '../config/adConfigStore';
import { AdController } from '../core/AdController';
import type { AdTriggerContext } from '../core/types';
import type { FetchAdsOptions, FetchAdsResult, TriggerCheckResult } from '../core/AdController';

// ============================================================================
// Hook 返回类型
// ============================================================================

/**
 * useAdTrigger Hook 返回值
 */
export interface UseAdTriggerReturn {
  /** 判断是否应该触发广告 */
  shouldTrigger: (context: AdTriggerContext) => TriggerCheckResult;
  /** 获取广告 */
  fetchAds: (context: AdTriggerContext, options?: FetchAdsOptions) => Promise<FetchAdsResult>;
  /** 获取频率统计信息 */
  getFrequencyStats: () => ReturnType<AdController['getFrequencyStats']>;
  /** 重置控制器状态 */
  reset: () => void;
  /** 是否已初始化 */
  isInitialized: boolean;
}

// ============================================================================
// 单例控制器管理
// ============================================================================

/**
 * 全局控制器实例（单例模式）
 */
let controllerInstance: AdController | null = null;

/**
 * 获取或创建控制器实例
 *
 * @param config - 广告配置
 * @returns 控制器实例
 */
function getController(config: ReturnType<typeof useAdConfigStore.getState>): AdController {
  if (!controllerInstance) {
    controllerInstance = new AdController(config as any);
  }
  return controllerInstance;
}

/**
 * 清除控制器实例
 *
 * 在配置变更或组件卸载时调用
 */
function clearController(): void {
  controllerInstance = null;
}

// ============================================================================
// Hook 实现
// ============================================================================

/**
 * 广告触发 Hook
 *
 * 提供广告触发判断和获取功能
 *
 * @example
 * ```tsx
 * function ChatMessage({ query, response, isStreaming }) {
 *   const { shouldTrigger, fetchAds } = useAdTrigger();
 *
 *   const handleResponseComplete = async () => {
 *     const context = {
 *       currentMessage: { query, response, timestamp: Date.now(), ... },
 *     };
 *
 *     const check = shouldTrigger(context);
 *     if (check.shouldTrigger) {
 *       const result = await fetchAds(context);
 *       // 展示广告
 *     }
 *   };
 *
 *   return <div>{response}</div>;
 * }
 * ```
 */
export function useAdTrigger(): UseAdTriggerReturn {
  // 获取配置
  const config = useAdConfigStore();

  // 控制器引用
  const controllerRef = useRef<AdController | null>(null);

  // 初始化控制器
  useEffect(() => {
    controllerRef.current = getController(config);

    // 清理函数
    return () => {
      // 不在这里清理控制器，因为其他组件可能正在使用
      // 控制器会在配置更新时自动更新
    };
  }, []); // 只在挂载时初始化

  // 监听配置变化
  useEffect(() => {
    if (controllerRef.current) {
      controllerRef.current.updateConfig(config as any);
    }
  }, [config]);

  /**
   * 判断是否应该触发广告
   */
  const shouldTrigger = useCallback((context: AdTriggerContext): TriggerCheckResult => {
    const controller = controllerRef.current;
    if (!controller) {
      return {
        shouldTrigger: false,
        reason: 'Controller not initialized',
      };
    }

    return controller.shouldTrigger(context);
  }, []);

  /**
   * 获取广告
   */
  const fetchAds = useCallback(
    async (context: AdTriggerContext, options?: FetchAdsOptions): Promise<FetchAdsResult> => {
      const controller = controllerRef.current;
      if (!controller) {
        return {
          ads: [],
          isMock: false,
          error: new Error('Controller not initialized'),
          duration: 0,
        };
      }

      return controller.fetchAds(context, options);
    },
    []
  );

  /**
   * 获取频率统计信息
   */
  const getFrequencyStats = useCallback(() => {
    const controller = controllerRef.current;
    if (!controller) {
      return {
        messageCount: 0,
        adCount: 0,
        lastAdTime: 0,
        formatCounters: {},
      };
    }

    return controller.getFrequencyStats();
  }, []);

  /**
   * 重置控制器状态
   */
  const reset = useCallback(() => {
    const controller = controllerRef.current;
    if (controller) {
      controller.reset();
    }
  }, []);

  return {
    shouldTrigger,
    fetchAds,
    getFrequencyStats,
    reset,
    isInitialized: controllerRef.current !== null,
  };
}

// ============================================================================
// 导出
// ============================================================================

export default useAdTrigger;
