/**
 * AI Ad Network - 配置相关 React Hooks
 *
 * 提供便捷的配置读取和更新 hooks
 * 这些 hooks 基于 adConfigStore 实现，提供更友好的 API
 */

import { useAdConfigStore } from '../config/adConfigStore';
import type { AdConfig, AdFormat, AdPlacement } from '../index';

// ============================================================================
// 基础配置 Hooks
// ============================================================================

/**
 * 获取完整的广告配置
 *
 * @returns 完整的 AdConfig 对象
 *
 * @example
 * const config = useAdConfig();
 * console.log(config.enabled);
 */
export function useAdConfig(): AdConfig {
  return useAdConfigStore((state) => state);
}

/**
 * 获取配置更新函数
 *
 * @returns 更新配置的函数
 *
 * @example
 * const updateConfig = useAdConfigUpdater();
 * updateConfig({ enabled: true });
 */
export function useAdConfigUpdater(): (updates: Partial<AdConfig>) => void {
  return useAdConfigStore((state) => state.updateConfig);
}

/**
 * 检查广告系统是否启用
 *
 * @returns 是否启用
 *
 * @example
 * const isAdEnabled = useIsAdEnabled();
 * if (isAdEnabled) {
 *   // 显示广告相关UI
 * }
 */
export function useIsAdEnabled(): boolean {
  return useAdConfigStore((state) => state.isEnabled());
}

/**
 * 检查调试模式是否启用
 *
 * @returns 是否在调试模式
 *
 * @example
 * const isDebug = useIsDebugMode();
 * if (isDebug) {
 *   console.log('Ad config:', useAdConfig());
 * }
 */
export function useIsDebugMode(): boolean {
  return useAdConfigStore((state) => state.isDebugMode());
}

// ============================================================================
// API 配置 Hooks
// ============================================================================

/**
 * 获取 API 配置
 *
 * @returns API 配置对象
 *
 * @example
 * const apiConfig = useApiConfig();
 * console.log(apiConfig.baseUrl);
 */
export function useApiConfig() {
  return useAdConfigStore((state) => state.api);
}

/**
 * 检查 API 配置是否有效
 *
 * @returns API 配置是否有效（baseUrl 和 apiKey 都已配置）
 *
 * @example
 * const isApiConfigured = useIsApiConfigured();
 * if (!isApiConfigured) {
 *   // 提示用户配置 API
 * }
 */
export function useIsApiConfigured(): boolean {
  const apiConfig = useApiConfig();
  return !!(apiConfig.baseUrl && apiConfig.apiKey);
}

/**
 * 检查是否使用 Mock 模式
 *
 * @returns 是否使用 Mock 模式
 *
 * @example
 * const useMock = useUseMockMode();
 * if (useMock) {
 *   console.log('Using mock data');
 * }
 */
export function useUseMockMode(): boolean {
  return useAdConfigStore((state) => state.api.useMock);
}

// ============================================================================
// 数据收集配置 Hooks
// ============================================================================

/**
 * 获取数据收集配置
 *
 * @returns 数据收集配置对象
 *
 * @example
 * const dataCollection = useDataCollectionConfig();
 * console.log(dataCollection.includeQuery);
 */
export function useDataCollectionConfig() {
  return useAdConfigStore((state) => state.dataCollection);
}

/**
 * 检查是否应该收集指定类型的数据
 *
 * @param dataType 数据类型
 * @returns 是否应该收集
 *
 * @example
 * const shouldCollectQuery = useShouldCollectData('query');
 * const shouldCollectMemory = useShouldCollectData('memory');
 */
export function useShouldCollectData(dataType: keyof AdConfig['dataCollection']): boolean {
  const config = useDataCollectionConfig();
  const privacyAllowed = useAdConfigStore((state) =>
    state.privacy.allowedDataTypes.includes(dataType as any)
  );
  return config[dataType] === true && privacyAllowed;
}

// ============================================================================
// 广告格式配置 Hooks
// ============================================================================

/**
 * 获取当前启用的广告格式列表
 *
 * @returns 启用的格式名称数组
 *
 * @example
 * const activeFormats = useActiveFormats();
 * console.log(activeFormats); // ['action_card', 'suffix']
 */
export function useActiveFormats(): AdFormat[] {
  return useAdConfigStore((state) => state.getActiveFormats()) as AdFormat[];
}

/**
 * 检查指定格式是否启用
 *
 * @param format 广告格式
 * @returns 是否启用
 *
 * @example
 * const isActionCardEnabled = useIsFormatEnabled('action_card');
 */
export function useIsFormatEnabled(format: keyof AdConfig['formats']): boolean {
  return useAdConfigStore((state) => state.isFormatEnabled(format));
}

/**
 * 获取指定格式的配置
 *
 * @param format 广告格式
 * @returns 该格式的配置对象
 *
 * @example
 * const actionCardConfig = useFormatConfig('actionCard');
 * console.log(actionCardConfig.variant);
 */
export function useFormatConfig<T extends keyof AdConfig['formats']>(format: T) {
  return useAdConfigStore((state) => state.formats[format]);
}

/**
 * 获取所有广告格式的配置
 *
 * @returns 所有格式的配置对象
 *
 * @example
 * const allFormats = useAllFormatsConfig();
 * console.log(allFormats.actionCard.enabled);
 */
export function useAllFormatsConfig() {
  return useAdConfigStore((state) => state.formats);
}

/**
 * 切换广告格式的启用状态
 *
 * @returns 切换函数
 *
 * @example
 * const toggleFormat = useToggleFormat();
 * toggleFormat('actionCard'); // 切换 action_card 的启用状态
 */
export function useToggleFormat(): (format: keyof AdConfig['formats']) => void {
  return useAdConfigStore((state) => state.toggleFormat);
}

// ============================================================================
// 隐私配置 Hooks
// ============================================================================

/**
 * 获取隐私配置
 *
 * @returns 隐私配置对象
 *
 * @example
 * const privacy = usePrivacyConfig();
 * console.log(privacy.enabled);
 */
export function usePrivacyConfig() {
  return useAdConfigStore((state) => state.privacy);
}

/**
 * 检查隐私保护是否启用
 *
 * @returns 是否启用隐私保护
 *
 * @example
 * const privacyEnabled = useIsPrivacyEnabled();
 */
export function useIsPrivacyEnabled(): boolean {
  return useAdConfigStore((state) => state.privacy.enabled);
}

/**
 * 检查是否需要用户同意
 *
 * @returns 是否需要用户同意
 *
 * @example
 * const needConsent = useNeedConsent();
 */
export function useNeedConsent(): boolean {
  return useAdConfigStore((state) => state.privacy.requireConsent);
}

// ============================================================================
// 组合 Hooks
// ============================================================================

/**
 * 广告系统准备就绪检查
 *
 * 检查广告系统是否准备好展示广告：
 * 1. 广告系统已启用
 * 2. API 已配置
 * 3. 至少有一种格式已启用
 *
 * @returns 是否准备就绪
 *
 * @example
 * const ready = useAdSystemReady();
 * if (ready) {
 *   // 可以触发广告请求
 * }
 */
export function useAdSystemReady(): boolean {
  const enabled = useIsAdEnabled();
  const apiConfigured = useIsApiConfigured();
  const activeFormats = useActiveFormats();

  return enabled && apiConfigured && activeFormats.length > 0;
}

/**
 * 获取广告系统状态摘要
 *
 * @returns 状态摘要对象
 *
 * @example
 * const status = useAdSystemStatus();
 * console.log(status);
 * // {
 * //   enabled: true,
 * //   apiConfigured: true,
 * //   activeFormats: ['action_card'],
 * //   debugMode: false
 * // }
 */
export function useAdSystemStatus() {
  const enabled = useIsAdEnabled();
  const apiConfigured = useIsApiConfigured();
  const activeFormats = useActiveFormats();
  const debugMode = useIsDebugMode();
  const useMock = useUseMockMode();
  const privacyEnabled = useIsPrivacyEnabled();

  return {
    enabled,
    apiConfigured,
    activeFormats,
    activeFormatCount: activeFormats.length,
    debugMode,
    useMock,
    privacyEnabled,
    ready: enabled && apiConfigured && activeFormats.length > 0,
  };
}

// ============================================================================
// 操作 Hooks
// ============================================================================

/**
 * 切换广告系统开关
 *
 * @returns 切换函数
 *
 * @example
 * const toggleAds = useToggleAds();
 * <button onClick={toggleAds}>
 *   {isEnabled ? 'Disable Ads' : 'Enable Ads'}
 * </button>
 */
export function useToggleAds(): () => void {
  return useAdConfigStore((state) => state.toggleEnabled);
}

/**
 * 重置广告配置为默认值
 *
 * @returns 重置函数
 *
 * @example
 * const resetConfig = useResetAdConfig();
 * <button onClick={resetConfig}>Reset to Defaults</button>
 */
export function useResetAdConfig(): () => void {
  return useAdConfigStore((state) => state.resetConfig);
}

/**
 * 更新 API 配置
 *
 * @returns 更新函数
 *
 * @example
 * const updateApiConfig = useUpdateApiConfig();
 * updateApiConfig({ apiKey: 'new-key' });
 */
export function useUpdateApiConfig() {
  return useAdConfigStore((state) => state.updateApiConfig);
}

/**
 * 更新数据收集配置
 *
 * @returns 更新函数
 *
 * @example
 * const updateDataCollection = useUpdateDataCollectionConfig();
 * updateDataCollection({ includeMemory: true });
 */
export function useUpdateDataCollectionConfig() {
  return useAdConfigStore((state) => state.updateDataCollectionConfig);
}

/**
 * 更新指定格式的配置
 *
 * @returns 更新函数
 *
 * @example
 * const updateFormat = useUpdateFormatConfig();
 * updateFormat('actionCard', { frequency: 5 });
 */
export function useUpdateFormatConfig() {
  return useAdConfigStore((state) => state.updateFormatConfig);
}

/**
 * 更新隐私配置
 *
 * @returns 更新函数
 *
 * @example
 * const updatePrivacy = useUpdatePrivacyConfig();
 * updatePrivacy({ requireConsent: false });
 */
export function useUpdatePrivacyConfig() {
  return useAdConfigStore((state) => state.updatePrivacyConfig);
}

// ============================================================================
// 默认导出
// ============================================================================

export default {
  // 基础配置
  useAdConfig,
  useAdConfigUpdater,
  useIsAdEnabled,
  useIsDebugMode,

  // API 配置
  useApiConfig,
  useIsApiConfigured,
  useUseMockMode,

  // 数据收集
  useDataCollectionConfig,
  useShouldCollectData,

  // 格式配置
  useActiveFormats,
  useIsFormatEnabled,
  useFormatConfig,
  useAllFormatsConfig,
  useToggleFormat,

  // 隐私配置
  usePrivacyConfig,
  useIsPrivacyEnabled,
  useNeedConsent,

  // 组合
  useAdSystemReady,
  useAdSystemStatus,

  // 操作
  useToggleAds,
  useResetAdConfig,
  useUpdateApiConfig,
  useUpdateDataCollectionConfig,
  useUpdateFormatConfig,
  useUpdatePrivacyConfig,
};
