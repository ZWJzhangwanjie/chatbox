/**
 * AI Ad Network - 工具模块导出
 *
 * 统一导出所有工具函数
 *
 * @module ads/utils
 */

// ============================================================================
// 隐私处理工具
// ============================================================================

export {
  // 文本脱敏
  anonymizeText,
  containsSensitiveInfo,
  getSensitiveInfoTypes,

  // 对象脱敏
  anonymizeObject,

  // 用户数据脱敏
  anonymizeMemory,
  anonymizeProfile,
  anonymizeMessages,

  // 隐私管理
  hasUserConsent,
  buildPrivacyReport,

  // 常量
  SENSITIVE_PATTERNS,
  SENSITIVE_FIELDS,
} from './privacy';

export type {
  AnonymizedMemory,
  AnonymizedProfile,
  AnonymizeOptions,
} from './privacy';

// ============================================================================
// 广告格式类型映射工具
// ============================================================================

export {
  // 标准化
  normalizeAdFormat,
  normalizeAdFormats,

  // 别名管理
  getAdFormatAliases,

  // 比较和匹配
  isSameAdFormat,
  isAdFormatMatch,
  isValidAdFormat,

  // Slot 相关
  getSlotId,
  extractFormatFromSlotId,

  // 工具
  getAllStandardFormats,
  getAdFormatDebugInfo,

  // 常量
  AD_FORMAT_ALIASES,
} from './adFormatUtils';

export type {
  StandardAdFormat,
  AdFormatAlias,
} from './adFormatUtils';

// ============================================================================
// 重新导出默认
// ============================================================================

export { default as privacy } from './privacy';
export { default as adFormatUtils } from './adFormatUtils';

