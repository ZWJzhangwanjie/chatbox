/**
 * AI Ad Network - Entity Link Hook
 *
 * 功能：
 * - 从广告数据中提取 Entity Link 增强数据
 * - 提供便捷的渲染方法
 * - 处理点击追踪
 */

import { useMemo, useCallback } from 'react'
import { useAdConfig } from '../hooks/useAdConfig'
import type { EntityLinkEnhancements } from '../core/types'
import type { AdIntegrationData } from '../components/MessageAdIntegration'

// ============================================================================
// Hook Result Type
// ============================================================================

export interface UseEntityLinkResult {
  /** Entity Link 增强数据 */
  enhancements: EntityLinkEnhancements | null
  /** 是否启用 Entity Link */
  isEnabled: boolean
  /** 应用 Entity Link 到文本（返回增强后的 React 节点） */
  applyToText: (text: string, Component: React.ComponentType<any>) => React.ReactNode
  /** 获取实体数量 */
  entityCount: number
  /** 处理实体点击 */
  handleEntityClick: (entityText: string, url: string) => void
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * 从 adData 中提取 Entity Link 增强数据
 */
function extractEntityLinkData(
  adData: AdIntegrationData | undefined
): EntityLinkEnhancements | null {
  if (!adData || !adData.slots) {
    return null
  }

  // 查找 entity_link slot（支持带 slot- 前缀和不带前缀的格式）
  const entityLinkSlot = adData.slots.find((slot) =>
    slot.slotId === 'slot-entity_link' || slot.slotId === 'entity_link'
  )

  if (!entityLinkSlot || entityLinkSlot.status !== 'filled' || !entityLinkSlot.ads) {
    return null
  }

  const ad = entityLinkSlot.ads[0]
  if (!ad) {
    return null
  }

  // 🔥 关键修复：从正确的位置提取实体数据
  // API 返回的完整结构：{ original, adapted, tracking }
  // 实体数据在：original.entity_link_content
  const original = ad.original as any
  const adapted = ad.content as any

  // 优先级 1：检查 original.entity_link_content（实际 API 结构）
  if (original?.entity_link_content?.entities && Array.isArray(original.entity_link_content.entities)) {
    console.log('[Entity Link] ✅ Found entity data in original.entity_link_content:', {
      entityCount: original.entity_link_content.entities.length,
      hasReplacements: !!original.entity_link_content.replacements,
    })

    return {
      entities: original.entity_link_content.entities,
      replacements: original.entity_link_content.replacements || [],
      maxLinks: 3,
      badgeStyle: 'subtle',
      overlapStrategy: 'longest',
    }
  }

  // 优先级 2：检查 adapted.entities（标准格式）
  if (adapted?.entities && Array.isArray(adapted.entities)) {
    console.log('[Entity Link] ✅ Found entity data in adapted.entities')
    return {
      entities: adapted.entities,
      replacements: adapted.replacements || [],
      maxLinks: adapted.maxLinks || 3,
      badgeStyle: adapted.badgeStyle || 'subtle',
      overlapStrategy: adapted.overlapStrategy || 'longest',
    }
  }

  // 优先级 3：检查 adapted.entityLinkContent（可能的嵌套格式）
  if (adapted?.entityLinkContent?.entities && Array.isArray(adapted.entityLinkContent.entities)) {
    console.log('[Entity Link] ✅ Found entity data in adapted.entityLinkContent')
    return {
      entities: adapted.entityLinkContent.entities,
      replacements: adapted.entityLinkContent.replacements || [],
      maxLinks: adapted.entityLinkContent.maxLinks || 3,
      badgeStyle: adapted.entityLinkContent.badgeStyle || 'subtle',
      overlapStrategy: adapted.entityLinkContent.overlapStrategy || 'longest',
    }
  }

  // 兼容格式：如果没有 entities，检查是否有摘要信息
  if (adapted?.body && typeof adapted.body === 'string') {
    const match = adapted.body.match(/(\d+)\s*entities/i)
    const entityCount = match ? parseInt(match[1]) : 0

    if (entityCount > 0) {
      console.warn('[Entity Link] ⚠️ API returned summary format instead of entity data:', {
        slotId: entityLinkSlot.slotId,
        body: adapted.body,
        adId: ad.id,
        hint: 'Entity data should be in original.entity_link_content.entities',
      })

      return {
        entities: [],
        replacements: [],
        maxLinks: 3,
        badgeStyle: 'subtle',
        overlapStrategy: 'longest',
      }
    }
  }

  // 没有找到实体数据
  console.warn('[Entity Link] ❌ No entity data found in any location:', {
    slotId: entityLinkSlot.slotId,
    hasOriginal: !!original,
    hasOriginalEntityLinkContent: !!original?.entity_link_content,
    hasAdapted: !!adapted,
    adaptedKeys: adapted ? Object.keys(adapted) : [],
    originalKeys: original ? Object.keys(original) : [],
    adId: ad.id,
  })

  return null
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Entity Link Hook
 *
 * 从广告数据中提取 Entity Link 增强数据，并提供应用方法
 *
 * @param adData - 广告集成数据
 * @returns Entity Link 增强数据和应用方法
 *
 * @example
 * ```tsx
 * function MyMessage({ adData, text }) {
 *   const { enhancements, applyToText, isEnabled } = useEntityLink(adData)
 *
 *   return (
 *     <div>
 *       {isEnabled && enhancements ? (
 *         applyToText(text, EnhancedContent)
 *       ) : (
 *         <Markdown>{text}</Markdown>
 *       )}
 *     </div>
 *   )
 * }
 * ```
 */
export function useEntityLink(
  adData: AdIntegrationData | undefined
): UseEntityLinkResult {
  const config = useAdConfig()
  const isEnabled = config.formats.entityLink.enabled

  // 提取 Entity Link 数据
  const enhancements = useMemo(() => {
    if (!isEnabled) {
      return null
    }

    // 调试：打印原始 adData
    if (config.debug && adData?.slots) {
      const entityLinkSlot = adData.slots.find((slot) =>
        slot.slotId === 'slot-entity_link' || slot.slotId === 'entity_link'
      )
      if (entityLinkSlot) {
        console.log('[Entity Link] Raw slot data:', {
          slotId: entityLinkSlot.slotId,
          status: entityLinkSlot.status,
          hasAds: !!entityLinkSlot.ads,
          adCount: entityLinkSlot.ads?.length || 0,
        })
        if (entityLinkSlot.ads && entityLinkSlot.ads.length > 0) {
          const ad = entityLinkSlot.ads[0]
          const original = ad.original as any
          const adapted = ad.content as any
          console.log('[Entity Link] Raw ad data:', {
            id: ad.id,
            type: ad.type,
            // original 字段（实际实体数据位置）
            originalKeys: original ? Object.keys(original) : [],
            hasOriginalEntityLinkContent: !!original?.entity_link_content,
            entityCount: original?.entity_link_content?.entities?.length || 0,
            // adapted 字段（摘要信息）
            adaptedKeys: adapted ? Object.keys(adapted) : [],
            adaptedContent: adapted,
          })
          // 如果有实体数据，打印第一个实体作为示例
          if (original?.entity_link_content?.entities?.length > 0) {
            console.log('[Entity Link] Sample entity:', original.entity_link_content.entities[0])
          }
        }
      }
    }

    return extractEntityLinkData(adData)
  }, [isEnabled, adData, config.debug])

  // 计算实体数量
  const entityCount = useMemo(() => {
    if (!enhancements || !enhancements.entities) {
      return 0
    }
    return enhancements.entities.length
  }, [enhancements])

  /**
   * 处理实体点击
   */
  const handleEntityClick = useCallback((entityText: string, url: string) => {
    // 记录点击事件（可以发送到分析服务）
    console.log('[Entity Link] Click:', {
      entity: entityText,
      url,
      timestamp: Date.now(),
    })

    // 追踪 URL（如果有）
    const trackingUrl = enhancements?.replacements?.find(
      (r) => r.originalText === entityText
    )?.affiliateUrl

    if (trackingUrl && config.debug) {
      console.log('[Entity Link] Tracking URL:', trackingUrl)
    }

    // 这里可以添加更多的追踪逻辑
    // 例如：发送到广告 API 的 impression_url
  }, [enhancements, config.debug])

  /**
   * 应用 Entity Link 到文本
   *
   * @param text - 原始文本
   * @param Component - 用于渲染增强内容的组件
   * @returns 增强后的 React 节点
   */
  const applyToText = useCallback((
    text: string,
    Component: React.ComponentType<any>
  ): React.ReactNode => {
    if (!enhancements) {
      return null
    }

    // 使用提供的组件渲染增强内容
    // 组件会接收 content 和 enhancements 作为 props
    return (
      <Component
        content={text}
        enhancements={enhancements}
        onEntityClick={handleEntityClick}
        enabled={isEnabled}
      />
    )
  }, [enhancements, handleEntityClick, isEnabled])

  return {
    enhancements,
    isEnabled,
    applyToText,
    entityCount,
    handleEntityClick,
  }
}

// ============================================================================
// Export
// ============================================================================

export default useEntityLink
