/**
 * AI Ad Network - Entity Link Markdown Wrapper
 *
 * 功能：
 * - 集成 EnhancedContent 和 Markdown 组件
 * - 当有 Entity Link 增强时，使用 EnhancedContent 渲染
 * - 否则，使用普通 Markdown 渲染
 */

import { memo } from 'react'
import Markdown from '@/components/Markdown'
import { EnhancedContent } from './EnhancedContent'
import type { EntityLinkEnhancements } from '../core/types'

// ============================================================================
// Props Interface
// ============================================================================

export interface EntityLinkMarkdownProps {
  /** 文本内容 */
  text: string
  /** Entity Link 增强数据 */
  enhancements?: EntityLinkEnhancements | null
  /** 是否启用 Entity Link */
  enabled?: boolean
  /** Markdown uniqueId (用于代码块复制等功能) */
  uniqueId?: string
  /** 是否启用 LaTeX 渲染 */
  enableLaTeXRendering?: boolean
  /** 是否启用 Mermaid 渲染 */
  enableMermaidRendering?: boolean
  /** 是否正在生成（用于流式输出处理） */
  generating?: boolean
}

// ============================================================================
// Component
// ============================================================================

/**
 * Entity Link Markdown 包装组件
 *
 * 根据是否有 Entity Link 增强数据，选择渲染方式：
 * - 有增强数据：使用 EnhancedContent (简化版本，不使用 Markdown)
 * - 无增强数据：使用普通 Markdown
 *
 * @note 当前实现：有 Entity Link 时使用纯文本渲染
 * 未来可以改进为支持 Markdown + Entity Link 的组合
 */
export const EntityLinkMarkdown = memo<EntityLinkMarkdownProps>(({
  text,
  enhancements,
  enabled = true,
  uniqueId,
  enableLaTeXRendering,
  enableMermaidRendering,
  generating,
}) => {
  // 如果启用了 Entity Link 且有增强数据，使用 EnhancedContent
  if (enabled && enhancements && enhancements.entities && enhancements.entities.length > 0) {
    return (
      <EnhancedContent
        content={text}
        enhancements={enhancements}
        enabled={true}
        className="entity-link-markdown-wrapper"
      />
    )
  }

  // 否则，使用普通 Markdown 渲染
  return (
    <Markdown
      uniqueId={uniqueId}
      enableLaTeXRendering={enableLaTeXRendering}
      enableMermaidRendering={enableMermaidRendering}
      generating={generating}
    >
      {text}
    </Markdown>
  )
})

EntityLinkMarkdown.displayName = 'EntityLinkMarkdown'

// ============================================================================
// Export
// ============================================================================

export default EntityLinkMarkdown
