/**
 * AI Ad Network - 统一广告数据 Hook
 *
 * 核心思路：
 * 1. 调用方通过 formats 参数指定需要的广告格式
 * 2. Hook 自动与配置取交集，只请求启用的格式
 * 3. 按 formats 组合生成缓存键，支持不同场景独立缓存
 *
 * @example
 * ```tsx
 * // MessageList: 只获取 action_card 和 suffix
 * useAds(context, { formats: ['action_card', 'suffix'] })
 *
 * // Sidebar: 只获取 static
 * useAds(context, { formats: ['static'] })
 *
 * // Web Search: 只获取 source
 * useAds(context, { formats: ['source'] })
 * ```
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAdConfigStore } from '../config/adConfigStore'
import { AdController } from '../core/AdController'
import type { Ad, AdTriggerContext, SlotResponse } from '../core/types'
import type { FetchAdsOptions } from '../core/AdController'
import type { AdConfig } from '../config/adConfigSchema'
import { isAdFormatMatch, getAdFormatAliases } from '../utils/adFormatUtils'

// 新增：配置事件管理器
import { AdConfigEventManager } from '../core/AdConfigEventManager'
import type { ConfigChangeEvent } from '../core/AdConfigEventManager'

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 广告格式类型
 */
export type AdFormatType =
  | 'action_card'
  | 'suffix'
  | 'followup'
  | 'source'
  | 'static'
  | 'lead_gen'

/**
 * useAds Hook 选项
 */
export interface UseAdsOptions {
  /** 要获取的广告格式（必填） */
  formats: AdFormatType[]
  /** 是否跳过频率检查（调试用，可选） */
  skipFrequencyCheck?: boolean
  /** 广告位置（可选） */
  placement?: string
}

interface AdsCacheEntry {
  ads: Ad[]
  slots?: SlotResponse[]
  timestamp: number
  isMock: boolean
  getAdsBySlot?: (slotId: string) => Ad[]
  getSlot?: (slotId: string) => SlotResponse | undefined
}

interface UseAdsResult {
  /** 获取指定格式的广告 */
  getAds: (format: string) => Ad[]
  /** 所有广告 */
  allAds: Ad[]
  /** Slot 原始响应 */
  slots?: SlotResponse[]
  /** 按 slotId 获取广告的便捷方法 */
  getAdsBySlot?: (slotId: string) => Ad[]
  /** 获取 slot 原始数据的便捷方法 */
  getSlot?: (slotId: string) => SlotResponse | undefined
  /** 是否正在加载 */
  isLoading: boolean
  /** 是否有错误 */
  isError: boolean
  /** 刷新广告 */
  refresh: () => Promise<void>
  /** 清除缓存 */
  clearCache: () => void
}

// ============================================================================
// 全局缓存
// ============================================================================

const adsCache = new Map<string, AdsCacheEntry>()

/**
 * 清除所有广告缓存
 * 在配置变更时调用
 */
export function clearAllAdsCache() {
  const size = adsCache.size
  adsCache.clear()
  console.log('[🗑️ useAds] Cleared all ads cache', { previousSize: size })
}

/**
 * 生成缓存键
 * 包含 sessionId、messageCount、query 和实际请求的格式信息
 * 不同 formats 组合会生成不同的缓存键，支持独立缓存
 */
function generateCacheKey(
  context: AdTriggerContext,
  formats: string[]
): string {
  const sessionId = context.conversationContext?.sessionId || 'default'
  const messageCount = context.conversationContext?.messageCount || 0
  // 只使用 query 的前 50 个字符
  const query = context.currentMessage.query.substring(0, 50)

  // 使用实际请求的格式（排序后）作为缓存键的一部分
  const formatsKey = formats.sort().join(',')

  const key = `${sessionId}_${messageCount}_${query}_${formatsKey}`.replace(/\s+/g, '_')
  return key
}

/**
 * 格式名称到配置键的映射
 * 将 API 格式名（如 action_card）转换为配置键（如 actionCard）
 */
function formatToConfigKey(format: string): keyof AdConfig['formats'] {
  const map: Record<string, keyof AdConfig['formats']> = {
    'action_card': 'actionCard',
    'followup': 'followup',
    'lead_gen': 'leadGen',
  }
  return map[format] || format as keyof AdConfig['formats']
}

/**
 * 过滤出在配置中启用的格式
 * 返回请求格式与配置启用格式的交集
 */
function filterEnabledFormats(
  requestedFormats: string[],
  config: AdConfig
): string[] {
  return requestedFormats.filter(format => {
    const configKey = formatToConfigKey(format)
    return config.formats[configKey]?.enabled ?? false
  })
}

/**
 * 获取缓存的有效期（秒）
 */
const CACHE_TTL = 5 * 60 // 5 分钟

/**
 * 检查缓存是否有效
 */
function isCacheValid(entry: AdsCacheEntry): boolean {
  const now = Date.now()
  return (now - entry.timestamp) < CACHE_TTL * 1000
}

// ============================================================================
// 全局控制器
// ============================================================================

let globalController: AdController | null = null

function getController(config: ReturnType<typeof useAdConfigStore.getState>): AdController {
  if (!globalController) {
    globalController = new AdController(config as any)
  } else {
    // 每次获取控制器时更新配置，确保使用最新的设置
    globalController.updateConfig(config as any)
  }
  return globalController
}

// ============================================================================
// 配置监听器初始化
// ============================================================================

/**
 * 配置监听器清理函数
 */
let configUnsubscribe: (() => void) | null = null

/**
 * 初始化配置监听器
 * 只在首次调用时注册，避免重复订阅
 */
export function initializeConfigListener(): () => void {
  if (configUnsubscribe) {
    console.log('[useAds] Config listener already initialized')
    return configUnsubscribe
  }

  console.log('[useAds] Initializing config listener')

  configUnsubscribe = AdConfigEventManager.getInstance().subscribe(
    (event: ConfigChangeEvent) => {
      console.log('[useAds] Config changed event:', {
        type: event.type,
        timestamp: event.timestamp,
        changes: event.changes,
      })

      // 配置变化时清除所有缓存
      clearAllAdsCache()

      // 清除全局控制器的缓存（如果存在）
      if (globalController) {
        globalController.clearCache()
      }
    },
    {
      name: 'useAds-config-listener',
      // 可以在这里添加其他选项，比如只监听特定类型的事件
    }
  )

  console.log('[useAds] Config listener initialized')

  return configUnsubscribe
}

// 自动初始化配置监听器
// 使用 setTimeout 确保在模块加载后执行，避免循环依赖
setTimeout(() => {
  initializeConfigListener()
}, 0)

// ============================================================================
// Hook 实现
// ============================================================================

/**
 * 统一广告数据 Hook
 *
 * 调用方通过 formats 参数指定需要的广告格式，Hook 自动与配置取交集
 *
 * @param context - 广告触发上下文
 * @param options - 选项，必须包含 formats
 * @returns 广告数据和操作方法
 *
 * @example
 * ```tsx
 * // MessageList: 只获取 action_card 和 suffix
 * function MessageList() {
 *   const context = buildAdContext(messages)
 *   const { allAds, getAdsBySlot, isLoading } = useAds(context, {
 *     formats: ['action_card', 'suffix']
 *   })
 *   // ...
 * }
 *
 * // Sidebar: 只获取 static
 * function Sidebar() {
 *   const context = buildSidebarAdContext()
 *   const { allAds } = useAds(context, {
 *     formats: ['static']
 *   })
 *   // ...
 * }
 * ```
 */
export function useAds(
  context?: AdTriggerContext,
  options?: UseAdsOptions
): UseAdsResult {
  const config = useAdConfigStore()
  const [isLoading, setIsLoading] = useState(false)
  const [isError, setIsError] = useState(false)
  const [allAds, setAllAds] = useState<Ad[]>([])
  const [slots, setSlots] = useState<SlotResponse[]>([])
  const [getAdsBySlot, setGetAdsBySlot] = useState<(slotId: string) => Ad[]>(() => () => [])
  const [getSlot, setGetSlot] = useState<(slotId: string) => SlotResponse | undefined>(() => () => undefined)

  const cacheKeyRef = useRef<string | null>(null)
  const hasFetchedRef = useRef(false)

  // 计算实际要请求的格式（与配置取交集）
  const requestedFormats = options?.formats ?? []
  const enabledFormats = useMemo(
    () => filterEnabledFormats(requestedFormats, config),
    [requestedFormats, config]
  )

  /**
   * 获取指定格式的广告
   * 使用工具函数支持各种命名格式的兼容处理
   */
  const getAds = useCallback((format: string): Ad[] => {
    // 使用工具函数获取该格式的所有别名
    const aliases = getAdFormatAliases(format)

    // 使用工具函数进行匹配
    return allAds.filter(ad => isAdFormatMatch(ad.type, aliases))
  }, [allAds])

  /**
   * 刷新广告
   */
  const refresh = useCallback(async () => {
    // 如果没有 context 或没有启用的格式，直接返回
    if (!context || enabledFormats.length === 0) {
      return
    }

    setIsLoading(true)
    setIsError(false)

    try {
      const controller = getController(config)
      const result = await controller.fetchAds(context, {
        formats: enabledFormats,
        skipFrequencyCheck: options?.skipFrequencyCheck ?? config.debug,
        placement: options?.placement,
      })

      setAllAds(result.ads)
      setSlots(result.slots || [])
      setGetAdsBySlot(() => result.getAdsBySlot || (() => []))
      setGetSlot(() => result.getSlot || (() => undefined))

      // 更新缓存
      const key = generateCacheKey(context, enabledFormats)
      adsCache.set(key, {
        ads: result.ads,
        slots: result.slots,
        timestamp: Date.now(),
        isMock: result.isMock,
        getAdsBySlot: result.getAdsBySlot,
        getSlot: result.getSlot,
      })
    } catch (error) {
      console.error('[❌ useAds.refresh] Error:', error)
      setIsError(true)
    } finally {
      setIsLoading(false)
    }
  }, [context, config, enabledFormats, options])

  /**
   * 清除缓存
   */
  const clearCache = useCallback(() => {
    if (cacheKeyRef.current) {
      adsCache.delete(cacheKeyRef.current)
      setAllAds([])
    }
  }, [])

  // 主 effect：获取广告
  useEffect(() => {
    // 如果没有 context 或没有启用的格式，不请求
    if (!context || enabledFormats.length === 0) {
      setAllAds([])
      setSlots([])
      return
    }

    const cacheKey = generateCacheKey(context, enabledFormats)
    cacheKeyRef.current = cacheKey

    // 检查缓存
    const cached = adsCache.get(cacheKey)

    if (cached && isCacheValid(cached)) {
      setAllAds(cached.ads)
      setSlots(cached.slots || [])
      setGetAdsBySlot(() => cached.getAdsBySlot || (() => []))
      setGetSlot(() => cached.getSlot || (() => undefined))
      hasFetchedRef.current = true
      return
    }

    // 没有缓存或缓存过期，发送请求
    const fetchController = new AbortController()
    const timeoutId = setTimeout(() => fetchController.abort(), 30000) // 30 秒超时

    const fetchAds = async () => {
      setIsLoading(true)
      setIsError(false)

      try {
        const controller = getController(config)
        const result = await controller.fetchAds(context, {
          formats: enabledFormats,
          skipFrequencyCheck: options?.skipFrequencyCheck ?? config.debug,
          placement: options?.placement,
        })

        setAllAds(result.ads)
        setSlots(result.slots || [])
        setGetAdsBySlot(() => result.getAdsBySlot || (() => []))
        setGetSlot(() => result.getSlot || (() => undefined))

        // 更新缓存
        adsCache.set(cacheKey, {
          ads: result.ads,
          slots: result.slots,
          timestamp: Date.now(),
          isMock: result.isMock,
          getAdsBySlot: result.getAdsBySlot,
          getSlot: result.getSlot,
        })

        hasFetchedRef.current = true
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          console.error('[⏱️ useAds] Request timeout')
        } else {
          console.error('[❌ useAds] Error:', error)
          setIsError(true)
        }
      } finally {
        setIsLoading(false)
        clearTimeout(timeoutId)
      }
    }

    fetchAds()

    return () => {
      fetchController.abort()
      clearTimeout(timeoutId)
    }
  }, [context, config, enabledFormats, options])

  return {
    getAds,
    allAds,
    slots,
    getAdsBySlot,
    getSlot,
    isLoading,
    isError,
    refresh,
    clearCache,
  }
}

// ============================================================================
// 导出
// ============================================================================

export default useAds
export { clearAllAdsCache, getController }
export type { AdFormatType, UseAdsOptions }
