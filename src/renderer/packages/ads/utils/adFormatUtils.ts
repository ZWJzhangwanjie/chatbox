/**
 * AI Ad Network - 广告格式类型映射工具
 *
 * 提供统一的广告格式类型转换和映射功能
 * 支持下划线、中划线、驼峰等各种命名格式的兼容处理
 */

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 标准广告格式类型（使用下划线命名）
 */
export type StandardAdFormat =
  | 'action_card'
  | 'suffix'
  | 'followup'
  | 'source'
  | 'static'
  | 'lead_gen'

/**
 * 广告格式别名（所有可能的变体）
 */
export type AdFormatAlias =
  | StandardAdFormat
  | 'actionCard'
  | 'ActionCard'
  | 'action-card'
  | 'followUp'
  | 'FollowUp'
  | 'follow-up'
  | 'follow_up'
  | 'sponsoredSource'
  | 'SponsoredSource'
  | 'sponsored-source'
  | 'sponsored_source'
  | 'leadGen'
  | 'LeadGen'
  | 'lead-gen'
  | 'lead_gen'
  | string

// ============================================================================
// 常量定义
// ============================================================================

/**
 * 标准格式名称映射表
 * 包含所有可能的命名变体
 */
export const AD_FORMAT_ALIASES: Record<StandardAdFormat, string[]> = {
  action_card: [
    'action_card',      // 标准下划线
    'actionCard',       // 驼峰
    'actioncard',       // 全小写驼峰
    'ActionCard',       // 大驼峰
    'action-card',      // 中划线
    'ACTION_CARD',      // 全大写下划线
    'actionCardAd',     // 带Ad后缀
    'action_card_ad',   // 带ad后缀下划线
  ],
  suffix: [
    'suffix',
    'Suffix',
    'SUFFIX',
    'suffixAd',
    'suffix_ad',
  ],
  followup: [
    'followup',         // 标准全小写
    'followUp',         // 驼峰
    'follow-up',        // 中划线
    'follow_up',        // 下划线
    'FollowUp',         // 大驼峰
    'FOLLOW_UP',        // 全大写
    'followupAd',
    'followup_ad',
    'follow_up_ad',
    'follow-up-ad',
  ],
  source: [
    'source',
    'Source',
    'SOURCE',
    'sponsoredSource',  // 驼峰
    'sponsored_source', // 下划线
    'sponsored-source', // 中划线
    'SponsoredSource',
    'SPONSORED_SOURCE',
    'sourceAd',
    'source_ad',
  ],
  static: [
    'static',
    'Static',
    'STATIC',
    'staticAd',
    'static_ad',
  ],
  lead_gen: [
    'lead_gen',         // 标准下划线
    'leadGen',          // 驼峰
    'lead-gen',         // 中划线
    'leadgen',          // 全小写
    'LeadGen',          // 大驼峰
    'LEAD_GEN',         // 全大写
    'leadGenAd',
    'lead_gen_ad',
  ],
}

/**
 * 反向映射：从任意别名到标准格式
 */
const ALIAS_TO_STANDARD: Record<string, StandardAdFormat> = {}

// 初始化反向映射表
Object.entries(AD_FORMAT_ALIASES).forEach(([standard, aliases]) => {
  aliases.forEach(alias => {
    ALIAS_TO_STANDARD[alias.toLowerCase()] = standard as StandardAdFormat
  })
})

// ============================================================================
// 工具函数
// ============================================================================

/**
 * 标准化广告格式名称
 * 将任意格式的广告格式名称转换为标准下划线格式
 *
 * @param format - 输入的广告格式名称（任意格式）
 * @returns 标准化的广告格式名称，如果无法识别则返回原值
 *
 * @example
 * ```ts
 * normalizeAdFormat('actionCard')  // => 'action_card'
 * normalizeAdFormat('follow-up')  // => 'followup'
 * normalizeAdFormat('SOURCE')     // => 'source'
 * normalizeAdFormat('unknown')    // => 'unknown'
 * ```
 */
export function normalizeAdFormat(format: string): string {
  if (!format) {
    return format
  }

  const normalized = ALIAS_TO_STANDARD[format.toLowerCase()]
  return normalized || format
}

/**
 * 获取广告格式的所有别名
 *
 * @param format - 标准广告格式名称
 * @returns 该格式的所有别名数组
 *
 * @example
 * ```ts
 * getAdFormatAliases('action_card')
 * // => ['action_card', 'actionCard', 'actioncard', 'ActionCard', 'action-card', ...]
 * ```
 */
export function getAdFormatAliases(format: string): string[] {
  const normalized = normalizeAdFormat(format)
  return AD_FORMAT_ALIASES[normalized as StandardAdFormat] || [format]
}

/**
 * 检查两个广告格式名称是否相同（忽略命名格式差异）
 *
 * @param format1 - 第一个格式名称
 * @param format2 - 第二个格式名称
 * @returns 是否表示相同的广告格式
 *
 * @example
 * ```ts
 * isSameAdFormat('actionCard', 'action_card')  // => true
 * isSameAdFormat('follow-up', 'followup')      // => true
 * isSameAdFormat('suffix', 'action_card')      // => false
 * ```
 */
export function isSameAdFormat(format1: string, format2: string): boolean {
  if (!format1 || !format2) {
    return format1 === format2
  }
  return normalizeAdFormat(format1) === normalizeAdFormat(format2)
}

/**
 * 检查广告格式是否匹配给定的格式列表
 *
 * @param adFormat - 广告的格式名称
 * @param formats - 格式名称列表（可以包含各种命名格式）
 * @returns 是否匹配
 *
 * @example
 * ```ts
 * isAdFormatMatch('actionCard', ['action_card', 'suffix'])  // => true
 * isAdFormatMatch('follow-up', ['suffix'])                   // => false
 * ```
 */
export function isAdFormatMatch(adFormat: string, formats: string[]): boolean {
  const normalizedAdFormat = normalizeAdFormat(adFormat)
  return formats.some(format => normalizeAdFormat(format) === normalizedAdFormat)
}

/**
 * 获取 slotId（根据广告格式）
 *
 * @param format - 广告格式名称
 * @returns 对应的 slotId
 *
 * @example
 * ```ts
 * getSlotId('actionCard')  // => 'slot-action_card'
 * getSlotId('follow-up')   // => 'slot-followup'
 * ```
 */
export function getSlotId(format: string): string {
  const normalized = normalizeAdFormat(format)
  return `slot-${normalized}`
}

/**
 * 从 slotId 中提取广告格式
 *
 * @param slotId - slot ID
 * @returns 广告格式名称，如果不是有效的 slotId 则返回 undefined
 *
 * @example
 * ```ts
 * extractFormatFromSlotId('slot-action_card')  // => 'action_card'
 * extractFormatFromSlotId('invalid-slot')       // => undefined
 * ```
 */
export function extractFormatFromSlotId(slotId: string): string | undefined {
  if (!slotId || !slotId.startsWith('slot-')) {
    return undefined
  }
  return slotId.substring(5) // 移除 'slot-' 前缀
}

/**
 * 批量标准化广告格式数组
 *
 * @param formats - 格式名称数组
 * @returns 标准化后的格式数组（去重）
 *
 * @example
 * ```ts
 * normalizeAdFormats(['actionCard', 'action_card', 'suffix'])
 * // => ['action_card', 'suffix']
 * ```
 */
export function normalizeAdFormats(formats: string[]): string[] {
  const normalized = formats.map(normalizeAdFormat)
  // 去重并保持顺序
  return Array.from(new Set(normalized))
}

/**
 * 获取所有支持的标准广告格式
 *
 * @returns 所有标准格式的数组
 */
export function getAllStandardFormats(): StandardAdFormat[] {
  return Object.keys(AD_FORMAT_ALIASES) as StandardAdFormat[]
}

/**
 * 验证是否为有效的广告格式
 *
 * @param format - 格式名称
 * @returns 是否为有效的广告格式
 *
 * @example
 * ```ts
 * isValidAdFormat('action_card')   // => true
 * isValidAdFormat('invalidFormat')  // => false
 * ```
 */
export function isValidAdFormat(format: string): boolean {
  const normalized = normalizeAdFormat(format)
  return Object.prototype.hasOwnProperty.call(AD_FORMAT_ALIASES, normalized)
}

// ============================================================================
// 调试工具
// ============================================================================

/**
 * 获取广告格式的调试信息
 *
 * @param format - 格式名称
 * @returns 调试信息对象
 *
 * @example
 * ```ts
 * getAdFormatDebugInfo('actionCard')
 * // => {
 * //   input: 'actionCard',
 * //   normalized: 'action_card',
 * //   aliases: ['action_card', 'actionCard', ...],
 * //   slotId: 'slot-action_card',
 * //   isValid: true
 * // }
 * ```
 */
export function getAdFormatDebugInfo(format: string) {
  const normalized = normalizeAdFormat(format)
  return {
    input: format,
    normalized,
    aliases: getAdFormatAliases(normalized),
    slotId: getSlotId(format),
    isValid: isValidAdFormat(format),
  }
}

// ============================================================================
// 默认导出
// ============================================================================

export default {
  normalizeAdFormat,
  getAdFormatAliases,
  isSameAdFormat,
  isAdFormatMatch,
  getSlotId,
  extractFormatFromSlotId,
  normalizeAdFormats,
  getAllStandardFormats,
  isValidAdFormat,
  getAdFormatDebugInfo,
  AD_FORMAT_ALIASES,
}
