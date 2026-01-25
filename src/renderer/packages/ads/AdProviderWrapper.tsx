/**
 * AI Ad Network - AdProvider 包装组件
 *
 * 这个组件负责：
 * 1. 从 adConfigStore 动态读取配置
 * 2. 配置 AdProvider
 * 3. 处理配置更新时的 Provider 重渲染
 *
 * 使用方式：
 * 在 __root.tsx 中包裹应用：
 * ```tsx
 * <AdProviderWrapper>
 *   <Root />
 * </AdProviderWrapper>
 * ```
 */

import { useEffect, useMemo, useState } from 'react';
import { useAdConfigStore } from './config/adConfigStore';
import platform from '@/platform';
import { getMemoryCache } from './core/MemoryCache';

// ============================================================================
// 类型定义
// ============================================================================

/**
 * AdProvider 配置接口
 * 根据 @ai-ad-network/frontend-sdk 的 AdProvider props 定义
 */
interface AdProviderConfig {
  /** API 基础 URL */
  apiBaseUrl: string;
  /** API 密钥 */
  apiKey: string;
  /** 是否启用广告 */
  enabled?: boolean;
  /** 默认广告格式 */
  defaultFormats?: string[];
  /** 请求超时时间（毫秒） */
  timeout?: number;
  /** 是否启用调试模式 */
  debug?: boolean;
  /** 是否使用 Mock 模式 */
  useMock?: boolean;
  /**
   * 应用上下文信息（JSON 对象）
   * SDK 将此对象传递给后端，后端根据需要解析使用
   */
  context?: Record<string, unknown>;
}

// ============================================================================
// SDK 加载状态管理
// ============================================================================

let AdProviderModule: typeof import('@ai-ad-network/frontend-sdk') | null = null;
let SDKLoadPromise: Promise<typeof import('@ai-ad-network/frontend-sdk')> | null = null;

/**
 * 动态加载 SDK
 *
 * 使用动态导入是为了：
 * 1. 避免在 SDK 未安装时构建失败
 * 2. 支持按需加载
 */
async function loadSDK() {
  if (AdProviderModule) {
    return AdProviderModule;
  }

  if (SDKLoadPromise) {
    return SDKLoadPromise;
  }

  SDKLoadPromise = import('@ai-ad-network/frontend-sdk')
    .then((module) => {
      AdProviderModule = module;
      return module;
    })
    .catch((error) => {
      console.error('[AdProviderWrapper] Failed to load @ai-ad-network/frontend-sdk:', error);
      throw error;
    });

  return SDKLoadPromise;
}

// ============================================================================
// AdProvider 包装组件
// ============================================================================

interface AdProviderWrapperProps {
  children: React.ReactNode;
}

/**
 * AdProvider 包装组件
 *
 * 职责：
 * - 从 store 读取配置
 * - 动态加载 SDK
 * - 获取设备信息
 * - 渲染 AdProvider（如果 SDK 可用）
 * - 处理配置变化
 */
export function AdProviderWrapper({ children }: AdProviderWrapperProps) {
  const config = useAdConfigStore((state) => state);
  const enabled = useAdConfigStore((state) => state.enabled);

  // 设备信息状态
  const [deviceInfo, setDeviceInfo] = useState<{
    userId?: string;
    appVersion?: string;
    platform?: string;
  }>({});

  // 挂载时初始化 store 和获取设备信息
  useEffect(() => {
    // 动态导入 initAdConfigStore 以避免循环依赖
    import('./config/adConfigStore').then(({ initAdConfigStore }) => {
      initAdConfigStore().catch((error) => {
        console.error('[AdProviderWrapper] Failed to initialize ad config store:', error);
      });
    });

    // 初始化记忆缓存：立即触发一次加载
    const memoryCache = getMemoryCache();
    memoryCache.refresh().catch((err) => {
      console.warn('[AdProviderWrapper] 初始记忆加载失败:', err);
    });

    // 每30秒自动刷新记忆缓存
    const refreshInterval = setInterval(() => {
      memoryCache.refresh().catch((err) => {
        console.warn('[AdProviderWrapper] 定期记忆刷新失败:', err);
      });
    }, 30000);

    // 获取设备信息（用户ID、应用版本等）
    Promise.all([
      platform.getConfig().then((cfg) => cfg.uuid).catch(() => undefined),
      platform.getVersion().catch(() => undefined),
      platform.getPlatform().catch(() => undefined),
    ])
      .then(([uuid, version, platformType]) => {
        setDeviceInfo({
          userId: uuid,
          appVersion: version,
          platform: platformType,
        });
        if (config.debug) {
          console.log('[AdProviderWrapper] Device info:', { uuid, version, platformType });
        }
      })
      .catch((error) => {
        console.warn('[AdProviderWrapper] Failed to get device info:', error);
      });

    // 清理函数
    return () => {
      clearInterval(refreshInterval);
    };
  }, []);

  // 动态加载 SDK 组件
  const [AdProviderComponent, setAdProviderComponent] = useState<React.ComponentType<{
    config: AdProviderConfig;
    children: React.ReactNode;
  }> | null>(null);

  useEffect(() => {
    if (!enabled && !config.debug) {
      // 如果广告未启用且不在调试模式，不加载 SDK
      setAdProviderComponent(null);
      return;
    }

    loadSDK()
      .then((module) => {
        setAdProviderComponent(() => module.AdProvider);
      })
      .catch((error) => {
        console.error('[AdProviderWrapper] Failed to load SDK:', error);
        // SDK 加载失败时，不影响应用正常运行，只是不显示广告
        setAdProviderComponent(null);
      });
  }, [enabled, config.debug]);

  // 构建传递给 AdProvider 的配置
  const providerConfig = useMemo<AdProviderConfig>(() => {
    const activeFormats = Object.entries(config.formats)
      .filter(([_, formatConfig]) => formatConfig.enabled)
      .map(([format]) => format);

    // 构建应用上下文对象，统一传递所有设备/应用信息
    const appContext: Record<string, unknown> = {
      // 用户标识
      userId: deviceInfo.userId,
      deviceId: deviceInfo.userId, // 兼容字段

      // 应用信息
      app: {
        name: 'chatbox',
        version: deviceInfo.appVersion,
        type: 'desktop', // Chatbox 是桌面应用
      },

      // 平台信息
      platform: {
        type: deviceInfo.platform,
      },

      // 环境信息
      environment: config.debug ? 'development' : 'production',
    };

    return {
      apiBaseUrl: config.api.baseUrl,
      apiKey: config.api.apiKey,
      enabled: config.enabled,
      defaultFormats: activeFormats.length > 0 ? activeFormats : undefined,
      timeout: config.api.timeout,
      debug: config.debug,
      useMock: config.api.useMock,
      // 统一传递上下文对象
      context: appContext,
    };
  }, [config, deviceInfo]);

  // 如果 SDK 未加载或广告未启用，直接渲染 children
  if (!AdProviderComponent || !enabled) {
    return <>{children}</>;
  }

  // 渲染 AdProvider
  return (
    <AdProviderComponent config={providerConfig}>
      {children}
    </AdProviderComponent>
  );
}

// ============================================================================
// 导出
// ============================================================================

export default AdProviderWrapper;
