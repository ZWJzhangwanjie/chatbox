/**
 * AI Ad Network Frontend SDK 类型定义
 *
 * SDK 没有提供官方类型定义，这里根据 README 和代码创建类型
 */

export {}

declare module '@ai-ad-network/frontend-sdk' {
  import type { CSSProperties, ReactNode } from 'react'

  // ============================================================================
  // SDK 配置类型
  // ============================================================================

  export interface AdProviderConfig {
    /** API 基础 URL */
    apiBaseUrl?: string
    /** API 密钥 (格式: ak_tenant_key) */
    apiKey?: string
    /** 默认广告格式 */
    defaultFormats?: string[]
    /** 默认展示位置 */
    defaultPlacement?: string
    /** 是否启用广告 */
    enabled?: boolean
    /** 调试模式 */
    debug?: boolean
    /** 自定义请求头 */
    headers?: Record<string, string>
    /** 请求超时（毫秒） */
    timeout?: number
    /** 最大重试次数 */
    maxRetries?: number
    /** 用户ID */
    userId?: string
  }

  // ============================================================================
  // 广告数据类型
  // ============================================================================

  export interface Ad {
    /** 广告ID */
    id: string
    /** 广告类型 */
    type: string
    /** 相关性分数 */
    score?: number
    /** 广告来源 */
    source?: 'internal' | 'external'
    /** 广告内容 */
    content: Record<string, unknown>
    /** 追踪信息 */
    tracking?: {
      clickUrl?: string
      impressionUrl?: string
    }
    /** 元数据 */
    metadata?: {
      category?: string
      ecpm?: number
    }
  }

  export interface AdIntent {
    /** 意图类型 */
    type: string
    /** 置信度 */
    confidence: number
    /** 意图描述 */
    description?: string
  }

  export interface AdRouting {
    /** 路由到的广告位 */
    placement: string
    /** 优先级 */
    priority: number
  }

  export interface UseAiAdsResult {
    /** 广告列表 */
    ads: Ad[]
    /** 意图分析结果 */
    intent: AdIntent | null
    /** 路由信息 */
    routing: AdRouting | null
    /** 是否正在加载 */
    isLoading: boolean
    /** 错误信息 */
    error: Error | null
    /** 重新获取 */
    refetch: () => void
  }

  export interface UseAiAdsOptions {
    /** 指定广告格式 */
    formats?: string[]
    /** 广告展示位置 */
    placement?: string
    /** 是否启用 */
    enabled?: boolean
  }

  // ============================================================================
  // 组件 Props 类型
  // ============================================================================

  export interface AdProviderProps {
    /** 配置 */
    config: AdProviderConfig
    /** 子组件 */
    children: ReactNode
  }

  export interface ActionCardAdProps {
    /** 广告数据 */
    ad: Ad
    /** 自定义类名 */
    className?: string
    /** 点击事件 */
    onClick?: (ad: Ad) => void
    /** 展示事件 */
    onImpression?: (ad: Ad) => void
    /** 视觉变体 */
    variant?: 'horizontal' | 'vertical' | 'compact'
  }

  export interface SuffixAdProps {
    /** 广告数据 */
    ad: Ad
    /** 自定义类名 */
    className?: string
    /** 视觉变体 */
    variant?: 'block' | 'inline' | 'minimal'
  }

  export interface FollowUpAdProps {
    /** 广告数据 */
    ad: Ad
    /** 自定义类名 */
    className?: string
    /** 点击事件 */
    onClick?: (ad: Ad) => void
    /** 视觉变体 */
    variant?: 'bubble' | 'pill' | 'underline'
  }

  export interface SponsoredSourceAdProps {
    /** 广告数据 */
    ad: Ad
    /** 自定义类名 */
    className?: string
    /** 点击事件 */
    onClick?: (ad: Ad) => void
    /** 视觉变体 */
    variant?: 'card' | 'minimal' | 'list_item'
  }

  export interface StaticAdProps {
    /** 广告数据 */
    ad: Ad
    /** 自定义类名 */
    className?: string
    /** 宽度 */
    width?: number
    /** 高度 */
    height?: number
  }

  export interface LeadGenAdProps {
    /** 广告数据 */
    ad: Ad
    /** 自定义类名 */
    className?: string
    /** 提交回调 */
    onSubmit?: (data: Record<string, string>) => void
  }

  // ============================================================================
  // SDK 导出
  // ============================================================================

  export const AdProvider: (props: AdProviderProps) => ReactNode
  export const useAiAds: (
    query: string,
    response: string,
    isFinished: boolean,
    options?: UseAiAdsOptions
  ) => UseAiAdsResult

  export const ActionCardAd: (props: ActionCardAdProps) => ReactNode
  export const SuffixAd: (props: SuffixAdProps) => ReactNode
  export const FollowUpAd: (props: FollowUpAdProps) => ReactNode
  export const SponsoredSourceAd: (props: SponsoredSourceAdProps) => ReactNode
  export const StaticAd: (props: StaticAdProps) => ReactNode
  export const LeadGenAd: (props: LeadGenAdProps) => ReactNode

  // ============================================================================
  // 默认导出
  // ============================================================================

  export default {
    AdProvider,
    useAiAds,
    ActionCardAd,
    SuffixAd,
    FollowUpAd,
    SponsoredSourceAd,
    StaticAd,
    LeadGenAd,
  }
}
