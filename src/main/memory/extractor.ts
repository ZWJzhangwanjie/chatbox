import { getLogger } from '../util'
import type { Message } from 'src/shared/types'
import type {
  Memory,
  MemoryExtraction,
  ExtractionConfig,
  MemoryType,
  MemorySource,
  MemoryPriority,
} from 'src/shared/types'
import {
  generateMemoryId,
  DEFAULT_EXTRACTION_CONFIG,
} from 'src/shared/types'
import { addMemories, getAllMemories } from './store'
import { filterMemoriesForPrivacy, type PrivacyFilterConfig } from './privacy-filter'
import { calculateImportanceScore } from './importance-scorer'

const log = getLogger('memory:extractor')

/**
 * 从会话消息中提取记忆
 */
export async function extractMemoriesFromSession(
  sessionId: string,
  messages: Message[],
  config: ExtractionConfig = {}
): Promise<MemoryExtraction> {
  const finalConfig = { ...DEFAULT_EXTRACTION_CONFIG, ...config }

  log.debug('[MemoryExtractor] Extracting memories from session:', sessionId)
  log.debug('[MemoryExtractor] Config:', finalConfig)

  try {
    // 限制分析的消息数量
    const messagesToAnalyze = messages.slice(-finalConfig.maxHistoryLength!)

    // 过滤出用户消息（主要信息来源）
    const userMessages = messagesToAnalyze.filter((m) => m.role === 'user')

    if (userMessages.length === 0) {
      log.debug('[MemoryExtractor] No user messages to analyze')
      return { memories: [], confidence: 0 }
    }

    // 获取现有记忆用于去重
    const existingMemories = await getAllMemories()
    const existingContentSet = new Set(existingMemories.map((m) => m.content.toLowerCase()))

    // 提取各类记忆
    const extractedMemories: Omit<Memory, 'embeddingId'>[] = []

    // 1. 提取明确偏好
    if (finalConfig.extractExplicitPreferences) {
      const preferences = await extractExplicitPreferences(userMessages, existingContentSet)
      extractedMemories.push(...preferences)
    }

    // 2. 提取事实信息
    if (finalConfig.extractFactualInfo) {
      const facts = await extractFactualInfo(userMessages, existingContentSet)
      extractedMemories.push(...facts)
    }

    // 3. 提取行为模式
    if (finalConfig.extractImplicitPatterns) {
      const patterns = await extractBehaviorPatterns(userMessages, messagesToAnalyze, existingContentSet)
      extractedMemories.push(...patterns)
    }

    // 过滤低置信度记忆
    const filteredMemories = extractedMemories.filter((m) => m.confidence >= finalConfig.minConfidence!)

    // 隐私过滤（如果启用）
    let privacyFilteredMemories = filteredMemories
    if (finalConfig.privacyMode) {
      const privacyConfig: PrivacyFilterConfig = {
        enabled: true,
        maskContent: false, // 完全过滤掉包含敏感信息的记忆
      }
      privacyFilteredMemories = filteredMemories
        .map((m) => filterMemoryForPrivacy(m, privacyConfig))
        .filter((m): m is Memory => m !== null)

      log.debug('[MemoryExtractor] Privacy filtered', {
        before: filteredMemories.length,
        after: privacyFilteredMemories.length,
      })
    }

    // 限制数量
    const limitedMemories = privacyFilteredMemories.slice(0, finalConfig.maxMemoriesPerSession!)

    // 自动计算重要性评分（如果未设置）
    const scoredMemories = limitedMemories.map((memory) => ({
      ...memory,
      importance: memory.importance || calculateImportanceScore(memory),
    }))

    // 存储到数据库
    const stored = await addMemories(scoredMemories)

    log.info('[MemoryExtractor] Extraction complete:', {
      sessionId,
      extracted: stored.length,
      confidence: calculateOverallConfidence(stored),
    })

    return {
      memories: stored,
      confidence: calculateOverallConfidence(stored),
      reasoning: `Extracted ${stored.length} memories from ${userMessages.length} user messages`,
    }
  } catch (error) {
    log.error('[MemoryExtractor] Extraction failed:', error)
    return { memories: [], confidence: 0 }
  }
}

/**
 * 提取明确偏好
 * 识别模式："我喜欢..."、"我偏好..."、"我习惯..."
 */
async function extractExplicitPreferences(
  userMessages: Message[],
  existing: Set<string>
): Promise<Omit<Memory, 'embeddingId'>[]> {
  const preferences: Omit<Memory, 'embeddingId'>[] = []
  const patterns = [
    /我喜欢.*?(.+)/gi,
    /我偏好.*?(.+)/gi,
    /我习惯.*?(.+)/gi,
    /我希望.*?(.+)/gi,
    /我想要.*?(.+)/gi,
  ]

  for (const msg of userMessages) {
    const text = getMessageText(msg)

    for (const pattern of patterns) {
      const matches = text.matchAll(pattern)

      for (const match of matches) {
        const content = match[1]?.trim()
        if (!content) continue

        // 简单去重检查
        if (isDuplicate(content, existing)) {
          continue
        }

        preferences.push({
          id: generateMemoryId(),
          userId: 'default',
          type: 'explicit_preference' as MemoryType,
          source: 'implicit' as MemorySource,
          content: `用户偏好: ${content}`,
          summary: `偏好: ${content.substring(0, 30)}${content.length > 30 ? '...' : ''}`,
          importance: 0.7,
          confidence: 0.8,
          priority: 3, // HIGH
          category: 'preference',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          lastAccessedAt: Date.now(),
          accessCount: 0,
          relatedSessionId: msg.metadata?.sessionId,
          tags: ['preference', 'explicit'],
        })

        existing.add(content.toLowerCase())
      }
    }
  }

  log.debug('[MemoryExtractor] Extracted explicit preferences:', preferences.length)
  return preferences
}

/**
 * 提取事实信息
 * 识别个人信息：职业、技能、兴趣等
 */
async function extractFactualInfo(
  userMessages: Message[],
  existing: Set<string>
): Promise<Omit<Memory, 'embeddingId'>[]> {
  const facts: Omit<Memory, 'embeddingId'>[] = []

  // 职业相关模式
  const professionPatterns = [
    /我是.*?(程序员|工程师|设计师|产品经理|学生|老师|医生|律师|分析师)/gi,
    /我的职业是.*?(.+)/gi,
    /我工作.*?(.+)/gi,
  ]

  // 技能相关模式
  const skillPatterns = [
    /我会.*?(编程|写作|设计|绘画|音乐|摄影)/gi,
    /我擅长.*?(.+)/gi,
    /我熟悉.*?(.+)/gi,
  ]

  // 兴趣相关模式
  const interestPatterns = [
    /我对.*?感兴趣/gi,
    /我喜欢.*?相关的/gi,
  ]

  const allPatterns = [...professionPatterns, ...skillPatterns, ...interestPatterns]

  for (const msg of userMessages) {
    const text = getMessageText(msg)

    for (const pattern of allPatterns) {
      const matches = text.match(pattern)

      for (const match of matches) {
        const content = typeof match === 'string' ? match : match[1]
        if (!content) continue

        if (isDuplicate(content, existing)) {
          continue
        }

        facts.push({
          id: generateMemoryId(),
          userId: 'default',
          type: 'explicit_fact' as MemoryType,
          source: 'implicit' as MemorySource,
          content: `用户信息: ${content}`,
          summary: `${content.substring(0, 30)}${content.length > 30 ? '...' : ''}`,
          importance: 0.6,
          confidence: 0.7,
          priority: 2, // MEDIUM
          category: 'personal-info',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          lastAccessedAt: Date.now(),
          accessCount: 0,
          relatedSessionId: msg.metadata?.sessionId,
          tags: ['fact'],
        })

        existing.add(content.toLowerCase())
      }
    }
  }

  log.debug('[MemoryExtractor] Extracted factual info:', facts.length)
  return facts
}

/**
 * 提取行为模式
 * 分析时间、频率、沟通风格等
 */
async function extractBehaviorPatterns(
  userMessages: Message[],
  allMessages: Message[],
  existing: Set<string>
): Promise<Omit<Memory, 'embeddingId'>[]> {
  const patterns: Omit<Memory, 'embeddingId'>[] = []

  // 分析时间模式
  const hours = userMessages.map((m) => new Date(m.timestamp).getHours())
  const nightUsage = hours.filter((h) => h >= 22 || h <= 6).length
  const dayUsage = hours.length - nightUsage

  if (nightUsage > dayUsage * 0.7) {
    const content = '用户主要在晚上/深夜使用应用'
    if (!isDuplicate(content, existing)) {
      patterns.push({
        id: generateMemoryId(),
        userId: 'default',
        type: 'implicit_pattern' as MemoryType,
        source: 'inferred' as MemorySource,
        content,
        summary: '夜间使用习惯',
        importance: 0.4,
        confidence: 0.6,
        priority: 2, // MEDIUM
        category: 'usage-pattern',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        lastAccessedAt: Date.now(),
        accessCount: 0,
        tags: ['pattern', 'time'],
      })
      existing.add(content.toLowerCase())
    }
  }

  // 分析消息长度（沟通风格）
  const avgLength = userMessages.reduce((sum, m) => sum + getMessageText(m).length, 0) / userMessages.length

  if (avgLength < 50) {
    const content = '用户偏好简洁的沟通方式'
    if (!isDuplicate(content, existing)) {
      patterns.push({
        id: generateMemoryId(),
        userId: 'default',
        type: 'implicit_pattern' as MemoryType,
        source: 'inferred' as MemorySource,
        content,
        summary: '简洁沟通风格',
        importance: 0.5,
        confidence: 0.5,
        priority: 2, // MEDIUM
        category: 'communication-style',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        lastAccessedAt: Date.now(),
        accessCount: 0,
        tags: ['pattern', 'style'],
      })
      existing.add(content.toLowerCase())
    }
  } else if (avgLength > 200) {
    const content = '用户偏好详细、描述性的沟通方式'
    if (!isDuplicate(content, existing)) {
      patterns.push({
        id: generateMemoryId(),
        userId: 'default',
        type: 'implicit_pattern' as MemoryType,
        source: 'inferred' as MemorySource,
        content,
        summary: '详细沟通风格',
        importance: 0.5,
        confidence: 0.5,
        priority: 2, // MEDIUM
        category: 'communication-style',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        lastAccessedAt: Date.now(),
        accessCount: 0,
        tags: ['pattern', 'style'],
      })
      existing.add(content.toLowerCase())
    }
  }

  log.debug('[MemoryExtractor] Extracted behavior patterns:', patterns.length)
  return patterns
}

/**
 * 计算整体置信度
 */
function calculateOverallConfidence(memories: Omit<Memory, 'embeddingId'>[]): number {
  if (memories.length === 0) return 0

  const avgConfidence = memories.reduce((sum, m) => sum + m.confidence, 0) / memories.length
  return avgConfidence
}

/**
 * 检查是否重复
 */
function isDuplicate(content: string, existing: Set<string>): boolean {
  const normalized = content.toLowerCase().trim()
  return existing.has(normalized) || Array.from(existing).some((e) => e.includes(normalized) || normalized.includes(e))
}

/**
 * 获取消息文本内容
 */
function getMessageText(message: Message): string {
  if (message.contentParts && message.contentParts.length > 0) {
    return message.contentParts
      .filter((p) => p.type === 'text')
      .map((p) => 'text' in p ? p.text : '')
      .join('')
  }
  return ''
}
