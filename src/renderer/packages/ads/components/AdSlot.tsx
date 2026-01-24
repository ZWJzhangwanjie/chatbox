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
import { lazy, Suspense, memo, useMemo } from 'react'
import type { Ad, AdTriggerContext } from '../core/types'
import { useAdData } from '../hooks/useAdData'
import { useAdConfig } from '../hooks/useAdConfig'

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
const SDKSponsoredSourceAd = lazy(() =>
  import('@ai-ad-network/frontend-sdk').then(m => ({ default: m.SponsoredSourceAd }))
)
const SDKStaticAd = lazy(() =>
  import('@ai-ad-network/frontend-sdk').then(m => ({ default: m.StaticAd }))
)
const SDKLeadGenAd = lazy(() =>
  import('@ai-ad-network/frontend-sdk').then(m => ({ default: m.LeadGenAd }))
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
}

// ============================================================================
// SDK 广告组件包装器
// ============================================================================

interface SDKAdWrapperProps {
  ad: Ad
  format: AdFormatType
  variant?: string
  onClick?: (ad: Ad) => void
}

/**
 * SDK 广告组件包装器
 * 根据 format 类型选择对应的 SDK 组件
 * 添加额外的 className 以便应用 Chatbox 样式覆盖
 */
const SDKAdWrapper = memo(({ ad, format, variant, onClick }: SDKAdWrapperProps) => {
  // 添加点击处理
  const handleClick = () => {
    onClick?.(ad)
  }

  // 为每个广告组件创建一致的包装器
  const wrapperClassName = `ad-component-wrapper ad-component-wrapper-${format}`

  // 根据 format 渲染对应的 SDK 组件，传递 variant
  const adComponent = (() => {
    switch (format) {
      case 'action_card':
        return (
          <SDKActionCardAd ad={ad} variant={variant as any} onClick={handleClick} />
        )

      case 'suffix':
        return (
          <SDKSuffixAd ad={ad} variant={variant as any} />
        )

      case 'followup':
        return (
          <SDKFollowUpAd ad={ad} variant={variant as any} onClick={handleClick} />
        )

      case 'source':
        return (
          <SDKSponsoredSourceAd ad={ad} variant={variant as any} onClick={handleClick} />
        )

      case 'static':
        return (
          <SDKStaticAd ad={ad} />
        )

      case 'lead_gen':
        return (
          <SDKLeadGenAd ad={ad} />
        )

      default:
        return <AdFallback ad={ad} />
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
}: AdSlotProps) {
  // 获取配置
  const config = useAdConfig()

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
  // 1. 优先使用 ads 参数（指定格式的广告）
  // 2. 其次从 allAds 中过滤出当前格式的广告
  // 3. 最后才使用 useAdData 独立获取
  const shouldUseExternalData = !!(externalAds || allAds)

  // 支持多种格式名称的映射（API 返回的命名可能不同）
  const formatAliases: Record<string, string[]> = {
    action_card: ['action_card', 'actionCard'],
    actionCard: ['action_card', 'actionCard'],
    suffix: ['suffix'],
    followup: ['followup', 'followUp'],
    followUp: ['followup', 'followUp'],
    source: ['source', 'sponsoredSource'],
    lead_gen: ['lead_gen', 'leadGen'],
    leadGen: ['lead_gen', 'leadGen'],
    static: ['static'],
  }

  // 获取该格式的所有别名
  const aliases = formatAliases[format] || [format]

  // 使用别名过滤
  const adsFromAll = allAds ? allAds.filter(ad => aliases.includes(ad.type)) : undefined
  const finalAds = externalAds ?? adsFromAll

  // 调试日志
  const allAdsTypes = allAds?.map(ad => ad.type) || []
  console.log('[🔍 AdSlot DATA FLOW]', {
    format,
    placement,
    hasExternalAds: !!externalAds,
    externalAdsCount: externalAds?.length || 0,
    hasAllAds: !!allAds,
    allAdsCount: allAds?.length || 0,
    allAdsTypes,
    adsFromAllCount: adsFromAll?.length || 0,
    finalAdsCount: finalAds?.length || 0,
    shouldUseExternalData,
  })

  // 使用外部提供的 context，或创建默认的 context
  const adContext: AdTriggerContext = useMemo(() => {
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
      },
    }
  }, [externalContext])

  // 只有在没有提供外部数据时才使用 useAdData
  const { ads: fetchedAds, isLoading, isError, error } = useAdData(
    shouldUseExternalData ? undefined : adContext,
    shouldUseExternalData ? undefined : { formats: [format], skipFrequencyCheck: config.debug }
  )

  // 最终使用的广告数据
  const displayAds = finalAds ?? fetchedAds

  // 调试日志：最终数据
  console.log('[🎯 AdSlot FINAL DATA]', {
    format,
    finalAdsCount: finalAds?.length || 0,
    fetchedAdsCount: fetchedAds?.length || 0,
    displayAdsCount: displayAds.length,
    isLoading,
    isError,
  })

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

      {displayAds.map((ad) => (
        <SDKAdWrapper
          key={ad.id}
          ad={ad}
          format={format}
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
