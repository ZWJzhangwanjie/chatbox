/**
 * AI Ad Network - 隐私处理工具
 *
 * 提供数据脱敏和隐私保护功能
 * 确保用户敏感信息不被发送到广告API
 *
 * @see adConfigSchema.ts - 配置定义
 * @see types.ts - 类型定义
 */

import type { UserMemory, UserProfile } from '../core/types';

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 脱敏后的用户记忆
 */
export interface AnonymizedMemory {
  /** 提取的话题标签 */
  topics: string[];
  /** 脱敏后的实体信息 */
  entities: Record<string, string>;
  /** 脱敏标记 */
  anonymized: boolean;
}

/**
 * 脱敏后的用户画像
 */
export interface AnonymizedProfile {
  /** 兴趣标签 */
  interests: string[];
  /** 行为模式（已脱敏） */
  behaviorPattern: string;
  /** 语言（如果安全） */
  language?: string;
  /** 时区（如果安全） */
  timezone?: string;
  /** 脱敏标记 */
  anonymized: boolean;
}

/**
 * 脱敏选项
 */
export interface AnonymizeOptions {
  /** 是否保留数字 */
  keepNumbers?: boolean;
  /** 是否保留邮箱域名 */
  keepEmailDomain?: boolean;
  /** 自定义替换文本 */
  replacementText?: string;
  /** 要额外脱敏的字段 */
  additionalFields?: string[];
}

// ============================================================================
// 敏感信息模式
// ============================================================================

/**
 * 敏感信息检测模式
 */
export const SENSITIVE_PATTERNS = {
  // 电子邮件
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/gi,

  // 电话号码（多种格式）- 顺序很重要，先匹配更复杂的格式
  phone: /(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g,

  // 信用卡号
  creditCard: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b|\b\d{16}\b/g,

  // SSN（社会安全号）
  ssn: /\b\d{3}[-]?\d{2}[-]?\d{4}\b/g,

  // IP地址
  ipAddress: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g,

  // URL（可能包含敏感信息）
  url: /https?:\/\/[^\s<>"{}|\\^`\[\]]+/g,

  // 密码相关
  password: /password[:\s]*[^\s,;.!?]+/gi,
  secret: /secret[:\s]*[^\s,;.!?]+/gi,
  token: /token[:\s]*[^\s,;.!?]+/gi,
  apiKey: /api[_-]?key[:\s]*[^\s,;.!?]+/gi,
};

/**
 * 敏感字段名称
 */
export const SENSITIVE_FIELDS = [
  'password',
  'secret',
  'token',
  'apiKey',
  'api_key',
  'accessToken',
  'access_token',
  'refreshToken',
  'refresh_token',
  'ssn',
  'socialSecurity',
  'creditCard',
  'bankAccount',
  'phone',
  'email',
  'address',
  'fullName',
  'firstName',
  'lastName',
  'name',
];

// ============================================================================
// 文本脱敏
// ============================================================================

/**
 * 脱敏文本中的敏感信息
 *
 * @param text - 原始文本
 * @param options - 脱敏选项
 * @returns 脱敏后的文本
 *
 * @example
 * ```ts
 * const original = 'Contact me at john@example.com or call 555-123-4567';
 * const anonymized = anonymizeText(original);
 * // 'Contact me at ***@***.*** or call ***-***-****'
 * ```
 */
export function anonymizeText(
  text: string,
  options: AnonymizeOptions = {}
): string {
  const {
    keepNumbers = false,
    keepEmailDomain = false,
    replacementText = '***',
  } = options;

  let result = text;

  // 脱敏电子邮件
  result = result.replace(SENSITIVE_PATTERNS.email, (match) => {
    if (keepEmailDomain) {
      const [local, domain] = match.split('@');
      const anonymizedLocal = replacementText.repeat(Math.min(3, local.length));
      return `${anonymizedLocal}@${domain}`;
    }
    return replacementText.repeat(Math.min(3, match.length));
  });

  // 脱敏电话号码
  if (!keepNumbers) {
    result = result.replace(SENSITIVE_PATTERNS.phone, replacementText);
  }

  // 脱敏信用卡号
  if (!keepNumbers) {
    result = result.replace(SENSITIVE_PATTERNS.creditCard, '****-****-****-****');
  }

  // 脱敏SSN
  if (!keepNumbers) {
    result = result.replace(SENSITIVE_PATTERNS.ssn, '***-**-****');
  }

  // 脱敏IP地址
  if (!keepNumbers) {
    result = result.replace(SENSITIVE_PATTERNS.ipAddress, '***.***.***.***');
  }

  // 脱敏URL（保留域名）
  result = result.replace(SENSITIVE_PATTERNS.url, (match) => {
    try {
      const url = new URL(match);
      const domain = url.hostname;
      return `[URL: ${domain}]`;
    } catch {
      return '[URL]';
    }
  });

  // 脱敏密码/密钥相关
  result = result.replace(SENSITIVE_PATTERNS.password, 'password: [REDACTED]');
  result = result.replace(SENSITIVE_PATTERNS.secret, 'secret: [REDACTED]');
  result = result.replace(SENSITIVE_PATTERNS.token, 'token: [REDACTED]');
  result = result.replace(SENSITIVE_PATTERNS.apiKey, 'apiKey: [REDACTED]');

  return result;
}

/**
 * 检测文本中是否包含敏感信息
 *
 * @param text - 要检测的文本
 * @returns 是否包含敏感信息
 */
export function containsSensitiveInfo(text: string): boolean {
  for (const pattern of Object.values(SENSITIVE_PATTERNS)) {
    if (pattern.test(text)) {
      return true;
    }
  }
  return false;
}

/**
 * 获取文本中的敏感信息类型
 *
 * @param text - 要检测的文本
 * @returns 敏感信息类型列表
 */
export function getSensitiveInfoTypes(text: string): string[] {
  const types: string[] = [];

  if (SENSITIVE_PATTERNS.email.test(text)) types.push('email');
  if (SENSITIVE_PATTERNS.phone.test(text)) types.push('phone');
  if (SENSITIVE_PATTERNS.creditCard.test(text)) types.push('creditCard');
  if (SENSITIVE_PATTERNS.ssn.test(text)) types.push('ssn');
  if (SENSITIVE_PATTERNS.ipAddress.test(text)) types.push('ipAddress');
  if (SENSITIVE_PATTERNS.url.test(text)) types.push('url');
  if (SENSITIVE_PATTERNS.password.test(text)) types.push('password');
  if (SENSITIVE_PATTERNS.secret.test(text)) types.push('secret');
  if (SENSITIVE_PATTERNS.token.test(text)) types.push('token');
  if (SENSITIVE_PATTERNS.apiKey.test(text)) types.push('apiKey');

  return types;
}

// ============================================================================
// 对象脱敏
// ============================================================================

/**
 * 脱敏对象中的敏感字段
 *
 * @param obj - 原始对象
 * @param options - 脱敏选项
 * @returns 脱敏后的对象
 *
 * @example
 * ```ts
 * const original = {
 *   name: 'John Doe',
 *   email: 'john@example.com',
 *   age: 30,
 * };
 * const anonymized = anonymizeObject(original);
 * // { name: '***', email: '***@***.***', age: 30 }
 * ```
 */
export function anonymizeObject<T extends Record<string, unknown>>(
  obj: T,
  options: AnonymizeOptions = {}
): T {
  const { additionalFields = [] } = options;
  const result: Record<string, unknown> = { ...obj };
  const sensitiveFields = new Set([...SENSITIVE_FIELDS, ...additionalFields]);

  for (const key of Object.keys(result)) {
    const value = result[key];

    // 检查是否为敏感字段
    if (sensitiveFields.has(key) || SENSITIVE_FIELDS.some((sf) => key.toLowerCase().includes(sf))) {
      result[key] = '***';
      continue;
    }

    // 递归处理嵌套对象
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      result[key] = anonymizeObject(value as Record<string, unknown>, options);
      continue;
    }

    // 处理字符串值
    if (typeof value === 'string') {
      result[key] = anonymizeText(value, options);
    }

    // 处理数组中的字符串
    if (Array.isArray(value)) {
      result[key] = value.map((item) => {
        if (typeof item === 'string') {
          return anonymizeText(item, options);
        }
        if (typeof item === 'object' && item !== null) {
          return anonymizeObject(item as Record<string, unknown>, options);
        }
        return item;
      });
    }
  }

  return result as T;
}

// ============================================================================
// 用户记忆脱敏
// ============================================================================

/**
 * 脱敏用户记忆
 *
 * @param memory - 原始用户记忆
 * @param options - 脱敏选项
 * @returns 脱敏后的用户记忆
 *
 * @example
 * ```ts
 * const original = {
 *   shortTerm: {
 *     email: 'john@example.com',
 *     preference: 'dark_mode',
 *   },
 *   longTerm: {
 *     name: 'John',
 *   },
 * };
 * const anonymized = anonymizeMemory(original);
 * // {
 * //   topics: ['preference'],
 * //   entities: { email: '***@***.***', preference: 'dark_mode' },
 * //   anonymized: true,
 * // }
 * ```
 */
export function anonymizeMemory(
  memory: UserMemory,
  options: AnonymizeOptions = {}
): AnonymizedMemory {
  const topics: string[] = [];
  const entities: Record<string, string> = {};

  // 处理短期记忆
  for (const [key, value] of Object.entries(memory.shortTerm)) {
    const processedValue = processValue(key, value, options);
    if (processedValue !== null) {
      entities[key] = processedValue;

      // 提取话题（非敏感的短值）
      if (!isSensitiveKey(key) && typeof value === 'string' && value.length < 50) {
        topics.push(value);
      }
    }
  }

  // 处理长期记忆
  for (const [key, value] of Object.entries(memory.longTerm)) {
    const processedValue = processValue(key, value, options);
    if (processedValue !== null && !entities[key]) {
      entities[key] = processedValue;

      // 提取话题
      if (!isSensitiveKey(key) && typeof value === 'string' && value.length < 50) {
        topics.push(value);
      }
    }
  }

  return {
    topics: [...new Set(topics)].slice(0, 10), // 去重并限制数量
    entities,
    anonymized: true,
  };
}

/**
 * 处理单个值
 */
function processValue(key: string, value: unknown, options: AnonymizeOptions): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'string') {
    return isSensitiveKey(key) ? '***' : anonymizeText(value, options);
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  return JSON.stringify(anonymizeObject(value as Record<string, unknown>, options));
}

/**
 * 检查是否为敏感字段
 */
function isSensitiveKey(key: string): boolean {
  return SENSITIVE_FIELDS.some((sf) => key.toLowerCase().includes(sf));
}

// ============================================================================
// 用户画像脱敏
// ============================================================================

/**
 * 脱敏用户画像
 *
 * @param profile - 原始用户画像
 * @param options - 脱敏选项
 * @returns 脱敏后的用户画像
 *
 * @example
 * ```ts
 * const original = {
 *   interests: ['programming', 'ai'],
 *   demographics: {
 *     ageRange: '25-34',
 *     language: 'en',
 *     timezone: 'America/New_York',
 *   },
 *   behaviorPattern: {
 *     preferredTopics: ['coding', 'learning'],
 *     interactionStyle: 'detailed',
 *   },
 * };
 * const anonymized = anonymizeProfile(original);
 * // {
 * //   interests: ['programming', 'ai'],
 * //   behaviorPattern: 'detailed',
 * //   language: 'en',
 * //   timezone: 'America/New_York',
 * //   anonymized: true,
 * // }
 * ```
 */
export function anonymizeProfile(
  profile: UserProfile,
  options: AnonymizeOptions = {}
): AnonymizedProfile {
  return {
    interests: profile.interests,
    behaviorPattern: profile.behaviorPattern?.interactionStyle || 'unknown',
    language: profile.demographics?.language,
    timezone: profile.demographics?.timezone,
    anonymized: true,
  };
}

// ============================================================================
// 批量脱敏
// ============================================================================

/**
 * 批量脱敏消息列表
 *
 * @param messages - 消息列表
 * @param options - 脱敏选项
 * @returns 脱敏后的消息列表
 */
export function anonymizeMessages(
  messages: Array<{ role: string; content: string }>,
  options: AnonymizeOptions = {}
): Array<{ role: string; content: string; hasSensitiveInfo: boolean }> {
  return messages.map((msg) => {
    const anonymizedContent = anonymizeText(msg.content, options);
    return {
      role: msg.role,
      content: anonymizedContent,
      hasSensitiveInfo: msg.content !== anonymizedContent,
    };
  });
}

// ============================================================================
// 隐私同意管理
// ============================================================================

/**
 * 检查用户是否同意数据收集
 *
 * @param consentRecord - 同意记录
 * @param dataType - 数据类型
 * @returns 是否同意
 */
export function hasUserConsent(
  consentRecord: Record<string, boolean | undefined>,
  dataType: 'query' | 'response' | 'context' | 'memory' | 'profile'
): boolean {
  return consentRecord[dataType] ?? false;
}

/**
 * 构建隐私报告
 *
 * @param originalData - 原始数据
 * @param anonymizedData - 脱敏后的数据
 * @returns 隐私报告
 */
export function buildPrivacyReport(
  originalData: unknown,
  anonymizedData: unknown
): {
  originalSize: number;
  anonymizedSize: number;
  fieldsProcessed: number;
  sensitiveFieldsFound: number;
  dataTypes: string[];
} {
  const originalStr = JSON.stringify(originalData);
  const anonymizedStr = JSON.stringify(anonymizedData);

  return {
    originalSize: originalStr.length,
    anonymizedSize: anonymizedStr.length,
    fieldsProcessed: Object.keys(originalData as Record<string, unknown>).length,
    sensitiveFieldsFound: SENSITIVE_FIELDS.filter((field) =>
      originalStr.toLowerCase().includes(field)
    ).length,
    dataTypes: getSensitiveInfoTypes(originalStr),
  };
}

// ============================================================================
// 导出
// ============================================================================

export default {
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
};
