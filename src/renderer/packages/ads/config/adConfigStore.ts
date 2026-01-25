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
            enabled: true,  // 默认启用 source 格式（搜索结果广告）
            variant: 'card',
            frequency: 1,  // 每次搜索都显示（测试用）
            maxPerSession: 10,  // 会话最多显示 10 次
            mixPosition: 1,  // 插入到第 1 个位置
            showSponsoredLabel: true,
          },
          static: {
            enabled: false,
            placement: 'sidebar',
            width: 220,
            height: 100,
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

        // 🔥 关键修复：直接使用 localStorage 而不是 IndexedDB
        // 原因：
        // 1. localStorage 会触发 storage 事件，IndexedDB 不会
        // 2. 跨标签页同步需要 storage 事件
        // 3. 配置数据很小（<10KB），localStorage 完全够用
        storage: {
          getItem: async (key) => {
            try {
              console.log('[AdConfigStore] Loading config from localStorage:', key);
              let res = localStorage.getItem(key);

              if (res === null) {
                console.log('[AdConfigStore] No data in localStorage, trying IndexedDB migration...');
                try {
                  const oldData = await storage.getItem<any>(key, null);
                  if (oldData && typeof oldData === 'object') {
                    console.log('[AdConfigStore] Found data in IndexedDB, migrating to localStorage...');
                    // 迁移到正确的格式：{ state, version }
                    const migratedValue = { state: oldData, version: 1 };
                    localStorage.setItem(key, JSON.stringify(migratedValue));
                    res = JSON.stringify(migratedValue);
                    console.log('[AdConfigStore] ✅ Migration completed');
                  }
                } catch (migrationError) {
                  console.warn('[AdConfigStore] Migration from IndexedDB failed:', migrationError);
                }
              }

              if (res === null || res === undefined) {
                console.warn('[AdConfigStore] No stored config found, will use defaults');
                return null;
              }

              // 🔥 解析 Zustand persist 格式：{ state: AdConfig, version: number }
              const parsed = JSON.parse(res);
              console.log('[AdConfigStore] ✅ Parsed from localStorage:', {
                hasState: !!parsed.state,
                hasVersion: parsed.version !== undefined,
                version: parsed.version,
                suffixEnabled: parsed.state?.formats?.suffix?.enabled,
              });

              // 返回整个 parsed 对象（包含 state 和 version）
              return parsed;
            } catch (error) {
              console.error('[AdConfigStore] Failed to load config:', {
                error: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined,
                key: key,
              });
              return null;
            }
          },
          setItem: (key, value) => {
            try {
              console.log('[AdConfigStore] Saving config to localStorage:', key);

              // 🔥 关键修复：Zustand persist 传递的 value 已经是正确的格式
              // value 是 { state: AdConfig, version: number } 格式
              // 我们需要直接存储这个格式，而不是只存储 state
              console.log('[AdConfigStore] Value to save:', {
                valueType: typeof value,
                hasState: !!(value as any).state,
                hasVersion: (value as any).version !== undefined,
                suffixEnabled: (value as any).state?.formats?.suffix?.enabled,
              });

              // 直接存储 value（包含 state 和 version）
              localStorage.setItem(key, JSON.stringify(value));
              console.log('[AdConfigStore] ✅ Config saved to localStorage successfully');
            } catch (error) {
              console.error('[AdConfigStore] ❌ Failed to save config:', error);
              console.error('[AdConfigStore] Value received:', value, typeof value);
            }
          },
          removeItem: (key) => {
            try {
              console.log('[AdConfigStore] Removing config from localStorage:', key);
              localStorage.removeItem(key);
              console.log('[AdConfigStore] ✅ Config removed from localStorage');
            } catch (error) {
              console.error('[AdConfigStore] ❌ Failed to remove config:', error);
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

        // 🔥 关键修复：使用深度合并策略，同时保留方法
        // Zustand persist 默认使用浅合并，对于嵌套对象可能不完全替换
        // 注意：不能直接返回新对象，否则会破坏 immer 的 Proxy 包装
        merge: (persistedState: any, currentState: AdConfig) => {
          console.log('[AdConfigStore] 🔧 Merge function called:', {
            hasPersisted: !!persistedState,
            persistedKeys: persistedState ? Object.keys(persistedState) : [],
            persistedSuffix: persistedState?.formats?.suffix?.enabled,
          });

          // 如果没有持久化状态，返回当前状态
          if (!persistedState) {
            return currentState;
          }

          // 🔥 关键：不返回新对象，而是修改传入的 currentState
          // 这样可以保留 immer 的 Proxy 包装和方法
          // 只合并数据字段，不影响方法（函数）

          // 合并顶层字段（不包括函数）
          for (const key of Object.keys(persistedState)) {
            const value = (persistedState as any)[key];
            // 只覆盖非函数字段
            if (typeof value !== 'function') {
              (currentState as any)[key] = value;
            }
          }

          // 深度合并嵌套对象
          if (persistedState.api) {
            Object.assign(currentState.api, persistedState.api);
          }
          if (persistedState.dataCollection) {
            Object.assign(currentState.dataCollection, persistedState.dataCollection);
          }
          if (persistedState.formats) {
            for (const formatKey of Object.keys(persistedState.formats)) {
              if (currentState.formats[formatKey as keyof AdConfig['formats']] && persistedState.formats[formatKey]) {
                Object.assign(
                  currentState.formats[formatKey as keyof AdConfig['formats']],
                  persistedState.formats[formatKey]
                );
              }
            }
          }
          if (persistedState.privacy) {
            Object.assign(currentState.privacy, persistedState.privacy);
          }

          console.log('[AdConfigStore] ✅ Merge completed (returned original state):', {
            suffixEnabled: currentState.formats?.suffix?.enabled,
            hasIsEnabled: typeof currentState.isEnabled === 'function',
          });

          // 返回原始状态对象（保留 Proxy 和方法）
          return currentState;
        },
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
 * 🔧 调试辅助函数 - 在控制台中快速启用 source 广告
 *
 * 使用方法：
 * 1. 打开浏览器控制台
 * 2. 输入: enableSourceAds()
 * 3. 刷新页面并重新进行 Web 搜索
 */
export function enableSourceAds() {
  const state = useAdConfigStore.getState();
  console.log('[🔧 Debug] Current config:', {
    globalEnabled: state.enabled,
    sourceEnabled: state.formats.source?.enabled,
  });

  // 启用全局广告和 source 格式
  state.updateConfig({
    enabled: true,
  });
  state.updateFormatConfig('source', {
    enabled: true,
    frequency: 1,
    maxPerSession: 10,
    mixPosition: 1,
    showSponsoredLabel: true,
  });

  console.log('[🔧 Debug] ✅ Source ads enabled! Config:', {
    globalEnabled: state.enabled,
    sourceEnabled: state.formats.source?.enabled,
  });
}

/**
 * 🔧 调试辅助函数 - 显示当前广告配置
 */
export function showAdConfig() {
  const state = useAdConfigStore.getState();
  console.log('[🔧 Debug] Current ad config:', {
    // 全局配置
    globalEnabled: state.enabled,
    debugMode: state.debug,

    // Source 格式配置
    source: {
      enabled: state.formats.source?.enabled,
      frequency: state.formats.source?.frequency,
      maxPerSession: state.formats.source?.maxPerSession,
      mixPosition: state.formats.source?.mixPosition,
      showSponsoredLabel: state.formats.source?.showSponsoredLabel,
    },

    // 其他格式
    actionCardEnabled: state.formats.actionCard?.enabled,
    suffixEnabled: state.formats.suffix?.enabled,
  });
}

/**
 * 🔧 调试辅助函数 - 重置频率计数器
 */
export function resetAdFrequency() {
  const keys = Object.keys(sessionStorage).filter(k => k.startsWith('ads_session_count_'));
  keys.forEach(key => {
    sessionStorage.removeItem(key);
  });
  console.log('[🔧 Debug] ✅ Ad frequency counters reset. Removed keys:', keys);
  return keys.length;
}

// 将调试函数暴露到 window 对象（仅在开发模式）
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).enableSourceAds = enableSourceAds;
  (window as any).showAdConfig = showAdConfig;
  (window as any).resetAdFrequency = resetAdFrequency;
  console.log('[🔧 Debug] Ad debugging functions available:');
  console.log('  - enableSourceAds()   : 启用 source 广告');
  console.log('  - showAdConfig()      : 显示当前广告配置');
  console.log('  - resetAdFrequency()  : 重置频率计数器');
}

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

// ============================================================================
// 跨标签页配置同步
// ============================================================================

/**
 * 跨标签页配置同步监听器
 *
 * 🔥 修复：当其他标签页修改 ad-config-storage 时，当前标签页自动重新水合
 *
 * 工作原理：
 * 1. 用户在 Tab A 修改配置 → storage.setItemNow() 写入 IndexedDB
 * 2. IndexedDB 触发 'storage' 事件（仅在跨标签页时触发）
 * 3. Tab B 检测到事件 → 重新水合 store → 显示最新配置
 *
 * 注意：'storage' 事件只在同源的其他标签页才会触发，同一页面不触发
 */
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    // 只处理 ad-config-storage 的变化
    if (event.key === 'ad-config-storage') {
      console.log('[AdConfigStore] 🔔 Detected storage event:', {
        key: event.key,
        oldValue: event.oldValue ? 'exists' : 'null',
        newValue: event.newValue ? 'exists' : 'null',
        url: event.url,
      });

      // 如果新值为 null（被删除），也需要处理
      if (event.newValue === null) {
        console.warn('[AdConfigStore] Config was deleted in another tab, rehydrating with defaults');
        useAdConfigStore.persist.rehydrate();
        return;
      }

      // 解析新配置
      try {
        const parsed = JSON.parse(event.newValue);
        const newConfig = parsed.state || parsed;

        console.log('[AdConfigStore] 🔄 New config detected from another tab:', {
          enabled: newConfig.enabled,
          actionCardEnabled: newConfig.formats?.actionCard?.enabled,
          suffixEnabled: newConfig.formats?.suffix?.enabled,
          dataCollection: {
            includeFullContext: newConfig.dataCollection?.includeFullContext,
            includeMemory: newConfig.dataCollection?.includeMemory,
            includeProfile: newConfig.dataCollection?.includeProfile,
          },
        });

        // 触发重新水合，从 storage 重新加载配置
        useAdConfigStore.persist.rehydrate();

        console.log('[AdConfigStore] ✅ Cross-tab rehydration triggered');
      } catch (error) {
        console.error('[AdConfigStore] ❌ Failed to parse config from storage event:', {
          error: error instanceof Error ? error.message : String(error),
          rawValue: event.newValue?.substring(0, 200),
        });
      }
    }
  });

  console.log('[AdConfigStore] 🔗 Cross-tab sync listener registered for key: ad-config-storage');
}
