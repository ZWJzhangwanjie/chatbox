/**
 * 记忆系统模块入口
 *
 * 负责初始化记忆系统并导出所有公开 API
 */

import { registerMemoryHandlers } from './ipc-handlers'
import { startCleanupTask } from './cleanup'
import { getLogger } from '../util'
import { sentry } from '../adapters/sentry'

const log = getLogger('memory:index')

let initPromise: Promise<void> | null = null

/**
 * 初始化记忆系统
 */
async function initializeMemorySystem() {
  const startTime = Date.now()
  log.info('[Memory] Initializing memory system...')

  try {
    // 注册 IPC 处理器
    registerMemoryHandlers()
    log.debug('[Memory] IPC handlers registered')

    // 启动清理任务
    startCleanupTask()
    log.debug('[Memory] Cleanup task started')

    // 初始化向量索引（延迟初始化，在第一次使用时创建）
    // 不在启动时阻塞，而是在第一次需要时初始化
    log.debug('[Memory] Vector index will be initialized on first use')

    const duration = Date.now() - startTime
    log.info(`[Memory] Memory system initialized successfully in ${duration}ms`)
  } catch (error) {
    const duration = Date.now() - startTime
    log.error(`[Memory] Failed to initialize memory system after ${duration}ms:`, error)

    // 报告关键初始化错误到 Sentry
    sentry.withScope((scope) => {
      scope.setTag('component', 'memory')
      scope.setTag('operation', 'initialization')
      scope.setExtra('duration', duration)
      scope.setExtra('error_type', 'initialization_failure')
      sentry.captureException(error)
    })

    throw error
  }
}

/**
 * 获取初始化 Promise
 * 用于确保记忆系统在使用前已初始化
 */
export function getInitPromise() {
  if (!initPromise) {
    initPromise = initializeMemorySystem()
  }
  return initPromise
}

// 自动初始化（带错误处理）
getInitPromise().catch((error) => {
  log.error('[Memory] Memory system auto-initialization failed:', error)
  // 不抛出错误，避免未处理的 Promise 拒绝
})

// ==================== 公开 API 导出 ====================

// 导出存储相关函数
export {
  addMemory,
  addMemories,
  deleteMemory,
  deleteMemories,
  getMemoryById,
  getAllMemories,
  searchMemories,
  updateMemory,
  getMemorySummary,
  getMemoryStats,
  toggleMemoryPin,
  toggleMemoryArchive,
} from './store'

// 导出提取相关函数
export { extractMemoriesFromSession } from './extractor'

// 导出嵌入相关函数
export {
  initializeMemoryIndex,
  embedMemories,
  searchMemoriesByQuery,
  getMemoriesForContext,
  extractRelevantMemories,
  deleteMemoryEmbeddings,
} from './embedder'

// 导出隐私过滤相关函数
export {
  detectSensitiveData,
  maskSensitiveData,
  filterMemoryForPrivacy,
  filterMemoriesForPrivacy,
  containsSensitiveData,
  type SensitiveDataType,
  type PrivacyFilterConfig,
} from './privacy-filter'

// 导出重要性评分相关函数
export {
  calculateImportanceScore,
  calculateImportanceScores,
  sortMemoriesByImportance,
  filterLowImportanceMemories,
  getMemoriesToCleanup,
  updateMemoryImportanceOnAccess,
  calculateDecayedImportance,
  type ImportanceScoringConfig,
} from './importance-scorer'

// 导出 LLM 提取相关函数
export {
  extractMemoriesWithLLM,
  type LLMExtractionConfig,
} from './llm-extractor-integrated'

// 导出清理任务相关函数
export {
  startCleanupTask,
  stopCleanupTask,
  runCleanup,
  triggerManualCleanup,
  getCleanupStats,
  type CleanupTaskConfig,
} from './cleanup'

// 导出类型定义（重新导出，方便使用）
export type {
  Memory,
  MemoryType,
  MemorySource,
  MemoryPriority,
  MemoryExtraction,
  ExtractionConfig,
  MemorySearchOptions,
  MemoryInjectionConfig,
  MemoryStats,
  MemorySummary,
} from '../../shared/types'

// 导出辅助函数
export {
  generateMemoryId,
  isMemoryExpired,
  updateMemoryAccess,
  formatMemoryForContext,
  calculateExpiryDate,
  DEFAULT_EXTRACTION_CONFIG,
  DEFAULT_INJECTION_CONFIG,
} from '../../shared/types'
