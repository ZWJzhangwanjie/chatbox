/**
 * 记忆隐私过滤器
 *
 * 检测和过滤敏感个人信息，支持隐私模式
 */

import type { Memory } from 'src/shared/types'
import { getLogger } from '../util'

const log = getLogger('memory:privacy-filter')

/**
 * 敏感信息类型
 */
export enum SensitiveDataType {
  // 个人身份信息
  EMAIL = 'email',
  PHONE = 'phone',
  ID_CARD = 'id_card',
  PASSPORT = 'passport',
  SSN = 'ssn', // 社会保障号

  // 财务信息
  CREDIT_CARD = 'credit_card',
  BANK_ACCOUNT = 'bank_account',
  PASSWORD = 'password',

  // 地理位置
  ADDRESS = 'address',
  COORDINATES = 'coordinates',

  // 健康信息
  MEDICAL_INFO = 'medical_info',

  // 其他敏感信息
  API_KEY = 'api_key',
  TOKEN = 'token',
  SECRET = 'secret',
}

/**
 * 敏感信息检测结果
 */
export interface SensitiveDataMatch {
  type: SensitiveDataType
  matchedText: string
  startIndex: number
  endIndex: number
  confidence: number
}

/**
 * 隐私过滤配置
 */
export interface PrivacyFilterConfig {
  // 是否启用过滤
  enabled?: boolean

  // 要过滤的敏感信息类型
  filterTypes?: SensitiveDataType[]

  // 是否屏蔽原始内容
  maskContent?: boolean

  // 自定义敏感词（正则表达式）
  customPatterns?: RegExp[]

  // 白名单词（不会被过滤）
  whitelistWords?: string[]
}

/**
 * 默认敏感信息正则表达式
 */
const DEFAULT_PATTERNS: Record<SensitiveDataType, RegExp> = {
  // 邮箱
  [SensitiveDataType.EMAIL]: /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/gi,

  // 电话号码（支持多种格式）
  [SensitiveDataType.PHONE]: /(\+?\d{1,3}[-.\s]?)?\(?\d{3,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,6}\b/g,

  // 身份证号（18位）
  [SensitiveDataType.ID_CARD]: /\b[1-9]\d{5}(18|19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[\dXx]\b/g,

  // 护照号
  [SensitiveDataType.PASSPORT]: /\b[A-Za-z]{1,2}\d{6,9}\b/g,

  // 社会保障号（美国）
  [SensitiveDataType.SSN]: /\b\d{3}-\d{2}-\d{4}\b/g,

  // 信用卡号
  [SensitiveDataType.CREDIT_CARD]: /\b(?:\d[ -]*?){13,16}\b/g,

  // 银行账号
  [SensitiveDataType.BANK_ACCOUNT]: /\b\d{10,20}\b/g,

  // 密码提示
  [SensitiveDataType.PASSWORD]: /\b(password|passwd|pwd)\s*[:=]\s*\S+/gi,

  // 地址
  [SensitiveDataType.ADDRESS]: /\d+\s+[\u4e00-\u9fa5a-zA-Z]+\s*(?:街道|路|街|道|胡同|巷|号|室|栋|楼|层|区|县|市|省|州|国)/g,

  // 坐标
  [SensitiveDataType.COORDINATES]: /\b\d+\.\d+,\s*-?\d+\.\d+\b/g,

  // 医疗信息关键词
  [SensitiveDataType.MEDICAL_INFO]: /\b(?:病情|诊断|治疗|药物|病史|医院|医生)\b/gi,

  // API 密钥
  [SensitiveDataType.API_KEY]: /\b(?:api[_-]?key|apikey|access[_-]?token)\s*[:=]\s*\S+/gi,

  // Token
  [SensitiveDataType.TOKEN]: /\b(?:token|jwt|bearer)\s*[:=]\s*[A-Za-z0-9._-]+\b/gi,

  // Secret
  [SensitiveDataType.SECRET]: /\b(?:secret|private[_-]?key|auth[_-]?key)\s*[:=]\s*\S+/gi,
}

/**
 * 检测文本中的敏感信息
 */
export function detectSensitiveData(
  text: string,
  config: PrivacyFilterConfig = {}
): SensitiveDataMatch[] {
  const matches: SensitiveDataMatch[] = []

  if (config.enabled === false) {
    return matches
  }

  const filterTypes = config.filterTypes || Object.values(SensitiveDataType)
  const whitelistWords = new Set(config.whitelistWords || [])

  // 检查每种敏感信息类型
  for (const type of filterTypes) {
    const pattern = DEFAULT_PATTERNS[type]
    if (!pattern) continue

    let match: RegExpExecArray | null
    // 重置正则表达式的 lastIndex
    pattern.lastIndex = 0

    while ((match = pattern.exec(text)) !== null) {
      const matchedText = match[0]

      // 检查是否在白名单中
      if (whitelistWords.has(matchedText.toLowerCase())) {
        continue
      }

      matches.push({
        type,
        matchedText,
        startIndex: match.index,
        endIndex: match.index + matchedText.length,
        confidence: calculateMatchConfidence(type, matchedText),
      })
    }
  }

  // 检查自定义模式
  if (config.customPatterns) {
    for (const pattern of config.customPatterns) {
      let match: RegExpExecArray | null
      pattern.lastIndex = 0

      while ((match = pattern.exec(text)) !== null) {
        matches.push({
          type: SensitiveDataType.EMAIL, // 使用任意类型作为占位
          matchedText: match[0],
          startIndex: match.index,
          endIndex: match.index + match[0].length,
          confidence: 0.7,
        })
      }
    }
  }

  // 按起始位置排序并合并重叠的匹配
  return mergeOverlappingMatches(matches)
}

/**
 * 计算匹配置信度
 */
function calculateMatchConfidence(type: SensitiveDataType, text: string): number {
  // 基础置信度
  let confidence = 0.5

  // 根据类型和特征调整置信度
  switch (type) {
    case SensitiveDataType.EMAIL:
      // 邮箱格式越完整，置信度越高
      if (text.includes('.') && text.includes('@')) {
        confidence = 0.95
      }
      break

    case SensitiveDataType.PHONE:
      // 有国家代码的电话置信度更高
      if (text.startsWith('+')) {
        confidence = 0.9
      } else {
        confidence = 0.8
      }
      break

    case SensitiveDataType.ID_CARD:
      // 中国身份证有校验位，可以验证
      confidence = validateChineseID(text) ? 0.95 : 0.7
      break

    case SensitiveDataType.CREDIT_CARD:
      // 信用卡号有 Luhn 算法校验
      confidence = validateLuhn(text.replace(/\s/g, '')) ? 0.95 : 0.6
      break

    default:
      confidence = 0.7
  }

  return confidence
}

/**
 * 验证中国身份证号
 */
function validateChineseID(id: string): boolean {
  // 简化验证：检查长度和基本格式
  if (id.length !== 18) return false

  // 前17位应该是数字
  const first17 = id.slice(0, 17)
  if (!/^\d{17}$/.test(first17)) return false

  // 最后一位是数字或X
  const last = id[17].toUpperCase()
  if (!/^\d|X$/.test(last)) return false

  // TODO: 可以添加更复杂的校验位验证
  return true
}

/**
 * Luhn 算法验证信用卡号
 */
function validateLuhn(cardNumber: string): boolean {
  let sum = 0
  let isEven = false

  for (let i = cardNumber.length - 1; i >= 0; i--) {
    let digit = parseInt(cardNumber[i], 10)

    if (isEven) {
      digit *= 2
      if (digit > 9) {
        digit -= 9
      }
    }

    sum += digit
    isEven = !isEven
  }

  return sum % 10 === 0
}

/**
 * 合并重叠的匹配
 */
function mergeOverlappingMatches(matches: SensitiveDataMatch[]): SensitiveDataMatch[] {
  if (matches.length === 0) return []

  // 按起始位置排序
  const sorted = [...matches].sort((a, b) => a.startIndex - b.startIndex)

  const merged: SensitiveDataMatch[] = []
  let current = sorted[0]

  for (let i = 1; i < sorted.length; i++) {
    const next = sorted[i]

    // 如果重叠，选择置信度更高的
    if (next.startIndex <= current.endIndex) {
      if (next.confidence > current.confidence) {
        current = next
      } else {
        // 扩展当前匹配的结束位置
        current.endIndex = Math.max(current.endIndex, next.endIndex)
      }
    } else {
      merged.push(current)
      current = next
    }
  }

  merged.push(current)
  return merged
}

/**
 * 屏蔽敏感信息
 */
export function maskSensitiveData(
  text: string,
  matches: SensitiveDataMatch[],
  maskChar: string = '*'
): string {
  if (matches.length === 0) return text

  let result = text
  let offset = 0

  for (const match of matches) {
    const before = result.slice(0, match.startIndex + offset)
    const masked = maskChar.repeat(match.endIndex - match.startIndex)
    const after = result.slice(match.endIndex + offset)

    result = before + masked + after
    offset += masked.length - (match.endIndex - match.startIndex)
  }

  return result
}

/**
 * 过滤记忆中的敏感信息
 */
export function filterMemoryForPrivacy(
  memory: Memory,
  config: PrivacyFilterConfig = {}
): Memory | null {
  // 检测内容中的敏感信息
  const contentMatches = detectSensitiveData(memory.content, config)
  const summaryMatches = memory.summary ? detectSensitiveData(memory.summary, config) : []

  // 如果没有敏感信息，返回原记忆
  if (contentMatches.length === 0 && summaryMatches.length === 0) {
    return memory
  }

  // 如果配置要求完全过滤掉包含敏感信息的记忆
  if (config.maskContent === false) {
    log.debug('[Privacy Filter] Filtering out memory with sensitive data', {
      memoryId: memory.id,
      contentMatches: contentMatches.length,
      summaryMatches: summaryMatches.length,
    })
    return null
  }

  // 否则，屏蔽敏感内容
  const filtered: Memory = {
    ...memory,
    content: maskSensitiveData(memory.content, contentMatches),
    summary: memory.summary ? maskSensitiveData(memory.summary, summaryMatches) : undefined,
    // 添加标记表明已被过滤
    tags: [...(memory.tags || []), '隐私过滤'],
  }

  log.debug('[Privacy Filter] Masked sensitive data in memory', {
    memoryId: memory.id,
    maskedContent: contentMatches.length,
    maskedSummary: summaryMatches.length,
  })

  return filtered
}

/**
 * 批量过滤记忆
 */
export function filterMemoriesForPrivacy(
  memories: Memory[],
  config: PrivacyFilterConfig = {}
): Memory[] {
  const filtered: Memory[] = []
  let removed = 0

  for (const memory of memories) {
    const result = filterMemoryForPrivacy(memory, config)
    if (result) {
      filtered.push(result)
    } else {
      removed++
    }
  }

  if (removed > 0) {
    log.info('[Privacy Filter] Filtered memories due to sensitive data', {
      total: memories.length,
      removed,
      remaining: filtered.length,
    })
  }

  return filtered
}

/**
 * 检查记忆是否包含敏感信息
 */
export function containsSensitiveData(
  memory: Memory,
  config: PrivacyFilterConfig = {}
): boolean {
  const contentMatches = detectSensitiveData(memory.content, config)
  const summaryMatches = memory.summary ? detectSensitiveData(memory.summary, config) : []

  return contentMatches.length > 0 || summaryMatches.length > 0
}
