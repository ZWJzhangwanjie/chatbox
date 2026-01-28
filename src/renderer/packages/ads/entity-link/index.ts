/**
 * AI Ad Network - Entity Link Module
 *
 * 实体链接广告模块
 * 在 AI 响应内容中识别实体并添加联盟营销链接
 *
 * Usage:
 * import { EnhancedContent, useEntityLink, EntityLinkMarkdown } from '@/packages/ads/entity-link'
 * import '@/packages/ads/entity-link/entity-link.css'
 */

// Export main component
export { EnhancedContent, default } from './EnhancedContent'
export type { EnhancedContentProps } from './EnhancedContent'

// Export Markdown wrapper component
export { EntityLinkMarkdown } from './EntityLinkMarkdown'
export type { EntityLinkMarkdownProps } from './EntityLinkMarkdown'

// Export hook
export { useEntityLink } from './useEntityLink'
export type { UseEntityLinkResult } from './useEntityLink'

// Export demo component (for development/testing)
export { EntityLinkDemo } from './EntityLinkDemo'

// Export utilities
export {
  extractEntityLinkEnhancements,
  validateEntityEnhancements,
} from './EnhancedContent'
