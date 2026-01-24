/**
 * 工程师B (核心逻辑层) 参考示例
 *
 * 展示如何在核心逻辑层使用配置系统
 */

import { useEffect, useState } from 'react';
import {
  // 类型定义
  type AdConfig,
  type AdTriggerContext,
  // Store
  useAdConfigStore,
  // Hooks
  useAdConfig,
  useIsAdEnabled,
  useActiveFormats,
  useDataCollectionConfig,
  useShouldCollectData,
  useApiConfig,
  // 验证工具
  validateAdConfig,
} from '@/packages/ads';

// ============================================================================
// 示例 1: 数据收集器 (DataCollector)
// ============================================================================

/**
 * 数据收集器实现示例
 *
 * 职责：根据配置收集数据并构建请求 payload
 */
class DataCollector {
  private config: AdConfig;

  constructor() {
    // 读取当前配置
    this.config = useAdConfigStore.getState();
  }

  /**
   * 收集广告请求数据
   */
  collect(context: AdTriggerContext) {
    const { dataCollection } = this.config;
    const payload: Record<string, unknown> = {};

    // 1. 基础数据（总是包含）
    payload.query = context.query;

    // 2. 根据配置决定是否收集响应
    if (dataCollection.includeResponse && context.response) {
      payload.response = context.response;
    }

    // 3. 根据配置决定是否收集完整上下文
    if (dataCollection.includeFullContext && context.fullContext) {
      // 限制上下文窗口大小
      const windowedContext = context.fullContext.slice(-dataCollection.contextWindow);
      payload.context = windowedContext;
    }

    // 4. 根据配置决定是否收集记忆
    if (dataCollection.includeMemory && context.memory) {
      payload.memory = context.memory;
    }

    // 5. 根据配置决定是否收集画像
    if (dataCollection.includeProfile && context.profile) {
      payload.profile = context.profile;
    }

    // 6. 检查隐私配置
    if (dataCollection.enableAnonymization) {
      return this.anonymize(payload);
    }

    return payload;
  }

  /**
   * 数据脱敏处理
   */
  private anonymize(data: Record<string, unknown>) {
    // TODO: 实现数据脱敏逻辑
    // - 移除敏感信息（邮箱、电话、身份证等）
    // - 保留广告相关有效信息
    return data;
  }
}

// 使用示例：
// const collector = new DataCollector();
// const payload = collector.collect({
//   query: 'What is AI?',
//   response: 'AI stands for Artificial Intelligence...',
//   sessionId: 'session-123',
// });

// ============================================================================
// 示例 2: 频率控制器 (FrequencyController)
// ============================================================================

/**
 * 频率控制器实现示例
 *
 * 职责：根据配置控制广告展示频率
 */
class FrequencyController {
  private formatCounts: Record<string, number> = {};
  private messageCount = 0;

  /**
   * 判断是否应该展示广告
   */
  shouldShow(format: string): boolean {
    const config = useAdConfigStore.getState();
    const formatConfig = config.formats[format as keyof typeof config.formats];

    if (!formatConfig?.enabled) {
      return false;
    }

    // 检查频率
    if (this.messageCount % formatConfig.frequency === 0) {
      // 检查单次会话限制
      const currentCount = this.formatCounts[format] || 0;
      if (currentCount < formatConfig.maxPerSession) {
        return true;
      }
    }

    return false;
  }

  /**
   * 记录消息
   */
  recordMessage() {
    this.messageCount++;
  }

  /**
   * 记录广告展示
   */
  recordImpression(format: string) {
    this.formatCounts[format] = (this.formatCounts[format] || 0) + 1;
  }

  /**
   * 重置计数器
   */
  reset() {
    this.formatCounts = {};
    this.messageCount = 0;
  }

  /**
   * 获取统计信息
   */
  getStats() {
    return {
      messageCount: this.messageCount,
      formatCounts: this.formatCounts,
    };
  }
}

// 使用示例：
// const controller = new FrequencyController();
// controller.recordMessage();
// if (controller.shouldShow('action_card')) {
//   // 展示广告
//   controller.recordImpression('action_card');
// }

// ============================================================================
// 示例 3: 广告控制器 (AdController) - React Hook
// ============================================================================

/**
 * 广告控制器 Hook 示例
 *
 * 职责：集成所有逻辑，提供统一的广告触发接口
 */
export function useAdController() {
  // 读取配置
  const isEnabled = useIsAdEnabled();
  const activeFormats = useActiveFormats();
  const apiConfig = useApiConfig();
  const dataCollectionConfig = useDataCollectionConfig();

  // 状态管理
  const [controller] = useState(() => new FrequencyController());
  const [collector] = useState(() => new DataCollector());

  /**
   * 判断是否应该触发广告
   */
  const shouldTrigger = (context: AdTriggerContext): boolean => {
    // 1. 检查广告系统是否启用
    if (!isEnabled) {
      return false;
    }

    // 2. 检查 API 是否配置
    if (!apiConfig.apiKey) {
      console.warn('[AdController] API key not configured');
      return false;
    }

    // 3. 检查是否有启用的格式
    if (activeFormats.length === 0) {
      return false;
    }

    // 4. 检查频率控制
    controller.recordMessage();
    const canShow = activeFormats.some((format) => controller.shouldShow(format));

    return canShow;
  };

  /**
   * 获取广告请求数据
   */
  const buildRequest = (context: AdTriggerContext) => {
    const payload = collector.collect(context);
    return {
      ...payload,
      formats: activeFormats,
      timestamp: Date.now(),
      sessionId: context.sessionId,
    };
  };

  /**
   * 获取统计信息
   */
  const getStats = () => {
    return {
      ...controller.getStats(),
      activeFormats,
      enabled: isEnabled,
    };
  };

  return {
    shouldTrigger,
    buildRequest,
    getStats,
    config: {
      enabled: isEnabled,
      activeFormats,
      apiConfig,
      dataCollectionConfig,
    },
  };
}

// 使用示例：
// function MyComponent() {
//   const { shouldTrigger, buildRequest } = useAdController();
//
//   const handleResponse = (query: string, response: string) => {
//     const context: AdTriggerContext = {
//       query,
//       response,
//       sessionId: 'session-123',
//     };
//
//     if (shouldTrigger(context)) {
//       const payload = buildRequest(context);
//       // 发送广告请求
//       fetchAds(payload);
//     }
//   };
//
//   return <div>...</div>;
// }

// ============================================================================
// 示例 4: 请求构建器 (AdRequestBuilder)
// ============================================================================

/**
 * 广告请求构建器示例
 */
export function useAdRequestBuilder() {
  const apiConfig = useApiConfig();
  const activeFormats = useActiveFormats();

  /**
   * 构建完整的广告请求
   */
  const buildRequest = (context: AdTriggerContext) => {
    return {
      // API 配置
      baseUrl: apiConfig.baseUrl,
      apiKey: apiConfig.apiKey,
      timeout: apiConfig.timeout,

      // 请求数据
      query: context.query,
      response: context.response,
      formats: activeFormats,

      // 元数据
      sessionId: context.sessionId,
      messageId: context.messageId,
      timestamp: Date.now(),

      // 配置信息（后端可能需要）
      useMock: apiConfig.useMock,
    };
  };

  return { buildRequest };
}

// ============================================================================
// 示例 5: 配置订阅
// ============================================================================

/**
 * 配置变更监听示例
 */
export function useConfigSubscription() {
  useEffect(() => {
    // 订阅配置变化
    const unsubscribe = useAdConfigStore.subscribe(
      (state) => state,
      (newState) => {
        console.log('[Config Subscription] Config changed:', newState);

        // 当 API 配置变化时，重新初始化某些东西
        // 当格式配置变化时，更新可用的格式列表
        // 等等...
      }
    );

    return () => {
      unsubscribe();
    };
  }, []);

  // 或者使用内置的订阅辅助函数
  useEffect(() => {
    const unsubscribe = useAdConfigStore.subscribe(
      (state) => state.enabled,
      (enabled) => {
        console.log('[Config Subscription] Ad enabled changed:', enabled);
        // 当广告开关变化时执行某些操作
      }
    );

    return unsubscribe;
  }, []);
}

// ============================================================================
// 示例 6: 条件性数据收集
// ============================================================================

/**
 * 条件性数据收集示例
 */
export function useConditionalDataCollection() {
  const shouldCollectQuery = useShouldCollectData('includeQuery');
  const shouldCollectResponse = useShouldCollectData('includeResponse');
  const shouldCollectMemory = useShouldCollectData('includeMemory');

  const collect = (context: AdTriggerContext) => {
    const data: Record<string, unknown> = {};

    // 只收集配置允许的数据
    if (shouldCollectQuery) {
      data.query = context.query;
    }

    if (shouldCollectResponse && context.response) {
      data.response = context.response;
    }

    if (shouldCollectMemory && context.memory) {
      data.memory = context.memory;
    }

    return data;
  };

  return { collect };
}

// ============================================================================
// 示例 7: 配置验证
// ============================================================================

/**
 * 配置验证示例
 */
export function useConfigValidator() {
  const validateCurrentConfig = () => {
    const config = useAdConfigStore.getState();
    const result = validateAdConfig(config);

    if (result.success) {
      console.log('[Config Validator] Config is valid');
      return { valid: true, errors: [] };
    } else {
      console.error('[Config Validator] Config is invalid:', result.error);
      return {
        valid: false,
        errors: result.error.errors.map((e) => ({
          path: e.path.join('.'),
          message: e.message,
        })),
      };
    }
  };

  return { validateCurrentConfig };
}
