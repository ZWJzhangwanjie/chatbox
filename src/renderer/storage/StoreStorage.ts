import { DebouncedFunc } from 'lodash'
import debounce from 'lodash/debounce'
import { v4 as uuidv4 } from 'uuid'
import BaseStorage from './BaseStorage'

export enum StorageKey {
  ChatSessions = 'chat-sessions',
  Configs = 'configs',
  Settings = 'settings',
  MyCopilots = 'myCopilots',
  ConfigVersion = 'configVersion',
  RemoteConfig = 'remoteConfig',
  ChatSessionsList = 'chat-sessions-list',
  ChatSessionSettings = 'chat-session-settings',
  PictureSessionSettings = 'picture-session-settings',
  AuthInfo = 'authInfo',
  MemorySidebarOpen = 'memory-sidebar-open',
  MemoryViewMode = 'memory-view-mode',
}

export const StorageKeyGenerator = {
  session(id: string) {
    return `session:${id}`
  },
  picture(category: string) {
    return `picture:${category}:${uuidv4()}`
  },
  file(sessionId: string, msgId: string) {
    return `file:${sessionId}:${msgId}:${uuidv4()}`
  },
}

export default class StoreStorage extends BaseStorage {
  constructor() {
    super()
  }

  /**
   * 立即写入白名单
   *
   * 这些 key 需要立即持久化（绕过防抖），通常是因为：
   * 1. 用户配置变更（需要立即保存，避免跨标签页时丢失）
   * 2. 关键状态（影响功能正确性）
   *
   * @example
   * - 'ad-config-storage': 广告配置，用户修改后需要立即生效
   */
  private static readonly IMMEDIATE_WRITE_KEYS = new Set<string>([
    'ad-config-storage', // 🔥 广告配置需要立即持久化，解决跨标签页问题
  ]);

  public async getItem<T>(key: string, initialValue: T): Promise<T> {
    let value: T = await super.getItem(key, initialValue)

    if (key === StorageKey.Configs && value === initialValue) {
      await super.setItemNow(key, initialValue) // 持久化初始生成的 uuid
    }

    return value
  }

  private debounceQueue = new Map<string, DebouncedFunc<(key: string, value: unknown) => void>>()

  public async setItem<T>(key: string, value: T): Promise<void> {
    // 🔥 优化：为需要立即持久化的 key 绕过防抖机制
    if (StoreStorage.IMMEDIATE_WRITE_KEYS.has(key)) {
      console.log(`[StoreStorage] ⚡ Immediate write for key: ${key}`);
      return this.setItemNow(key, value);
    }

    // 其他数据使用防抖（减少频繁写入）
    let debounced = this.debounceQueue.get(key)
    if (!debounced) {
      debounced = debounce(this.setItemNow.bind(this), 500, { maxWait: 2000 })
      this.debounceQueue.set(key, debounced)
    }
    debounced(key, value)
  }
}
