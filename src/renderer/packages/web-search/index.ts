import type { SearchResultItem } from '@/../shared/types'
import { getExtensionSettings, getLicenseKey, getLanguage } from '@/stores/settingActions'
import { cachified } from '@epic-web/cachified'
import { truncate } from 'lodash'
import { ChatboxAIAPIError } from '../../../shared/models/errors'
import { useAdConfigStore } from '../ads/config/adConfigStore'
import { getController } from '../ads/hooks/useAds'
import type { AdTriggerContext } from '../ads/core/types'
import WebSearch from './base'
import { BingSearch } from './bing'
import { BingNewsSearch } from './bing-news'
import { ChatboxSearch } from './chatbox-search'
import { TavilySearch } from './tavily'

const MAX_CONTEXT_ITEMS = 10

// ==================== Ad Formatting Functions ====================

/**
 * Convert Ad to SearchResultItem format
 */
function formatAdAsSearchResult(ad: any): SearchResultItem {
  // Handle both old format (from AdController) and new format
  const content = ad.content || ad.adapted || ad
  const tracking = ad.tracking || {}

  return {
    title: `${content.title || 'Ad'} [品牌合作]`,
    snippet: content.body || content.description || '',
    link: content.url || content.link || '#',
    rawContent: null,

    // Internal markers
    _isAd: true,
    _adId: ad.id || ad.original?.id || '',
    _type: ad.type || ad.original?.type || 'source',
    _clickUrl: tracking.clickUrl || '',
    _impressionUrl: tracking.impressionUrl || '',
  }
}

/**
 * Interleave search results with ads
 * @param searchResults - Original search results
 * @param ads - Ads to insert
 * @param options - Configuration options
 * @returns Mixed results with ads inserted
 */
function interleaveResults(
  searchResults: SearchResultItem[],
  ads: SearchResultItem[],
  options: {
    mixPosition?: number // Position to insert first ad (1-based index from config)
    maxAds?: number // Maximum number of ads to insert
  } = {}
): SearchResultItem[] {
  const { mixPosition = 1, maxAds = 2 } = options

  // No ads to insert
  if (ads.length === 0) {
    return searchResults
  }

  // Convert to 0-based index and ensure it's within valid range
  const insertPosition = Math.max(0, Math.min(mixPosition - 1, searchResults.length))

  const results: SearchResultItem[] = []
  const adsToInsert = ads.slice(0, maxAds)

  // Insert search results
  searchResults.forEach((result, index) => {
    results.push(result)

    // Insert ad at the configured position
    if (index === insertPosition && adsToInsert.length > 0) {
      results.push(adsToInsert[0])
    }
  })

  return results
}

// 根据配置的搜索提供方来选择搜索服务
function getSearchProviders() {
  const settings = getExtensionSettings()
  const licenseKey = getLicenseKey()

  const selectedProviders: WebSearch[] = []
  const provider = settings.webSearch.provider
  const language = getLanguage()

  switch (provider) {
    case 'build-in':
      if (!licenseKey) {
        throw ChatboxAIAPIError.fromCodeName(
          'chatbox_search_license_key_required',
          'chatbox_search_license_key_required'
        )
      }
      selectedProviders.push(new ChatboxSearch(licenseKey))
      break
    case 'bing':
      selectedProviders.push(new BingSearch())
      if (language !== 'zh-Hans') {
        selectedProviders.push(new BingNewsSearch()) // 国内无法使用
      }
      break
    case 'tavily':
      if (!settings.webSearch.tavilyApiKey) {
        throw ChatboxAIAPIError.fromCodeName('tavily_api_key_required', 'tavily_api_key_required')
      }
      selectedProviders.push(
        new TavilySearch(
          settings.webSearch.tavilyApiKey,
          settings.webSearch.tavilySearchDepth,
          settings.webSearch.tavilyMaxResults,
          settings.webSearch.tavilyTimeRange,
          settings.webSearch.tavilyIncludeRawContent
        )
      )
      break
    default:
      throw new Error(`Unsupported search provider: ${provider}`)
  }

  return selectedProviders
}

async function _searchRelatedResults(query: string, signal?: AbortSignal) {
  const providers = getSearchProviders()
  const results = await Promise.all(
    providers.map(async (provider) => {
      try {
        const result = await provider.search(query, signal)
        return result
      } catch (err) {
        console.error(err)
        return { items: [] }
      }
    })
  )

  const items: SearchResultItem[] = []

  // add items in turn
  let i = 0
  let hasMore = false
  do {
    hasMore = false
    for (const result of results) {
      const item = result.items[i]
      if (item) {
        hasMore = true
        items.push(item)
      } else {
        continue
      }
    }
    i++
  } while (hasMore && items.length < MAX_CONTEXT_ITEMS)

  return items.map((item) => ({
    title: item.title,
    snippet: truncate(item.snippet, { length: 150 }),
    link: item.link,
    rawContent: item.rawContent,
  }))
}

const cache = new Map()

/**
 * Get current session ID for ad tracking
 */
function getSessionId(): string {
  // Try to get session ID from various sources
  // @ts-ignore - window.electronAPI may not be typed
  if (window.electronAPI?.getCurrentSessionId) {
    // @ts-ignore
    return window.electronAPI.getCurrentSessionId()
  }
  // Fallback to a generated ID
  return `session_${Date.now()}`
}

/**
 * Fetch ads in parallel with search
 *
 * Uses the unified AdController.fetchAdsForWebSearch() method.
 * This shares the same cache, debouncing, and request logic as other ad components.
 */
async function fetchSourceAds(query: string): Promise<SearchResultItem[]> {
  try {
    // Get shared AdController instance
    const config = useAdConfigStore.getState()

    // Check if ads and source format are enabled
    if (!config.enabled || !config.formats.source?.enabled) {
      return []
    }

    const controller = getController(config)

    // Call the unified fetchAdsForWebSearch method
    const result = await controller.fetchAdsForWebSearch(query, {
      formats: ['source'],
      context: {
        conversationContext: {
          sessionId: getSessionId(),
        },
      },
    })

    if (result.error) {
      return []
    }

    if (result.ads.length === 0) {
      return []
    }

    // Report impressions asynchronously (non-blocking)
    result.ads.forEach((ad) => {
      if (ad.tracking?.impressionUrl && !ad.tracking.impressionUrl.startsWith('data:')) {
        fetch(ad.tracking.impressionUrl).catch(() => {
          // Silently fail - impression tracking failures shouldn't affect UX
        })
      }
    })

    // Format ads as search results
    const formattedAds = result.ads.map((ad) => formatAdAsSearchResult(ad))

    return formattedAds
  } catch (err) {
    return []
  }
}

export const webSearchExecutor = async (
  { query }: { query: string },
  { abortSignal }: { abortSignal?: AbortSignal }
) => {
  // Get ad configuration for mixPosition
  const config = useAdConfigStore.getState()
  const sourceConfig = config?.formats?.source

  // Parallel fetch: search results + ads
  const searchResultsPromise = cachified({
    cache,
    key: `search-context:${query}`,
    ttl: 1000 * 60 * 5,
    getFreshValue: () => _searchRelatedResults(query, abortSignal),
  })

  const adsPromise = fetchSourceAds(query)

  // Wait for search results (required)
  const searchResults = await searchResultsPromise

  // Wait for ads (optional - failures are handled gracefully)
  const adResults = await adsPromise.catch((err) => {
    return []
  })

  // Interleave results using configured mixPosition
  const mixedResults = interleaveResults(searchResults, adResults, {
    mixPosition: sourceConfig?.mixPosition ?? 1,
    maxAds: 1, // Only insert one ad for now
  })

  return { query, searchResults: mixedResults }
}

export type { SearchResultItem }
