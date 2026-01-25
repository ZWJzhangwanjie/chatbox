# Chatbox 引用功能 + 广告商业化技术方案（简化版）

> **版本**: v2.0
> **日期**: 2026-01-24
> **状态**: 方案评审中
> **变更**: 复用现有 Web Search 架构，最小改动实现

---

## 目录

1. [方案概述](#1-方案概述)
2. [现有架构分析](#2-现有架构分析)
3. [改造方案](#3-改造方案)
4. [SDK 接口要求](#4-sdk-接口要求)
5. [实现细节](#5-实现细节)
6. [UI 设计](#6-ui-设计)
7. [实施计划](#7-实施计划)
8. [成功指标](#8-成功指标)

---

## 1. 方案概述

### 1.1 核心思路

**复用现有 Web Search 架构，在搜索结果中混入广告**

Chatbox 已有完整的 Web Search 功能，包括：
- ✅ 搜索结果格式化 `[webpage X begin]...[webpage X end]`
- ✅ Prompt 模板 `answerWithSearchResults()`
- ✅ 上下文注入逻辑 `constructMessagesWithSearchResults()`

**只需最小改动**：
1. 搜索时并行获取广告
2. 将广告格式化为搜索结果格式，混入结果列表
3. 调整 Prompt 提示 LLM 客观引用广告
4. 添加引用展示 UI 组件

### 1.2 数据流

```
用户提问
    │
    ▼
┌─────────────────────────────────────────┐
│  并行获取                                │
│  ├─ Web 搜索 → 5 条结果                 │
│  └─ SDK.matchAds() → 2 条广告           │
└─────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────┐
│  混合结果                                │
│  [1] 网页结果                            │
│  [2] 网页结果                            │
│  [3] 网页结果                            │
│  [4] 广告结果 [品牌合作]                 │
│  [5] 网页结果                            │
│  [6] 广告结果 [品牌合作]                 │
└─────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────┐
│  格式化为 [webpage X] 格式               │
│  发送给 LLM                              │
└─────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────┐
│  LLM 生成回答（带 [webpage X] 引用）     │
└─────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────┐
│  UI 展示引用卡片                         │
└─────────────────────────────────────────┘
```

---

## 2. 现有架构分析

### 2.1 当前 Web Search 流程

```typescript
// src/renderer/packages/web-search/index.ts

export const webSearchExecutor = async (
  { query }: { query: string },
  { abortSignal }: { abortSignal?: AbortSignal }
) => {
  const searchResults = await _searchRelatedResults(query, abortSignal)

  return {
    query,
    searchResults: searchResults.map(item => ({
      title: item.title,
      snippet: item.snippet,
      link: item.link,
      rawContent: item.rawContent,
    }))
  }
}
```

### 2.2 搜索结果格式

```typescript
// 已有的格式化逻辑（tools.ts）

[webpage 1 begin]
Title: 运动减肥指南
URL: https://example.com/fitness
Content: 减肥需要创造热量差...
[webpage 1 end]

[webpage 2 begin]
Title: 营养学基础
URL: https://example.com/nutrition
Content: 蛋白质是肌肉修复的重要营养素...
[webpage 2 end]
...
```

### 2.3 Prompt 模板

```typescript
// src/renderer/packages/prompts.ts

export function answerWithSearchResults(): string {
  return `
You are an expert web research AI...
In the search results provided to you, each result is formatted
as [webpage X begin]...[webpage X end]...

Response rules:
- Use [webpage X] to cite your sources
- Synthesize information from multiple sources
...
`.trim()
}
```

---

## 3. 改造方案

### 3.1 改动文件清单

| 文件 | 改动内容 | 工作量 |
|------|----------|--------|
| `src/shared/types.ts` | 扩展 `SearchResultItem` 类型 | 0.5h |
| `src/renderer/packages/web-search/index.ts` | 并行获取广告，混合结果 | 3h |
| `src/renderer/packages/prompts.ts` | 调整 Prompt 提示 | 0.5h |
| `src/renderer/components/messages/CitationDisplay.tsx` | 新增引用展示组件 | 3h |
| `src/renderer/packages/ads-integration/` | 新建 SDK 集成模块 | 2h |

**总计：9 小时（约 1-2 个工作日）**

---

### 3.2 详细实现

#### 改动 1：扩展类型定义

```typescript
// src/shared/types.ts

export const SearchResultItemSchema = z.object({
  title: z.string(),
  link: z.string(),
  snippet: z.string(),
  rawContent: z.string().nullable().optional(),

  // 新增：广告标记（内部使用，用于区分广告和普通搜索结果）
  _isAd: z.boolean().optional(),
  _adId: z.string().optional(),
  _type: z.string().optional(),  // 广告格式类型：'source' | 'suffix' 等
  _clickUrl: z.string().optional(),   // 点击追踪链接
  _impressionUrl: z.string().optional(), // 曝光追踪链接
})

export type SearchResultItem = z.infer<typeof SearchResultItemSchema>
```

---

#### 改动 2：Web Search 集成广告

```typescript
// src/renderer/packages/web-search/index.ts

import { fetchAds } from '@ai-ad-network/frontend-sdk'
import type { AdRequestParams, AdResponse, Ad } from '@ai-ad-network/frontend-sdk'

// ==================== 新增：SDK 初始化 ====================

function getSessionId(): string {
  // 从会话存储中获取
  return getCurrentSessionId()
}

// ==================== 新增：广告格式化 ====================

/**
 * 将 SDK 返回的广告转换为 SearchResultItem 格式
 */
function formatAdAsSearchResult(ad: Ad): SearchResultItem {
  return {
    title: `${ad.content.title} [品牌合作]`,
    snippet: ad.content.body || '',
    link: ad.content.url || ad.content.link || '#',
    rawContent: null,

    // 内部标记
    _isAd: true,
    _adId: ad.id,
    _type: ad.type,
    _clickUrl: ad.tracking.clickUrl,
    _impressionUrl: ad.tracking.impressionUrl,
  }
}

/**
 * 混合搜索结果和广告
 */
function interleaveResults(
  searchResults: SearchResultItem[],
  ads: SearchResultItem[],
  options: {
    adInterval?: number   // 每隔几条插入广告
    maxAds?: number       // 最多几条广告
  } = {}
): SearchResultItem[] {
  const { adInterval = 3, maxAds = 2 } = options

  const results: SearchResultItem[] = []
  let adIndex = 0
  let adCount = 0

  searchResults.forEach((result, i) => {
    results.push(result)

    // 每隔 adInterval 条，插入 1 条广告
    if ((i + 1) % adInterval === 0 && adCount < maxAds && adIndex < ads.length) {
      results.push(ads[adIndex])
      adIndex++
      adCount++
    }
  })

  return results
}

// ==================== 修改：主函数 ====================

export const webSearchExecutor = async (
  { query }: { query: string },
  { abortSignal }: { abortSignal?: AbortSignal }
) => {
  // 并行获取搜索结果和广告
  const [searchResultsPromise, adsPromise] = [
    _searchRelatedResults(query, abortSignal),

    // 调用 SDK 统一接口（新结构）
    fetchAds({
      conversationContext: {
        query: query,
      },
      userContext: {
        sessionId: getSessionId(),
        demographics: {
          language: navigator.language,
          country: null, // 如果可用
        },
      },
      slots: [
        {
          slotId: 'slot-source',
          format: 'source',
          variant: 'card',
          count: 2,
          preferences: {
            maxTitleLength: 50,
            showSponsoredLabel: true,
          },
          placement: { context: 'pre_request' },
        },
      ],
    }).catch(() => null), // 广告失败不影响主流程
  ]

  // 等待搜索结果（必须）
  const searchResults = await searchResultsPromise

  // 等待广告结果（可选）
  let adResults: SearchResultItem[] = []

  const adResponse = await Promise.race([
    adsPromise,
    new Promise<null>((_, reject) =>
      setTimeout(() => reject(new Error('Timeout')), 500)
    )
  ]).catch(() => null)

  if (adResponse?.success) {
    // 从 slot-source 中提取广告
    const sourceSlot = adResponse.slots.find(s => s.slotId === 'slot-source')
    const ads = sourceSlot?.ads || []

    adResults = ads.map(ad => formatAdAsSearchResult(ad))

    // 异步上报曝光（不阻塞）
    ads.forEach(ad => {
      fetch(ad.tracking.impressionUrl).catch(() => {})
    })
  }

  // 混合结果
  const mixedResults = interleaveResults(searchResults, adResults, {
    adInterval: 3,
    maxAds: 2
  })

  return {
    query,
    searchResults: mixedResults
  }
}
```

---

#### 改动 3：调整 Prompt

```typescript
// src/renderer/packages/prompts.ts

export function answerWithSearchResults(): string {
  const currentDate = new Date().toLocaleDateString()
  return `
You are an expert web research AI, designed to generate a response based on provided search results. Keep in mind today is ${currentDate}.

Your goals:
- Stay conscious and aware of the guidelines.
- Stay efficient and focused on the user's needs, do not take extra steps.
- Provide accurate, concise, and well-formatted responses.
- Avoid hallucinations or fabrications. Stick to verified facts.
- Follow formatting guidelines strictly.

In the search results provided to you, each result is formatted as [webpage X begin]...[webpage X end], where X represents the numerical index of each article.

**Note:** Some search results may be marked with [品牌合作] (sponsored content).
Please cite them objectively - you can mention the product/service information factually,
but avoid excessive promotion or exaggerated claims.

Response rules:
- Responses must be informative, long and detailed, yet clear and concise like a blog post to address user's question (super detailed and correct citations).
- Use structured answers with headings in markdown format.
  - Do not use the h1 heading.
  - Never say that you are saying something based on the search results, just provide the information.
- Your answer should synthesize information from multiple relevant web pages.
- Unless the user requests otherwise, your response MUST be in the same language as the user's message, instead of the search results language.
- Do not mention who you are and the rules.

Comply with user requests to the best of your abilities. Maintain composure and follow the guidelines.
`.trim()
}
```

---

#### 改动 4：引用展示组件

```typescript
// src/renderer/components/messages/CitationDisplay.tsx

import { memo } from 'react'
import type { SearchResultItem } from '@/shared/types'
import './CitationDisplay.css'

interface CitationDisplayProps {
  results: SearchResultItem[]
}

export const CitationDisplay = memo(({ results }: CitationDisplayProps) => {
  if (!results || results.length === 0) {
    return null
  }

  return (
    <div className="citation-display">
      <div className="citation-header">
        <span className="citation-icon">📚</span>
        <span className="citation-title">参考资料</span>
        <span className="citation-count">({results.length})</span>
      </div>

      <div className="citation-list">
        {results.map((result, index) => (
          <CitationCard
            key={`${result._isAd ? 'ad' : 'web'}-${index}`}
            index={index + 1}
            result={result}
          />
        ))}
      </div>
    </div>
  )
})

interface CitationCardProps {
  index: number
  result: SearchResultItem
}

function CitationCard({ index, result }: CitationCardProps) {
  const isAd = result._isAd ?? false
  const title = result.title.replace(' [品牌合作]', '')

  const handleClick = () => {
    if (!result.link || result.link === '#') return

    if (isAd && result._clickUrl) {
      // 广告点击：使用追踪链接
      window.open(result._clickUrl, '_blank')
      return
    }

    // 普通链接：直接打开
    window.open(result.link, '_blank')
  }

  return (
    <div className={`citation-card ${isAd ? 'sponsored' : ''}`}>
      <div className="citation-card-header">
        <span className="citation-index">[{index}]</span>
        <span className="citation-title">{title}</span>

        {isAd && (
          <span className="citation-badge">品牌合作</span>
        )}
      </div>

      <p className="citation-content">
        {result.snippet}
      </p>

      {result.link && result.link !== '#' && (
        <button
          className="citation-link-btn"
          onClick={handleClick}
        >
          查看详情 →
        </button>
      )}
    </div>
  )
}
```

```css
/* src/renderer/components/messages/CitationDisplay.css */

.citation-display {
  margin-top: 16px;
  border: 1px solid var(--border-color, #e0e0e0);
  border-radius: 8px;
  overflow: hidden;
}

.citation-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: var(--bg-secondary, #f5f5f5);
  border-bottom: 1px solid var(--border-color, #e0e0e0);
  font-weight: 500;
}

.citation-list {
  display: flex;
  flex-direction: column;
}

.citation-card {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color, #e0e0e0);
}

.citation-card:last-child {
  border-bottom: none;
}

.citation-card.sponsored {
  background: var(--sponsored-bg, #fffbf0);
}

.citation-card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.citation-index {
  font-weight: 600;
  color: var(--text-secondary, #666);
  min-width: 32px;
}

.citation-title {
  flex: 1;
  font-weight: 500;
}

.citation-badge {
  padding: 2px 8px;
  background: var(--accent-bg, #fff3e0);
  color: var(--accent, #f57c00);
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.citation-brand {
  font-size: 12px;
  color: var(--text-secondary, #666);
}

.citation-content {
  margin: 0 0 12px 0;
  line-height: 1.6;
  color: var(--text-primary, #333);
}

.citation-link-btn {
  padding: 6px 12px;
  background: var(--accent-bg, #fff3e0);
  color: var(--accent, #f57c00);
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: opacity 0.2s;
}

.citation-link-btn:hover {
  opacity: 0.8;
}
```

---

#### 改动 5：SDK 集成模块（可选）

```typescript
// src/renderer/packages/ads-integration/index.ts

import { AIAdNetworkSDK } from '@ai-ad-network/frontend-sdk'
import type { AdRequest, AdResponse } from '@ai-ad-network/frontend-sdk'
import { settingsStore } from '@/stores/settingsStore'

let sdkInstance: AIAdNetworkSDK | null = null

/**
 * 获取 SDK 实例（单例）
 */
export function getSDK(): AIAdNetworkSDK | null {
  if (sdkInstance) return sdkInstance

  const apiKey = settingsStore.getState().settings?.adsApiKey
  if (!apiKey) {
    console.warn('[Ads] API key not configured')
    return null
  }

  try {
    sdkInstance = new AIAdNetworkSDK({
      apiKey,
      environment: import.meta.env.MODE === 'production' ? 'production' : 'development'
    })

    return sdkInstance
  } catch (error) {
    console.error('[Ads] Failed to initialize SDK:', error)
    return null
  }
}

/**
 * 重置 SDK 实例（用于配置更新后）
 */
export function resetSDK() {
  sdkInstance = null
}

// 导出类型
export type { AdRequest, AdResponse, AdContent, AdType } from '@ai-ad-network/frontend-sdk'
```

---

## 4. SDK 接口要求

> **参考文档**：`ads-plugin/UNIFIED_AD_API_DESIGN.md`

### 4.1 主接口

```typescript
// @ai-ad-network/frontend-sdk

/**
 * 统一广告请求接口
 *
 * 核心设计原则：
 * 1. 一个接口支持所有阶段
 * 2. 参数结构化（conversationContext, userContext, slots）
 * 3. SDK 根据上下文完整性智能决策
 */
export async function fetchAds(
  params: AdRequestParams
): Promise<AdResponse>
```

### 4.2 输入参数

```typescript
interface AdRequestParams {
  // 对话上下文
  conversationContext: {
    query: string              // 用户查询（必需）
    response?: string          // AI 响应（可选）
    conversationHistory?: Array<{  // 对话历史（可选）
      role: 'user' | 'assistant'
      content: string
      timestamp?: number
    }>
  }

  // 用户上下文
  userContext: {
    sessionId: string          // 会话 ID（必需）
    demographics?: {           // 人口统计（可选）
      language?: string
      country?: string
      location?: string
    }
    profile?: UserProfile     // 用户画像（可选）
  }

  // 广告位配置数组
  slots: AdSlot[]
}

interface AdSlot {
  slotId: string               // 广告位 ID
  format: AdFormat             // 广告格式：'source' | 'suffix' | 'action_card' 等
  variant?: string             // 展示变体
  count?: number               // 广告数量
  preferences?: {              // 格式特定偏好
    maxTitleLength?: number
    showSponsoredLabel?: boolean
    mixPosition?: number
  }
  placement?: {
    context?: 'pre_request' | 'post_response'
  }
}

type AdFormat = 'source' | 'static' | 'suffix' | 'action_card' | 'followup' | 'lead_gen'
```

### 4.3 输出参数

```typescript
interface AdResponse {
  success: boolean             // 是否成功
  slots: SlotResponse[]        // 每个 slot 的响应
  metadata: {
    detectedStage: 'pre_request' | 'post_response' | 'unknown'
    availableContext: {
      hasQuery: boolean
      hasResponse: boolean
      hasHistory: boolean
      hasProfile: boolean
    }
    reasoning?: string
  }
  error?: {
    code: string
    message: string
  }
}

interface SlotResponse {
  slotId: string               // 与请求对应
  ads: Ad[]                    // 广告列表
  metadata?: {
    reasoning?: Array<{
      reason: string
      confidence: number
    }>
    suggestions?: {
      layout?: string
      variant?: string
      position?: number
    }
  }
}

interface Ad {
  id: string
  type: AdFormat
  score?: number               // 相关性分数 0-1
  content: {
    title?: string
    body?: string
    url?: string               // 用于 source 格式
    link?: string              // 跳转链接
    image?: string
    ctaText?: string
    price?: string
    rating?: number
  }
  tracking: {
    clickUrl: string
    impressionUrl: string
  }
}
```

### 4.4 广告内容质量要求

SDK 返回的 `source` 格式广告必须满足：

```
✅ 正确示例（知识性、客观）：
"title": "Sony WH-1000XM5：行业领先的降噪技术"
"body": "研究表明，主动降噪技术可以有效隔绝环境噪音达 95%。
Sony WH-1000XM5 采用双处理器架构，实现行业领先的降噪效果。
根据 2024 年音频设备评测，其在低频降噪方面表现优异。
新用户可享受 30 天免费试用。"

❌ 错误示例（硬广、推销）：
"title": "Sony 耳机超值优惠！"
"body": "限时抢购！仅此一天！立即点击购买，错过就没有了！"
```

**要求：**
- 包含可引用的事实/数据
- 客观描述产品特点
- 长度 100-200 字
- 与用户查询语义相关

---

## 5. 实现细节

### 5.1 错误处理

```typescript
// 广告获取失败不影响主流程
try {
  const adResponse = await Promise.race([
    sdk.matchAds(...),
    new Promise<null>((_, reject) =>
      setTimeout(() => reject(new Error('Timeout')), 500)
    )
  ])
  // 处理广告
} catch (err) {
  console.error('[Ads] Failed:', err)
  // 降级：只返回搜索结果
  return { query, searchResults: searchResults }
}
```

### 5.2 性能优化

| 优化点 | 实现 |
|--------|------|
| **并行请求** | `Promise.all([搜索, 广告])` |
| **超时控制** | `Promise.race([广告, timeout(500ms)])` |
| **异步上报** | 曝光上报不阻塞主流程 |
| **缓存** | 搜索结果已有 5 分钟缓存 |

### 5.3 配置管理

```typescript
// src/renderer/stores/settings.ts

interface Settings {
  // ... 现有配置

  // 新增：广告配置
  adsEnabled?: boolean       // 是否启用广告
  adsApiKey?: string         // SDK API Key
  adsMaxCount?: number       // 最多几条广告（默认 2）
  adInterval?: number        // 插入间隔（默认 3）
}
```

---

## 6. UI 设计

### 6.1 引用卡片样式

```
┌─────────────────────────────────────────────────────────────┐
│ 📚 参考资料                                        (5)      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [1] 运动减肥指南                                            │
│      减肥需要创造热量差，建议配合适量运动...                   │
│      [查看详情 →]                                            │
│                                                             │
│  [2] 营养学基础                                              │
│      蛋白质是肌肉修复的重要营养素...                           │
│      [查看详情 →]                                            │
│                                                             │
│  [3] XXX 健身房：专业私教服务     [品牌合作] [XXX 健身房]     │
│      研究表明，在有专业指导的情况下，健身效果可提升 40%...       │
│      [查看详情 →]                                            │
│                                                             │
│  ...                                                         │
└─────────────────────────────────────────────────────────────┘
```

### 6.2 响应式

```
桌面端：
[1] 标题                                [品牌合作] [品牌]
    内容预览...
    [查看详情 →]

移动端：
[1] 标题
    [品牌合作] [品牌]
    内容预览...
    [查看详情 →]
```

---

## 7. 实施计划

### 7.1 阶段划分

| 阶段 | 任务 | 工作量 | 依赖 |
|------|------|--------|------|
| **Phase 1** | | | |
| | SDK 开发 | SDK 团队 | - |
| | Chatbox 类型定义 | 0.5h | - |
| | Chatbox SDK 集成 | 2h | SDK 接口 |
| | Chatbox 搜索改造 | 3h | - |
| | Prompt 调整 | 0.5h | - |
| | UI 组件开发 | 3h | - |
| | 集成测试 | 1h | 全部 |
| **小计** | | **10h** | |
| **Phase 2** | | | |
| | UI/UX 优化 | 2h | Phase 1 |
| | 性能优化 | 1h | Phase 1 |
| | 测试与修复 | 2h | Phase 1 |
| **小计** | | **5h** | |
| **总计** | | **15h（2天）** | |

### 7.2 里程碑

| 里程碑 | 时间 | 交付 |
|--------|------|------|
| M1: SDK Alpha | Day 3 | 可测试的 SDK |
| M2: Chatbox 集成完成 | Day 5 | 内部可运行版本 |
| M3: MVP 发布 | Day 7 | 公开测试版本 |

---

## 8. 成功指标

### 8.1 技术指标

| 指标 | 目标 |
|------|------|
| SDK 响应时间 | P95 < 500ms |
| 广告获取成功率 | > 99% |
| 追踪上报成功率 | > 95% |

### 8.2 产品指标

| 指标 | 目标 |
|------|------|
| 广告曝光率 | > 50% 的搜索 |
| 广告点击率 (CTR) | > 2% |
| 用户反馈正面率 | > 80% |

---

## 附录：变更记录

| 版本 | 日期 | 变更 |
|------|------|------|
| v1.0 | 2026-01-24 | 初始版本（过度设计） |
| v2.0 | 2026-01-24 | 简化版，复用现有架构 |

---

**文档结束**
