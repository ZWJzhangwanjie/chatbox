/**
 * LLM 驱动的记忆提取器
 *
 * 使用大语言模型从对话中智能提取用户记忆
 */

import type { Message } from 'src/shared/types'
import type {
  Memory,
  MemoryType,
  MemorySource,
  MemoryPriority,
  MemoryExtraction,
  ExtractionConfig,
} from 'src/shared/types'
import { v4 as uuidv4 } from 'uuid'
import { sentry } from '../adapters/sentry'
import { getLogger } from '../util'
import { callAiForMemoryExtraction, deduplicateMemories, validateMemory } from './extractor'

const log = getLogger('memory:llm-extractor')

/**
 * LLM 记忆提取配置
 */
export interface LLMExtractionConfig extends ExtractionConfig {
  // LLM 相关配置
  modelId?: string
  maxTokens?: number
  temperature?: number

  // 提取策略
  extractionMode?: 'conservative' | 'balanced' | 'aggressive'

  // 是否提取情绪状态
  extractEmotionalState?: boolean

  // 是否提取长期目标
  extractLongTermGoals?: boolean

  // 是否提取社交关系
  extractSocialRelationships?: boolean
}

/**
 * 从会话中提取记忆（LLM 驱动）
 */
export async function extractMemoriesWithLLM(
  sessionId: string,
  messages: Message[],
  config: LLMExtractionConfig = {}
): Promise<MemoryExtraction> {
  const startTime = Date.now()
  log.info('[LLM Extractor] Starting memory extraction', { sessionId, messageCount: messages.length })

  try {
    // 1. 预处理消息
    const conversationContext = prepareConversationContext(messages, config)

    // 2. 构建提取提示词
    const extractionPrompt = buildExtractionPrompt(conversationContext, config)

    // 3. 调用 LLM 进行提取
    const llmResponse = await callAiForMemoryExtraction(extractionPrompt, config)

    // 4. 解析 LLM 响应
    const extractedMemories = parseLLMResponse(llmResponse, sessionId)

    // 5. 验证记忆
    const validMemories = extractedMemories.filter(validateMemory)

    // 6. 去重
    const uniqueMemories = await deduplicateMemories(validMemories)

    // 7. 计算整体置信度
    const confidence = calculateOverallConfidence(uniqueMemories)

    const duration = Date.now() - startTime
    log.info(`[LLM Extractor] Extraction completed in ${duration}ms`, {
      extracted: extractedMemories.length,
      valid: validMemories.length,
      unique: uniqueMemories.length,
      confidence,
    })

    return {
      memories: uniqueMemories,
      confidence,
      reasoning: `LLM-based extraction using ${config.extractionMode || 'balanced'} mode`,
    }
  } catch (error) {
    const duration = Date.now() - startTime
    log.error('[LLM Extractor] Extraction failed', error)

    sentry.withScope((scope) => {
      scope.setTag('component', 'memory-llm-extractor')
      scope.setTag('operation', 'extract')
      scope.setExtra('sessionId', sessionId)
      scope.setExtra('messageCount', messages.length)
      scope.setExtra('duration', duration)
      sentry.captureException(error)
    })

    // 返回空结果而不是抛出错误，避免阻塞用户流程
    return {
      memories: [],
      confidence: 0,
      reasoning: `Extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    }
  }
}

/**
 * 准备对话上下文
 */
function prepareConversationContext(messages: Message[], config: LLMExtractionConfig): string {
  // 只使用最近的消息，避免超过 token 限制
  const maxMessages = config.maxMessages || 50
  const recentMessages = messages.slice(-maxMessages)

  // 格式化消息
  const formattedMessages = recentMessages
    .map((msg) => {
      const role = msg.role === 'user' ? 'User' : 'Assistant'
      const content = msg.content?.slice(0, 500) || '' // 限制每条消息长度
      return `${role}: ${content}`
    })
    .join('\n\n')

  return formattedMessages
}

/**
 * 构建提取提示词
 */
function buildExtractionPrompt(conversationContext: string, config: LLMExtractionConfig): string {
  const extractionMode = config.extractionMode || 'balanced'

  const modeInstructions: Record<string, string> = {
    conservative: '只提取用户明确表达的信息，如明确的偏好、事实陈述。避免做出推测。',
    balanced: '提取用户明确表达的信息，以及可以合理推断的模式和兴趣。需要有一定的证据支持。',
    aggressive: '提取所有可能的有用信息，包括隐含的模式、潜在的偏好和可能的特征。可以做出合理的推测。',
  }

  const prompt = `你是一个专门分析对话并提取用户记忆的AI助手。你的任务是从以下对话中提取关于用户的重要信息。

**提取模式**: ${extractionMode}
${modeInstructions[extractionMode] || modeInstructions.balanced}

**需要提取的信息类型**:

1. **明确偏好** (explicit_preference): 用户明确表达的好恶、偏好
   - 例如: "我喜欢简洁的回答"、"我讨厌长篇大论"

2. **事实信息** (explicit_fact): 关于用户的事实信息
   - 例如: "我是软件工程师"、"我住在北京"

3. **行为模式** (implicit_pattern): 用户的行为特征和习惯
   - 例如: 用户经常在晚上提问、用户喜欢代码示例

4. **兴趣话题** (implicit_interest): 用户感兴趣的主题
   - 例如: 用户对AI安全很感兴趣、用户关注前端开发

5. **上下文信息** (implicit_context): 对话相关的背景信息
   - 例如: 用户正在开发聊天应用、用户在使用某个框架

${config.extractEmotionalState ? '6. **情绪状态**: 用户在对话中表现出的情绪倾向' : ''}
${config.extractLongTermGoals ? '7. **长期目标**: 用户提到的长期目标或计划' : ''}
${config.extractSocialRelationships ? '8. **社交关系**: 用户提到的人际关系' : ''}

**输出格式**:
请以JSON格式返回提取的记忆，每个记忆包含：
- type: 记忆类型（必须是上述类型之一）
- content: 详细描述（1-2句话）
- summary: 简短摘要（可选）
- importance: 重要性评分（0.0-1.0，基于信息的价值）
- confidence: 置信度（0.0-1.0，基于你的确定程度）
- category: 分类标签（如：个人信息、使用习惯、沟通风格等）

**对话内容**:
\`\`\`
${conversationContext}
\`\`\`

**输出**:
请只返回JSON数组，不要包含其他解释文字：
\`\`\`json
[
  {
    "type": "explicit_preference",
    "content": "...",
    "summary": "...",
    "importance": 0.8,
    "confidence": 0.9,
    "category": "沟通风格"
  },
  ...
]
\`\`\``

  return prompt
}

/**
 * 解析 LLM 响应
 */
function parseLLMResponse(response: string, sessionId: string): Memory[] {
  try {
    // 尝试提取 JSON 数组
    let jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/) ||
                    response.match(/\[[\s\S]*\]/)

    if (!jsonMatch) {
      log.warn('[LLM Extractor] No JSON array found in response', { response: response.slice(0, 200) })
      return []
    }

    const jsonStr = jsonMatch[1] || jsonMatch[0]
    const parsed = JSON.parse(jsonStr)

    if (!Array.isArray(parsed)) {
      log.warn('[LLM Extractor] Response is not an array')
      return []
    }

    // 转换为 Memory 格式
    const memories: Memory[] = []
    const now = Date.now()

    for (const item of parsed) {
      if (!item.type || !item.content) {
        continue
      }

      const memory: Memory = {
        id: uuidv4(),
        userId: 'default',
        type: item.type as MemoryType,
        source: 'implicit' as MemorySource,
        content: item.content,
        summary: item.summary,
        importance: item.importance ?? 0.5,
        confidence: item.confidence ?? 0.5,
        priority: calculatePriorityFromImportance(item.importance ?? 0.5),
        category: item.category,
        relatedSessionId: sessionId,
        createdAt: now,
        updatedAt: now,
        lastAccessedAt: now,
        accessCount: 0,
      }

      memories.push(memory)
    }

    return memories
  } catch (error) {
    log.error('[LLM Extractor] Failed to parse LLM response', error)
    return []
  }
}

/**
 * 根据重要性计算优先级
 */
function calculatePriorityFromImportance(importance: number): MemoryPriority {
  if (importance >= 0.8) return 'critical'
  if (importance >= 0.6) return 'high'
  if (importance >= 0.4) return 'medium'
  return 'low'
}

/**
 * 计算整体置信度
 */
function calculateOverallConfidence(memories: Memory[]): number {
  if (memories.length === 0) return 0

  const totalConfidence = memories.reduce((sum, m) => sum + (m.confidence || 0), 0)
  return totalConfidence / memories.length
}

/**
 * 调用 AI 进行记忆提取
 *
 * 注意：这是一个简化实现。实际使用时需要：
 * 1. 获取当前会话的 AI 模型配置
 * 2. 创建临时会话或使用专门的提取模型
 * 3. 处理 token 限制和错误重试
 */
async function callAiForMemoryExtraction(
  prompt: string,
  config: LLMExtractionConfig
): Promise<string> {
  // 这里需要实际的 LLM 调用实现
  // 暂时返回一个模拟响应

  // TODO: 实现实际的 LLM 调用
  // 1. 获取模型配置
  // 2. 创建 AI SDK 实例
  // 3. 发送请求并获取响应
  // 4. 处理错误和重试

  log.warn('[LLM Extractor] LLM call not implemented, using fallback')
  throw new Error('LLM-based extraction not yet implemented. Use pattern-based extraction instead.')
}
