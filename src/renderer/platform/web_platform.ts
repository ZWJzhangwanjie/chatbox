import localforage from 'localforage'
import * as defaults from 'src/shared/defaults'
import type { Config, Settings, ShortcutSetting } from 'src/shared/types'
import type { Memory, MemorySearchOptions, MemoryStats, MemorySummary } from 'src/shared/types'
import { v4 as uuidv4 } from 'uuid'
import { parseLocale } from '@/i18n/parser'
import { getBrowser, getOS } from '../packages/navigator'
import type { Platform, PlatformType } from './interfaces'
import type { KnowledgeBaseController } from './knowledge-base/interface'
import { IndexedDBStorage } from './storages'
import WebExporter from './web_exporter'
import { parseTextFileLocally } from './web_platform_utils'

/**
 * IndexedDB 封装类 - 用于存储记忆
 */
class MemoryDB {
  private db: IDBDatabase | null = null
  private readonly DB_NAME = 'chatbox_memory'
  private readonly STORE_NAME = 'memories'
  private readonly DB_VERSION = 1

  async init(): Promise<void> {
    if (this.db) return

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION)

      request.onerror = () => reject(new Error('Failed to open memory database'))
      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          db.createObjectStore(this.STORE_NAME, { keyPath: 'id' })
        }
      }
    })
  }

  async add(memory: Memory): Promise<void> {
    await this.init()
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(this.STORE_NAME, 'readwrite')
      const store = tx.objectStore(this.STORE_NAME)
      store.add(memory)

      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  }

  async getAll(userId = 'default'): Promise<Memory[]> {
    await this.init()
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(this.STORE_NAME, 'readonly')
      const store = tx.objectStore(this.STORE_NAME)
      const getAll = store.getAll()

      getAll.onsuccess = () => {
        const memories = getAll.result as Memory[]
        const filtered = memories.filter(m => m.userId === userId && !m.archived)
        resolve(filtered.sort((a, b) => b.createdAt - a.createdAt))
      }
      getAll.onerror = () => reject(getAll.error)
    })
  }

  async get(id: string): Promise<Memory | undefined> {
    await this.init()
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(this.STORE_NAME, 'readonly')
      const store = tx.objectStore(this.STORE_NAME)
      const get = store.get(id)

      get.onsuccess = () => resolve(get.result)
      get.onerror = () => reject(get.error)
    })
  }

  async update(id: string, updates: Partial<Memory>): Promise<void> {
    await this.init()
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(this.STORE_NAME, 'readwrite')
      const store = tx.objectStore(this.STORE_NAME)

      store.get(id).onsuccess = () => {
        const existing = store.get(id).result as Memory
        if (existing) {
          const updated = { ...existing, ...updates, id, updatedAt: Date.now() }
          store.put(updated)

          tx.oncomplete = () => resolve()
          tx.onerror = () => reject(tx.error)
        } else {
          reject(new Error(`Memory not found: ${id}`))
        }
      }
    })
  }

  async remove(id: string): Promise<void> {
    await this.init()
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(this.STORE_NAME, 'readwrite')
      const store = tx.objectStore(this.STORE_NAME)
      store.delete(id)

      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  }

  async clear(): Promise<void> {
    await this.init()
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(this.STORE_NAME, 'readwrite')
      const store = tx.objectStore(this.STORE_NAME)
      store.clear()

      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  }
}

// 创建单例实例
const memoryDB = new MemoryDB()

export default class WebPlatform extends IndexedDBStorage implements Platform {
  public type: PlatformType = 'web'

  public exporter = new WebExporter()

  public async getVersion(): Promise<string> {
    return 'web'
  }
  public async getPlatform(): Promise<string> {
    return 'web'
  }
  public async getArch(): Promise<string> {
    return 'web'
  }
  public async shouldUseDarkColors(): Promise<boolean> {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
  }
  public onSystemThemeChange(callback: () => void): () => void {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', callback)
    return () => {
      window.matchMedia('(prefers-color-scheme: dark)').removeEventListener('change', callback)
    }
  }
  public onWindowShow(callback: () => void): () => void {
    return () => null
  }
  public onUpdateDownloaded(callback: () => void): () => void {
    return () => null
  }
  public async openLink(url: string): Promise<void> {
    window.open(url)
  }
  public async getDeviceName(): Promise<string> {
    // Web 平台返回浏览器名称
    return getBrowser()
  }
  public async getInstanceName(): Promise<string> {
    return `${getOS()} / ${getBrowser()}`
  }
  public async getLocale() {
    const lang = window.navigator.language
    return parseLocale(lang)
  }
  public async ensureShortcutConfig(config: ShortcutSetting): Promise<void> {
    return
  }
  public async ensureProxyConfig(config: { proxy?: string }): Promise<void> {
    return
  }
  public async relaunch(): Promise<void> {
    location.reload()
  }

  public async getConfig(): Promise<Config> {
    let value: Config = await this.getStoreValue('configs')
    if (value === undefined || value === null) {
      value = defaults.newConfigs()
      await this.setStoreValue('configs', value)
    }
    return value
  }
  public async getSettings(): Promise<Settings> {
    let value: Settings = await this.getStoreValue('settings')
    if (value === undefined || value === null) {
      value = defaults.settings()
      await this.setStoreValue('settings', value)
    }
    return value
  }

  public async getStoreBlob(key: string): Promise<string | null> {
    return localforage.getItem<string>(key)
  }
  public async setStoreBlob(key: string, value: string): Promise<void> {
    await localforage.setItem(key, value)
  }
  public async delStoreBlob(key: string) {
    return localforage.removeItem(key)
  }
  public async listStoreBlobKeys(): Promise<string[]> {
    return localforage.keys()
  }

  public async initTracking() {
    const GAID = 'G-B365F44W6E'
    try {
      const conf = await this.getConfig()
      window.gtag('config', GAID, {
        app_name: 'chatbox',
        user_id: conf.uuid,
        client_id: conf.uuid,
        app_version: await this.getVersion(),
        chatbox_platform_type: 'web',
        chatbox_platform: await this.getPlatform(),
        app_platform: await this.getPlatform(),
      })
    } catch (e) {
      window.gtag('config', GAID, {
        app_name: 'chatbox',
      })
      throw e
    }
  }
  public trackingEvent(name: string, params: { [key: string]: string }) {
    window.gtag('event', name, params)
  }

  public async shouldShowAboutDialogWhenStartUp(): Promise<boolean> {
    return false
  }

  public async appLog(level: string, message: string): Promise<void> {
    console.log(`APP_LOG: [${level}] ${message}`)
  }

  public async ensureAutoLaunch(enable: boolean) {
    return
  }

  async parseFileLocally(file: File): Promise<{ key?: string; isSupported: boolean }> {
    const result = await parseTextFileLocally(file)
    if (!result.isSupported) {
      return { isSupported: false }
    }
    const key = `parseFile-` + uuidv4()
    await this.setStoreBlob(key, result.text)
    return { key, isSupported: true }
  }

  public async parseUrl(url: string): Promise<{ key: string; title: string }> {
    throw new Error('Not implemented')
  }

  public async isFullscreen() {
    return true
  }

  public async setFullscreen(enabled: boolean): Promise<void> {
    return
  }

  installUpdate(): Promise<void> {
    throw new Error('Method not implemented.')
  }

  public getKnowledgeBaseController(): KnowledgeBaseController {
    throw new Error('Method not implemented.')
  }

  // ==================== Memory Operations (Web Mode with IndexedDB) ====================

  /**
   * 获取所有记忆（Web 模式：从 IndexedDB 读取）
   */
  public async getAllMemories(userId = 'default'): Promise<Memory[]> {
    try {
      return await memoryDB.getAll(userId)
    } catch (error) {
      console.error('[WebPlatform] getAllMemories error:', error)
      return []
    }
  }

  /**
   * 根据 ID 获取记忆
   */
  public async getMemoryById(id: string): Promise<Memory> {
    const memory = await memoryDB.get(id)
    if (!memory) {
      throw new Error(`Memory not found: ${id}`)
    }
    return memory
  }

  /**
   * 添加记忆
   */
  public async addMemory(memoryData: Omit<Memory, 'embeddingId' | 'id' | 'createdAt' | 'updatedAt' | 'lastAccessedAt' | 'accessCount'>): Promise<Memory> {
    const now = Date.now()
    const memory: Memory = {
      ...memoryData,
      id: uuidv4(),
      createdAt: now,
      updatedAt: now,
      lastAccessedAt: now,
      accessCount: 0,
    }
    await memoryDB.add(memory)
    console.log('[WebPlatform] Memory added:', memory.content)
    return memory
  }

  /**
   * 更新记忆
   */
  public async updateMemory(id: string, updates: Partial<Memory>): Promise<Memory> {
    await memoryDB.update(id, updates)
    const updated = await memoryDB.get(id)
    if (!updated) {
      throw new Error(`Memory not found: ${id}`)
    }
    return updated
  }

  /**
   * 删除记忆
   */
  public async deleteMemory(id: string): Promise<{ success: boolean }> {
    await memoryDB.remove(id)
    return { success: true }
  }

  /**
   * 批量删除记忆
   */
  public async deleteMemoriesBatch(ids: string[]): Promise<{ success: boolean; count: number }> {
    for (const id of ids) {
      await memoryDB.remove(id)
    }
    return { success: true, count: ids.length }
  }

  /**
   * 搜索记忆（基于元数据）
   */
  public async searchMemories(userId = 'default', options: MemorySearchOptions = {}): Promise<Memory[]> {
    const allMemories = await this.getAllMemories(userId)

    let filtered = allMemories

    if (options.types && options.types.length > 0) {
      filtered = filtered.filter(m => options.types!.includes(m.type))
    }

    if (options.categories && options.categories.length > 0) {
      filtered = filtered.filter(m => m.category && options.categories!.includes(m.category))
    }

    if (options.minImportance !== undefined) {
      filtered = filtered.filter(m => (m.importance || 0) >= options.minImportance!)
    }

    if (!options.includeArchived) {
      filtered = filtered.filter(m => !m.archived)
    }

    return filtered
  }

  /**
   * 语义搜索（Web 模式：简化为文本搜索）
   */
  public async semanticSearchMemories(query: string, options?: MemorySearchOptions): Promise<Memory[]> {
    const allMemories = await this.getAllMemories()
    const queryLower = query.toLowerCase()

    // 简单的文本匹配搜索
    return allMemories.filter(memory => {
      const contentMatch = memory.content.toLowerCase().includes(queryLower)
      const summaryMatch = memory.summary?.toLowerCase().includes(queryLower)
      const tagMatch = memory.tags?.some(tag => tag.toLowerCase().includes(queryLower))

      return contentMatch || summaryMatch || tagMatch
    })
  }

  /**
   * 获取相关记忆用于上下文
   */
  public async getMemoriesForContext(query: string, maxMemories = 5, maxTokens = 500): Promise<Memory[]> {
    const allMemories = await this.getAllMemories()

    // 按重要性和最近访问时间排序
    const sorted = [...allMemories].sort((a, b) => {
      const aScore = (a.importance || 0.5) * 100 + (a.pinned ? 1000 : 0)
      const bScore = (b.importance || 0.5) * 100 + (b.pinned ? 1000 : 0)
      return bScore - aScore
    })

    return sorted.slice(0, maxMemories)
  }

  /**
   * 获取记忆摘要
   */
  public async getMemorySummary(userId = 'default'): Promise<MemorySummary> {
    const allMemories = await this.getAllMemories(userId)

    const byType: Record<string, number> = {}
    const byCategory: Record<string, number> = {}
    const recentMemories = allMemories.slice(0, 10)
    let pinnedCount = 0
    let archivedCount = 0

    for (const memory of allMemories) {
      byType[memory.type] = (byType[memory.type] || 0) + 1
      if (memory.category) {
        byCategory[memory.category] = (byCategory[memory.category] || 0) + 1
      }
      if (memory.pinned) pinnedCount++
      if (memory.archived) archivedCount++
    }

    return {
      totalCount: allMemories.length,
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
  public async getMemoryStats(userId = 'default'): Promise<MemoryStats> {
    const allMemories = await this.getAllMemories(userId)

    const byType: Record<string, number> = {}
    const bySource: Record<string, number> = {}
    const byCategory: Record<string, number> = {}
    let thisWeek = 0
    let thisMonth = 0

    const now = Date.now()
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000
    const monthAgo = now - 30 * 24 * 60 * 60 * 1000

    for (const memory of allMemories) {
      byType[memory.type] = (byType[memory.type] || 0) + 1
      bySource[memory.source] = (bySource[memory.source] || 0) + 1
      if (memory.category) {
        byCategory[memory.category] = (byCategory[memory.category] || 0) + 1
      }
      if (memory.createdAt >= weekAgo) thisWeek++
      if (memory.createdAt >= monthAgo) thisMonth++
    }

    return {
      total: allMemories.length,
      byType,
      bySource,
      byCategory,
      thisWeek,
      thisMonth,
    }
  }

  /**
   * 切换置顶状态
   */
  public async toggleMemoryPin(id: string): Promise<Memory> {
    const memory = await this.getMemoryById(id)
    return this.updateMemory(id, { pinned: !memory.pinned })
  }

  /**
   * 切换归档状态
   */
  public async toggleMemoryArchive(id: string): Promise<Memory> {
    const memory = await this.getMemoryById(id)
    return this.updateMemory(id, { archived: !memory.archived })
  }

  /**
   * 从会话中提取记忆（Web 模式：简单的规则提取）
   */
  public async extractMemoriesFromSession(
    sessionId: string,
    messages: any[],
    config: any = {}
  ): Promise<{ memories: Memory[]; confidence: number; reasoning?: string }> {
    console.log('[WebPlatform] 开始提取记忆...')
    const extractedMemories: Memory[] = []

    // 辅助函数：从消息中提取文本
    const getMessageText = (msg: any): string => {
      if (msg.contentParts && msg.contentParts.length > 0) {
        return msg.contentParts
          .map((c: any) => {
            if (c.type === 'text') return c.text
            return ''
          })
          .filter((c: string) => c !== null && c !== undefined)
          .join('\n')
      }
      return msg.content || msg.text || ''
    }

    // 简单的模式匹配提取
    const userMessages = messages.filter((m: any) => m.role === 'user')
    console.log('[WebPlatform] 用户消息数量:', userMessages.length)

    const patterns = [
      { type: 'explicit_preference' as const, pattern: /我(?:喜欢|偏好|爱|想要|希望).{0,5}?(.+?)(?:[。，！？.!?]|$)/gi, category: 'preference' },
      { type: 'explicit_fact' as const, pattern: /我(?:是|是一名?|从事).{0,10}?(.+?)(?:[。，！？.!?]|$)/gi, category: 'personal-info' },
      { type: 'explicit_fact' as const, pattern: /我(?:会|能|擅长|精通|熟悉).{0,3}?(.+?)(?:[。，！？.!?]|$)/gi, category: 'skill' },
    ]

    for (const msg of userMessages) {
      const text = getMessageText(msg)
      console.log('[WebPlatform] 分析消息:', text.substring(0, 50))

      for (const { type, pattern, category } of patterns) {
        const matches = Array.from(text.matchAll(pattern))

        for (const match of matches) {
          const content = match[1]?.trim()
          if (!content || content.length < 2) continue

          const memory: Memory = {
            id: uuidv4(),
            userId: 'default',
            type,
            source: 'implicit',
            content: `${category === 'preference' ? '用户偏好' : '用户信息'}: ${content}`,
            summary: content.substring(0, 30),
            importance: 0.6,
            confidence: 0.7,
            priority: 2,
            category,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            lastAccessedAt: Date.now(),
            accessCount: 0,
            relatedSessionId: sessionId,
            tags: [category],
          }

          // 存储到 IndexedDB
          await memoryDB.add(memory)
          extractedMemories.push(memory)
          console.log('[WebPlatform] 提取到记忆:', memory.content)
        }
      }
    }

    console.log('[WebPlatform] 提取完成，共', extractedMemories.length, '条记忆')

    return {
      memories: extractedMemories,
      confidence: extractedMemories.length > 0 ? 0.7 : 0,
      reasoning: extractedMemories.length > 0
        ? `Web 模式提取到 ${extractedMemories.length} 条记忆`
        : '没有提取到记忆',
    }
  }

  /**
   * 初始化记忆系统
   */
  public async initializeMemory(): Promise<{ success: boolean }> {
    console.log('[WebPlatform] 初始化记忆系统...')
    try {
      await memoryDB.init()
      console.log('[WebPlatform] 记忆系统初始化成功')
      return { success: true }
    } catch (error) {
      console.error('[WebPlatform] 记忆系统初始化失败:', error)
      return { success: false }
    }
  }

  public minimize() {
    return Promise.resolve()
  }

  public maximize() {
    return Promise.resolve()
  }

  public unmaximize() {
    return Promise.resolve()
  }

  public closeWindow() {
    return Promise.resolve()
  }

  public isMaximized() {
    return Promise.resolve(true)
  }

  public onMaximizedChange() {
    return () => null
  }
}
