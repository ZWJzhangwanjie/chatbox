/**
 * SDK ClientInfo 适配器
 *
 * 从 @ai-ad-network/frontend-sdk 获取 ClientInfo
 * 并适配到现有系统的数据结构
 *
 * SDK 版本: 1.0.7+
 * 文档: https://github.com/ai-ad-network/frontend-sdk
 */

// ============================================================================
// 类型定义
// ============================================================================

/**
 * SDK Device Info (OpenRTB 2.5/2.6 标准)
 */
export interface SdkDeviceInfo {
  ua?: string;           // User Agent
  os: string;            // 操作系统
  osv: string;           // OS 版本
  devicetype: number;    // 设备类型 (1=mobile, 2=tablet, 3=PC/desktop)
  model?: string;        // 设备型号
  language: string;      // 系统语言
}

/**
 * SDK User Info
 */
export interface SdkUserInfo {
  id: string;            // 唯一用户 ID (持久化)
  language: string;      // 用户语言
}

/**
 * SDK App Info
 */
export interface SdkAppInfo {
  bundle: string;        // 应用包名/域名
  name: string;          // 应用名称
  ver: string;           // 版本号
  publisher: {
    id?: string;         // 发布商 ID
    domain: string;      // 域名
  };
}

/**
 * SDK Geo Info
 */
export interface SdkGeoInfo {
  country?: string;      // 国家代码 (ISO 3166-1 alpha-2)
  language?: string;     // 语言代码 (ISO 639-1)
}

/**
 * 完整的 SDK ClientInfo
 */
export interface SdkClientInfo {
  device: SdkDeviceInfo;
  user: SdkUserInfo;
  app: SdkAppInfo;
  geo?: SdkGeoInfo;
}

/**
 * ClientInfo 采集选项
 */
export interface ClientInfoOptions {
  /** 启用地理位置采集 */
  enableGeo?: boolean;
  /** 启用设备信息采集 */
  enableDevice?: boolean;
  /** 启用用户信息采集 */
  enableUser?: boolean;
  /** 自定义用户 ID */
  customUserId?: string;
}

/**
 * ClientInfo 采集结果
 */
export interface ClientInfoResult {
  /** ClientInfo 数据 */
  clientInfo: SdkClientInfo | null;
  /** 是否成功 */
  success: boolean;
  /** 错误信息 */
  error?: string;
  /** 采集时间戳 */
  timestamp: number;
}

// ============================================================================
// SDK 模块类型
// ============================================================================

/**
 * SDK 模块导出类型
 */
interface SdkModule {
  /** 便捷函数：获取完整 ClientInfo */
  getClientInfo?: () => SdkClientInfo | null;
  /** 便捷函数：获取用户 ID */
  getUserId?: () => string;
  /** 便捷函数：获取设备信息 */
  getDeviceInfo?: () => SdkDeviceInfo | null;
  /** 便捷函数：获取用户信息 */
  getUserInfo?: () => SdkUserInfo | null;
  /** 便捷函数：获取应用信息 */
  getAppInfo?: () => SdkAppInfo | null;
  /** 便捷函数：获取地理位置信息 */
  getGeoInfo?: () => SdkGeoInfo | null;
  /** 便捷函数：获取 JSON 字符串 */
  getClientInfoJSON?: (options?: ClientInfoOptions) => string;
  /** 便捷函数：获取可读摘要 */
  getClientInfoSummary?: () => string;
  /** 便捷函数：清除缓存 */
  clearClientInfoCache?: () => void;
  /** 获取采集器实例 */
  getClientInfoCollector?: () => {
    collect: (options?: ClientInfoOptions) => SdkClientInfo | null;
    clearCache: () => void;
  };
}

// ============================================================================
// ClientInfo 适配器
// ============================================================================

/**
 * SDK ClientInfo 适配器类
 *
 * 提供统一的接口访问 SDK 的 ClientInfo 功能
 * 自动处理 SDK 加载、降级等逻辑
 */
export class ClientInfoAdapter {
  private sdkModule: SdkModule | null = null;
  private sdkLoaded: boolean = false;
  private loadError: Error | null = null;
  private cache: SdkClientInfo | null = null;
  private cacheTime: number = 0;
  private readonly CACHE_TTL = 60000; // 1 分钟缓存

  constructor() {
    this.initialize();
  }

  /**
   * 初始化 SDK 模块
   */
  private async initialize(): Promise<void> {
    if (this.sdkLoaded) return;

    try {
      // 动态导入 SDK
      this.sdkModule = await import('@ai-ad-network/frontend-sdk');
      this.sdkLoaded = true;

      // 验证 SDK 功能
      const hasClientInfoAPI = !!(
        this.sdkModule.getClientInfo ||
        this.sdkModule.getClientInfoCollector
      );

      if (!hasClientInfoAPI) {
        console.warn('[ClientInfoAdapter] SDK loaded but ClientInfo API not available');
      } else {
        console.log('[ClientInfoAdapter] SDK ClientInfo API available');
      }
    } catch (error) {
      this.loadError = error instanceof Error ? error : new Error(String(error));
      this.sdkLoaded = true;
      console.warn('[ClientInfoAdapter] Failed to load SDK:', this.loadError);
    }
  }

  /**
   * 获取 SDK ClientInfo
   *
   * @param options - 采集选项
   * @param forceRefresh - 是否强制刷新缓存
   * @returns ClientInfo 采集结果
   */
  async getClientInfo(
    options?: ClientInfoOptions,
    forceRefresh = false
  ): Promise<ClientInfoResult> {
    const now = Date.now();

    // 检查缓存
    if (!forceRefresh && this.cache && (now - this.cacheTime) < this.CACHE_TTL) {
      return {
        clientInfo: this.cache,
        success: true,
        timestamp: this.cacheTime,
      };
    }

    // 确保 SDK 已加载
    if (!this.sdkLoaded) {
      await this.initialize();
    }

    let clientInfo: SdkClientInfo | null = null;

    try {
      // 方式 1: 使用便捷函数
      if (this.sdkModule?.getClientInfo) {
        clientInfo = this.sdkModule.getClientInfo();
        console.log('[ClientInfoAdapter] Collected via getClientInfo()', {
          hasDevice: !!clientInfo?.device,
          hasApp: !!clientInfo?.app,
          hasUser: !!clientInfo?.user,
          hasGeo: !!clientInfo?.geo,
        });
      }
      // 方式 2: 使用采集器
      else if (this.sdkModule?.getClientInfoCollector) {
        const collector = this.sdkModule.getClientInfoCollector();
        clientInfo = collector.collect(options);
        console.log('[ClientInfoAdapter] Collected via collector.collect()', {
          hasDevice: !!clientInfo?.device,
          hasApp: !!clientInfo?.app,
          hasUser: !!clientInfo?.user,
          hasGeo: !!clientInfo?.geo,
        });
      }
      // 方式 3: 手动组装
      else if (this.sdkModule) {
        console.log('[ClientInfoAdapter] Assembling from individual functions...');
        const device = this.sdkModule.getDeviceInfo?.();
        const user = this.sdkModule.getUserInfo?.();
        const app = this.sdkModule.getAppInfo?.();
        const geo = this.sdkModule.getGeoInfo?.();

        if (device && user && app) {
          clientInfo = { device, user, app, geo: geo || undefined };
          console.log('[ClientInfoAdapter] Assembled from individual functions');
        }
      }

      // 更新缓存
      if (clientInfo) {
        this.cache = clientInfo;
        this.cacheTime = now;

        return {
          clientInfo,
          success: true,
          timestamp: now,
        };
      }

      // SDK 加载成功但没有可用的 API
      return {
        clientInfo: null,
        success: false,
        error: 'SDK loaded but ClientInfo API not available',
        timestamp: now,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('[ClientInfoAdapter] Error collecting ClientInfo:', error);

      return {
        clientInfo: null,
        success: false,
        error: errorMessage,
        timestamp: now,
      };
    }
  }

  /**
   * 获取用户 ID
   *
   * @returns 用户 ID 或 null
   */
  async getUserId(): Promise<string | null> {
    try {
      if (!this.sdkLoaded) {
        await this.initialize();
      }

      if (this.sdkModule?.getUserId) {
        const userId = this.sdkModule.getUserId();
        console.log('[ClientInfoAdapter] Got user ID:', userId?.substring(0, 8) + '...');
        return userId;
      }

      // 从 ClientInfo 中提取
      const result = await this.getClientInfo();
      return result.clientInfo?.user?.id || null;
    } catch (error) {
      console.warn('[ClientInfoAdapter] Failed to get user ID:', error);
      return null;
    }
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.cache = null;
    this.cacheTime = 0;
    console.log('[ClientInfoAdapter] Local cache cleared');

    // 同时清除 SDK 的缓存
    if (this.sdkModule?.clearClientInfoCache) {
      this.sdkModule.clearClientInfoCache();
      console.log('[ClientInfoAdapter] SDK cache cleared');
    }
  }

  /**
   * 检查 SDK 是否可用
   */
  isAvailable(): boolean {
    return !!(
      this.sdkModule &&
      (this.sdkModule.getClientInfo ||
        this.sdkModule.getClientInfoCollector)
    );
  }

  /**
   * 获取 SDK 加载状态
   */
  getStatus(): {
    loaded: boolean;
    available: boolean;
    error: Error | null;
    hasCache: boolean;
  } {
    return {
      loaded: this.sdkLoaded,
      available: this.isAvailable(),
      error: this.loadError,
      hasCache: !!this.cache,
    };
  }
}

// ============================================================================
// 单例
// ============================================================================

let adapterInstance: ClientInfoAdapter | null = null;

/**
 * 获取 ClientInfo 适配器单例
 */
export function getClientInfoAdapter(): ClientInfoAdapter {
  if (!adapterInstance) {
    adapterInstance = new ClientInfoAdapter();
  }
  return adapterInstance;
}

// ============================================================================
// 便捷函数
// ============================================================================

/**
 * 获取 SDK ClientInfo
 *
 * @param options - 采集选项
 * @param forceRefresh - 是否强制刷新缓存
 * @returns ClientInfo 或 null
 */
export async function getSdkClientInfo(
  options?: ClientInfoOptions,
  forceRefresh = false
): Promise<SdkClientInfo | null> {
  const adapter = getClientInfoAdapter();
  const result = await adapter.getClientInfo(options, forceRefresh);
  return result.clientInfo;
}

/**
 * 获取 SDK 用户 ID
 *
 * @returns 用户 ID 或 null
 */
export async function getSdkUserId(): Promise<string | null> {
  const adapter = getClientInfoAdapter();
  return adapter.getUserId();
}

/**
 * 清除 SDK ClientInfo 缓存
 */
export async function clearSdkClientInfoCache(): Promise<void> {
  const adapter = getClientInfoAdapter();
  adapter.clearCache();
}

/**
 * 获取 SDK 状态
 */
export function getSdkClientInfoStatus() {
  const adapter = getClientInfoAdapter();
  return adapter.getStatus();
}

// ============================================================================
// 默认导出
// ============================================================================

export default ClientInfoAdapter;
