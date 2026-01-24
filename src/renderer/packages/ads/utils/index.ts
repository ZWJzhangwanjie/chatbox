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

  // 默认导出
  default,
} from './privacy';

export type {
  AnonymizedMemory,
  AnonymizedProfile,
  AnonymizeOptions,
} from './privacy';

// ============================================================================
// 重新导出默认
// ============================================================================

export { default as privacy } from './privacy';
