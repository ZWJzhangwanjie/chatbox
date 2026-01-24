/**
 * AI Ad Network - 广告配置 Store
 *
 * 使用 Zustand v5 + persist 中间件
 * 管理广告系统配置状态，支持持久化存储
 *
 * @see adConfigSchema.ts - 配置 Schema 定义
 */

import { create } from 'zustand';
import { persist, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { WritableDraft } from 'immer';
import storage from '@/storage';
import type { AdConfig } from './adConfigSchema';
import { defaultAdConfig } from './defaultConfig';

// ============================================================================
// Store 状态定义
// ============================================================================

interface AdConfigState extends AdConfig {
  // ========== 状态查询 ==========
  /** 检查广告系统是否启用 */
  isEnabled: () => boolean;
  /** 检查调试模式是否启用 */
  isDebugMode: () => boolean;
  /** 获取当前启用的广告格式列表 */
  getActiveFormats: () => string[];
  /** 检查指定格式是否启用 */
  isFormatEnabled: (format: keyof AdConfig['formats']) => boolean;

  // ========== 配置更新 ==========
  /** 更新配置 */
  updateConfig: (updates: Partial<AdConfig>) => void;
  /** 重置为默认配置 */
  resetConfig: () => void;
  /** 切换广告系统开关 */
  toggleEnabled: () => void;

  // ========== API 配置 ==========
  /** 更新 API 配置 */
  updateApiConfig: (config: Partial<AdConfig['api']>) => void;

  // ========== 数据收集配置 ==========
  /** 更新数据收集配置 */
  updateDataCollectionConfig: (config: Partial<AdConfig['dataCollection']>) => void;

  // ========== 格式配置 ==========
  /** 更新指定格式的配置 */
  updateFormatConfig: (
    format: keyof AdConfig['formats'],
    config: Partial<AdConfig['formats'][keyof AdConfig['formats']]>
  ) => void;
  /** 切换指定格式的启用状态 */
  toggleFormat: (format: keyof AdConfig['formats']) => void;

  // ========== 隐私配置 ==========
  /** 更新隐私配置 */
  updatePrivacyConfig: (config: Partial<AdConfig['privacy']>) => void;
}

// ============================================================================
// Store 创建
// ============================================================================

/**
 * 广告配置 Store
 *
 * 使用说明：
 * ```tsx
 * // 在组件中使用
 * const config = useAdConfigStore(state => state.api);
 * const updateConfig = useAdConfigStore(state => state.updateConfig);
 *
 * // 使用便捷 hooks
 * const apiConfig = useAdConfig(); // 从 hooks/useAdConfig.ts
 * ```
 */
export const useAdConfigStore = create<AdConfigState>()(
  subscribeWithSelector(
    persist(
      immer((set, get) => ({
        // ========== 初始状态 ==========
        // 注意：不要在这里展开 defaultAdConfig，让 persist 从存储中恢复
        // 如果存储中没有数据，persist 会使用这个初始值
        enabled: true,
        debug: true,
        api: {
          baseUrl: 'http://localhost:3000/api/v1',
          apiKey: '',
          timeout: 50000,
          useMock: false,
        },
        dataCollection: {
          includeQuery: true,
          includeResponse: true,
          includeFullContext: false,
          includeMemory: false,
          includeProfile: false,
          contextWindow: 10,
          enableAnonymization: true,
        },
        formats: {
          actionCard: {
            enabled: true,
            variant: 'horizontal',
            placement: 'post_response',
            frequency: 3,
            maxPerSession: 5,
            showRating: true,
            showPrice: true,
          },
          suffix: {
            enabled: false,
            variant: 'block',
            placement: 'block',
            frequency: 5,
            maxPerSession: 3,
            showDivider: true,
          },
          followup: {
            enabled: false,
            variant: 'bubble',
            placement: 'inline_questions',
            frequency: 5,
            maxPerSession: 3,
            mixPosition: 2,
          },
          source: {
            enabled: false,
            variant: 'card',
            frequency: 5,
            maxPerSession: 3,
            mixPosition: 1,
            showSponsoredLabel: true,
          },
          static: {
            enabled: false,
            placement: 'sidebar',
            width: 300,
            height: 250,
            refreshInterval: 0,
            dismissible: true,
          },
          leadGen: {
            enabled: false,
            placement: 'post_response',
            frequency: 10,
            maxPerSession: 1,
            fields: [
              {
                type: 'email',
                required: true,
                placeholder: 'your@email.com',
              },
              {
                type: 'name',
                required: false,
                placeholder: 'Your name',
              },
            ],
          },
        },
        privacy: {
          enabled: true,
          requireConsent: true,
          dataRetentionDays: 0,
          allowedDataTypes: ['query', 'response'],
        },

        // ========== 状态查询 ==========
        isEnabled: () => get().enabled,

        isDebugMode: () => get().debug,

        getActiveFormats: () => {
          const formats = get().formats;
          return Object.entries(formats)
            .filter(([_, config]) => config.enabled)
            .map(([format]) => format);
        },

        isFormatEnabled: (format) => {
          return get().formats[format]?.enabled ?? false;
        },

        // ========== 配置更新 ==========
        updateConfig: (updates) => set((state) => {
          Object.assign(state, updates);

          // 使用事件管理器通知配置变更（替代循环导入）
          import('../core/AdConfigEventManager').then(({ AdConfigEventManager }) => {
            AdConfigEventManager.getInstance().emit({
              type: 'update',
              config: state as AdConfig,
              timestamp: Date.now(),
              changes: updates,
            });
          });
        }),

        resetConfig: () => set((state) => {
          Object.assign(state, defaultAdConfig);
        }),

        toggleEnabled: () => set((state) => {
          state.enabled = !state.enabled;
        }),

        // ========== API 配置 ==========
        updateApiConfig: (config) => set((state) => {
          Object.assign(state.api, config);
        }),

        // ========== 数据收集配置 ==========
        updateDataCollectionConfig: (config) => set((state) => {
          Object.assign(state.dataCollection, config);
        }),

        // ========== 格式配置 ==========
        updateFormatConfig: (format, config) => set((state) => {
          const formatConfig = state.formats[format];
          if (formatConfig) {
            Object.assign(formatConfig, config);
          }
        }),

        toggleFormat: (format) => set((state) => {
          const formatConfig = state.formats[format];
          if (formatConfig) {
            formatConfig.enabled = !formatConfig.enabled;
          }
        }),

        // ========== 隐私配置 ==========
        updatePrivacyConfig: (config) => set((state) => {
          Object.assign(state.privacy, config);
        }),
      })),
      {
        // ========== 持久化配置 ==========
        name: 'ad-config-storage',

        // 使用项目的 storage 封装
        storage: {
          getItem: async (key) => {
            try {
              console.log('[AdConfigStore] Loading config from storage:', key);
              const res = await storage.getItem<any>(key, null);
              console.log('[AdConfigStore] Storage result:', res);
              if (res && typeof res === 'object') {
                // 直接返回状态对象
                return JSON.stringify(res);
              }
              return res ? JSON.stringify(res) : null;
            } catch (error) {
              console.error('[AdConfigStore] Failed to load config:', error);
              return null;
            }
          },
          setItem: async (key, value) => {
            try {
              console.log('[AdConfigStore] Saving config to storage:', key);
              let stateToSave: AdConfig;

              // value 可能是字符串或对象
              if (typeof value === 'string') {
                // Zustand persist 传递的格式: { state: {...}, version: N }
                const parsed = JSON.parse(value) as { state: AdConfig; version?: number };
                stateToSave = parsed.state;
              } else if (value && typeof value === 'object') {
                // 如果已经是对象，直接使用
                stateToSave = (value as any).state || value;
              } else {
                throw new Error('Invalid value type: ' + typeof value);
              }

              console.log('[AdConfigStore] Saving state:', {
                enabled: stateToSave.enabled,
                actionCardEnabled: stateToSave.formats?.actionCard?.enabled,
                suffixEnabled: stateToSave.formats?.suffix?.enabled,
              });
              await storage.setItem(key, stateToSave);
              console.log('[AdConfigStore] Config saved successfully');
            } catch (error) {
              console.error('[AdConfigStore] Failed to save config:', error);
              console.error('[AdConfigStore] Value received:', value, typeof value);
            }
          },
          removeItem: async (key) => {
            try {
              console.log('[AdConfigStore] Removing config from storage:', key);
              await storage.removeItem(key);
            } catch (error) {
              console.error('[AdConfigStore] Failed to remove config:', error);
            }
          },
        },

        // 版本管理（用于未来迁移）
        version: 1,

        // 不跳过初始化时的水合，让配置能正确加载
        skipHydration: false,

        // 水合完成后的回调
        onRehydrateStorage: () => (state) => {
          console.log('[AdConfigStore] Rehydration completed, state:', {
            enabled: state?.enabled,
            actionCardEnabled: state?.formats?.actionCard?.enabled,
            suffixEnabled: state?.formats?.suffix?.enabled,
          });
        },

        // 部分持久化（可以选择不持久化某些字段）
        // partialize: (state) => ({
        //   enabled: state.enabled,
        //   api: state.api,
        //   // ...
        // }),
      }
    )
  )
);

// ============================================================================
// Store 初始化
// ============================================================================

let _initPromise: Promise<void> | undefined;

/**
 * 初始化广告配置 Store
 *
 * 在应用启动时调用，确保配置已从存储中加载
 *
 * @returns 初始化完成的 Promise
 */
export const initAdConfigStore = async (): Promise<void> => {
  if (!_initPromise) {
    _initPromise = new Promise<void>((resolve) => {
      const unsub = useAdConfigStore.persist.onFinishHydration(() => {
        unsub();
        console.log('[AdConfigStore] Hydration completed');
        resolve();
      });
      useAdConfigStore.persist.rehydrate();
    });
  }
  return _initPromise;
};

// ============================================================================
// 订阅辅助函数
// ============================================================================

/**
 * 订阅配置变化
 *
 * @param listener 变化监听器
 * @returns 取消订阅函数
 */
export function subscribeToConfigChanges(
  listener: (config: AdConfig) => void
): () => void {
  return useAdConfigStore.subscribe((state) => {
    listener(state);
  });
}

/**
 * 订阅指定格式的配置变化
 *
 * @param format 广告格式
 * @param listener 变化监听器
 * @returns 取消订阅函数
 */
export function subscribeToFormatChanges<T extends keyof AdConfig['formats']>(
  format: T,
  listener: (config: AdConfig['formats'][T]) => void
): () => void {
  return useAdConfigStore.subscribe(
    (state) => state.formats[format],
    (config) => listener(config)
  );
}

/**
 * 订阅广告系统开关变化
 *
 * @param listener 变化监听器
 * @returns 取消订阅函数
 */
export function subscribeToEnabledChanges(
  listener: (enabled: boolean) => void
): () => void {
  return useAdConfigStore.subscribe(
    (state) => state.enabled,
    (enabled) => listener(enabled)
  );
}
