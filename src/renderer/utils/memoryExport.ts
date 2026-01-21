/**
 * 记忆导出/导入工具
 */

import type { Memory } from 'src/shared/types'

export interface MemoryExportData {
  version: string
  exportDate: number
  memories: Memory[]
}

/**
 * 导出记忆为 JSON 文件
 */
export async function exportMemories(memories: Memory[], filename?: string): Promise<void> {
  const data: MemoryExportData = {
    version: '1.0',
    exportDate: Date.now(),
    memories,
  }

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)

  const a = document.createElement('a')
  a.href = url
  a.download = filename || `memories-${new Date().toISOString().split('T')[0]}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)

  URL.revokeObjectURL(url)
}

/**
 * 从 JSON 文件导入记忆
 */
export async function importMemoriesFromFile(
  file: File,
  onProgress?: (current: number, total: number) => void
): Promise<Memory[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const content = e.target?.result as string
        const data = JSON.parse(content) as MemoryExportData

        // 验证数据格式
        if (!data.memories || !Array.isArray(data.memories)) {
          throw new Error('Invalid memory export format')
        }

        // 验证每条记忆的必需字段
        const validMemories = data.memories.filter((memory) => {
          return memory.id && memory.content && memory.type && memory.userId
        })

        if (validMemories.length === 0) {
          throw new Error('No valid memories found in file')
        }

        // 如果有进度回调，模拟进度
        if (onProgress) {
          for (let i = 0; i < validMemories.length; i++) {
            onProgress(i + 1, validMemories.length)
          }
        }

        resolve(validMemories)
      } catch (error) {
        reject(new Error(`Failed to parse memory file: ${error instanceof Error ? error.message : 'Unknown error'}`))
      }
    }

    reader.onerror = () => {
      reject(new Error('Failed to read file'))
    }

    reader.readAsText(file)
  })
}

/**
 * 验证导入的记忆数据
 */
export function validateImportedMemories(memories: Memory[]): {
  valid: Memory[]
  duplicates: Memory[]
  invalid: Memory[]
} {
  // 这里需要与现有记忆对比来检测重复
  // 简化版：只检查必需字段
  const valid: Memory[] = []
  const invalid: Memory[] = []

  for (const memory of memories) {
    if (memory.id && memory.content && memory.type) {
      valid.push(memory)
    } else {
      invalid.push(memory)
    }
  }

  return {
    valid,
    duplicates: [], // 需要从主进程获取现有记忆进行对比
    invalid,
  }
}

/**
 * 生成记忆统计报告
 */
export function generateMemoryReport(memories: Memory[]): {
  total: number
  byType: Record<string, number>
  bySource: Record<string, number>
  avgImportance: number
  avgConfidence: number
  pinnedCount: number
  archivedCount: number
} {
  const byType: Record<string, number> = {}
  const bySource: Record<string, number> = {}
  let totalImportance = 0
  let totalConfidence = 0
  let pinnedCount = 0
  let archivedCount = 0

  for (const memory of memories) {
    // 按类型统计
    byType[memory.type] = (byType[memory.type] || 0) + 1

    // 按来源统计
    bySource[memory.source] = (bySource[memory.source] || 0) + 1

    // 累加重要性和置信度
    totalImportance += memory.importance || 0
    totalConfidence += memory.confidence || 0

    // 统计置顶和归档
    if (memory.pinned) pinnedCount++
    if (memory.archived) archivedCount++
  }

  return {
    total: memories.length,
    byType,
    bySource,
    avgImportance: memories.length > 0 ? totalImportance / memories.length : 0,
    avgConfidence: memories.length > 0 ? totalConfidence / memories.length : 0,
    pinnedCount,
    archivedCount,
  }
}

/**
 * 格式化记忆为 CSV 格式（用于导出到 Excel）
 */
export function exportMemoriesAsCSV(memories: Memory[]): string {
  const headers = [
    'ID',
    'Type',
    'Source',
    'Content',
    'Summary',
    'Importance',
    'Confidence',
    'Priority',
    'Category',
    'Tags',
    'Pinned',
    'Archived',
    'Created At',
    'Updated At',
  ]

  const rows = memories.map((memory) => [
    memory.id,
    memory.type,
    memory.source,
    `"${memory.content.replace(/"/g, '""')}"`, // Escape quotes
    `"${(memory.summary || '').replace(/"/g, '""')}"`,
    (memory.importance || 0).toString(),
    (memory.confidence || 0).toString(),
    memory.priority,
    memory.category || '',
    `"${(memory.tags || []).join(', ')}"`,
    memory.pinned ? 'Yes' : 'No',
    memory.archived ? 'Yes' : 'No',
    new Date(memory.createdAt).toISOString(),
    new Date(memory.updatedAt).toISOString(),
  ])

  return [headers.join(','), ...rows.map((row) => row.join(','))].join('\n')
}

/**
 * 下载 CSV 文件
 */
export function downloadCSV(content: string, filename?: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)

  const a = document.createElement('a')
  a.href = url
  a.download = filename || `memories-${new Date().toISOString().split('T')[0]}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)

  URL.revokeObjectURL(url)
}
