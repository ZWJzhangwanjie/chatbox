/**
 * LLM 驱动的记忆提取器（集成版）
 *
 * 使用项目现有的 AI 基础设施从对话中智能提取用户记忆
 */

import type { Message } from '../../shared/types'
import type {
  Memory,
  MemoryType,
  MemorySource,
  MemoryPriority,
  MemoryExtraction,
  ExtractionConfig,
} from '../../shared/types'
import type { ModelMessage } from '../../shared/types'
import { getModel } from '../../shared/models'
import { createModelDependencies } from '../adapters'
import { getSettings } from '../store-node'
import { sentry } from '../adapters/sentry'
import { getLogger } from '../util'
import { v4 as uuidv4 } from 'uuid'
import {
  generateMemoryId,
  DEFAULT_EXTRACTION_CONFIG,
} from '../../shared/types'
import { deduplicateMemories, getAllMemories, addMemories } from './store'

const log = getLogger('memory:llm-extractor')

/**
 * LLM 记忆提取配置
 */
export interface LLMExtractionConfig extends ExtractionConfig {
  // 使用的模型（可选，默认使用当前会话模型）
  providerId?: string
  modelId?: string

  // 提取策略
  extractionMode?: 'conservative' | 'balanced' | 'aggressive'

  // 最大 token 使用量
  maxTokens?: number
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
    // 1. 获取模型配置
    const modelConfig = await getExtractionModelConfig(config)

    // 2. 准备对话上下文
    const conversationContext = prepareConversationContext(messages, config)

    // 3. 构建提取提示词
    const extractionPrompt = buildExtractionPrompt(conversationContext, config)

    // 4. 调用 LLM 进行提取
    const llmResponse = await callLLMForExtraction(extractionPrompt, modelConfig)

    // 5. 解析 LLM 响应
    const extractedMemories = parseLLMResponse(llmResponse, sessionId)

    // 6. 去重
    const uniqueMemories = await deduplicateMemories(extractedMemories)

    // 7. 限制数量
    const limitedMemories = uniqueMemories.slice(0, config.maxMemoriesPerSession || 10)

    // 8. 存储到数据库
    const stored = await addMemories(limitedMemories)

    // 9. 计算整体置信度
    const confidence = calculateOverallConfidence(stored)

    const duration = Date.now() - startTime
    log.info(`[LLM Extractor] Extraction completed in ${duration}ms`, {
      extracted: extractedMemories.length,
      stored: stored.length,
      confidence,
    })

    return {
      memories: stored,
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
 * 获取提取模型配置
 */
async function getExtractionModelConfig(config: LLMExtractionConfig) {
  const settings = getSettings()

  // 如果没有指定模型，使用默认的聊天模型
  const providerId = config.providerId || settings.provider || 'openai'
  const modelId = config.modelId || settings.modelId || 'gpt-4o-mini'

  return { providerId, modelId }
}

/**
 * 准备对话上下文
 */
function prepareConversationContext(messages: Message[], config: LLMExtractionConfig): string {
  // 只使用最近的消息，避免超过 token 限制
  const maxMessages = config.maxMessages || 30
  const recentMessages = messages.slice(-maxMessages)

  // 格式化消息
  const formattedMessages = recentMessages
    .map((msg) => {
      const role = msg.role === 'user' ? '用户' : '助手'
      const content = msg.content?.slice(0, 300) || '' // 限制每条消息长度
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

  return `你是一个专门分析对话并提取用户记忆的AI助手。

**任务**: 从以下对话中提取关于用户的重要信息。

**提取模式**: ${extractionMode}
${modeInstructions[extractionMode] || modeInstructions.balanced}

**需要提取的信息类型**:

1. **明确偏好** (explicit_preference): 用户明确表达的好恶、偏好
2. **事实信息** (explicit_fact): 关于用户的事实信息
3. **行为模式** (implicit_pattern): 用户的行为特征和习惯
4. **兴趣话题** (implicit_interest): 用户感兴趣的主题
5. **上下文信息** (implicit_context): 对话相关的背景信息

**输出要求**:
- 只返回JSON数组，不要包含其他解释文字
- 每个记忆包含：type, content, summary（可选）, importance（0-1）, confidence（0-1）, category
- importance基于信息的价值和实用性
- confidence基于你的确定程度
- 最多返回5-8条最重要的记忆

**对话内容**:
\`\`\`
${conversationContext}
\`\`\`

**输出格式**:
\`\`\`json
[
  {
    "type": "explicit_preference",
    "content": "用户偏好简洁的回答风格，避免冗长的解释",
    "summary": "偏好简洁回答",
    "importance": 0.8,
    "confidence": 0.9,
    "category": "沟通风格"
  }
]
\`\`\``
}

/**
 * 调用 LLM 进行记忆提取
 */
async function callLLMForExtraction(
  prompt: string,
  modelConfig: { providerId: string; modelId: string }
): Promise<string> {
  try {
    log.debug('[LLM Extractor] Calling LLM', modelConfig)

    // 创建模型依赖
    const dependencies = await createModelDependencies()

    // 获取模型实例
    const model = await getModel(modelConfig.providerId, modelConfig.modelId, dependencies)

    // 构建消息
    const messages: ModelMessage[] = [
      {
        role: 'user',
        content: prompt,
      },
    ]

    // 调用模型（非流式）
    const result = await model.chat(messages, {
      temperature: 0.3, // 较低的温度以获得更稳定的结果
      maxOutputTokens: 2000,
    })

    // 等待完整响应
    let fullResponse = ''
    for await (const chunk of result.textStream) {
      fullResponse += chunk
    }

    log.debug('[LLM Extractor] LLM response received', {
      responseLength: fullResponse.length,
    })

    return fullResponse
  } catch (error) {
    log.error('[LLM Extractor] LLM call failed', error)
    throw error
  }
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
      log.warn('[LLM Extractor] No JSON array found in response', { response: response.slice(0, 300) })
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

      const validTypes: MemoryType[] = [
        'explicit_preference',
        'explicit_fact',
        'implicit_pattern',
        'implicit_interest',
        'implicit_context',
      ]

      if (!validTypes.includes(item.type as MemoryType)) {
        continue
      }

      const memory: Memory = {
        id: generateMemoryId(),
        userId: 'default',
        type: item.type as MemoryType,
        source: 'implicit' as MemorySource,
        content: item.content,
        summary: item.summary,
        importance: Math.max(0, Math.min(1, item.importance ?? 0.5)),
        confidence: Math.max(0, Math.min(1, item.confidence ?? 0.5)),
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
