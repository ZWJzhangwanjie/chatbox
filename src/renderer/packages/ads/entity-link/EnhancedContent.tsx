/**
 * AI Ad Network - Entity Link Enhanced Content Component
 *
 * 功能：
 * - 在文本中识别实体并替换为链接
 * - 支持多种徽章样式
 * - 处理实体重叠策略
 * - 追踪点击事件
 */

import { useState } from 'react'
import type { EntityLinkEnhancements } from '../core/types'

// ============================================================================
// Props Interface
// ============================================================================

export interface EnhancedContentProps {
  /** 原始文本内容 */
  content: string
  /** 实体增强数据 */
  enhancements?: EntityLinkEnhancements
  /** 点击追踪回调 */
  onEntityClick?: (entityText: string, url: string) => void
  /** 是否启用（用于调试） */
  enabled?: boolean
  /** 自定义类名 */
  className?: string
}

// ============================================================================
// Badge Style Components
// ============================================================================

interface EntityBadgeProps {
  children: React.ReactNode
  badgeStyle: 'subtle' | 'hover' | 'explicit' | 'none'
  url: string
  onClick: () => void
}

function EntityBadge({ children, badgeStyle, url, onClick }: EntityBadgeProps) {
  const [isHovered, setIsHovered] = useState(false)

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    onClick()
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const baseStyle: React.CSSProperties = {
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  }

  switch (badgeStyle) {
    case 'subtle':
      return (
        <span
          onClick={handleClick}
          style={{
            ...baseStyle,
            borderBottom: '1px dotted #228be6',
            color: '#228be6',
          }}
          className="entity-link-badge-subtle"
        >
          {children}
        </span>
      )

    case 'hover':
      return (
        <span
          onClick={handleClick}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          style={{
            ...baseStyle,
            position: 'relative',
            color: isHovered ? '#228be6' : 'inherit',
          }}
          className="entity-link-badge-hover"
        >
          {children}
          {isHovered && (
            <span
              style={{
                position: 'absolute',
                top: '-24px',
                left: '50%',
                transform: 'translateX(-50%)',
                background: '#228be6',
                color: 'white',
                padding: '2px 8px',
                borderRadius: '4px',
                fontSize: '10px',
                whiteSpace: 'nowrap',
                pointerEvents: 'none',
                zIndex: 1000,
              }}
              className="entity-link-badge-label"
            >
              赞助链接
            </span>
          )}
        </span>
      )

    case 'explicit':
      return (
        <span
          onClick={handleClick}
          style={{
            ...baseStyle,
            background: '#fff3cd',
            padding: '2px 6px',
            borderRadius: '4px',
            border: '1px solid #ffc107',
            color: '#856404',
          }}
          className="entity-link-badge-explicit"
        >
          <span style={{ fontSize: '10px', marginRight: '4px' }}>†</span>
          {children}
        </span>
      )

    case 'none':
      return (
        <span
          onClick={handleClick}
          style={{
            ...baseStyle,
            color: '#228be6',
            textDecoration: 'underline',
          }}
          className="entity-link-badge-none"
        >
          {children}
        </span>
      )

    default:
      return <span onClick={handleClick}>{children}</span>
  }
}

// ============================================================================
// Overlap Strategy Handlers
// ============================================================================

/**
 * 应用重叠策略，过滤重叠的实体
 */
function applyOverlapStrategy(
  entities: EntityLinkEnhancements['entities'],
  strategy: 'longest' | 'first' | 'all'
): EntityLinkEnhancements['entities'] {
  if (!entities || entities.length === 0) {
    return []
  }

  switch (strategy) {
    case 'longest':
      // 保留最长的实体，移除与其重叠的短实体
      return entities.filter((entity, index, self) => {
        // 检查是否有更长的实体包含当前实体
        const hasLongerOverlap = self.some((other, otherIndex) => {
          return (
            otherIndex !== index &&
            other.startPosition <= entity.startPosition &&
            other.endPosition >= entity.endPosition &&
            (other.endPosition - other.startPosition) > (entity.endPosition - entity.startPosition)
          )
        })
        return !hasLongerOverlap
      })

    case 'first':
      // 保留最先出现的实体，移除与其重叠的后续实体
      const filtered: typeof entities = []
      const usedRanges: Array<[number, number]> = []

      for (const entity of entities) {
        const overlaps = usedRanges.some(
          ([start, end]) =>
            !(entity.endPosition <= start || entity.startPosition >= end)
        )

        if (!overlaps) {
          filtered.push(entity)
          usedRanges.push([entity.startPosition, entity.endPosition])
        }
      }

      return filtered

    case 'all':
      // 保留所有实体（允许重叠）
      return entities

    default:
      return entities
  }
}

/**
 * 将文本分段，识别哪些部分是实体
 */
interface TextSegment {
  text: string
  isEntity: boolean
  entity?: EntityLinkEnhancements['entities'][number]
}

function segmentText(
  content: string,
  entities: EntityLinkEnhancements['entities']
): TextSegment[] {
  if (!entities || entities.length === 0) {
    return [{ text: content, isEntity: false }]
  }

  const segments: TextSegment[] = []
  let lastPosition = 0

  // 按起始位置排序
  const sortedEntities = [...entities].sort((a, b) => a.startPosition - b.startPosition)

  for (const entity of sortedEntities) {
    // 添加实体前的普通文本
    if (entity.startPosition > lastPosition) {
      segments.push({
        text: content.slice(lastPosition, entity.startPosition),
        isEntity: false,
      })
    }

    // 添加实体
    segments.push({
      text: content.slice(entity.startPosition, entity.endPosition),
      isEntity: true,
      entity,
    })

    lastPosition = entity.endPosition
  }

  // 添加最后剩余的普通文本
  if (lastPosition < content.length) {
    segments.push({
      text: content.slice(lastPosition),
      isEntity: false,
    })
  }

  return segments
}

// ============================================================================
// Main Component
// ============================================================================

export function EnhancedContent({
  content,
  enhancements,
  onEntityClick,
  enabled = true,
  className = '',
}: EnhancedContentProps) {
  // 如果未启用或没有增强数据，直接显示原始内容（保留换行）
  if (!enabled || !enhancements || !enhancements.entities || enhancements.entities.length === 0) {
    return (
      <div
        className={className}
        style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
      >
        {content}
      </div>
    )
  }

  // 应用重叠策略
  const filteredEntities = applyOverlapStrategy(
    enhancements.entities,
    enhancements.overlapStrategy || 'longest'
  )

  // 限制最大链接数
  const maxLinks = enhancements.maxLinks || 3
  const limitedEntities = filteredEntities.slice(0, maxLinks)

  // 分段文本
  const segments = segmentText(content, limitedEntities)

  // 渲染分段（保留换行和基本格式）
  return (
    <div
      className={`entity-link-enhanced-content ${className}`.trim()}
      style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
    >
      {segments.map((segment, index) => {
        if (!segment.isEntity || !segment.entity) {
          // 非实体文本：保留内容
          return <span key={index}>{segment.text}</span>
        }

        const entity = segment.entity
        const url = entity.affiliateUrl || ''

        return (
          <EntityBadge
            key={`${index}-${entity.startPosition}`}
            badgeStyle={enhancements.badgeStyle || 'subtle'}
            url={url}
            onClick={() => onEntityClick?.(entity.text, url)}
          >
            {segment.text}
          </EntityBadge>
        )
      })}
    </div>
  )
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * 从 API 响应中提取 Entity Link 增强数据
 */
export function extractEntityLinkEnhancements(
  apiResponse: any
): EntityLinkEnhancements | undefined {
  if (!apiResponse?.data?.slots) {
    return undefined
  }

  // 查找 entity_link slot
  const entityLinkSlot = apiResponse.data.slots.find(
    (slot: any) => slot.slotId === 'entity_link'
  )

  if (!entityLinkSlot || entityLinkSlot.status !== 'filled' || !entityLinkSlot.ads) {
    return undefined
  }

  const ad = entityLinkSlot.ads[0]
  if (!ad) {
    return undefined
  }

  // 从 adapted.content 中提取实体数据
  const content = ad.adapted?.content
  if (!content || !Array.isArray(content.entities)) {
    return undefined
  }

  return {
    entities: content.entities,
    replacements: content.replacements || [],
    maxLinks: content.maxLinks || 3,
    badgeStyle: content.badgeStyle || 'subtle',
    overlapStrategy: content.overlapStrategy || 'longest',
  }
}

/**
 * 验证实体数据是否有效
 */
export function validateEntityEnhancements(
  enhancements: EntityLinkEnhancements
): boolean {
  if (!enhancements.entities || enhancements.entities.length === 0) {
    return false
  }

  // 检查每个实体是否有必要字段
  return enhancements.entities.every(
    (entity) =>
      entity.text &&
      entity.startPosition !== undefined &&
      entity.endPosition !== undefined &&
      entity.affiliateUrl
  )
}

// ============================================================================
// Export
// ============================================================================

export default EnhancedContent
