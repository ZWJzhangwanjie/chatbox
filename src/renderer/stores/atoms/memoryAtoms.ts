/**
 * 记忆系统状态管理 Atoms
 *
 * 提供记忆功能的 Jotai atoms，包括：
 * - 记忆设置
 * - 记忆数据缓存
 * - UI 状态
 */

import { atom, atomWithStorage, useAtomValue, useSetAtom } from 'jotai'
import { focusAtom } from 'jotai-optics'
import { atomWithQuery, atomWithMutation } from 'jotai-tanstack-query'
import type { Memory, MemorySearchOptions, MemoryStats, MemorySummary } from 'src/shared/types'
import { settingsAtom } from './settingsAtoms'
import storage, { StorageKey } from '../../storage'
import platform from '../../platform'

// ==================== 记忆设置 ====================

// 记忆功能启用状态
export const memoryEnabledAtom = focusAtom(settingsAtom, (optic) =>
  optic.prop('memoryEnabled').default(true)
)

// 记忆设置详情
export const memorySettingsAtom = focusAtom(settingsAtom, (optic) =>
  optic.prop('memorySettings').default({})
)

// ==================== 记忆数据缓存 ====================

// 记忆数据缓存（只存储在内存，不持久化）
// 用于避免频繁的 IPC 调用
const _memoriesCacheAtom = atom<Map<string, Memory>>(new Map())

// 带查询的记忆列表
export const memoriesQueryAtom = atomWithQuery((get) => ({
  queryKey: ['memories'],
  queryFn: async () => {
    return await platform.getAllMemories()
  },
}))

// 记忆列表状态（从查询派生）
export const memoriesAtom = atom((get) => {
  const data = get(memoriesQueryAtom).data
  return data ?? []
})

// 记忆摘要状态
export const memorySummaryAtom = atomWithQuery((get) => ({
  queryKey: ['memorySummary'],
  queryFn: async () => {
    return await platform.getMemorySummary()
  },
  staleTime: 1000 * 60, // 1 分钟缓存
}))

// 记忆统计状态
export const memoryStatsAtom = atomWithQuery((get) => ({
  queryKey: ['memoryStats'],
  queryFn: async () => {
    return await platform.getMemoryStats()
  },
  staleTime: 1000 * 60 * 5, // 5 分钟缓存
}))

// ==================== 记忆搜索 ====================

// 搜索查询状态
export const memorySearchQueryAtom = atom<string>('')

// 搜索选项状态
export const memorySearchOptionsAtom = atom<MemorySearchOptions>({
  limit: 50,
  offset: 0,
})

// 搜索结果状态
export const memorySearchResultsAtom = atomWithQuery((get) => {
  const query = get(memorySearchQueryAtom)
  const options = get(memorySearchOptionsAtom)

  return {
    queryKey: ['memorySearch', query, options],
    queryFn: async () => {
      if (!query.trim()) {
        return await platform.searchMemories('default', options)
      }
      return await platform.semanticSearchMemories(query, options)
    },
    enabled: query.length > 0 || Object.keys(options).length > 1, // 至少有非默认选项时才搜索
    staleTime: 1000 * 30, // 30 秒缓存
  }
})

// ==================== 记忆选择状态 ====================

// 选中的记忆 ID 列表
export const selectedMemoryIdsAtom = atom<Set<string>>(new Set())

// 是否全选
export const isAllMemoriesSelectedAtom = atom((get) => {
  const selectedIds = get(selectedMemoryIdsAtom)
  const memories = get(memoriesAtom)
  return memories.length > 0 && selectedIds.size === memories.length
})

// 切换全选
export const toggleSelectAllMemoriesAtom = atom(
  null,
  (get, set) => {
    const memories = get(memoriesAtom)
    const selectedIds = get(selectedMemoryIdsAtom)

    if (selectedIds.size === memories.length) {
      // 全部取消选择
      set(selectedMemoryIdsAtom, new Set())
    } else {
      // 全部选择
      set(selectedMemoryIdsAtom, new Set(memories.map((m) => m.id)))
    }
  }
)

// ==================== 记忆 UI 状态 ====================

// 记忆详情对话框打开状态
export const memoryDetailDialogOpenAtom = atom<boolean>(false)

// 当前查看的记忆 ID
export const currentMemoryIdAtom = atom<string | null>(null)

// 当前查看的记忆详情
export const currentMemoryAtom = atom((get) => {
  const memoryId = get(currentMemoryIdAtom)
  const memories = get(memoriesAtom)

  if (!memoryId) return null
  return memories.find((m) => m.id === memoryId) ?? null
})

// 记忆编辑对话框打开状态
export const memoryEditDialogOpenAtom = atom<boolean>(false)

// 记忆删除确认对话框打开状态
export const memoryDeleteConfirmOpenAtom = atom<boolean>(false)

// 记忆侧边栏展开状态
export const memorySidebarOpenAtom = atomWithStorage<boolean>(
  StorageKey.MemorySidebarOpen,
  true,
  storage
)

// 记忆视图模式（列表/网格）
export type MemoryViewMode = 'list' | 'grid'
export const memoryViewModeAtom = atomWithStorage<MemoryViewMode>(
  StorageKey.MemoryViewMode,
  'list',
  storage
)

// 记忆筛选状态
export const memoryFilterTypeAtom = atom<string>('all') // 'all', 'explicit_preference', 'explicit_fact', etc.

export const memoryFilterCategoryAtom = atom<string>('all') // 'all', 'preference', 'personal-info', etc.

// 记忆排序状态
export type MemorySortOption = 'createdAt' | 'updatedAt' | 'importance' | 'accessCount'
export const memorySortOptionAtom = atom<MemorySortOption>('createdAt')

export const memorySortOrderAtom = atom<'asc' | 'desc'>('desc')

// 过滤和排序后的记忆列表
export const filteredAndSortedMemoriesAtom = atom((get) => {
  const memories = get(memoriesAtom)
  const filterType = get(memoryFilterTypeAtom)
  const filterCategory = get(memoryFilterCategoryAtom)
  const sortOption = get(memorySortOptionAtom)
  const sortOrder = get(memorySortOrderAtom)

  // 过滤
  let filtered = memories

  if (filterType !== 'all') {
    filtered = filtered.filter((m) => m.type === filterType)
  }

  if (filterCategory !== 'all') {
    filtered = filtered.filter((m) => m.category === filterCategory)
  }

  // 排序
  const sorted = [...filtered].sort((a, b) => {
    const aVal = a[sortOption]
    const bVal = b[sortOption]

    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal
    }

    // 字符串比较
    const aStr = String(aVal ?? '')
    const bStr = String(bVal ?? '')
    return sortOrder === 'asc'
      ? aStr.localeCompare(bStr)
      : bStr.localeCompare(aStr)
  })

  return sorted
})

// ==================== 记忆操作 Atoms ====================

// 添加记忆
export const useAddMemory = () => {
  const setMemories = useSetAtom(memoriesQueryAtom)

  return useAtomValue(
    atomWithMutation(() => ({
      mutationKey: ['addMemory'],
      mutationFn: async (memory: Omit<Memory, 'embeddingId' | 'id' | 'createdAt' | 'updatedAt' | 'lastAccessedAt' | 'accessCount'>) => {
        const result = await platform.addMemory(memory)
        // 使查询失效，触发重新获取
        setMemories((prev) => ({ ...prev, data: [...(prev.data ?? []), result] }))
        return result
      },
    }))
  )
}

// 更新记忆
export const useUpdateMemory = () => {
  const setMemories = useSetAtom(memoriesQueryAtom)

  return useAtomValue(
    atomWithMutation(() => ({
      mutationKey: ['updateMemory'],
      mutationFn: async ({ id, updates }: { id: string; updates: Partial<Memory> }) => {
        const result = await platform.updateMemory(id, updates)
        // 更新缓存
        setMemories((prev) => ({
          ...prev,
          data: (prev.data ?? []).map((m) => (m.id === id ? result : m)),
        }))
        return result
      },
    }))
  )
}

// 删除记忆
export const useDeleteMemory = () => {
  const setMemories = useSetAtom(memoriesQueryAtom)

  return useAtomValue(
    atomWithMutation(() => ({
      mutationKey: ['deleteMemory'],
      mutationFn: async (id: string) => {
        await platform.deleteMemory(id)
        // 从缓存中移除
        setMemories((prev) => ({
          ...prev,
          data: (prev.data ?? []).filter((m) => m.id !== id),
        }))
      },
    }))
  )
}

// 批量删除记忆
export const useDeleteMemories = () => {
  const setMemories = useSetAtom(memoriesQueryAtom)

  return useAtomValue(
    atomWithMutation(() => ({
      mutationKey: ['deleteMemories'],
      mutationFn: async (ids: string[]) => {
        await platform.deleteMemoriesBatch(ids)
        // 从缓存中移除
        setMemories((prev) => ({
          ...prev,
          data: (prev.data ?? []).filter((m) => !ids.includes(m.id)),
        }))
      },
    }))
  )
}

// 切换记忆置顶
export const useToggleMemoryPin = () => {
  const setMemories = useSetAtom(memoriesQueryAtom)

  return useAtomValue(
    atomWithMutation(() => ({
      mutationKey: ['toggleMemoryPin'],
      mutationFn: async (id: string) => {
        const result = await platform.toggleMemoryPin(id)
        // 更新缓存
        setMemories((prev) => ({
          ...prev,
          data: (prev.data ?? []).map((m) => (m.id === id ? result : m)),
        }))
        return result
      },
    }))
  )
}

// 切换记忆归档
export const useToggleMemoryArchive = () => {
  const setMemories = useSetAtom(memoriesQueryAtom)

  return useAtomValue(
    atomWithMutation(() => ({
      mutationKey: ['toggleMemoryArchive'],
      mutationFn: async (id: string) => {
        const result = await platform.toggleMemoryArchive(id)
        // 更新缓存
        setMemories((prev) => ({
          ...prev,
          data: (prev.data ?? []).map((m) => (m.id === id ? result : m)),
        }))
        return result
      },
    }))
  )
}

// 搜索记忆
export const useSearchMemories = () => {
  return useAtomValue(
    atomWithMutation(() => ({
      mutationKey: ['searchMemories'],
      mutationFn: async (query: string, options: MemorySearchOptions = {}) => {
        return await platform.semanticSearchMemories(query, options)
      },
    }))
  )
}

// 从会话提取记忆
export const useExtractMemoriesFromSession = () => {
  const setMemories = useSetAtom(memoriesQueryAtom)

  return useAtomValue(
    atomWithMutation(() => ({
      mutationKey: ['extractMemoriesFromSession'],
      mutationFn: async (sessionId: string, messages: any[]) => {
        const result = await platform.extractMemoriesFromSession(sessionId, messages)
        // 添加到缓存
        setMemories((prev) => ({
          ...prev,
          data: [...(prev.data ?? []), ...result.memories],
        }))
        return result
      },
    }))
  )
}
