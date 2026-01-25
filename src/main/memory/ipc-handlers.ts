import { ipcMain } from 'electron'
import type { Message } from '../../shared/types'
import type {
  Memory,
  MemoryExtraction,
  MemorySearchOptions,
  MemoryStats,
  MemorySummary,
  ExtractionConfig,
} from '../../shared/types'
import { sentry } from '../adapters/sentry'
import { getLogger } from '../util'
import {
  addMemory,
  addMemories,
  deleteMemory,
  deleteMemories,
  getAllMemories,
  getMemoryById,
  getMemoryStats,
  getMemorySummary,
  searchMemories,
  toggleMemoryArchive,
  toggleMemoryPin,
  updateMemory,
} from './store'
import { extractMemoriesFromSession } from './extractor'
import {
  deleteMemoryEmbeddings,
  embedMemories,
  extractRelevantMemories,
  getMemoriesForContext,
  initializeMemoryIndex,
  searchMemoriesByQuery,
} from './embedder'

const log = getLogger('memory:ipc-handlers')

/**
 * 注册记忆系统相关的 IPC 处理器
 */
export function registerMemoryHandlers() {
  // ==================== 记忆 CRUD 操作 ====================

  // 获取所有记忆
  ipcMain.handle('memory:getAll', async (_event, userId: string = 'default') => {
    try {
      log.debug('[IPC] memory:getAll', userId)
      const memories = await getAllMemories(userId)
      return memories
    } catch (error: any) {
      log.error('[IPC] memory:getAll failed', error)
      sentry.withScope((scope) => {
        scope.setTag('component', 'memory-ipc')
        scope.setTag('operation', 'get_all')
        sentry.captureException(error)
      })
      throw error
    }
  })

  // 根据 ID 获取记忆
  ipcMain.handle('memory:getById', async (_event, id: string) => {
    try {
      log.debug('[IPC] memory:getById', id)
      const memory = await getMemoryById(id)
      if (!memory) {
        throw new Error(`Memory not found: ${id}`)
      }
      return memory
    } catch (error: any) {
      log.error('[IPC] memory:getById failed', error)
      sentry.withScope((scope) => {
        scope.setTag('component', 'memory-ipc')
        scope.setTag('operation', 'get_by_id')
        scope.setExtra('memoryId', id)
        sentry.captureException(error)
      })
      throw error
    }
  })

  // 添加单个记忆
  ipcMain.handle('memory:add', async (_event, memory: Omit<Memory, 'embeddingId' | 'id' | 'createdAt' | 'updatedAt' | 'lastAccessedAt' | 'accessCount'>) => {
    try {
      log.debug('[IPC] memory:add', memory.content)
      const added = await addMemory(memory)
      // 异步生成嵌入（不阻塞）
      // TODO: Embed single memory after creation
      return added
    } catch (error: any) {
      log.error('[IPC] memory:add failed', error)
      sentry.withScope((scope) => {
        scope.setTag('component', 'memory-ipc')
        scope.setTag('operation', 'add')
        scope.setExtra('content', memory.content)
        sentry.captureException(error)
      })
      throw error
    }
  })

  // 批量添加记忆
  ipcMain.handle('memory:addBatch', async (_event, memories: Omit<Memory, 'embeddingId' | 'id' | 'createdAt' | 'updatedAt' | 'lastAccessedAt' | 'accessCount'>[]) => {
    try {
      log.debug('[IPC] memory:addBatch', memories.length)
      const added = await addMemories(memories)
      // 异步批量生成嵌入
      embedMemories(added).catch((err) => {
        log.warn('[IPC] Failed to batch embed memories:', err)
      })
      return added
    } catch (error: any) {
      log.error('[IPC] memory:addBatch failed', error)
      sentry.withScope((scope) => {
        scope.setTag('component', 'memory-ipc')
        scope.setTag('operation', 'add_batch')
        scope.setExtra('count', memories.length)
        sentry.captureException(error)
      })
      throw error
    }
  })

  // 更新记忆
  ipcMain.handle('memory:update', async (_event, id: string, updates: Partial<Memory>) => {
    try {
      log.debug('[IPC] memory:update', id)
      const updated = await updateMemory(id, updates)
      // TODO: Re-embed if content changes
      return updated
    } catch (error: any) {
      log.error('[IPC] memory:update failed', error)
      sentry.withScope((scope) => {
        scope.setTag('component', 'memory-ipc')
        scope.setTag('operation', 'update')
        scope.setExtra('memoryId', id)
        sentry.captureException(error)
      })
      throw error
    }
  })

  // 删除单个记忆
  ipcMain.handle('memory:delete', async (_event, id: string) => {
    try {
      log.debug('[IPC] memory:delete', id)
      await deleteMemory(id)
      return { success: true }
    } catch (error: any) {
      log.error('[IPC] memory:delete failed', error)
      sentry.withScope((scope) => {
        scope.setTag('component', 'memory-ipc')
        scope.setTag('operation', 'delete')
        scope.setExtra('memoryId', id)
        sentry.captureException(error)
      })
      throw error
    }
  })

  // 批量删除记忆
  ipcMain.handle('memory:deleteBatch', async (_event, ids: string[]) => {
    try {
      log.debug('[IPC] memory:deleteBatch', ids.length)
      await deleteMemories(ids)
      return { success: true, count: ids.length }
    } catch (error: any) {
      log.error('[IPC] memory:deleteBatch failed', error)
      sentry.withScope((scope) => {
        scope.setTag('component', 'memory-ipc')
        scope.setTag('operation', 'delete_batch')
        scope.setExtra('count', ids.length)
        sentry.captureException(error)
      })
      throw error
    }
  })

  // ==================== 记忆搜索和检索 ====================

  // 搜索记忆（基于元数据）
  ipcMain.handle('memory:search', async (_event, userId: string = 'default', options: MemorySearchOptions = {}) => {
    try {
      log.debug('[IPC] memory:search', options)
      const memories = await searchMemories(userId, options)
      return memories
    } catch (error: any) {
      log.error('[IPC] memory:search failed', error)
      sentry.withScope((scope) => {
        scope.setTag('component', 'memory-ipc')
        scope.setTag('operation', 'search')
        sentry.captureException(error)
      })
      throw error
    }
  })

  // 语义搜索记忆（基于向量）
  ipcMain.handle('memory:semanticSearch', async (_event, query: string, options: MemorySearchOptions = {}) => {
    try {
      log.debug('[IPC] memory:semanticSearch', query)
      const memories = await searchMemoriesByQuery(query, options)
      return memories
    } catch (error: any) {
      log.error('[IPC] memory:semanticSearch failed', error)
      sentry.withScope((scope) => {
        scope.setTag('component', 'memory-ipc')
        scope.setTag('operation', 'semantic_search')
        scope.setExtra('query', query)
        sentry.captureException(error)
      })
      throw error
    }
  })

  // 获取相关记忆用于上下文注入
  ipcMain.handle('memory:getForContext', async (_event, query: string, maxMemories: number = 5, maxTokens: number = 500) => {
    try {
      log.debug('[IPC] memory:getForContext', query)
      const memories = await getMemoriesForContext(query, maxMemories, maxTokens)
      return memories
    } catch (error: any) {
      log.error('[IPC] memory:getForContext failed', error)
      sentry.withScope((scope) => {
        scope.setTag('component', 'memory-ipc')
        scope.setTag('operation', 'get_for_context')
        scope.setExtra('query', query)
        sentry.captureException(error)
      })
      throw error
    }
  })

  // ==================== 记忆提取 ====================

  // 从会话中提取记忆
  ipcMain.handle(
    'memory:extractFromSession',
    async (_event, sessionId: string, messages: Message[], config: ExtractionConfig = {}) => {
      try {
        log.info('[IPC] ===== memory:extractFromSession =====')
        log.info('[IPC] Session:', sessionId)
        log.info('[IPC] Message count:', messages.length)
        const result = await extractMemoriesFromSession(sessionId, messages, config)

        log.info('[IPC] 提取结果:', {
          memoryCount: result.memories.length,
          confidence: result.confidence,
          reasoning: result.reasoning
        })

        // 异步生成嵌入
        if (result.memories.length > 0) {
          embedMemories(result.memories).catch((err) => {
            log.warn('[IPC] Failed to embed extracted memories:', err)
          })
        } else {
          log.warn('[IPC] 没有提取到任何记忆')
        }

        return result
      } catch (error: any) {
        log.error('[IPC] memory:extractFromSession failed:', error.message)
        log.error('[IPC] Error stack:', error.stack)
        sentry.withScope((scope) => {
          scope.setTag('component', 'memory-ipc')
          scope.setTag('operation', 'extract_from_session')
          scope.setExtra('sessionId', sessionId)
          sentry.captureException(error)
        })
        throw error
      }
    }
  )

  // 从消息中提取相关记忆
  ipcMain.handle('memory:extractRelevant', async (_event, messages: Message[], maxMemories: number = 5) => {
    try {
      log.debug('[IPC] memory:extractRelevant', messages.length)
      const memories = await extractRelevantMemories(messages, maxMemories)
      return memories
    } catch (error: any) {
      log.error('[IPC] memory:extractRelevant failed', error)
      sentry.withScope((scope) => {
        scope.setTag('component', 'memory-ipc')
        scope.setTag('operation', 'extract_relevant')
        sentry.captureException(error)
      })
      throw error
    }
  })

  // ==================== 记忆统计和摘要 ====================

  // 获取记忆摘要
  ipcMain.handle('memory:getSummary', async (_event, userId: string = 'default') => {
    try {
      log.debug('[IPC] memory:getSummary', userId)
      const summary = await getMemorySummary(userId)
      return summary
    } catch (error: any) {
      log.error('[IPC] memory:getSummary failed', error)
      sentry.withScope((scope) => {
        scope.setTag('component', 'memory-ipc')
        scope.setTag('operation', 'get_summary')
        sentry.captureException(error)
      })
      throw error
    }
  })

  // 获取记忆统计
  ipcMain.handle('memory:getStats', async (_event, userId: string = 'default') => {
    try {
      log.debug('[IPC] memory:getStats', userId)
      const stats = await getMemoryStats(userId)
      return stats
    } catch (error: any) {
      log.error('[IPC] memory:getStats failed', error)
      sentry.withScope((scope) => {
        scope.setTag('component', 'memory-ipc')
        scope.setTag('operation', 'get_stats')
        sentry.captureException(error)
      })
      throw error
    }
  })

  // ==================== 记忆操作 ====================

  // 切换记忆的置顶状态
  ipcMain.handle('memory:togglePin', async (_event, id: string) => {
    try {
      log.debug('[IPC] memory:togglePin', id)
      const memory = await toggleMemoryPin(id)
      return memory
    } catch (error: any) {
      log.error('[IPC] memory:togglePin failed', error)
      sentry.withScope((scope) => {
        scope.setTag('component', 'memory-ipc')
        scope.setTag('operation', 'toggle_pin')
        scope.setExtra('memoryId', id)
        sentry.captureException(error)
      })
      throw error
    }
  })

  // 切换记忆的归档状态
  ipcMain.handle('memory:toggleArchive', async (_event, id: string) => {
    try {
      log.debug('[IPC] memory:toggleArchive', id)
      const memory = await toggleMemoryArchive(id)
      return memory
    } catch (error: any) {
      log.error('[IPC] memory:toggleArchive failed', error)
      sentry.withScope((scope) => {
        scope.setTag('component', 'memory-ipc')
        scope.setTag('operation', 'toggle_archive')
        scope.setExtra('memoryId', id)
        sentry.captureException(error)
      })
      throw error
    }
  })

  // ==================== 系统初始化 ====================

  // 初始化记忆系统（创建向量索引等）
  ipcMain.handle('memory:initialize', async () => {
    try {
      log.info('[IPC] memory:initialize')
      await initializeMemoryIndex()
      return { success: true }
    } catch (error: any) {
      log.error('[IPC] memory:initialize failed', error)
      sentry.withScope((scope) => {
        scope.setTag('component', 'memory-ipc')
        scope.setTag('operation', 'initialize')
        sentry.captureException(error)
      })
      throw error
    }
  })

  log.info('[IPC] Memory handlers registered successfully')
}
