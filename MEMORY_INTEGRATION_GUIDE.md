# Memory Management System Integration Guide

> Chatbox Memory Management System - 完整集成文档
> 版本: 1.0.0
> 更新时间: 2025-01-25

---

## 📋 目录

1. [系统概述](#系统概述)
2. [Platform API](#platform-api)
3. [记忆类型](#记忆类型)
4. [广告系统集成](#广告系统集成)
5. [代码示例](#代码示例)
6. [最佳实践](#最佳实践)

---

## 1. 系统概述

### 1.1 架构

Memory Management System 采用分层架构设计：

```
┌─────────────────────────────────────────────────────────────────┐
│                        应用层 (Application)                      │
├─────────────────────────────────────────────────────────────────┤
│  - Memory Management UI (settings/memory.tsx)                    │
│  - 广告系统集成 (ads/)                                          │
│  - 对话系统 (session/)                                          │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      Platform 层 (platform/)                      │
├─────────────────────────────────────────────────────────────────┤
│  DesktopPlatform → Electron IPC → Main Process (SQLite)        │
│  WebPlatform → IndexedDB (浏览器存储)                          │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    存储层 (Storage)                              │
├─────────────────────────────────────────────────────────────────┤
│  - SQLite (桌面模式)                                             │
│  - IndexedDB (Web 模式)                                         │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 支持的平台

| 平台 | 存储方式 | Platform Type |
|------|----------|---------------|
| 桌面应用 (Electron) | SQLite | `'desktop'` |
| Web 应用 | IndexedDB | `'web'` |

---

## 2. Platform API

### 2.1 导入 Platform

```typescript
import platform from '@/platform'
```

### 2.2 核心 API 方法

#### 2.2.1 获取所有记忆

```typescript
/**
 * 获取用户的所有记忆
 * @param userId - 用户ID，默认为 'default'
 * @returns Promise<Memory[]> - 记忆列表
 */
const allMemories = await platform.getAllMemories('default')
```

#### 2.2.2 根据 ID 获取记忆

```typescript
/**
 * 根据ID获取单条记忆
 * @param id - 记忆ID
 * @returns Promise<Memory> - 记忆对象
 */
const memory = await platform.getMemoryById(memoryId)
```

#### 2.2.3 添加记忆

```typescript
/**
 * 手动添加一条记忆
 * @param memoryData - 记忆数据（不含 id, createdAt 等自动生成的字段）
 * @returns Promise<Memory> - 完整的记忆对象
 */
const newMemory = await platform.addMemory({
  userId: 'default',
  type: 'explicit_preference',
  source: 'manual',
  content: '用户喜欢喝咖啡',
  summary: '喜欢喝咖啡',
  importance: 0.8,
  confidence: 0.9,
  priority: 3,
  category: 'preference',
  tags: ['preference', 'beverage'],
})
```

#### 2.2.4 更新记忆

```typescript
/**
 * 更新现有记忆
 * @param id - 记忆ID
 * @param updates - 要更新的字段
 * @returns Promise<Memory> - 更新后的记忆对象
 */
const updatedMemory = await platform.updateMemory(memoryId, {
  importance: 0.9,
  pinned: true,
})
```

#### 2.2.5 删除记忆

```typescript
/**
 * 删除单条记忆
 * @param id - 记忆ID
 * @returns Promise<{ success: boolean }>
 */
await platform.deleteMemory(memoryId)

/**
 * 批量删除记忆
 * @param ids - 记忆ID数组
 * @returns Promise<{ success: boolean; count: number }>
 */
await platform.deleteMemoriesBatch([id1, id2, id3])
```

#### 2.2.6 搜索记忆

```typescript
/**
 * 基于元数据搜索记忆
 * @param userId - 用户ID
 * @param options - 搜索选项
 */
const results = await platform.searchMemories('default', {
  types: ['explicit_preference', 'explicit_fact'],
  categories: ['preference', 'skill'],
  minImportance: 0.6,
  includeArchived: false,
})
```

#### 2.2.7 语义搜索

```typescript
/**
 * 语义搜索（基于文本内容）
 * @param query - 搜索查询
 * @param options - 搜索选项
 */
const results = await platform.semanticSearchMemories('咖啡')
// 或
const results = await platform.semanticSearchMemories('程序员', {
  types: ['explicit_fact'],
})
```

#### 2.2.8 获取上下文相关记忆

```typescript
/**
 * 获取与查询相关的记忆（用于对话上下文注入）
 * @param query - 用户查询文本
 * @param maxMemories - 最多返回多少条记忆，默认5
 * @param maxTokens - 最大token数限制，默认500
 * @returns Promise<Memory[]> - 相关记忆列表
 */
const relevantMemories = await platform.getMemoriesForContext(
  '如何学习编程',
  5,
  500
)
```

#### 2.2.9 从会话中提取记忆

```typescript
/**
 * 从对话会话中提取记忆（核心提取功能）
 * @param sessionId - 会话ID
 * @param messages - 消息数组
 * @param config - 提取配置（可选）
 * @returns Promise<MemoryExtraction> - 提取结果
 */
const extractionResult = await platform.extractMemoriesFromSession(
  sessionId,
  messages,
  {
    maxHistoryLength: 30,      // 分析最近多少条消息
    extractExplicitPreferences: true,  // 提取明确偏好
    extractFactualInfo: true,   // 提取事实信息
    extractImplicitPatterns: true,  // 提取行为模式
    minConfidence: 0.5,         // 最低置信度
    privacyMode: false,         // 隐私模式
  }
)

// 提取结果包含：
// {
//   memories: Memory[],       // 提取到的记忆列表
//   confidence: number,       // 整体置信度 (0-1)
//   reasoning: string        // 提取说明
// }
```

#### 2.2.10 获取记忆统计

```typescript
/**
 * 获取记忆统计信息
 * @param userId - 用户ID
 * @returns Promise<MemoryStats>
 */
const stats = await platform.getMemoryStats('default')
// {
//   total: 10,              // 总记忆数
//   byType: {...},          // 按类型统计
//   bySource: {...},        // 按来源统计
//   byCategory: {...},      // 按分类统计
//   thisWeek: 2,            // 本周新增
//   thisMonth: 5            // 本月新增
// }
```

#### 2.2.11 获取记忆摘要

```typescript
/**
 * 获取记忆摘要（用于概览页面）
 * @param userId - 用户ID
 * @returns Promise<MemorySummary>
 */
const summary = await platform.getMemorySummary('default')
// {
//   totalCount: 10,
//   byType: {...},
//   byCategory: {...},
//   recentMemories: Memory[],  // 最近10条记忆
//   pinnedCount: 2,           // 置顶数量
//   archivedCount: 1          // 归档数量
// }
```

#### 2.2.12 切换置顶/归档状态

```typescript
/**
 * 切换置顶状态
 */
const updatedMemory = await platform.toggleMemoryPin(memoryId)

/**
 * 切换归档状态
 */
const updatedMemory = await platform.toggleMemoryArchive(memoryId)
```

---

## 3. 记忆类型

### 3.1 Memory 数据结构

```typescript
interface Memory {
  // 基础字段
  id: string                    // 唯一标识
  userId: string                // 用户ID
  type: MemoryType             // 记忆类型
  source: MemorySource         // 数据来源

  // 内容字段
  content: string              // 完整内容
  summary: string              // 简短摘要（最多30字）

  // 评分字段
  importance: number           // 重要性 (0-1)
  confidence: number           // 置信度 (0-1)
  priority: number             // 优先级 (1-5)

  // 分类字段
  category: string             // 分类标签
  tags: string[]               // 额外标签

  // 时间字段
  createdAt: number            // 创建时间（时间戳）
  updatedAt: number            // 更新时间（时间戳）
  lastAccessedAt: number       // 最后访问时间
  accessCount: number          // 访问次数

  // 关联字段
  relatedSessionId: string     // 关联的会话ID
  relatedModelId?: string      // 关联的模型ID

  // 状态字段
  pinned: boolean              // 是否置顶
  archived: boolean            // 是否归档

  // 可选字段
  embeddingId?: string         // 向量嵌入ID（用于语义搜索）
  expiresAt?: number           // 过期时间
}
```

### 3.2 MemoryType 枚举

```typescript
type MemoryType =
  | 'explicit_preference'  // 明确偏好（用户直接表达）
  | 'explicit_fact'        // 明确事实（个人信息）
  | 'implicit_pattern'     // 隐式模式（行为模式）
  | 'implicit_interest'    // 隐式兴趣（推断的兴趣）
```

### 3.3 MemorySource 枚举

```typescript
type MemorySource =
  | 'manual'      // 手动添加
  | 'implicit'    // 自动提取
  | 'api'         // API导入
```

### 3.4 MemoryPriority 枚举

```typescript
type MemoryPriority =
  | 1  // 最低
  | 2  // 低
  | 3  // 中等（默认）
  | 4  // 高
  | 5  // 最高
```

---

## 4. 广告系统集成

### 4.1 更新 useMemoryForAds Hook

当前 `useMemoryForAds` 是存根实现，返回空数据。以下是完整实现：

```typescript
// src/renderer/packages/ads/hooks/useMemoryForAds.ts

import { useQuery } from '@tanstack/react-query'
import type { Memory } from 'src/shared/types'
import type { UserData, UserPreferences } from '../core/types'
import platform from '@/platform'

export interface UseMemoryForAdsResult {
  userData: UserData | null
  isLoading: boolean
  memoryCount: number
}

/**
 * 从记忆中提取话题标签
 */
function extractTopicsFromMemory(memory: Memory): string[] {
  const topics: string[] = []

  // 从 category 添加
  if (memory.category) {
    topics.push(memory.category)
  }

  // 从 tags 添加
  if (memory.tags?.length) {
    topics.push(...memory.tags)
  }

  // 从 content 中提取关键词
  const keywords = memory.content
    .replace(/用户[偏好信息][:：]\s*/g, '')
    .trim()
    .split(/\s+/)[0]

  if (keywords && keywords.length > 1 && keywords.length < 20) {
    topics.push(keywords)
  }

  return topics
}

/**
 * 记忆分类
 */
const SHORT_TERM_TYPES = ['implicit_pattern']
const LONG_TERM_TYPES = ['explicit_preference', 'explicit_fact', 'implicit_interest']

/**
 * 将记忆转换为广告系统需要的 UserData 格式
 */
function transformMemoryForAds(memories: Memory[]): UserData {
  const shortTerm: Record<string, unknown> = {}
  const longTerm: Record<string, unknown> = {}
  const interests = new Set<string>()
  const preferredTopics: string[] = []

  // 按重要性和时间排序
  const sortedMemories = [...memories].sort((a, b) => {
    // 置顶的记忆优先
    if (a.pinned && !b.pinned) return -1
    if (!a.pinned && b.pinned) return 1

    // 重要性高的优先
    if ((b.importance || 0.5) !== (a.importance || 0.5)) {
      return (b.importance || 0.5) - (a.importance || 0.5)
    }

    // 最近的优先
    return b.createdAt - a.createdAt
  })

  for (const memory of sortedMemories) {
    const key = `${memory.type}_${memory.id}`
    const memoryData = {
      content: memory.content,
      summary: memory.summary,
      category: memory.category,
      tags: memory.tags,
      importance: memory.importance,
      confidence: memory.confidence,
      createdAt: memory.createdAt,
    }

    if (SHORT_TERM_TYPES.includes(memory.type)) {
      shortTerm[key] = memoryData
    } else if (LONG_TERM_TYPES.includes(memory.type)) {
      longTerm[key] = memoryData

      // 提取兴趣和偏好话题
      const topics = extractTopicsFromMemory(memory)
      topics.forEach(t => interests.add(t))

      if (memory.category === 'preference') {
        preferredTopics.push(memory.summary)
      }
    }
  }

  return {
    memory: {
      shortTerm,
      longTerm,
    },
    profile: {
      interests: Array.from(interests).slice(0, 20),
      behaviorPattern: {
        preferredTopics: preferredTopics.slice(0, 10),
        interactionStyle: 'conversational',
      },
      demographics: {
        language: 'zh-CN', // 可以从 settings 中获取
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
    },
    preferences: {
      language: 'zh-CN',
      theme: 'light',
      customSettings: {},
    },
  }
}

/**
 * 用户记忆数据 Hook（完整实现）
 *
 * @returns {UseMemoryForAdsResult}
 */
export function useMemoryForAds(): UseMemoryForAdsResult {
  // 使用 React Query 获取记忆数据
  const {
    data: memories = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['allMemories'],
    queryFn: async () => {
      // Web 模式也支持记忆功能了
      return await platform.getAllMemories()
    },
    refetchInterval: 60000, // 每分钟刷新一次
    retry: 1,
  })

  // 处理错误状态
  if (error) {
    console.warn('[useMemoryForAds] Failed to load memories:', error)
    return {
      userData: null,
      isLoading: false,
      memoryCount: 0,
    }
  }

  // 转换记忆数据为广告系统格式
  const userData = memories.length > 0 ? transformMemoryForAds(memories) : null

  return {
    userData,
    isLoading,
    memoryCount: memories.length,
  }
}

export default useMemoryForAds
```

### 4.2 更新 DataCollector

在 `DataCollector.ts` 中添加记忆数据收集：

```typescript
// src/renderer/packages/ads/core/DataCollector.ts

import { useMemoryForAds } from '../hooks/useMemoryForAds'

export class DataCollector {
  // ... 现有代码 ...

  /**
   * 收集所有数据（添加记忆数据）
   */
  collectData(
    currentMessage: CurrentMessageInfo,
    conversationContext?: ConversationContext,
    options?: CollectionOptions
  ): DataCollectionResult {
    const { userData } = useMemoryForAds()
    const requestData: AdRequestData = {
      // ... 现有字段 ...

      // 添加用户记忆数据
      userMemory: userData?.memory ? {
        topics: this.extractTopics(userData),
        entities: this.extractEntities(userData),
      } : undefined,

      // 添加用户画像数据
      userProfile: userData?.profile ? {
        interests: userData.profile.interests,
        behaviorPattern: userData.profile.behaviorPattern?.interactionStyle || 'conversational',
      } : undefined,
    }

    return {
      requestData,
      warnings: [],
      summary: {
        hasQuery: !!currentMessage.query,
        hasResponse: !!currentMessage.response,
        hasContext: !!conversationContext,
        hasMemory: !!userData?.memory && (
          Object.keys(userData.memory.shortTerm).length > 0 ||
          Object.keys(userData.memory.longTerm).length > 0
        ),
        hasProfile: !!userData?.profile,
        contextSize: conversationContext?.messageCount || 0,
        dataSize: this.calculateDataSize(requestData),
      },
    }
  }

  /**
   * 从记忆中提取话题标签
   */
  private extractTopics(userData: UserData): string[] {
    const topics = new Set<string>()

    // 从长期记忆中提取
    for (const [key, value] of Object.entries(userData.memory.longTerm)) {
      const memory = value as any
      if (memory.category) {
        topics.add(memory.category)
      }
      if (memory.tags) {
        memory.tags.forEach((tag: string) => topics.add(tag))
      }
    }

    return Array.from(topics).slice(0, 10)
  }

  /**
   * 从记忆中提取实体信息（脱敏）
   */
  private extractEntities(userData: UserData): Record<string, string> {
    const entities: Record<string, string> = {}

    // 只提取类别，不提取具体内容（保护隐私）
    for (const [key, value] of Object.entries(userData.memory.longTerm)) {
      const memory = value as any
      if (memory.category) {
        entities[key] = memory.category
      }
    }

    return entities
  }

  /**
   * 计算数据大小
   */
  private calculateDataSize(data: AdRequestData): number {
    return JSON.stringify(data).length
  }
}
```

### 4.3 广告请求示例

带有用户记忆的广告请求数据结构：

```typescript
{
  query: "如何学习编程",
  response: "学习编程的最好方式是...",
  sessionInfo: {
    model: "gpt-4",
    provider: "openai",
    timestamp: 1706161234567
  },
  adFormats: ["action_card", "suffix"],
  placement: "post_response",

  // 用户记忆数据（新增）
  userMemory: {
    topics: ["编程", "coffee", "preference", "personal-info"],
    entities: {
      "memory_1": "preference",
      "memory_2": "skill"
    }
  },

  // 用户画像数据（新增）
  userProfile: {
    interests: ["编程", "咖啡", "技术"],
    behaviorPattern: "conversational"
  }
}
```

---

## 5. 代码示例

### 5.1 基础使用示例

#### 示例 1: 获取所有记忆

```typescript
import platform from '@/platform'

async function displayAllMemories() {
  const memories = await platform.getAllMemories()

  console.log(`总共 ${memories.length} 条记忆:`)
  memories.forEach((memory, index) => {
    console.log(`${index + 1}. ${memory.content}`)
    console.log(`   类型: ${memory.type}`)
    console.log(`   重要性: ${memory.importance}`)
    console.log(`   标签: ${memory.tags?.join(', ')}`)
    console.log('---')
  })
}
```

#### 示例 2: 搜索记忆

```typescript
async function searchUserPreferences() {
  // 搜索所有偏好类型的记忆
  const preferences = await platform.searchMemories('default', {
    types: ['explicit_preference'],
  })

  console.log('找到偏好:', preferences.length)
  preferences.forEach(p => {
    console.log(`- ${p.content}`)
  })
}
```

#### 示例 3: 添加手动记忆

```typescript
async function addManualMemory(content: string) {
  const memory = await platform.addMemory({
    userId: 'default',
    type: 'explicit_preference',
    source: 'manual',
    content: `用户偏好: ${content}`,
    summary: content.substring(0, 30),
    importance: 0.8,
    confidence: 1.0,
    priority: 3,
    category: 'preference',
    tags: ['manual', 'preference'],
  })

  console.log('记忆已添加:', memory.id)
  return memory
}
```

### 5.2 与广告系统集成示例

#### 示例 4: 在广告触发时获取用户记忆

```typescript
import { useMemoryForAds } from '@/packages/ads/hooks/useMemoryForAds'
import { AdController } from '@/packages/ads/core/AdController'

function AdIntegrationComponent() {
  const { userData, memoryCount } = useMemoryForAds()

  const handleTriggerAd = async () => {
    const controller = new AdController()

    // 触发广告时传入用户记忆数据
    await controller.triggerAd({
      query: userQuery,
      response: aiResponse,
      userData,  // 传入用户记忆和画像数据
    })
  }

  return (
    <div>
      <p>用户记忆数: {memoryCount}</p>
      {userData?.profile?.interests && (
        <p>兴趣标签: {userData.profile.interests.join(', ')}</p>
      )}
      <button onClick={handleTriggerAd}>触发广告</button>
    </div>
  )
}
```

#### 示例 5: 实时记忆注入

```typescript
import platform from '@/platform'

/**
 * 在生成 AI 回复前注入相关记忆
 */
async function injectMemoriesToContext(
  sessionId: string,
  messages: Message[]
): Promise<Message[]> {
  // 获取最近的用户消息
  const lastUserMessage = messages
    .filter(m => m.role === 'user')
    .slice(-1)[0]

  if (!lastUserMessage) {
    return messages
  }

  // 提取消息文本
  const query = extractMessageText(lastUserMessage)

  // 获取相关记忆
  const relevantMemories = await platform.getMemoriesForContext(query, 5, 500)

  if (relevantMemories.length === 0) {
    return messages
  }

  // 构建记忆注入消息
  const memoryContext = relevantMemories
    .map(m => `- ${m.content}`)
    .join('\n')

  const memoryInjection: Message = {
    role: 'system',
    contentParts: [{
      type: 'text',
      text: `[用户记忆]\n${memoryContext}\n\n请根据这些记忆信息来回答用户的问题。`,
    }],
    id: 'memory-injection',
  }

  // 注入到消息列表开头
  return [memoryInjection, ...messages]
}
```

---

## 6. 最佳实践

### 6.1 记忆提取触发时机

```typescript
// ✅ 推荐：在对话完成后触发提取
async function onConversationComplete(sessionId: string, messages: Message[]) {
  // 检查是否达到提取阈值
  const userMessageCount = messages.filter(m => m.role === 'user').length
  const threshold = 3 // 每3条用户消息提取一次

  if (userMessageCount >= threshold && userMessageCount % threshold === 0) {
    await platform.extractMemoriesFromSession(sessionId, messages)
  }
}

// ❌ 不推荐：每次对话都提取（会产生大量重复）
async function onEveryMessage(messages: Message[]) {
  await platform.extractMemoriesFromSession(sessionId, messages) // 太频繁！
}
```

### 6.2 隐私保护

```typescript
// ✅ 在广告中使用时进行脱敏处理
function sanitizeMemoryForAds(memory: Memory): any {
  return {
    // 只传递分类和标签，不传递具体内容
    category: memory.category,
    tags: memory.tags,

    // 或者传递脱敏后的摘要
    summary: memory.summary,

    // 不传递原始内容
    // content: memory.content, // ❌ 不传递！
  }
}

// ✅ 使用隐私模式
await platform.extractMemoriesFromSession(sessionId, messages, {
  privacyMode: true,  // 自动过滤敏感信息
})
```

### 6.3 性能优化

```typescript
// ✅ 使用 React Query 缓存记忆数据
const { data: memories } = useQuery({
  queryKey: ['allMemories'],
  queryFn: () => platform.getAllMemories(),
  staleTime: 60000,        // 1分钟内认为数据新鲜
  cacheTime: 300000,       // 缓存5分钟
  refetchInterval: 30000,  // 每30秒自动刷新
})

// ✅ 分页加载大量记忆
async function getMemoriesPaginated(page: number, pageSize = 20) {
  const all = await platform.getAllMemories()
  return all.slice(page * pageSize, (page + 1) * pageSize)
}
```

### 6.4 错误处理

```typescript
// ✅ 完善的错误处理
async function safeMemoryOperations() {
  try {
    const memories = await platform.getAllMemories()
    console.log('成功获取记忆:', memories.length)
    return memories
  } catch (error) {
    if (error.message.includes('Memory not available')) {
      console.warn('记忆功能在此平台不可用')
      return []
    }
    console.error('获取记忆失败:', error)
    return []
  }
}
```

---

## 7. 附录

### 7.1 平台检测

```typescript
import platform from '@/platform'

// 检测当前平台
if (platform.type === 'desktop') {
  console.log('运行在桌面模式，使用 SQLite 存储')
} else if (platform.type === 'web') {
  console.log('运行在 Web 模式，使用 IndexedDB 存储')
}
```

### 7.2 记忆数据清理

```typescript
// 清理过期记忆
async function cleanupExpiredMemories() {
  const allMemories = await platform.getAllMemories()
  const now = Date.now()
  const retentionDays = 30 // 保留30天

  const expiredMemories = allMemories.filter(m => {
    const ageInDays = (now - m.createdAt) / (1000 * 60 * 60 * 24)
    return ageInDays > retentionDays && !m.pinned
  })

  for (const memory of expiredMemories) {
    await platform.deleteMemory(memory.id)
  }

  console.log(`清理了 ${expiredMemories.length} 条过期记忆`)
}
```

### 7.3 调试技巧

```typescript
// 查看当前记忆状态
async function debugMemoryState() {
  console.group('🔍 Memory Debug Info')

  const stats = await platform.getMemoryStats()
  console.log('统计信息:', stats)

  const allMemories = await platform.getAllMemories()
  console.log('所有记忆:', allMemories.length)

  const recent = await platform.getMemorySummary()
  console.log('最近记忆:', recent.recentMemories?.map(m => ({
    content: m.content,
    type: m.type,
    importance: m.importance,
  })))

  console.groupEnd()
}
```

---

## 8. 更新日志

| 版本 | 日期 | 更新内容 |
|------|------|----------|
| 1.0.0 | 2025-01-25 | 初始版本，完整集成文档 |

---

## 9. 相关文件

```
src/
├── main/
│   └── memory/               # 主进程记忆模块
│       ├── index.ts         # 入口
│       ├── store.ts         # 数据库操作
│       ├── extractor.ts     # 记忆提取
│       └── ipc-handlers.ts  # IPC 处理
│
├── renderer/
│   ├── platform/           # 平台抽象层
│   │   ├── desktop_platform.ts  # 桌面平台
│   │   └── web_platform.ts       # Web 平台
│   │
│   ├── stores/
│   │   └── sessionActions.ts     # 会话操作（触发提取）
│   │
│   ├── routes/settings/
│   │   └── memory.tsx           # Memory Management UI
│   │
│   └── packages/
│       └── ads/               # 广告系统
│           ├── hooks/
│           │   └── useMemoryForAds.ts  # 记忆集成 Hook
│           └── core/
│               └── DataCollector.ts   # 数据收集
│
└── shared/
    ├── types.ts             # 类型定义
    └── utils/
        └── message.ts       # 消息工具
```

---

**文档维护者**: Claude Code AI Assistant
**最后更新**: 2025-01-25
