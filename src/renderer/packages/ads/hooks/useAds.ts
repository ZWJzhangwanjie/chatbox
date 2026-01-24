/**
 * AI Ad Network - 统一广告数据 Hook
 *
 * 在 MessageList 层级统一获取所有广告格式，避免重复请求
 *
 * 核心思路：
 * 1. 每个 context 只发送一次 API 请求
 * 2. 请求包含所有启用的广告格式
 * 3. 各个 AdSlot 组件从缓存中读取数据
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { useAdConfigStore } from '../config/adConfigStore'
import { AdController } from '../core/AdController'
import type { Ad, AdTriggerContext } from '../core/types'
import type { FetchAdsOptions } from '../core/AdController'

// 新增：配置事件管理器
import { AdConfigEventManager } from '../core/AdConfigEventManager'
import type { ConfigChangeEvent } from '../core/AdConfigEventManager'

// ============================================================================
// 类型定义
// ============================================================================

interface AdsCacheEntry {
  ads: Ad[]
  timestamp: number
  isMock: boolean
}

interface UseAdsResult {
  /** 获取指定格式的广告 */
  getAds: (format: string) => Ad[]
  /** 所有广告 */
  allAds: Ad[]
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
 * 包含 sessionId、messageCount、query 和启用的格式信息
 * 这样当配置改变时，缓存键也会变化，确保使用新配置请求数据
 */
function generateCacheKey(context: AdTriggerContext, config: any): string {
  const sessionId = context.conversationContext?.sessionId || 'default'
  const messageCount = context.conversationContext?.messageCount || 0
  // 只使用 query 的前 50 个字符，不使用 response（因为 response 会在生成过程中变化）
  const query = context.currentMessage.query.substring(0, 50)

  // 获取启用的格式列表（作为缓存键的一部分）
  const enabledFormats = [
    config.formats.actionCard.enabled ? 'actionCard' : '',
    config.formats.suffix.enabled ? 'suffix' : '',
    config.formats.followup.enabled ? 'followup' : '',
    config.formats.source.enabled ? 'source' : '',
    config.formats.static.enabled ? 'static' : '',
    config.formats.leadGen.enabled ? 'leadGen' : '',
  ].filter(Boolean).sort().join(',')

  const key = `${sessionId}_${messageCount}_${query}_${enabledFormats}`.replace(/\s+/g, '_')
  console.log('[🔑 generateCacheKey]', {
    sessionId,
    messageCount,
    query: query.substring(0, 30),
    enabledFormats,
    fullKey: key,
  })
  return key
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
 * 在 MessageList 层级使用，统一获取所有启用的广告格式
 *
 * @param context - 广告触发上下文
 * @returns 广告数据和操作方法
 *
 * @example
 * ```tsx
 * function MessageList({ messages, sessionId }) {
 *   const context = buildAdContext(messages)
 *   const { getAds, isLoading } = useAds(context)
 *
 *   return messages.map(msg => (
 *     <Message key={msg.id}>
 *       {msg.content}
 *       <SuffixSlot />
 *       <ActionCardSlot />
 *     </Message>
 *   ))
 * }
 * ```
 */
export function useAds(context?: AdTriggerContext): UseAdsResult {
  const config = useAdConfigStore()
  const [isLoading, setIsLoading] = useState(false)
  const [isError, setIsError] = useState(false)
  const [allAds, setAllAds] = useState<Ad[]>([])

  // 调试日志：allAds 变化
  console.log('[🔄 useAds RENDER]', {
    hasContext: !!context,
    allAdsCount: allAds.length,
    allAdsTypes: allAds.map(ad => ad.type),
  })

  const cacheKeyRef = useRef<string | null>(null)
  const hasFetchedRef = useRef(false)

  /**
   * 获取指定格式的广告
   */
  const getAds = useCallback((format: string): Ad[] => {
    console.log('[📦 useAds.getAds]', { format, totalAds: allAds.length })

    // 支持多种格式名称的映射
    const formatAliases: Record<string, string[]> = {
      actionCard: ['action_card', 'actionCard'],
      suffix: ['suffix'],
      followUp: ['followup', 'followUp'],
      source: ['source', 'sponsoredSource'],
      leadGen: ['lead_gen', 'leadGen'],
      static: ['static'],
    }

    // 获取该格式的所有别名
    const aliases = Object.entries(formatAliases).find(([key]) => key === format)?.[1] || [format]

    // 使用别名过滤
    return allAds.filter(ad => aliases.includes(ad.type))
  }, [allAds])

  /**
   * 刷新广告
   */
  const refresh = useCallback(async () => {
    if (!context) {
      console.log('[❌ useAds.refresh] No context')
      return
    }

    console.log('[🔄 useAds.refresh] Refreshing ads...')
    setIsLoading(true)
    setIsError(false)

    try {
      const controller = getController(config)
      const result = await controller.fetchAds(context, {
        skipFrequencyCheck: config.debug,
      })

      setAllAds(result.ads)

      // 更新缓存
      const key = generateCacheKey(context, config)
      adsCache.set(key, {
        ads: result.ads,
        timestamp: Date.now(),
        isMock: result.isMock,
      })

      console.log('[✅ useAds.refresh] Refreshed', {
        adsCount: result.ads.length,
        isMock: result.isMock,
      })
    } catch (error) {
      console.error('[❌ useAds.refresh] Error:', error)
      setIsError(true)
    } finally {
      setIsLoading(false)
    }
  }, [context, config])

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
    console.log('[=====USEADS_START=====]', {
      hasContext: !!context,
      enabled: config.enabled,
      query: context?.currentMessage?.query?.substring(0, 50),
    })

    if (!context) {
      console.log('[=====USEADS_NO_CONTEXT=====]')
      return
    }

    const cacheKey = generateCacheKey(context, config)
    cacheKeyRef.current = cacheKey

    // 检查缓存
    const cached = adsCache.get(cacheKey)
    console.log('[=====USEADS_CACHE_CHECK=====]', {
      cacheKey,
      hasCached: !!cached,
      cacheValid: cached ? isCacheValid(cached) : false,
      cachedAdsCount: cached?.ads.length || 0,
      cacheAge: cached ? Date.now() - cached.timestamp : 0,
      allCacheKeys: Array.from(adsCache.keys()),
    })

    if (cached && isCacheValid(cached)) {
      console.log('[=====USEADS_USING_CACHE=====]', {
        adsCount: cached.ads.length,
        age: Date.now() - cached.timestamp,
      })
      setAllAds(cached.ads)
      hasFetchedRef.current = true
      return
    }

    // 没有缓存或缓存过期，发送请求
    console.log('[=====USEADS_FETCHING=====]', {
      cacheKey,
      hasCached: !!cached,
      cacheValid: cached ? isCacheValid(cached) : false,
    })

    const fetchController = new AbortController()
    const timeoutId = setTimeout(() => fetchController.abort(), 30000) // 30 秒超时

    const fetchAds = async () => {
      setIsLoading(true)
      setIsError(false)

      try {
        const controller = getController(config)
        const result = await controller.fetchAds(context, {
          skipFrequencyCheck: config.debug,
        })

        setAllAds(result.ads)

        console.log('[=====USEADS_SET_ALLADS=====]', {
          adsCount: result.ads.length,
          types: result.ads.map(ad => ad.type),
        })

        // 更新缓存
        adsCache.set(cacheKey, {
          ads: result.ads,
          timestamp: Date.now(),
          isMock: result.isMock,
        })

        console.log('[💾 useAds] Cache SET', {
          cacheKey,
          adsCount: result.ads.length,
          totalCacheKeys: adsCache.size,
          allKeys: Array.from(adsCache.keys()),
        })

        hasFetchedRef.current = true

        console.log('[=====USEADS_FETCH_SUCCESS=====]', {
          adsCount: result.ads.length,
          isMock: result.isMock,
          formats: result.ads.map(ad => ad.type),
          ads: result.ads.map(ad => ({ id: ad.id, type: ad.type, score: ad.score })),
        })
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          console.log('[⏱️ useAds] Request timeout')
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
  }, [context, config])

  return {
    getAds,
    allAds,
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
export { clearAllAdsCache }
