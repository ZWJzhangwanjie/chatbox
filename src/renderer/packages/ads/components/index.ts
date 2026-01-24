/**
 * AI Ad Network - UI 组件统一导出
 *
 * 工程师C - UI与集成专家
 *
 * 此文件统一导出所有广告相关的 UI 组件
 */

// ============================================================================
// 广告插槽组件
// ============================================================================

export {
  AdSlot,
  ActionCardSlot,
  SuffixSlot,
  FollowUpSlot,
  SponsoredSourceSlot,
  StaticSlot,
  LeadGenSlot,
} from './AdSlot';
export type { AdSlotProps, AdFormatType } from './AdSlot';

// ============================================================================
// Message 广告集成组件
// ============================================================================

export {
  MessageSuffixAd,
  MessageSponsoredSourceAd,
  calculateAdInsertPosition,
} from './MessageAdIntegration';

// ============================================================================
// MessageList 广告集成组件
// ============================================================================

export {
  MessageListActionCardAd,
  calculateAdInsertPositions,
  shouldInsertAdAtPosition,
  MessageListWithAds,
} from './MessageListAdIntegration';

// ============================================================================
// 调试面板组件
// ============================================================================

export { DebugPanel, mockAdData } from './DebugPanel';
