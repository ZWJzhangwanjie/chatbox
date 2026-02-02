/**
 * AI Ad Network - 广告插槽组件
 *
 * 工程师C - UI与集成专家
 *
 * AdSlot 是一个通用的广告渲染容器，负责：
 * - 根据 Ad 类型渲染对应的广告组件
 * - 处理加载状态
 * - 处理错误状态
 * - 提供统一的广告展示接口
 *
 * 现在集成真实的 @ai-ad-network/frontend-sdk 组件
 */

import { Box, Loader, Paper, Stack, Text, Alert } from '@mantine/core'
import { IconAlertCircle } from '@tabler/icons-react'
import { lazy, Suspense, memo, useMemo, useState, useEffect } from 'react'
import type { Ad, AdTriggerContext, SlotResponse } from '../core/types'
import { useAdData } from '../hooks/useAdData'
import { useAdConfig } from '../hooks/useAdConfig'
import { isAdFormatMatch, getAdFormatAliases } from '../utils/adFormatUtils'

// ============================================================================
// 动态导入 SDK 组件
// ============================================================================

// 使用 React.lazy 动态导入 SDK 组件
const SDKActionCardAd = lazy(() =>
  import('@ai-ad-network/frontend-sdk').then(m => ({ default: m.ActionCardAd }))
)
const SDKSuffixAd = lazy(() =>
  import('@ai-ad-network/frontend-sdk').then(m => ({ default: m.SuffixAd }))
)
const SDKFollowUpAd = lazy(() =>
  import('@ai-ad-network/frontend-sdk').then(m => ({ default: m.FollowUpAd }))
)
// 注意：SDK 导出的是 SponsoredSource 而不是 SponsoredSourceAd
const SDKSponsoredSourceAd = lazy(() =>
  import('@ai-ad-network/frontend-sdk').then(m => ({ default: m.SponsoredSource }))
)
const SDKStaticAd = lazy(() =>
  import('@ai-ad-network/frontend-sdk').then(m => ({ default: m.StaticAd }))
)
const SDKLeadGenAd = lazy(() =>
  import('@ai-ad-network/frontend-sdk').then(m => ({ default: m.LeadGenAd }))
)
const SDKEntityLinkAd = lazy(() =>
  import('@ai-ad-network/frontend-sdk').then(m => ({ default: m.EntityLinkAd }))
)

// ============================================================================
// 组件 Props
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
  | 'entity_link'

/**
 * AdSlot 组件 Props
 */
export interface AdSlotProps {
  /** 广告格式类型 */
  format: AdFormatType
  /** 广告展示位置（可选，用于调试） */
  placement?: string
  /** 变体（可选，用于某些广告格式的样式变体） */
  variant?: string
  /** 自定义类名 */
  className?: string
  /** 加载中回调 */
  onLoadingStart?: () => void
  /** 加载完成回调 */
  onLoadingComplete?: (ads: Ad[]) => void
  /** 错误回调 */
  onError?: (error: Error) => void
  /** 是否显示调试信息 */
  showDebug?: boolean
  /** 自定义加载组件 */
  loadingComponent?: React.ReactNode
  /** 自定义错误组件 */
  errorComponent?: React.ReactNode
  /** 自定义空状态组件 */
  emptyComponent?: React.ReactNode
  /** 指定格式的广告数据（可选，如果不提供则从 allAds 中过滤） */
  ads?: Ad[]
  /** 所有格式的广告数据（可选，如果不提供则使用 useAdData 自动获取） */
  allAds?: Ad[]
  /** 广告触发上下文（可选，如果不提供则使用默认值） */
  context?: AdTriggerContext
  /** Slot ID（新增，用于直接从 slots 获取广告） */
  slotId?: string
  /** 按 slotId 获取广告的便捷方法（新增） */
  getAdsBySlot?: (slotId: string) => Ad[]
  /** 获取 slot 原始数据的便捷方法（新增） */
  getSlot?: (slotId: string) => SlotResponse | undefined
}

// ============================================================================
// SDK 广告组件包装器
// ============================================================================

interface SDKAdWrapperProps {
  ad: Ad
  format: AdFormatType
  slotId: string  // 新增：用于 SDK 自动追踪
  variant?: string
  onClick?: (ad: Ad) => void
}

/**
 * SDK 广告组件包装器
 * 根据 format 类型选择对应的 SDK 组件
 * 添加额外的 className 以便应用 Chatbox 样式覆盖
 */
const SDKAdWrapper = memo(({ ad, format, slotId, variant, onClick }: SDKAdWrapperProps) => {
  // 获取配置
  const config = useAdConfig()

  // 添加点击处理
  const handleClick = () => {
    onClick?.(ad)
  }

  // 为每个广告组件创建一致的包装器
  const wrapperClassName = `ad-component-wrapper ad-component-wrapper-${format}`

  // 错误边界状态
  const [hasError, setHasError] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | undefined>()

  useEffect(() => {
    // 验证必需的字段
    if (!ad.content?.title) {
      console.error(`[SDKAdWrapper] Missing required field 'title' for ${format} ad`, ad)
      setHasError(true)
      setErrorMessage(`Missing required field: content.title`)
    }
  }, [ad, format])

  // 渲染错误状态
  if (hasError) {
    return (
      <Alert variant="light" color="red" icon={<IconAlertCircle size={16} />}>
        <Text size="sm">Ad rendering error: {errorMessage}</Text>
      </Alert>
    )
  }

  // 根据 format 渲染对应的 SDK 组件，传递 variant
  const adComponent = (() => {
    try {
      switch (format) {
        case 'action_card':
          return (
            <Suspense fallback={<AdLoadingSkeleton />}>
              <SDKActionCardAd ad={ad} slotId={slotId} variant={variant as any} onClick={handleClick} />
            </Suspense>
          )

        case 'suffix':
          return (
            <Suspense fallback={<AdLoadingSkeleton />}>
              <SDKSuffixAd ad={ad} slotId={slotId} variant={variant as any} />
            </Suspense>
          )

        case 'followup':
          return (
            <Suspense fallback={<AdLoadingSkeleton />}>
              <SDKFollowUpAd ad={ad} slotId={slotId} variant={variant as any} onClick={handleClick} />
            </Suspense>
          )

        case 'source':
          return (
            <Suspense fallback={<AdLoadingSkeleton />}>
              <SDKSponsoredSourceAd ad={ad} slotId={slotId} variant={variant as any} onClick={handleClick} />
            </Suspense>
          )

        case 'static':
          // 从配置中获取尺寸参数
          const staticConfig = config.formats.static
          // 使用内联样式强制覆盖SDK的默认尺寸
          const wrapperStyle = {
            '--static-ad-width': `${staticConfig.width}px`,
            '--static-ad-height': `${staticConfig.height}px`,
          } as React.CSSProperties
          return (
            <Suspense fallback={<AdLoadingSkeleton />}>
              <div style={wrapperStyle} className="static-ad-size-wrapper">
                <SDKStaticAd
                  ad={ad}
                  slotId={slotId}
                  width={staticConfig.width}
                  height={staticConfig.height}
                />
              </div>
            </Suspense>
          )

        case 'lead_gen':
          return (
            <Suspense fallback={<AdLoadingSkeleton />}>
              <SDKLeadGenAd ad={ad} slotId={slotId} />
            </Suspense>
          )

        case 'entity_link':
          return (
            <Suspense fallback={<AdLoadingSkeleton />}>
              <SDKEntityLinkAd
                ad={ad}
                slotId={slotId}
                variant={variant as any}
                onEntityClick={handleClick}
              />
            </Suspense>
          )

        default:
          console.warn(`[SDKAdWrapper] Unknown format: ${format}, using fallback`)
          return <AdFallback ad={ad} />
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.error(`[SDKAdWrapper] Error rendering ${format} ad:`, error)
      setHasError(true)
      setErrorMessage(message)
      return (
        <Alert variant="light" color="red">
          <Text size="sm">Ad render failed: {message}</Text>
        </Alert>
      )
    }
  })()

  // 用 div 包装以便应用 Chatbox 样式，传递 variant 用于样式定制
  return (
    <div className={wrapperClassName} data-variant={variant}>
      {adComponent}
    </div>
  )
})

SDKAdWrapper.displayName = 'SDKAdWrapper'

// ============================================================================
// 辅助组件
// ============================================================================

/**
 * 广告加载骨架屏
 */
function AdLoadingSkeleton() {
  return (
    <Paper
      shadow="xs"
      p="md"
      withBorder
      className="ad-loading-skeleton animate-pulse"
      style={{ backgroundColor: 'var(--mantine-color-gray-1)' }}
    >
      <Stack gap="xs">
        <Box h={16} w="60%" bg="gray.3" />
        <Box h={12} w="100%" bg="gray.2" />
        <Box h={12} w="80%" bg="gray.2" />
      </Stack>
    </Paper>
  )
}

/**
 * 广告回退组件（当 SDK 组件加载失败时使用）
 */
function AdFallback({ ad }: { ad: Ad }) {
  const content = ad.content as any

  return (
    <Paper
      shadow="xs"
      p="sm"
      withBorder
      style={{
        borderLeft: '3px solid var(--mantine-color-chatbox-brand-filled)',
        opacity: 0.8
      }}
    >
      <Text size="sm" fw={500}>广告</Text>
      {content.title && (
        <Text size="xs" c="dimmed">{content.title}</Text>
      )}
    </Paper>
  )
}

// ============================================================================
// AdSlot 主组件
// ============================================================================

/**
 * AdSlot 组件
 *
 * 通用广告插槽容器，根据 format 渲染对应的广告组件
 * 使用真实的 SDK 组件进行渲染
 *
 * @example
 * ```tsx
 * // 基本用法
 * <AdSlot format="action_card" />
 *
 * // 指定变体
 * <AdSlot format="action_card" variant="vertical" />
 *
 * // 使用外部广告数据
 * <AdSlot format="suffix" ads={adList} />
 * ```
 */
export function AdSlot({
  format,
  placement,
  variant: propVariant,
  className,
  onLoadingStart,
  onLoadingComplete,
  onError,
  showDebug = false,
  loadingComponent,
  errorComponent,
  emptyComponent,
  ads: externalAds,
  allAds,
  context: externalContext,
  slotId: externalSlotId,
  getAdsBySlot,
  getSlot,
}: AdSlotProps) {
  // 获取配置
  const config = useAdConfig()

  // 生成或使用外部提供的 slotId
  const finalSlotId = useMemo(() => {
    if (externalSlotId) {
      return externalSlotId
    }
    // 自动生成 slotId: slot-{format}-{placement}
    const placementPart = placement ? `-${placement}` : ''
    return `slot-${format}${placementPart}`
  }, [externalSlotId, format, placement])

  // 从配置中获取默认的 variant（如果没有通过 props 传递）
  const variant = useMemo(() => {
    // 如果通过 props 明确传递了 variant，使用它
    if (propVariant && propVariant !== 'default') {
      return propVariant
    }

    // 否则从配置中获取
    switch (format) {
      case 'action_card':
        return config.formats.actionCard.variant
      case 'suffix':
        return config.formats.suffix.variant
      case 'followup':
        return config.formats.followup.variant
      case 'source':
        return config.formats.source.variant
      default:
        return propVariant || 'default'
    }
  }, [propVariant, format, config])

  // 确定要显示的广告数据：
  // 新增优先级（支持 slot-based 访问）：
  // 0. 如果提供了 slotId 和 getAdsBySlot，优先使用 slotId 获取广告
  // 1. 优先使用 ads 参数（指定格式的广告）
  // 2. 其次从 allAds 中过滤出当前格式的广告
  // 3. 最后才使用 useAdData 独立获取
  const shouldUseExternalData = !!(externalAds || allAds || (externalSlotId && getAdsBySlot))

  // 使用工具函数获取该格式的所有别名（支持各种命名格式）
  const aliases = getAdFormatAliases(format)

  // 新增：使用 slotId 获取广告（如果提供了 slotId 和 getAdsBySlot）
  let adsFromSlot: Ad[] | undefined = undefined
  if (externalSlotId && getAdsBySlot && typeof getAdsBySlot === 'function') {
    try {
      adsFromSlot = getAdsBySlot(externalSlotId) || []
    } catch (error) {
      console.error('[❌ AdSlot getAdsBySlot error]:', error)
      adsFromSlot = []
    }
  }

  // 使用别名过滤（使用工具函数进行匹配）
  const adsFromAll = allAds ? allAds.filter(ad => isAdFormatMatch(ad.type, aliases)) : undefined
  const finalAds = externalAds ?? adsFromSlot ?? adsFromAll

  // 使用外部提供的 context，或创建默认的 context
  const adContext = useMemo(() => {
    if (externalContext) {
      return externalContext
    }

    // 默认 context（当没有外部提供时使用）
    return {
      currentMessage: {
        query: '',
        response: '',
        timestamp: Date.now(),
        model: 'default',
        provider: 'chatbox',
        isStreaming: false,
      },
      conversationContext: {
        sessionId: 'default',
        messageCount: 0,
        messages: [],
      },
    }
  }, [externalContext])

  // 缓存 options 对象，避免每次渲染创建新引用导致无限循环
  const useAdDataOptions = useMemo(() => ({
    formats: [format] as const,
    skipFrequencyCheck: config.debug,
  }), [format, config.debug])

  // 只有在没有提供外部数据时才使用 useAdData
  const { ads: fetchedAds, isLoading, isError, error } = useAdData(
    shouldUseExternalData ? undefined : adContext,
    shouldUseExternalData ? undefined : useAdDataOptions
  )

  // 最终使用的广告数据
  const displayAds = finalAds ?? fetchedAds

  // 回调处理
  if (onLoadingStart && isLoading) {
    onLoadingStart()
  }

  if (onLoadingComplete && !isLoading && displayAds.length > 0) {
    onLoadingComplete(displayAds)
  }

  if (onError && isError && error) {
    onError(error)
  }

  // ===== 加载状态 =====
  if (isLoading) {
    return (
      <Box className={`ad-slot ad-slot-loading ${className || ''}`}>
        {loadingComponent || (
          <Box p="md" style={{ display: 'flex', justifyContent: 'center' }}>
            <Loader size="sm" />
          </Box>
        )}
      </Box>
    )
  }

  // ===== 错误状态 =====
  if (isError) {
    return (
      <Box className={`ad-slot ad-slot-error ${className || ''}`}>
        {errorComponent || (
          <Alert variant="light" color="red" icon={<IconAlertCircle size={16} />}>
            <Text size="sm">广告加载失败</Text>
          </Alert>
        )}
      </Box>
    )
  }

  // ===== 空状态 =====
  if (displayAds.length === 0) {
    return (
      <Box className={`ad-slot ad-slot-empty ${className || ''}`}>
        {emptyComponent || null}
      </Box>
    )
  }

  // ===== 渲染广告 =====
  return (
    <Box className={`ad-slot ad-slot-${format} ${className || ''}`}>
      {showDebug && (
        <Alert variant="light" color="gray" mb="xs">
          <Text size="xs">
            [DEBUG] Format: {format}, Placement: {placement || 'N/A'},
            Ads: {displayAds.length}
          </Text>
        </Alert>
      )}

      {displayAds.map((ad, index) => (
        <SDKAdWrapper
          key={ad.id}
          ad={ad}
          format={format}
          slotId={finalSlotId}
          // 优先使用后端返回的 layout 建议，其次使用配置中的 variant
          variant={ad.suggestions?.layout || variant}
        />
      ))}
    </Box>
  )
}

// ============================================================================
// 便捷组件
// ============================================================================

/**
 * ActionCard 广告插槽
 */
export function ActionCardSlot(props: Omit<AdSlotProps, 'format'>) {
  return <AdSlot {...props} format="action_card" />
}

/**
 * Suffix 广告插槽
 */
export function SuffixSlot(props: Omit<AdSlotProps, 'format'>) {
  return <AdSlot {...props} format="suffix" />
}

/**
 * FollowUp 广告插槽
 */
export function FollowUpSlot(props: Omit<AdSlotProps, 'format'>) {
  return <AdSlot {...props} format="followup" />
}

/**
 * SponsoredSource 广告插槽
 */
export function SponsoredSourceSlot(props: Omit<AdSlotProps, 'format'>) {
  return <AdSlot {...props} format="source" />
}

/**
 * Static 广告插槽
 */
export function StaticSlot(props: Omit<AdSlotProps, 'format'>) {
  return <AdSlot {...props} format="static" />
}

/**
 * LeadGen 广告插槽
 */
export function LeadGenSlot(props: Omit<AdSlotProps, 'format'>) {
  return <AdSlot {...props} format="lead_gen" />
}

// ============================================================================
// 导出
// ============================================================================

export default AdSlot
