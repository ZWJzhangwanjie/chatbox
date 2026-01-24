/**
 * AI Ad Network - Hash 工具函数
 *
 * 提供高性能的字符串哈希功能，用于生成缓存键
 * 使用 FNV-1a 算法（快速且分布均匀）
 *
 * @see ImprovedAdCacheManager.ts - 缓存管理器使用此模块生成缓存键
 */

/**
 * FNV-1a 哈希算法
 *
 * 特点：
 * - 快速：单次遍历字符串
 * - 均匀：哈希值分布均匀
 * - 紧凑：输出 36 进制字符串
 *
 * @param str - 要哈希的字符串
 * @returns 哈希值（36进制字符串）
 *
 * @example
 * ```ts
 * const hash = fnv1aHash('hello world');
 * console.log(hash); // '3v5g7k2m9...'
 * ```
 */
export function fnv1aHash(str: string): string {
  // FNV-1a 算法参数
  // FNV offset basis: 2166136261
  // FNV prime: 16777619
  let hash = 2166136261;

  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  // 转换为无符号 32 位整数
  const unsignedHash = hash >>> 0;

  // 转换为 36 进制字符串（0-9 + a-z）
  // 36 进制比 16 进制更紧凑，可读性更好
  return unsignedHash.toString(36);
}

/**
 * 生成组合哈希
 *
 * 用于多个字符串的组合哈希，保证输入顺序不同时哈希值不同
 *
 * @param parts - 要组合的字符串数组
 * @returns 组合哈希值
 *
 * @example
 * ```ts
 * const hash1 = combinedHash(['session123', 'query', 'actionCard']);
 * const hash2 = combinedHash(['session123', 'query', 'actionCard']);
 * const hash3 = combinedHash(['actionCard', 'query', 'session123']);
 *
 * console.log(hash1 === hash2); // true
 * console.log(hash1 === hash3); // false
 * ```
 */
export function combinedHash(parts: string[]): string {
  // 使用特殊分隔符组合各部分
  // 分隔符使用不太可能出现在实际数据中的字符
  const delimiter = '\x00'; // NULL 字符
  const combined = parts.join(delimiter);

  return fnv1aHash(combined);
}

/**
 * 生成带前缀的缓存键
 *
 * @param prefix - 键前缀（如 'ad:cache'）
 * @param parts - 要组合的字符串数组
 * @returns 完整的缓存键
 *
 * @example
 * ```ts
 * const key = generateCacheKey('ad:cache', ['session123', 'myQuery', 'actionCard']);
 * console.log(key); // 'ad:cache:session123:myQuery:actionCard:3v5g7k2m9...'
 * ```
 */
export function generateCacheKey(prefix: string, parts: string[]): string {
  const hash = combinedHash(parts);
  const combined = parts.join(':');

  // 格式：prefix:combined:hash
  // 这样可以：
  // 1. 通过前缀快速过滤
  // 2. 通过组合字符串查找特定条目
  // 3. 通过哈希值避免冲突
  return `${prefix}:${combined}:${hash}`;
}

/**
 * 验证缓存键的哈希是否匹配
 *
 * 用于检测缓存键是否被篡改或损坏
 *
 * @param key - 缓存键
 * @returns 哈希是否有效
 *
 * @example
 * ```ts
 * const key = 'ad:cache:session123:query:actionCard:3v5g7k2m9';
 * console.log(validateCacheKey(key)); // true 或 false
 * ```
 */
export function validateCacheKey(key: string): boolean {
  const parts = key.split(':');

  // 缓存键格式：prefix:...:hash
  if (parts.length < 2) {
    return false;
  }

  const hash = parts[parts.length - 1];
  const content = parts.slice(0, -1).join(':');

  // 重新计算哈希并比较
  const expectedHash = fnv1aHash(content);

  return hash === expectedHash;
}

/**
 * 生成短 ID
 *
 * 用于生成短的唯一标识符，适合作为缓存键的后缀
 *
 * @returns 短 ID（8个字符的36进制字符串）
 *
 * @example
 * ```ts
 * const id1 = generateShortId();
 * const id2 = generateShortId();
 * console.log(id1 !== id2); // true
 * console.log(id1.length); // 8
 * ```
 */
export function generateShortId(): string {
  // 结合时间戳和随机数生成短 ID
  const timestamp = Date.now();
  const random = Math.random();

  const combined = `${timestamp}${random}`;
  const hash = fnv1aHash(combined);

  // 取前 8 个字符
  return hash.substring(0, 8);
}

/**
 * 计算字符串的相似度哈希
 *
 * 用于检测相似内容，适用于去重场景
 *
 * @param str - 要计算的字符串
 * @returns 相似度哈希值
 *
 * @example
 * ```ts
 * const hash1 = similarityHash('hello world');
 * const hash2 = similarityHash('hello world!');
 * const hash3 = similarityHash('foo bar');
 *
 * console.log(hash1 === hash2); // 可能为 true（相似）
 * console.log(hash1 === hash3); // 可能为 false（不相似）
 * ```
 */
export function similarityHash(str: string): string {
  // 简单的相似度哈希：去除空格和标点，转小写后再哈希
  const normalized = str
    .toLowerCase()
    .replace(/[^\w]/g, '')
    .replace(/\s+/g, '');

  return fnv1aHash(normalized);
}

// ============================================================================
// 导出
// ============================================================================

export default {
  fnv1aHash,
  combinedHash,
  generateCacheKey,
  validateCacheKey,
  generateShortId,
  similarityHash,
};
