import { getLogger } from '../util'
import type { Message } from '../../shared/types'
import type {
  Memory,
  MemoryExtraction,
  ExtractionConfig,
  MemoryType,
  MemorySource,
  MemoryPriority,
} from '../../shared/types'
import {
  generateMemoryId,
  DEFAULT_EXTRACTION_CONFIG,
} from '../../shared/types'
import { addMemories, getAllMemories, deduplicateMemories } from './store'
import { filterMemoriesForPrivacy, type PrivacyFilterConfig } from './privacy-filter'
import { calculateImportanceScore } from './importance-scorer'
import { extractMemoriesWithLLM } from './llm-extractor-integrated'

const log = getLogger('memory:extractor')

/**
 * 从会话消息中提取记忆
 * 优先使用 LLM 智能提取，失败时回退到基于规则的提取
 */
export async function extractMemoriesFromSession(
  sessionId: string,
  messages: Message[],
  config: ExtractionConfig = {}
): Promise<MemoryExtraction> {
  const finalConfig = { ...DEFAULT_EXTRACTION_CONFIG, ...config }

  log.info('[MemoryExtractor] ===== 开始提取记忆 =====')
  log.info('[MemoryExtractor] Session:', sessionId)
  log.info('[MemoryExtractor] Message count:', messages.length)
  log.info('[MemoryExtractor] Config:', finalConfig)

  try {
    // 限制分析的消息数量
    const messagesToAnalyze = messages.slice(-finalConfig.maxHistoryLength!)

    // 过滤出用户消息（主要信息来源）
    const userMessages = messagesToAnalyze.filter((m) => m.role === 'user')

    if (userMessages.length === 0) {
      log.info('[MemoryExtractor] 没有用户消息，跳过提取')
      return { memories: [], confidence: 0, reasoning: 'No user messages to analyze' }
    }

    log.info('[MemoryExtractor] 用户消息数量:', userMessages.length)

    // 打印用户消息内容用于调试
    for (let i = 0; i < userMessages.length; i++) {
      const msg = userMessages[i]
      const text = getMessageText(msg)
      log.info(`[MemoryExtractor] 用户消息 ${i + 1}:`, {
        type: msg.type,
        textLength: text.length,
        text: text.substring(0, 100)
      })
    }

    // 优先使用 LLM 智能提取
    log.info('[MemoryExtractor] 尝试使用 LLM 智能提取...')
    const llmResult = await extractMemoriesWithLLM(sessionId, messages, {
      ...finalConfig,
      extractionMode: 'balanced',
      maxTokens: 2000,
    }).catch((error) => {
      log.warn('[MemoryExtractor] LLM 提取失败，将回退到规则提取:', error.message)
      return null
    })

    if (llmResult && llmResult.memories.length > 0) {
      log.info('[MemoryExtractor] LLM 提取成功，提取到', llmResult.memories.length, '条记忆')
      return llmResult
    }

    log.info('[MemoryExtractor] LLM 提取未返回结果，回退到基于规则的提取...')

    // 获取现有记忆用于去重
    const existingMemories = await getAllMemories()
    const existingContentSet = new Set(existingMemories.map((m) => m.content.toLowerCase()))
    log.info('[MemoryExtractor] 现有记忆数量:', existingMemories.length)

    // 提取各类记忆
    const extractedMemories: Omit<Memory, 'embeddingId'>[] = []

    // 1. 提取明确偏好
    if (finalConfig.extractExplicitPreferences) {
      log.info('[MemoryExtractor] 开始提取明确偏好...')
      const preferences = await extractExplicitPreferences(userMessages, existingContentSet)
      log.info('[MemoryExtractor] 提取到偏好数量:', preferences.length)
      extractedMemories.push(...preferences)
    }

    // 2. 提取事实信息
    if (finalConfig.extractFactualInfo) {
      log.info('[MemoryExtractor] 开始提取事实信息...')
      const facts = await extractFactualInfo(userMessages, existingContentSet)
      log.info('[MemoryExtractor] 提取到事实数量:', facts.length)
      extractedMemories.push(...facts)
    }

    // 3. 提取行为模式
    if (finalConfig.extractImplicitPatterns) {
      log.info('[MemoryExtractor] 开始提取行为模式...')
      const patterns = await extractBehaviorPatterns(userMessages, messagesToAnalyze, existingContentSet)
      log.info('[MemoryExtractor] 提取到模式数量:', patterns.length)
      extractedMemories.push(...patterns)
    }

    log.info('[MemoryExtractor] 规则提取总计:', extractedMemories.length, '条记忆')

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
 * 识别模式："我喜欢..."、"我偏好..."、"我习惯..."、"我爱..."等
 */
async function extractExplicitPreferences(
  userMessages: Message[],
  existing: Set<string>
): Promise<Omit<Memory, 'embeddingId'>[]> {
  const preferences: Omit<Memory, 'embeddingId'>[] = []

  // 扩展模式匹配，支持更多表达方式
  const patterns = [
    // 中文偏好表达
    { pattern: /我(?:喜欢|偏好|爱|想要|希望|更倾向于).{0,5}?(.+?)(?:[。，！？.!?]|$)/gi, type: 'preference' },
    { pattern: /(?:我的)?(?:爱好|兴趣|喜好).{0,3}?(?:是|为).{0,3}?(.+?)(?:[。，！？.!?]|$)/gi, type: 'hobby' },
    { pattern: /我比较.{0,3}?(?:喜欢|偏爱).{0,3}?(.+?)(?:[。，！？.!?]|$)/gi, type: 'preference' },
    // 英文偏好表达
    { pattern: /I\s+(?:like|love|prefer|enjoy|want|would like).{0,5}?\s+(.+?)(?:[.!?]|$)/gi, type: 'preference' },
    { pattern: /my\s+(?:favorite|preference).{0,3}?\s+(?:is|are).{0,3}?\s+(.+?)(?:[.!?]|$)/gi, type: 'favorite' },
  ]

  for (const msg of userMessages) {
    const text = getMessageText(msg)
    log.info('[MemoryExtractor] 分析消息:', text.substring(0, 50))

    for (const { pattern, type } of patterns) {
      const matches = text.matchAll(pattern)
      const matchArray = Array.from(matches)
      if (matchArray.length > 0) {
        log.info('[MemoryExtractor] 模式匹配成功:', { type, matchCount: matchArray.length })
      }

      for (const match of matchArray) {
        const content = match[1]?.trim()
        if (!content || content.length < 2) {
          log.info('[MemoryExtractor] 内容太短，跳过:', content)
          continue
        }

        // 使用改进的去重检查
        if (isDuplicate(content, existing, 0.7)) {
          log.info('[MemoryExtractor] 重复内容，跳过:', content)
          continue
        }

        log.info('[MemoryExtractor] 提取到偏好:', content)

        preferences.push({
          id: generateMemoryId(),
          userId: 'default',
          type: 'explicit_preference' as MemoryType,
          source: 'implicit' as MemorySource,
          content: `用户偏好: ${content}`,
          summary: `${content.substring(0, 30)}${content.length > 30 ? '...' : ''}`,
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

  log.info('[MemoryExtractor] 提取到偏好:', preferences.length)
  return preferences
}

/**
 * 提取事实信息
 * 识别个人信息：职业、技能、兴趣、关系等
 */
async function extractFactualInfo(
  userMessages: Message[],
  existing: Set<string>
): Promise<Omit<Memory, 'embeddingId'>[]> {
  const facts: Omit<Memory, 'embeddingId'>[] = []

  // 职业相关模式
  const professionPatterns = [
    /我(?:是|是一名?|从事).{0,10}?(程序员|工程师|设计师|产品经理|学生|老师|医生|律师|分析师|开发人员|架构师|测试|运营|销售|总监|经理|专家)/gi,
    /(?:我的)?(?:职业|工作).{0,3}?(?:是|为).{0,3}?(.+?)(?:[。，！？.!?]|$)/gi,
    /我(?:在|目前).{0,5}?(.+?)(?:公司|厂|学校|机构|组织)工作/gi,
    // 英文
    /I\s+am\s+(?:a\s+)?(.+?)(?:developer|engineer|designer|manager|student|teacher|doctor|lawyer|analyst)(?:[.!?]|$)/gi,
    /I\s+work\s+(?:at|for|in).{0,5}?(.+?)(?:[.!?]|$)/gi,
  ]

  // 技能相关模式
  const skillPatterns = [
    /我(?:会|能|擅长|精通|熟悉).{0,3}?(.+?)(?:[。，！？.!?]|$)/gi,
    /我(?:学过|用过|掌握).{0,3}?(.+?)(?:[。，！？.!?]|$)/gi,
    // 英文
    /I\s+(?:can|know|good at|skill).{0,5}?\s+(.+?)(?:[.!?]|$)/gi,
  ]

  // 兴趣相关模式
  const interestPatterns = [
    /我(?:对|感兴趣于).{0,3}?(.+?)(?:感兴趣|有趣)/gi,
    /我(?:喜欢|爱).{0,3}?(.+?)(?:相关的)/gi,
    // 英文
    /I\s+am\s+interested\s+in.{0,5}?\s+(.+?)(?:[.!?]|$)/gi,
  ]

  // 关系相关模式
  const relationPatterns = [
    /我(?:有|的).{0,5}?(?:家人|孩子|儿子|女儿|父母|妻子|丈夫|伴侣|室友|朋友)/gi,
  ]

  const allPatterns = [
    ...professionPatterns.map((p) => ({ pattern: p, type: 'profession' })),
    ...skillPatterns.map((p) => ({ pattern: p, type: 'skill' })),
    ...interestPatterns.map((p) => ({ pattern: p, type: 'interest' })),
    ...relationPatterns.map((p) => ({ pattern: p, type: 'relation' })),
  ]

  for (const msg of userMessages) {
    const text = getMessageText(msg)

    for (const { pattern, type } of allPatterns) {
      const matches = text.matchAll(pattern)

      for (const match of matches) {
        const content = typeof match === 'string' ? match : match[1]
        if (!content || content.length < 2) continue

        // 使用改进的去重检查
        if (isDuplicate(content, existing, 0.6)) {
          continue
        }

        const categoryMap = {
          profession: 'personal-info',
          skill: 'skill',
          interest: 'interest',
          relation: 'relation',
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
          category: categoryMap[type] || 'personal-info',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          lastAccessedAt: Date.now(),
          accessCount: 0,
          relatedSessionId: msg.metadata?.sessionId,
          tags: ['fact', type],
        })

        existing.add(content.toLowerCase())
      }
    }
  }

  log.info('[MemoryExtractor] 提取到事实信息:', facts.length)
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
 * 检查是否重复（改进版）
 * 使用相似度阈值而不是完全匹配
 */
function isDuplicate(content: string, existing: Set<string>, similarityThreshold = 0.8): boolean {
  const normalized = content.toLowerCase().trim()

  // 完全匹配
  if (existing.has(normalized)) {
    return true
  }

  // 计算相似度（使用简单的字符串包含关系）
  for (const existingContent of existing) {
    const existingLower = existingContent.toLowerCase()

    // 如果新内容被现有内容包含，且长度相近，认为是重复
    if (existingLower.includes(normalized)) {
      const ratio = normalized.length / existingLower.length
      if (ratio >= 0.7) {
        return true
      }
    }

    // 如果现有内容被新内容包含，且长度相近，认为是重复
    if (normalized.includes(existingLower)) {
      const ratio = existingLower.length / normalized.length
      if (ratio >= 0.7) {
        return true
      }
    }
  }

  return false
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
