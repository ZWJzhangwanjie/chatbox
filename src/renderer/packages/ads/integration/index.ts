/**
 * SDK Integration Module
 *
 * This module provides integration with the @ai-ad-network/frontend-sdk.
 * It wraps the SDK functionality and provides a clean interface for the chatbox.
 *
 * NOTE: This is a placeholder implementation. When the actual SDK is available,
 * replace the mock implementation with real SDK imports.
 */

// ==================== Types for Ad SDK ====================

/**
 * Ad format types (from @ai-ad-network/frontend-sdk)
 */
export type AdFormat = 'source' | 'static' | 'suffix' | 'action_card' | 'followup' | 'lead_gen'

/**
 * Single ad definition
 */
export interface Ad {
  id: string
  type: AdFormat
  score?: number
  content: {
    title?: string
    body?: string
    url?: string
    link?: string
    image?: string
    ctaText?: string
    price?: string
    rating?: number
    lead_gen_fields?: Array<{
      type: 'email' | 'name' | 'company' | 'phone' | 'custom'
      placeholder: string
      required: boolean
      label?: string
    }>
  }
  tracking: {
    clickUrl: string
    impressionUrl: string
  }
}

/**
 * Slot response from SDK
 */
export interface SlotResponse {
  slotId: string
  ads: Ad[]
  metadata?: {
    reasoning?: Array<{
      reason: string
      confidence: number
    }>
  }
}

/**
 * Ad request params (matching SDK interface)
 */
export interface AdRequestParams {
  conversationContext: {
    query: string
    response?: string
    conversationHistory?: Array<{
      role: 'user' | 'assistant' | 'system'
      content: string
      timestamp?: number
    }>
  }
  userContext: {
    sessionId: string
    demographics?: {
      language?: string
      country?: string
      location?: string
    }
    profile?: any
  }
  slots: Array<{
    slotId: string
    slotName?: string
    format: AdFormat
    variant?: string
    size?: { width: number; height: number }
    count?: number
    preferences?: {
      maxTitleLength?: number
      maxBodyLength?: number
      showRating?: boolean
      showPrice?: boolean
      showSponsoredLabel?: boolean
      mixPosition?: number
      showDivider?: boolean
      fields?: Array<{
        type: 'email' | 'name' | 'company' | 'phone' | 'custom'
        placeholder: string
        required: boolean
        label?: string
      }>
    }
    placement?: {
      position?: 'above_fold' | 'below_fold'
      context?: 'pre_request' | 'post_response'
    }
  }>
}

/**
 * Ad response from SDK
 */
export interface AdResponse {
  success: boolean
  slots: SlotResponse[]
  metadata: {
    detectedStage: 'pre_request' | 'post_response' | 'unknown'
    availableContext: {
      hasQuery: boolean
      hasResponse: boolean
      hasHistory: boolean
      hasProfile: boolean
      historyLength?: number
    }
    reasoning?: string
  }
  error?: {
    code: string
    message: string
  }
}

// SDK interface placeholder
export interface AIAdNetworkSDKConfig {
  apiKey: string
  baseUrl?: string
  debug?: boolean
}

/**
 * Generate valid tracking URLs for mock ads
 *
 * Using data: URLs to avoid CORS errors during development.
 * In production, these will be replaced with real tracking URLs from the ad server.
 */
function generateMockTrackingUrls(adId: string) {
  // Use data: URLs for mock tracking to avoid CORS errors
  // These won't make actual network requests but will satisfy the interface
  const clickTrackingData = JSON.stringify({
    event: 'click',
    adId,
    timestamp: Date.now(),
  })
  const impressionTrackingData = JSON.stringify({
    event: 'impression',
    adId,
    timestamp: Date.now(),
  })

  return {
    // In production, these will be real URLs from the ad server
    // For now, use data URLs to prevent CORS errors
    clickUrl: `data:application/json;base64,${btoa(clickTrackingData)}`,
    impressionUrl: `data:application/json;base64,${btoa(impressionTrackingData)}`,
  }
}

/**
 * AIAdNetworkSDK Class
 *
 * This is a placeholder implementation. When the real SDK is available,
 * replace this with:
 * import { AIAdNetworkSDK } from '@ai-ad-network/frontend-sdk'
 */
export class AIAdNetworkSDK {
  private config: AIAdNetworkSDKConfig

  constructor(config: AIAdNetworkSDKConfig) {
    this.config = config

    if (this.config.debug) {
      console.log('[Ads SDK] Initialized with config:', {
        apiKey: config.apiKey ? '***' : 'none',
        baseUrl: config.baseUrl,
      })
    }
  }

  /**
   * Main fetchAds method
   *
   * Implements the unified ad API interface as specified in ads-plugin/v2/UNIFIED_AD_API_DESIGN.md
   *
   * Request structure:
   * - conversationContext: { query, response?, conversationHistory? }
   * - userContext: { sessionId, demographics?, profile? }
   * - slots: Array of { slotId, format, variant, count, preferences, placement }
   *
   * Response structure:
   * - success: boolean
   * - slots: Array of { slotId, ads[], metadata? }
   * - metadata: { detectedStage, availableContext, reasoning }
   *
   * When the real SDK is available, this will delegate to the actual SDK.
   */
  async fetchAds(params: any): Promise<any> {
    const query = params.conversationContext?.query || ''
    const hasResponse = !!params.conversationContext?.response
    const hasHistory = !!(params.conversationContext?.conversationHistory?.length)

    if (this.config.debug) {
      console.log('[Ads SDK] fetchAds called', {
        query: query.substring(0, 50),
        slotsCount: params.slots?.length,
        hasResponse,
        hasHistory,
        stage: hasResponse ? 'post_response' : 'pre_request',
      })
    }

    // Determine which formats can be returned based on context completeness
    const contextScore = {
      hasQuery: !!query,
      hasResponse,
      hasHistory,
      hasProfile: !!params.userContext?.profile,
    }

    // Process each slot according to its format and context availability
    const slotResponses = (params.slots || []).map((slot: any) => {
      const ads = this.fillSlot(slot, contextScore, query, params.conversationContext)

      return {
        slotId: slot.slotId,
        ads,
        metadata: {
          reasoning: ads.length > 0
            ? [{ reason: `Context sufficient for ${slot.format} format`, confidence: 0.9 }]
            : [{ reason: this.getInsufficientContextReason(slot.format, contextScore), confidence: 0 }],
        },
      }
    })

    return {
      success: true,
      slots: slotResponses,
      metadata: {
        detectedStage: hasResponse ? 'post_response' : 'pre_request',
        availableContext: {
          hasQuery: contextScore.hasQuery,
          hasResponse: contextScore.hasResponse,
          hasHistory: contextScore.hasHistory,
          hasProfile: contextScore.hasProfile,
          historyLength: params.conversationContext?.conversationHistory?.length || 0,
        },
        reasoning: `Mock SDK: Detected ${hasResponse ? 'post_response' : 'pre_request'} stage`,
      },
    }
  }

  /**
   * Fill a slot with ads based on format and context availability
   *
   * Format requirements:
   * - source, static: Only need query (pre_request stage)
   * - suffix, action_card, followup, lead_gen: Need query + response (post_response stage)
   */
  private fillSlot(slot: any, contextScore: any, query: string, conversationContext: any): any[] {
    const { format, count = 1, preferences } = slot

    // Check if format can be returned in current context
    if (!this.canFillFormat(format, contextScore)) {
      return []
    }

    // Generate mock ads for this slot
    const ads: any[] = []

    for (let i = 0; i < count; i++) {
      const adId = `mock-${format}-${Date.now()}-${i}`
      const trackingUrls = generateMockTrackingUrls(adId)

      const ad = this.generateMockAd(format, query, adId, trackingUrls, preferences)
      ads.push(ad)
    }

    return ads
  }

  /**
   * Check if a format can be returned in the current context
   */
  private canFillFormat(format: string, contextScore: any): boolean {
    // source and static only need query
    if (format === 'source' || format === 'static') {
      return contextScore.hasQuery
    }

    // Other formats need query + response
    return contextScore.hasQuery && contextScore.hasResponse
  }

  /**
   * Get explanation for why a format couldn't be filled
   */
  private getInsufficientContextReason(format: string, contextScore: any): string {
    if (format === 'source' || format === 'static') {
      if (!contextScore.hasQuery) return 'Missing query'
    }

    if (!contextScore.hasQuery) return 'Missing query'
    if (!contextScore.hasResponse) return 'Missing response'

    return 'Insufficient context'
  }

  /**
   * Generate a mock ad for the given format
   */
  private generateMockAd(format: string, query: string, adId: string, trackingUrls: any, preferences?: any): any {
    const baseAd = {
      id: adId,
      type: format,
      score: 0.85,
      tracking: trackingUrls,
    }

    switch (format) {
      case 'source':
        return {
          ...baseAd,
          content: {
            title: '测试广告 - AI助手推荐',
            body: '这是一个测试广告，用于展示 source 格式广告在搜索结果中的显示效果。',
            url: 'https://example.com/test-ad',
            link: 'https://example.com/test-ad',
          },
        }

      case 'static':
        return {
          ...baseAd,
          content: {
            title: '测试横幅广告',
            body: '这是一个静态横幅广告',
            image: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjI1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZThlOGU4Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtc2l6ZT0iMTYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGRvbWluYW50LWJhc2VsaW5lPSJtaWRkbGUiPueahOebrueUn+eCueaRhDwvdGV4dD48L3N2Zz4=',
            link: 'https://example.com/banner',
          },
        }

      case 'suffix':
        return {
          ...baseAd,
          content: {
            title: `顺便说一句，关于"${query.substring(0, 20)}"的相关内容也值得关注。`,
            body: '这是一个测试后缀广告',
          },
        }

      case 'action_card':
        return {
          ...baseAd,
          content: {
            title: '推荐产品',
            body: '这是一个测试行动卡片广告',
            image: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjBmMGYwIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtc2l6ZT0iMTgiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGRvbWluYW50LWJhc2VsaW5lPSJtaWRkbGUiPuaApyAg5piO6L+U5LqMPC90ZXh0Pjwvc3ZnPg==',
            price: '$99.99',
            rating: 4.5,
            ctaText: '了解更多',
          },
        }

      case 'followup':
        return {
          ...baseAd,
          content: {
            title: `想了解更多关于"${query.substring(0, 15)}"的信息吗？`,
            body: '点击查看更多',
          },
        }

      case 'lead_gen':
        return {
          ...baseAd,
          content: {
            title: '订阅我们的资讯',
            body: '获取最新产品信息',
            lead_gen_fields: [
              { type: 'email', placeholder: 'your@email.com', required: true },
            ],
          },
        }

      default:
        return baseAd
    }
  }
}

// Global SDK instance
let sdkInstance: AIAdNetworkSDK | null = null

/**
 * Get SDK instance (singleton)
 */
export function getSDK(config?: AIAdNetworkSDKConfig): AIAdNetworkSDK | null {
  if (sdkInstance) {
    return sdkInstance
  }

  if (!config) {
    console.warn('[Ads Integration] SDK config not provided')
    return null
  }

  try {
    sdkInstance = new AIAdNetworkSDK(config)
    return sdkInstance
  } catch (error) {
    console.error('[Ads Integration] Failed to initialize SDK:', error)
    return null
  }
}

/**
 * Reset SDK instance (for config updates)
 */
export function resetSDK() {
  sdkInstance = null
}

/**
 * Check if SDK is available and configured
 */
export function isSDKAvailable(): boolean {
  return sdkInstance !== null
}
