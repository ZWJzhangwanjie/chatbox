import { embedMany } from 'ai'
import type { Message } from 'src/shared/types'
import type { Memory, MemorySearchOptions } from 'src/shared/types'
import { isMemoryExpired, updateMemoryAccess } from 'src/shared/types'
import { getDatabase, getVectorStore, withTransaction } from '../knowledge-base/db'
import { getEmbeddingProvider } from '../knowledge-base/model-providers'
import { sentry } from '../adapters/sentry'
import { getSettings } from '../store-node'
import { cache } from '../cache'
import { getLogger } from '../util'

const log = getLogger('memory:embedder')

// Memory vector index name
const MEMORY_INDEX_NAME = 'user_memories'

// Default knowledge base ID for embedding provider (will be created if needed)
const MEMORY_KB_ID = -999

/**
 * 获取或创建记忆专用的知识库配置
 * 为了复用现有的嵌入基础设施
 */
async function getMemoryEmbeddingProvider() {
  return cache(
    'memory:embedding:provider',
    async () => {
      try {
        const db = getDatabase()
        const settings = getSettings()

        // 尝试获取已存在的记忆 KB 配置
        const rs = await db.execute('SELECT embedding_model FROM knowledge_base WHERE id = ?', [MEMORY_KB_ID])

        let embeddingModelString: string

        if (rs.rows.length > 0 && rs.rows[0].embedding_model) {
          // 使用已配置的嵌入模型
          embeddingModelString = rs.rows[0].embedding_model as string
        } else {
          // 获取知识库配置中的嵌入模型
          const kbEmbeddingModel = settings.extension?.knowledgeBase?.models?.embedding
          if (!kbEmbeddingModel) {
            throw new Error('Embedding model not configured. Please configure it in Knowledge Base settings.')
          }
          embeddingModelString = kbEmbeddingModel

          // 创建记忆专用的 KB 记录（用于存储嵌入模型配置）
          await db.execute({
            sql: `
              INSERT OR IGNORE INTO knowledge_base (id, name, embedding_model)
              VALUES (?, ?, ?)
            `,
            args: [MEMORY_KB_ID, 'User Memories', embeddingModelString],
          })
          log.info('[MemoryEmbedder] Created memory KB configuration with model:', embeddingModelString)
        }

        // 解析嵌入模型字符串 (格式: "provider:modelId")
        const { providerId, modelId } = parseEmbeddingModelString(embeddingModelString)
        if (!providerId || !modelId) {
          throw new Error(`Invalid embedding model format: ${embeddingModelString}`)
        }

        // 使用知识库的 getEmbeddingProvider 方法获取嵌入实例
        // 注意：这里我们需要创建一个临时的 provider，因为 getEmbeddingProvider 需要 kbId
        return getEmbeddingProvider(MEMORY_KB_ID)
      } catch (error: any) {
        log.error('[MemoryEmbedder] Failed to get embedding provider:', error)
        sentry.withScope((scope) => {
          scope.setTag('component', 'memory-embedder')
          scope.setTag('operation', 'get_embedding_provider')
          sentry.captureException(error)
        })
        throw error
      }
    },
    {
      ttl: 1000 * 60 * 5, // 5 minutes cache
    }
  )
}

/**
 * 解析嵌入模型字符串
 * 格式: "provider:modelId" 或 "provider"
 */
function parseEmbeddingModelString(modelString: string): { providerId: string; modelId: string } | null {
  const parts = modelString.split(':')
  if (parts.length === 2) {
    return { providerId: parts[0], modelId: parts[1] }
  }
  return null
}

/**
 * 初始化记忆向量索引
 */
export async function initializeMemoryIndex(): Promise<void> {
  try {
    const vectorStore = getVectorStore()
    const embeddingInstance = await getMemoryEmbeddingProvider()

    // 生成一个测试嵌入来获取向量维度
    const testEmbedding = await embedMany({
      model: embeddingInstance,
      values: ['test'],
    })

    const dimension = testEmbedding.embeddings[0].length
    log.debug(`[MemoryEmbedder] Initializing memory index with dimension: ${dimension}`)

    // 创建向量索引
    await vectorStore.createIndex({
      indexName: MEMORY_INDEX_NAME,
      dimension,
    })

    log.info('[MemoryEmbedder] Memory index initialized successfully')
  } catch (error: any) {
    log.error('[MemoryEmbedder] Failed to initialize memory index:', error)
    sentry.withScope((scope) => {
      scope.setTag('component', 'memory-embedder')
      scope.setTag('operation', 'initialize_index')
      sentry.captureException(error)
    })
    throw error
  }
}

/**
 * 为单个记忆生成并存储向量嵌入
 */
export async function embedMemory(memory: Memory): Promise<string> {
  try {
    const vectorStore = getVectorStore()
    const embeddingInstance = await getMemoryEmbeddingProvider()

    // 生成嵌入文本（使用 summary 或 content）
    const textToEmbed = memory.summary || memory.content

    log.debug('[MemoryEmbedder] Generating embedding for memory:', memory.id)

    // 生成嵌入向量
    const embeddingResult = await embedMany({
      model: embeddingInstance,
      values: [textToEmbed],
    })

    const embedding = embeddingResult.embeddings[0]
    if (!embedding) {
      throw new Error('Failed to generate embedding for memory')
    }

    // 存储向量
    const vectorId = `memory_${memory.id}`
    await vectorStore.upsert({
      indexName: MEMORY_INDEX_NAME,
      vectors: [embedding],
      metadata: [
        {
          memoryId: memory.id,
          userId: memory.userId,
          type: memory.type,
          content: memory.content,
          summary: memory.summary,
          category: memory.category,
          importance: memory.importance,
          createdAt: memory.createdAt,
        },
      ],
    })

    log.debug('[MemoryEmbedder] Memory embedded successfully:', memory.id)
    return vectorId
  } catch (error: any) {
    log.error('[MemoryEmbedder] Failed to embed memory:', memory.id, error)
    sentry.withScope((scope) => {
      scope.setTag('component', 'memory-embedder')
      scope.setTag('operation', 'embed_memory')
      scope.setExtra('memoryId', memory.id)
      sentry.captureException(error)
    })
    throw error
  }
}

/**
 * 批量为记忆生成嵌入
 */
export async function embedMemories(memories: Memory[]): Promise<void> {
  if (memories.length === 0) {
    return
  }

  try {
    const vectorStore = getVectorStore()
    const embeddingInstance = await getMemoryEmbeddingProvider()

    log.info(`[MemoryEmbedder] Batch embedding ${memories.length} memories`)

    // 批量生成嵌入（每次最多 50 个）
    const BATCH_SIZE = 50
    for (let i = 0; i < memories.length; i += BATCH_SIZE) {
      const batch = memories.slice(i, i + BATCH_SIZE)
      const texts = batch.map((m) => m.summary || m.content)

      const embeddingResult = await embedMany({
        model: embeddingInstance,
        values: texts,
      })

      if (!embeddingResult.embeddings || embeddingResult.embeddings.length !== batch.length) {
        throw new Error(
          `Embedding batch failed: expected ${batch.length}, got ${embeddingResult.embeddings?.length || 0}`
        )
      }

      // 批量存储向量
      await vectorStore.upsert({
        indexName: MEMORY_INDEX_NAME,
        vectors: embeddingResult.embeddings,
        metadata: batch.map((m) => ({
          memoryId: m.id,
          userId: m.userId,
          type: m.type,
          content: m.content,
          summary: m.summary,
          category: m.category,
          importance: m.importance,
          createdAt: m.createdAt,
        })),
      })

      log.debug(`[MemoryEmbedder] Batch ${Math.floor(i / BATCH_SIZE) + 1} embedded: ${batch.length} memories`)
    }

    log.info(`[MemoryEmbedder] Successfully embedded ${memories.length} memories`)
  } catch (error: any) {
    log.error('[MemoryEmbedder] Failed to batch embed memories:', error)
    sentry.withScope((scope) => {
      scope.setTag('component', 'memory-embedder')
      scope.setTag('operation', 'batch_embed_memories')
      scope.setExtra('memoryCount', memories.length)
      sentry.captureException(error)
    })
    throw error
  }
}

/**
 * 语义搜索记忆
 */
export async function searchMemoriesByQuery(
  query: string,
  options: MemorySearchOptions = {}
): Promise<Memory[]> {
  try {
    log.debug('[MemoryEmbedder] Searching memories with query:', query)

    const embeddingInstance = await getMemoryEmbeddingProvider()
    const vectorStore = getVectorStore()

    // 生成查询向量
    const queryEmbedding = await embedMany({
      model: embeddingInstance,
      values: [query],
    })

    // 向量搜索
    const topK = options.limit || 20
    const searchResults = await vectorStore.query({
      indexName: MEMORY_INDEX_NAME,
      queryVector: queryEmbedding.embeddings[0],
      topK,
    })

    log.debug(`[MemoryEmbedder] Vector search returned ${searchResults.length} results`)

    // 获取完整的记忆信息
    const memoryIds = searchResults.map((r) => r.metadata?.memoryId).filter(Boolean) as string[]

    if (memoryIds.length === 0) {
      return []
    }

    // 从数据库获取完整的记忆信息
    const db = getDatabase()
    const placeholders = memoryIds.map(() => '?').join(',')
    const rs = await db.execute({
      sql: `SELECT * FROM user_memory WHERE id IN (${placeholders}) AND archived = 0`,
      args: memoryIds,
    })

    const memories: Memory[] = rs.rows.map((row) => {
      const r = row as Record<string, unknown>
      return {
        id: String(r.id),
        userId: String(r.user_id),
        type: String(r.type) as any,
        source: String(r.source) as any,
        content: String(r.content),
        summary: r.summary ? String(r.summary) : undefined,
        embeddingId: r.embedding_id ? String(r.embedding_id) : undefined,
        importance: Number(r.importance),
        confidence: Number(r.confidence),
        priority: Number(r.priority),
        category: r.category ? String(r.category) : undefined,
        createdAt: Number(r.created_at),
        updatedAt: Number(r.updated_at),
        lastAccessedAt: Number(r.last_accessed_at),
        accessCount: Number(r.access_count),
        relatedSessionId: r.related_session_id ? String(r.related_session_id) : undefined,
        relatedModelId: r.related_model_id ? String(r.related_model_id) : undefined,
        tags: r.tags ? JSON.parse(String(r.tags)) : undefined,
        expiresAt: r.expires_at ? Number(r.expires_at) : undefined,
        archived: Boolean(r.archived),
        pinned: Boolean(r.pinned),
      }
    })

    // 按向量搜索结果排序并过滤
    const memoryMap = new Map(memories.map((m) => [m.id, m]))
    const results: Array<{ memory: Memory; score: number }> = []

    for (const searchResult of searchResults) {
      const memoryId = searchResult.metadata?.memoryId as string
      const memory = memoryMap.get(memoryId)

      if (memory && !isMemoryExpired(memory)) {
        // 计算综合评分
        const score = calculateRelevanceScore(searchResult.score, memory)
        results.push({ memory, score })
      }
    }

    // 排序并应用限制
    results.sort((a, b) => b.score - a.score)

    const filtered = results
      .filter((r) => r.score >= (options.minImportance ?? 0.3))
      .slice(0, options.limit ?? 10)
      .map((r) => r.memory)

    log.debug(`[MemoryEmbedder] Search returned ${filtered.length} memories after filtering`)

    return filtered
  } catch (error: any) {
    log.error('[MemoryEmbedder] Failed to search memories:', error)
    sentry.withScope((scope) => {
      scope.setTag('component', 'memory-embedder')
      scope.setTag('operation', 'search_memories')
      scope.setExtra('query', query)
      sentry.captureException(error)
    })
    return []
  }
}

/**
 * 计算相关性评分（综合向量相似度、重要性、近期性）
 */
function calculateRelevanceScore(vectorSimilarity: number, memory: Memory): number {
  const weights = {
    semantic: 0.6, // 语义相似度权重
    importance: 0.2, // 重要性权重
    recency: 0.15, // 近期性权重
    pinned: 0.05, // 置顶权重
  }

  // 计算近期性分数（0-1，越近越高）
  const daysSinceCreated = (Date.now() - memory.createdAt) / (1000 * 60 * 60 * 24)
  const recencyScore = Math.max(0, 1 - daysSinceCreated / 365) // 1 年内线性衰减

  const score =
    vectorSimilarity * weights.semantic +
    memory.importance * weights.importance +
    recencyScore * weights.recency +
    (memory.pinned ? 1 : 0) * weights.pinned

  return Math.min(1, Math.max(0, score))
}

/**
 * 获取相关记忆用于上下文注入
 */
export async function getMemoriesForContext(
  query: string,
  maxMemories: number = 5,
  maxTokens: number = 500
): Promise<Memory[]> {
  try {
    // 搜索相关记忆
    const memories = await searchMemoriesByQuery(query, {
      limit: maxMemories * 2, // 获取更多候选
      minImportance: 0.3,
    })

    // 按重要性和相关性排序
    const scored = memories.map((memory) => ({
      memory,
      score: calculateRelevanceScore(0.8, memory), // 假设已经通过语义搜索过滤
    }))

    scored.sort((a, b) => b.score - a.score)

    // 选择前 N 个记忆
    const selected = scored.slice(0, maxMemories).map((s) => s.memory)

    // 估算 token 数量（粗略估计：1 token ≈ 4 字符）
    const totalChars = selected.reduce((sum, m) => sum + (m.summary || m.content).length, 0)
    const estimatedTokens = Math.ceil(totalChars / 4)

    if (estimatedTokens > maxTokens) {
      log.warn(`[MemoryEmbedder] Memory context exceeds token budget: ${estimatedTokens} > ${maxTokens}`)
    }

    log.debug(`[MemoryEmbedder] Retrieved ${selected.length} memories for context`)
    return selected
  } catch (error: any) {
    log.error('[MemoryEmbedder] Failed to get memories for context:', error)
    return []
  }
}

/**
 * 删除记忆的向量嵌入
 */
export async function deleteMemoryEmbedding(memoryId: string): Promise<void> {
  try {
    const vectorStore = getVectorStore()
    const db = getDatabase()

    // 删除向量（通过 metadata 查询）
    const rs = await db.execute({
      sql: `SELECT id FROM ${MEMORY_INDEX_NAME} WHERE json_extract(metadata, '$.memoryId') = ?`,
      args: [memoryId],
    })

    if (rs.rows.length > 0) {
      // LibSQL Vector 暂不支持直接删除，通过标记 archived 实现
      log.debug('[MemoryEmbedder] Memory embedding will be ignored due to archived flag:', memoryId)
    }

    log.debug('[MemoryEmbedder] Memory embedding deleted:', memoryId)
  } catch (error: any) {
    log.error('[MemoryEmbedder] Failed to delete memory embedding:', memoryId, error)
    sentry.withScope((scope) => {
      scope.setTag('component', 'memory-embedder')
      scope.setTag('operation', 'delete_embedding')
      scope.setExtra('memoryId', memoryId)
      sentry.captureException(error)
    })
  }
}

/**
 * 批量删除记忆的向量嵌入
 */
export async function deleteMemoryEmbeddings(memoryIds: string[]): Promise<void> {
  try {
    for (const memoryId of memoryIds) {
      await deleteMemoryEmbedding(memoryId)
    }
    log.info('[MemoryEmbedder] Batch deleted embeddings for memories:', memoryIds.length)
  } catch (error: any) {
    log.error('[MemoryEmbedder] Failed to batch delete memory embeddings:', error)
    sentry.withScope((scope) => {
      scope.setTag('component', 'memory-embedder')
      scope.setTag('operation', 'batch_delete_embeddings')
      scope.setExtra('memoryCount', memoryIds.length)
      sentry.captureException(error)
    })
  }
}

/**
 * 为消息提取相关记忆
 */
export async function extractRelevantMemories(
  messages: Message[],
  maxMemories: number = 5
): Promise<Memory[]> {
  if (messages.length === 0) {
    return []
  }

  // 构建查询文本（使用最近的用户消息）
  const recentUserMessages = messages.filter((m) => m.role === 'user').slice(-3)
  const queryText = recentUserMessages.map((m) => {
    if (m.contentParts && m.contentParts.length > 0) {
      return m.contentParts
        .filter((p) => p.type === 'text')
        .map((p) => ('text' in p ? p.text : ''))
        .join(' ')
    }
    return ''
  }).join('\n')

  if (!queryText.trim()) {
    return []
  }

  return getMemoriesForContext(queryText, maxMemories)
}
