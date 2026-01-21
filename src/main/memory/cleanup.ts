/**
 * 记忆清理任务
 *
 * 定期清理过期、低重要性的记忆
 */

import { getLogger } from '../util'
import { sentry } from '../adapters/sentry'
import { getAllMemories, deleteMemories } from './store'
import { getMemoriesToCleanup } from './importance-scorer'

const log = getLogger('memory:cleanup')

/**
 * 清理任务配置
 */
export interface CleanupTaskConfig {
  // 清理间隔（毫秒），默认 7 天
  interval?: number

  // 记忆保留天数
  retentionDays?: number

  // 最小保留数量
  keepCount?: number

  // 重要性阈值
  importanceThreshold?: number

  // 最小年龄（毫秒）才会被清理
  minAge?: number
}

/**
 * 默认清理配置
 */
const DEFAULT_CONFIG: Required<CleanupTaskConfig> = {
  interval: 7 * 24 * 60 * 60 * 1000, // 7 天
  retentionDays: 90,
  keepCount: 100,
  importanceThreshold: 0.3,
  minAge: 60 * 24 * 60 * 60 * 1000, // 60 天
}

let cleanupInterval: NodeJS.Timeout | null = null
let isRunning = false

/**
 * 启动清理任务
 */
export function startCleanupTask(config: CleanupTaskConfig = {}) {
  const finalConfig = { ...DEFAULT_CONFIG, ...config }

  if (cleanupInterval) {
    log.warn('[Cleanup] Task already running, stopping previous task')
    stopCleanupTask()
  }

  // 立即执行一次清理（可选，延迟 5 分钟后首次执行）
  setTimeout(
    () => {
      runCleanup(finalConfig).catch((error) => {
        log.error('[Cleanup] Initial cleanup failed', error)
      })
    },
    5 * 60 * 1000
  )

  // 定期执行清理
  cleanupInterval = setInterval(async () => {
    await runCleanup(finalConfig)
  }, finalConfig.interval)

  log.info('[Cleanup] Task started', {
    interval: `${finalConfig.interval / 1000 / 60 / 60 / 24} days`,
  })
}

/**
 * 停止清理任务
 */
export function stopCleanupTask() {
  if (cleanupInterval) {
    clearInterval(cleanupInterval)
    cleanupInterval = null
    log.info('[Cleanup] Task stopped')
  }
}

/**
 * 运行清理任务
 */
export async function runCleanup(config: CleanupTaskConfig = {}) {
  // 防止并发执行
  if (isRunning) {
    log.debug('[Cleanup] Cleanup already running, skipping')
    return
  }

  const finalConfig = { ...DEFAULT_CONFIG, ...config }
  const startTime = Date.now()

  isRunning = true
  log.info('[Cleanup] Starting memory cleanup')

  try {
    // 获取所有记忆
    const allMemories = await getAllMemories()

    if (allMemories.length === 0) {
      log.debug('[Cleanup] No memories to clean up')
      return
    }

    // 获取需要清理的记忆
    const toCleanup = getMemoriesToCleanup(allMemories, {
      keepCount: finalConfig.keepCount,
      threshold: finalConfig.importanceThreshold,
      minAge: finalConfig.minAge,
    })

    if (toCleanup.length === 0) {
      log.info('[Cleanup] No memories need cleanup', { total: allMemories.length })
      return
    }

    // 执行删除
    const idsToDelete = toCleanup.map((m) => m.id)
    await deleteMemories(idsToDelete)

    const duration = Date.now() - startTime
    log.info('[Cleanup] Cleanup completed', {
      total: allMemories.length,
      deleted: toCleanup.length,
      remaining: allMemories.length - toCleanup.length,
      duration: `${duration}ms`,
    })

    // 报告到 Sentry
    sentry.withScope((scope) => {
      scope.setTag('component', 'memory-cleanup')
      scope.setTag('operation', 'scheduled_cleanup')
      scope.setExtra('totalMemories', allMemories.length)
      scope.setExtra('deletedMemories', toCleanup.length)
      scope.setExtra('duration', duration)
      sentry.captureMessage(`Memory cleanup: deleted ${toCleanup.length} memories`)
    })
  } catch (error) {
    const duration = Date.now() - startTime
    log.error('[Cleanup] Cleanup failed', error)

    sentry.withScope((scope) => {
      scope.setTag('component', 'memory-cleanup')
      scope.setTag('operation', 'scheduled_cleanup')
      scope.setExtra('duration', duration)
      scope.setExtra('error', error instanceof Error ? error.message : 'Unknown error')
      sentry.captureException(error)
    })
  } finally {
    isRunning = false
  }
}

/**
 * 手动触发清理
 */
export async function triggerManualCleanup(options: {
  retentionDays?: number
  keepCount?: number
  importanceThreshold?: number
} = {}) {
  const config: CleanupTaskConfig = {
    ...options,
    minAge: options.retentionDays
      ? options.retentionDays * 24 * 60 * 60 * 1000
      : DEFAULT_CONFIG.minAge,
  }

  log.info('[Cleanup] Manual cleanup triggered', config)
  return await runCleanup(config)
}

/**
 * 获取清理统计
 */
export async function getCleanupStats() {
  const allMemories = await getAllMemories()

  const toCleanup = getMemoriesToCleanup(allMemories, {
    keepCount: DEFAULT_CONFIG.keepCount,
    threshold: DEFAULT_CONFIG.importanceThreshold,
    minAge: DEFAULT_CONFIG.minAge,
  })

  return {
    total: allMemories.length,
    cleanupCandidates: toCleanup.length,
    wouldRemain: allMemories.length - toCleanup.length,
  }
}
