import { getLogger } from '../util'
import type { Memory, MemorySearchOptions, MemoryStats, MemorySummary } from 'src/shared/types'
import {
  generateMemoryId,
  isMemoryExpired,
  updateMemoryAccess,
  type MemoryType,
  type MemorySource,
} from 'src/shared/types'
import { getDatabase, withTransaction } from '../knowledge-base/db'

const log = getLogger('memory:store')

/**
 * 存储类型到数据库值的转换
 */
function memoryTypeToDB(type: MemoryType): string {
  return type
}

/**
 * 从数据库值转换为存储类型
 */
function dbToMemoryType(type: string): MemoryType {
  return type as MemoryType
}

/**
 * 序列化记忆对象为数据库行
 */
function serializeMemory(memory: Memory): Record<string, unknown> {
  return {
    id: memory.id,
    user_id: memory.userId,
    type: memoryTypeToDB(memory.type),
    source: memory.source,
    content: memory.content,
    summary: memory.summary || null,
    embedding_id: memory.embeddingId || null,
    importance: memory.importance,
    confidence: memory.confidence,
    priority: memory.priority,
    category: memory.category || null,
    created_at: memory.createdAt,
    updated_at: memory.updatedAt,
    last_accessed_at: memory.lastAccessedAt,
    access_count: memory.accessCount,
    related_session_id: memory.relatedSessionId || null,
    related_model_id: memory.relatedModelId || null,
    tags: memory.tags ? JSON.stringify(memory.tags) : null,
    expires_at: memory.expiresAt || null,
    archived: memory.archived ? 1 : 0,
    pinned: memory.pinned ? 1 : 0,
  }
}

/**
 * 反序列化数据库行为记忆对象
 */
function deserializeMemory(row: Record<string, unknown>): Memory {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    type: dbToMemoryType(String(row.type)),
    source: String(row.source) as MemorySource,
    content: String(row.content),
    summary: row.summary ? String(row.summary) : undefined,
    embeddingId: row.embedding_id ? String(row.embedding_id) : undefined,
    importance: Number(row.importance),
    confidence: Number(row.confidence),
    priority: Number(row.priority),
    category: row.category ? String(row.category) : undefined,
    createdAt: Number(row.createdAt),
    updatedAt: Number(row.updatedAt),
    lastAccessedAt: Number(row.last_accessed_at),
    accessCount: Number(row.access_count),
    relatedSessionId: row.related_session_id ? String(row.related_session_id) : undefined,
    relatedModelId: row.related_model_id ? String(row.related_model_id) : undefined,
    tags: row.tags ? JSON.parse(String(row.tags)) : undefined,
    expiresAt: row.expires_at ? Number(row.expires_at) : undefined,
    archived: Boolean(row.archived),
    pinned: Boolean(row.pinned),
  }
}

/**
 * 添加新记忆
 */
export async function addMemory(memory: Omit<Memory, 'embeddingId'>): Promise<Memory> {
  const db = getDatabase()

  const newMemory: Memory = {
    ...memory,
    id: memory.id || generateMemoryId(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
    lastAccessedAt: Date.now(),
    accessCount: 0,
    archived: false,
    pinned: false,
  }

  log.debug('[MemoryStore] Adding memory:', newMemory.id)

  await db.execute({
    sql: `
      INSERT INTO user_memory (
        id, user_id, type, source, content, summary,
        importance, confidence, priority, category,
        created_at, updated_at, last_accessed_at, access_count,
        related_session_id, related_model_id, tags, expires_at,
        archived, pinned
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    args: [
      newMemory.id,
      newMemory.userId,
      memoryTypeToDB(newMemory.type),
      newMemory.source,
      newMemory.content,
      newMemory.summary || null,
      newMemory.importance,
      newMemory.confidence,
      newMemory.priority,
      newMemory.category || null,
      newMemory.createdAt,
      newMemory.updatedAt,
      newMemory.lastAccessedAt,
      newMemory.accessCount,
      newMemory.relatedSessionId || null,
      newMemory.relatedModelId || null,
      newMemory.tags ? JSON.stringify(newMemory.tags) : null,
      newMemory.expiresAt || null,
      newMemory.archived ? 1 : 0,
      newMemory.pinned ? 1 : 0,
    ],
  })

  // 创建会话关联
  if (newMemory.relatedSessionId) {
    await db.execute({
      sql: 'INSERT INTO memory_session_link (memory_id, session_id, created_at) VALUES (?, ?, ?)',
      args: [newMemory.id, newMemory.relatedSessionId, Date.now()],
    })
  }

  log.info('[MemoryStore] Memory added:', newMemory.id)
  return newMemory
}

/**
 * 批量添加记忆
 */
export async function addMemories(memories: Omit<Memory, 'embeddingId'>[]): Promise<Memory[]> {
  return await withTransaction(async () => {
    const results: Memory[] = []
    for (const memory of memories) {
      const added = await addMemory(memory)
      results.push(added)
    }
    return results
  })
}

/**
 * 更新记忆
 */
export async function updateMemory(id: string, updates: Partial<Memory>): Promise<Memory> {
  const db = getDatabase()

  const existing = await getMemoryById(id)
  if (!existing) {
    throw new Error(`Memory not found: ${id}`)
  }

  const updated: Memory = {
    ...existing,
    ...updates,
    id, // 确保不被修改
    userId: updates.userId ?? existing.userId,
    updatedAt: Date.now(),
  }

  log.debug('[MemoryStore] Updating memory:', id)

  await db.execute({
    sql: `
      UPDATE user_memory SET
        content = ?, summary = ?, importance = ?, confidence = ?,
        priority = ?, category = ?, updated_at = ?, tags = ?,
        expires_at = ?, archived = ?, pinned = ?
      WHERE id = ?
    `,
    args: [
      updated.content,
      updated.summary || null,
      updated.importance,
      updated.confidence,
      updated.priority,
      updated.category || null,
      updated.updatedAt,
      updated.tags ? JSON.stringify(updated.tags) : null,
      updated.expiresAt || null,
      updated.archived ? 1 : 0,
      updated.pinned ? 1 : 0,
      id,
    ],
  })

  log.info('[MemoryStore] Memory updated:', id)
  return updated
}

/**
 * 删除记忆
 */
export async function deleteMemory(id: string): Promise<void> {
  const db = getDatabase()

  log.debug('[MemoryStore] Deleting memory:', id)

  await db.execute({
    sql: 'DELETE FROM user_memory WHERE id = ?',
    args: [id],
  })

  log.info('[MemoryStore] Memory deleted:', id)
}

/**
 * 批量删除记忆
 */
export async function deleteMemories(ids: string[]): Promise<void> {
  const db = getDatabase()

  log.debug('[MemoryStore] Deleting memories:', ids.length)

  const placeholders = ids.map(() => '?').join(',')
  await db.execute({
    sql: `DELETE FROM user_memory WHERE id IN (${placeholders})`,
    args: ids,
  })

  log.info('[MemoryStore] Memories deleted:', ids.length)
}

/**
 * 根据 ID 获取记忆
 */
export async function getMemoryById(id: string): Promise<Memory | null> {
  const db = getDatabase()

  const rs = await db.execute({
    sql: 'SELECT * FROM user_memory WHERE id = ?',
    args: [id],
  })

  if (rs.rows.length === 0) {
    return null
  }

  const memory = deserializeMemory(rs.rows[0] as Record<string, unknown>)

  // 更新访问时间和计数
  await updateMemoryAccessTime(id)

  return memory
}

/**
 * 获取所有记忆
 */
export async function getAllMemories(userId: string = 'default'): Promise<Memory[]> {
  const db = getDatabase()

  const rs = await db.execute({
    sql: 'SELECT * FROM user_memory WHERE user_id = ? AND archived = 0 ORDER BY created_at DESC',
    args: [userId],
  })

  return rs.rows.map((row) => deserializeMemory(row as Record<string, unknown>))
}

/**
 * 搜索记忆
 */
export async function searchMemories(
  userId: string = 'default',
  options: MemorySearchOptions = {}
): Promise<Memory[]> {
  const db = getDatabase()

  const {
    limit = 50,
    offset = 0,
    types,
    categories,
    minImportance,
    includeArchived = false,
    startDate,
    endDate,
  } = options

  // 构建查询条件
  const conditions: string[] = ['user_id = ?']
  const args: (string | number)[] = [userId]

  if (!includeArchived) {
    conditions.push('archived = 0')
  }

  if (types && types.length > 0) {
    const placeholders = types.map(() => '?').join(',')
    conditions.push(`type IN (${placeholders})`)
    args.push(...types)
  }

  if (categories && categories.length > 0) {
    const placeholders = categories.map(() => '?').join(',')
    conditions.push(`category IN (${placeholders})`)
    args.push(...categories)
  }

  if (minImportance !== undefined) {
    conditions.push('importance >= ?')
    args.push(minImportance)
  }

  if (startDate) {
    conditions.push('created_at >= ?')
    args.push(startDate)
  }

  if (endDate) {
    conditions.push('created_at <= ?')
    args.push(endDate)
  }

  const whereClause = conditions.join(' AND ')

  const sql = `
    SELECT * FROM user_memory
    WHERE ${whereClause}
    ORDER BY pinned DESC, last_accessed_at DESC
    LIMIT ? OFFSET ?
  `

  const rs = await db.execute({
    sql,
    args: [...args, limit, offset],
  })

  return rs.rows.map((row) => deserializeMemory(row as Record<string, unknown>))
}

/**
 * 更新记忆访问时间
 */
async function updateMemoryAccessTime(id: string): Promise<void> {
  const db = getDatabase()

  await db.execute({
    sql: 'UPDATE user_memory SET last_accessed_at = ?, access_count = access_count + 1 WHERE id = ?',
    args: [Date.now(), id],
  })
}

/**
 * 获取记忆摘要
 */
export async function getMemorySummary(userId: string = 'default'): Promise<MemorySummary> {
  const db = getDatabase()

  // 获取总数
  const totalRs = await db.execute({
    sql: 'SELECT COUNT(*) as count FROM user_memory WHERE user_id = ? AND archived = 0',
    args: [userId],
  })
  const totalCount = (totalRs.rows[0] as { count: number }).count

  // 按类型统计
  const typeRs = await db.execute({
    sql: 'SELECT type, COUNT(*) as count FROM user_memory WHERE user_id = ? AND archived = 0 GROUP BY type',
    args: [userId],
  })
  const byType: Partial<Record<MemoryType, number>> = {}
  for (const row of typeRs.rows) {
    const r = row as { type: string; count: number }
    byType[dbToMemoryType(r.type) as MemoryType] = r.count
  }

  // 按分类统计
  const categoryRs = await db.execute({
    sql: 'SELECT category, COUNT(*) as count FROM user_memory WHERE user_id = ? AND archived = 0 GROUP BY category',
    args: [userId],
  })
  const byCategory: Record<string, number> = {}
  for (const row of categoryRs.rows) {
    const r = row as { category: string | null; count: number }
    if (r.category) {
      byCategory[r.category] = r.count
    }
  }

  // 获取最近记忆
  const recentRs = await db.execute({
    sql: 'SELECT * FROM user_memory WHERE user_id = ? AND archived = 0 ORDER BY created_at DESC LIMIT 5',
    args: [userId],
  })
  const recentMemories = recentRs.rows.map((row) =>
    deserializeMemory(row as Record<string, unknown>)
  )

  // 获取置顶和归档计数
  const pinnedRs = await db.execute({
    sql: 'SELECT COUNT(*) as count FROM user_memory WHERE user_id = ? AND archived = 0 AND pinned = 1',
    args: [userId],
  })
  const pinnedCount = (pinnedRs.rows[0] as { count: number }).count

  const archivedRs = await db.execute({
    sql: 'SELECT COUNT(*) as count FROM user_memory WHERE user_id = ? AND archived = 1',
    args: [userId],
  })
  const archivedCount = (archivedRs.rows[0] as { count: number }).count

  return {
    totalCount,
    byType,
    byCategory,
    recentMemories,
    pinnedCount,
    archivedCount,
  }
}

/**
 * 获取记忆统计
 */
export async function getMemoryStats(userId: string = 'default'): Promise<MemoryStats> {
  const db = getDatabase()

  const now = Date.now()
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000
  const monthAgo = now - 30 * 24 * 60 * 60 * 1000

  // 总数
  const totalRs = await db.execute({
    sql: 'SELECT COUNT(*) as count FROM user_memory WHERE user_id = ? AND archived = 0',
    args: [userId],
  })
  const total = (totalRs.rows[0] as { count: number }).count

  // 按类型统计
  const typeRs = await db.execute({
    sql: 'SELECT type, COUNT(*) as count FROM user_memory WHERE user_id = ? AND archived = 0 GROUP BY type',
    args: [userId],
  })
  const byType: Record<string, number> = {}
  for (const row of typeRs.rows) {
    const r = row as { type: string; count: number }
    byType[r.type] = r.count
  }

  // 按来源统计
  const sourceRs = await db.execute({
    sql: 'SELECT source, COUNT(*) as count FROM user_memory WHERE user_id = ? AND archived = 0 GROUP BY source',
    args: [userId],
  })
  const bySource: Record<string, number> = {}
  for (const row of sourceRs.rows) {
    const r = row as { source: string; count: number }
    bySource[r.source] = r.count
  }

  // 按分类统计
  const categoryRs = await db.execute({
    sql: 'SELECT category, COUNT(*) as count FROM user_memory WHERE user_id = ? AND archived = 0 GROUP BY category',
    args: [userId],
  })
  const byCategory: Record<string, number> = {}
  for (const row of categoryRs.rows) {
    const r = row as { category: string | null; count: number }
    if (r.category) {
      byCategory[r.category] = r.count
    }
  }

  // 本周新增
  const weekRs = await db.execute({
    sql: 'SELECT COUNT(*) as count FROM user_memory WHERE user_id = ? AND archived = 0 AND created_at >= ?',
    args: [userId, weekAgo],
  })
  const thisWeek = (weekRs.rows[0] as { count: number }).count

  // 本月新增
  const monthRs = await db.execute({
    sql: 'SELECT COUNT(*) as count FROM user_memory WHERE user_id = ? AND archived = 0 AND created_at >= ?',
    args: [userId, monthAgo],
  })
  const thisMonth = (monthRs.rows[0] as { count: number }).count

  return {
    total,
    byType: byType as Record<MemoryType, number>,
    bySource: bySource as Record<string, number>,
    byCategory,
    thisWeek,
    thisMonth,
  }
}

/**
 * 清理过期记忆
 */
export async function cleanupExpiredMemories(userId: string = 'default'): Promise<number> {
  const db = getDatabase()

  const now = Date.now()

  const rs = await db.execute({
    sql: 'DELETE FROM user_memory WHERE user_id = ? AND expires_at IS NOT NULL AND expires_at < ?',
    args: [userId, now],
  })

  const count = rs.rowsAffected || 0

  if (count > 0) {
    log.info('[MemoryStore] Cleaned up expired memories:', count)
  }

  return count
}

/**
 * 切换记忆的置顶状态
 */
export async function toggleMemoryPin(id: string): Promise<Memory> {
  const memory = await getMemoryById(id)
  if (!memory) {
    throw new Error(`Memory not found: ${id}`)
  }

  return await updateMemory(id, { pinned: !memory.pinned })
}

/**
 * 切换记忆的归档状态
 */
export async function toggleMemoryArchive(id: string): Promise<Memory> {
  const memory = await getMemoryById(id)
  if (!memory) {
    throw new Error(`Memory not found: ${id}`)
  }

  return await updateMemory(id, { archived: !memory.archived })
}
