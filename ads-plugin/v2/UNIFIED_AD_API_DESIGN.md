# Chatbox 广告系统统一接口设计文档

## 文档信息

| 项目 | 说明 |
|------|------|
| **文档名称** | Chatbox 广告系统统一接口设计 |
| **版本** | v1.0.0 |
| **日期** | 2026-01-24 |
| **作者** | Chatbox 开发团队 + @ai-ad-network/frontend-sdk 团队 |
| **状态** | 设计评审中 |

---

## 目录

1. [背景与问题分析](#1-背景与问题分析)
2. [设计目标](#2-设计目标)
3. [核心设计理念](#3-核心设计理念)
4. [系统架构](#4-系统架构)
5. [接口设计](#5-接口设计)
6. [Chatbox 端集成方案](#6-chatbox-端集成方案)
7. [SDK 端需求](#7-sdk-端需求)
8. [数据流与交互时序](#8-数据流与交互时序)
9. [SDK 智能决策逻辑](#9-sdk-智能决策逻辑)
10. [场景示例](#10-场景示例)
11. [优势分析](#11-优势分析)
12. [风险评估与缓解](#12-风险评估与缓解)
13. [实施计划](#13-实施计划)
14. [附录](#14-附录)

---

## 1. 背景与问题分析

### 1.1 当前系统架构

```
┌─────────────────────────────────────────────────────────────┐
│                      当前架构                                │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  用户输入 → Chatbox → 单一 API 调用 → 所有格式广告 → 渲染  │
│                                                              │
│  问题：所有格式在同一个时机获取，无法满足不同格式的时机需求  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 广告格式特性分析

| 广告格式 | 时机需求 | 上下文需求 | 展示特点 | 当前问题 |
|---------|---------|-----------|---------|---------|
| **Source** | LLM 请求前 | query | 需要嵌入 LLM context 作为"参考资料" | 无法在 LLM 请求前获取 |
| **Suffix** | LLM 返回后 | query + response | 延续文本样式，需要理解对话 | 时机正确 |
| **ActionCard** | LLM 返回后 | query + response | 卡片展示，需要完整对话 | 时机正确 |
| **FollowUp** | LLM 返回后 | query + response | 混在建议问题中 | 时机正确 |
| **LeadGen** | LLM 返回后 | query + response + profile | 需要用户画像匹配 | 缺少 profile 数据 |
| **Static** | 任意时机 | profile/session | 侧边栏横幅，不依赖对话 | 未实现 |

### 1.3 核心问题

#### 问题 1：时机无法区分
```
当前：所有格式在 LLM 返回后统一获取
结果：Source 广告无法嵌入 LLM 请求，失去上下文相关性
```

#### 问题 2：上下文传递不完整
```
当前：context 在渲染时才构建
结果：无法在 LLM 请求阶段使用 Source 广告
```

#### 问题 3：接口耦合
```
当前：单一 API 返回所有格式
结果：无法针对不同时机优化数据获取
```

---

## 2. 设计目标

### 2.1 功能目标

| 目标 | 描述 | 优先级 |
|------|------|--------|
| **统一接口** | 一个接口支持所有阶段，通过上下文完整性区分 | P0 |
| **智能决策** | SDK 根据可用上下文智能选择最佳广告 | P0 |
| **时机控制** | Chatbox 能够在正确时机调用接口 | P0 |
| **内容生成** | SDK 根据对话内容生成自然的广告文案 | P1 |
| **个性化** | 基于用户画像提供精准广告 | P1 |

### 2.2 非功能目标

| 目标 | 指标 | 优先级 |
|------|------|--------|
| **性能** | 广告获取时间 < 500ms | P0 |
| **可扩展性** | 新增格式无需修改接口 | P0 |
| **向后兼容** | 不破坏现有功能 | P1 |
| **权限清晰** | 明确的数据访问边界 | P0 |
| **可调试性** | 提供决策过程透明度 | P2 |

### 2.3 用户体验目标

| 方面 | 目标 |
|------|------|
| **相关性** | 广告内容与对话高度相关 |
| **自然度** | Suffix/FollowUp 广告像正常对话的一部分 |
| **不打扰** | 在合适的时机展示，不打断用户思考 |
| **隐私保护** | 用户数据使用透明可控 |

---

## 3. 核心设计理念

### 3.1 统一接口原则

```
┌─────────────────────────────────────────────────────────────┐
│                    核心原则                                  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  一个接口 + 可选上下文 = SDK 智能决策                       │
│                                                              │
│  Chatbox: 决定"何时调用"（时机控制）                        │
│  SDK:     决定"返回什么"（智能决策）                        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**关键点**：
- **接口统一**：只有 `fetchAds()` 一个接口
- **参数灵活**：context 字段都是可选的
- **智能决策**：SDK 根据上下文完整性决定返回什么
- **职责清晰**：Chatbox 控制时机，SDK 控制内容

### 3.2 阶段划分

```
上下文完整性 → SDK 智能决策 → 返回广告

只有 query           → 返回 source, static
query + response    → 返回 suffix, actionCard, followUp, leadGen
完整上下文           → 返回所有格式，且更精准
```

### 3.3 职责边界

```
┌─────────────────────────────────────────────────────────────┐
│                    Chatbox 职责                               │
├─────────────────────────────────────────────────────────────┤
│  • 决定何时调用 API                                         │
│  • 收集可用的上下文信息                                     │
│  • 将 Source 广告嵌入 LLM context                          │
│  • 渲染返回的广告                                           │
│  • 管理用户隐私和数据使用                                   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    SDK 职责                                   │
├─────────────────────────────────────────────────────────────┤
│  • 根据上下文智能选择广告格式                               │
│  • 为每个广告生成合适的内容                                 │
│  • 提供决策透明度（reasoning + suggestions）               │
│  • 实现缓存和性能优化                                       │
│  • 保护用户隐私                                           │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. 系统架构

### 4.1 整体架构图

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Chatbox 应用层                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────────┐    ┌──────────────────┐    ┌─────────────┐  │
│  │  ChatInput      │    │  MessageList     │    │  Sidebar    │  │
│  └────────┬────────┘    └────────┬─────────┘    └───────────┬──┘
│           │                      │                         │          │
│           ▼                      ▼                         │          │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │                 AdContextManager (上下文管理器)               ││
│  │  • 管理广告数据缓存                                           ││
│  │  • 提供统一的数据访问接口                                     ││
│  │  • 处理阶段转换和合并                                       ││
│  └─────────────────────────────┬───────────────────────────────┘│
│                                │                                  │
│  ┌─────────────────────────────▼───────────────────────────────┐│
│  │              AdRequestBuilder (请求构建器)                  ││
│  │  • 收集用户输入                                             ││
│  │  • 收集对话历史                                             ││
│  │  • 收集用户画像                                             ││
│  └─────────────────────────────┬───────────────────────────────┘│
│                                │                                  │
└────────────────────────────────┼──────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    SDK 接口层                                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│                     fetchAds(params)                              │
│                            ↓                                       │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │              SDK 决策引擎                                       │ │
│  │  • 评估上下文完整性                                         │ │
│  │  • 选择合适的广告格式                                       │ │
│  │  • 匹配广告内容                                             │ │
│  │  • 生成智能文案                                             │ │
│  │  • 排序和优化                                               │ │
│  └───────────────────────────┬───────────────────────────────────┘ │
│                              │                                     │
│                              ▼                                     │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │              广告数据库                                       │ │
│  │  • 广告素材库                                               │ │
│  │  • 用户画像库                                               │ │
│  │  • 匹配规则库                                               │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 4.2 数据流图

```
阶段1：用户输入 (Pre-Request)
    │
    ├─> ChatInput 检测用户输入
    │
    ├─> AdRequestBuilder 收集数据
    │   • query: "蓝牙耳机推荐"
    │   • userProfile: { interests: [...] }
    │   • placement.stage: "pre_request"
    │
    ├─> SDK.fetchAds({
    │      context: { query: "..." }
    │    })
    │
    ├─> SDK 决策引擎评估
    │   • 有 query → 可以返回 source, static
    │   • 无 response → 不能返回 suffix, actionCard 等
    │
    ├─> SDK 返回
    │   • source: [{ title, url, description }]
    │   • static: [{ title, body, image }]
    │
    ├─> AdContextManager 提取 Source
    │   → sourceForLLM: [{ title, url, sponsored: true }]
    │
    └─> ChatInput 构建 LLM 请求
        • messages: [...]
        • sources: [sourceForLLM]  ← 嵌入广告


阶段2：LLM 响应 (Post-Response)
    │
    ├─> Message 检测响应完成
    │   • msg.role === 'assistant'
    │   • !msg.generating
    │
    ├─> AdRequestBuilder 收集数据
    │   • query: "蓝牙耳机推荐"
    │   • response: "蓝牙耳机是一种..."
    │   • conversationHistory: [...]
    │   • userProfile: { interests: [...] }
    │   • placement.stage: "post_request"
    │
    ├─> SDK.fetchAds({
    │      context: {
    │        query: "...",
    │        response: "...",
    │        conversationHistory: [...]
    │      }
    │    })
    │
    ├─> SDK 决策引擎评估
    │   • 有 query + response → 可以返回 suffix, actionCard 等
    │   • 有 history → 更精准匹配
    │
    ├─> SDK 返回
    │   • suffix: [{ title: "顺便说一句..." }]
    │   • actionCard: [{ title, body, image, price }]
    │   • followUp: [{ title: "想了解更多..." }]
    │   • leadGen: [{ title, fields }]
    │
    └─> Message 渲染所有广告组件
```

---

## 5. 接口设计

### 5.1 核心接口定义

```typescript
// @ai-ad-network/frontend-sdk

/**
 * 统一广告请求接口
 *
 * 核心设计原则：
 * 1. 一个接口支持所有阶段
 * 2. 参数结构化（conversationContext, userContext, slots）
 * 3. SDK 根据上下文完整性智能决策
 * 4. 返回决策元数据，增加透明度
 *
 * @param params - 结构化的广告请求参数
 * @returns 广告响应，包含广告列表和决策元数据
 */
export async function fetchAds(
  params: AdRequestParams
): Promise<AdResponse>
```

### 5.2 请求参数详细定义

```typescript
/**
 * 广告请求参数（统一接口 - 结构化设计）
 *
 * 结构说明：
 * - conversationContext: 对话相关上下文（query, response, history）
 * - userContext: 用户相关上下文（sessionId, demographics, profile）
 * - slots: 广告位配置数组（每个 slot 定义格式、变体、偏好等）
 */
export interface AdRequestParams {
  // ================================================================
  // 对话上下文
  // ================================================================

  /**
   * 对话上下文
   *
   * 包含当前对话的相关信息，SDK 根据这些信息智能选择和生成广告
   */
  conversationContext: {
    /**
     * 用户输入的查询文本
     *
     * 何时可用：
     * - 用户输入后立即可用
     * - 所有阶段都必需
     *
     * SDK 使用：
     * - 理解用户意图
     * - 匹配相关广告
     * - 生成自然文案
     */
    query: string

    /**
     * AI 的响应文本
     *
     * 何时可用：
     * - LLM 返回完成后可用
     * - 用于生成需要理解对话内容的广告（suffix, actionCard 等）
     *
     * SDK 使用：
     * - 分析对话主题
     * - 生成相关后缀
     * - 提供精准推荐
     */
    response?: string

    /**
     * 对话历史记录
     *
     * 何时可用：
     * - 多轮对话中可用
     * - 用于提升广告匹配精准度
     *
     * SDK 使用：
     * - 理解对话主题演变
     * - 识别用户真实意图
     * - 避免重复推荐
     */
    conversationHistory?: Array<{
      /** 消息角色 */
      role: 'user' | 'assistant' | 'system'
      /** 消息内容 */
      content: string
      /** 消息时间戳（可选，用于时序分析） */
      timestamp?: number
    }>
  }

  // ================================================================
  // 用户上下文
  // ================================================================

  /**
   * 用户上下文
   *
   * 包含用户相关的信息，用于个性化和精准投放
   */
  userContext: {
    /**
     * 会话 ID
     * 用于跨请求关联和频率控制
     */
    sessionId: string

    /**
     * 人口统计信息（已脱敏）
     *
     * 注意：
     * - 所有字段都是可选的
     * - 不包含个人身份信息（PII）
     * - 数据应已脱敏和聚合
     */
    demographics?: {
      /** 年龄段（已聚合） */
      ageRange?: '18-24' | '25-34' | '35-44' | '45-54' | '55+'

      /** 语言代码 */
      language?: string

      /** 国家代码（ISO 3166-1 alpha-2） */
      country?: string

      /** 时区（已聚合到地区级别） */
      location?: string  // 例如：'US', 'EU', 'Asia'

      /** 时区（用于时间相关广告） */
      timezone?: string
    }

    /**
     * 用户画像（可选）
     *
     * 用于：
     * - LeadGen 表单字段优化
     * - 广告个性化推荐
     * - 避免不相关广告
     */
    profile?: UserProfile
  }

  // ================================================================
  // 广告位配置
  // ================================================================

  /**
   * 广告位配置数组
   *
   * 每个 slot 定义一个广告位的配置：
   * - format: 广告格式
   * - variant: 展示变体
   * - count: 广告数量
   * - preferences: 格式特定的偏好设置
   * - placement: 放置位置信息
   *
   * SDK 处理逻辑：
   * 1. 遍历所有 slots
   * 2. 根据 conversationContext 完整性判断是否能为该 slot 返回广告
   * 3. 为每个 slot 匹配和生成广告内容
   * 4. 返回所有 slot 的广告（部分可能为空）
   */
  slots: AdSlot[]
}

/**
 * 单个广告位配置
 */
export interface AdSlot {
  // ================================================================
  // 基本配置
  // ================================================================

  /**
   * 广告位唯一标识
   */
  slotId: string

  /**
   * 广告位名称
   */
  slotName?: string

  /**
   * 广告格式类型
   */
  format: AdFormat

  /**
   * 展示变体
   *
   * 可能的值：
   * - actionCard: 'horizontal', 'vertical', 'compact'
   * - suffix: 'block', 'inline', 'minimal'
   * - followup: 'bubble', 'pill', 'underline'
   * - source: 'card', 'minimal', 'list_item'
   * - lead_gen: 'default', 'inline', 'modal'
   * - static: 'banner', 'sidebar', 'hero'
   */
  variant?: string

  /**
   * 尺寸配置
   */
  size?: {
    width: number
    height: number
  }

  /**
   * 请求的广告数量
   */
  count?: number

  // ================================================================
  // 偏好设置
  // ================================================================

  /**
   * 格式特定的偏好设置
   *
   * 根据不同格式有不同的配置项
   */
  preferences?: {
    // ================================================================
    // 通用偏好
    // ================================================================

    /** 最大标题长度 */
    maxTitleLength?: number

    /** 最大描述长度 */
    maxBodyLength?: number

    // ================================================================
    // ActionCard 偏好
    // ================================================================

    /** 是否显示评分 */
    showRating?: boolean

    /** 是否显示价格 */
    showPrice?: boolean

    // ================================================================
    // Source 偏好
    // ================================================================

    /** 是否显示赞助标签 */
    showSponsoredLabel?: boolean

    /** 混合展示位置 */
    mixPosition?: number

    // ================================================================
    // Suffix 偏好
    // ================================================================

    /** 是否显示分隔线 */
    showDivider?: boolean

    // ================================================================
    // LeadGen 偏好
    // ================================================================

    /** 表单字段配置 */
    fields?: Array<{
      type: 'email' | 'name' | 'company' | 'phone' | 'custom'
      placeholder: string
      required: boolean
      label?: string
    }>
  }

  // ================================================================
  // 放置信息
  // ================================================================

  /**
   * 放置位置信息
   */
  placement?: {
    /**
     * 位置
     * - above_fold: 首屏
     * - below_fold: 次屏
     */
    position?: 'above_fold' | 'below_fold'

    /**
     * 上下文阶段
     * - pre_request: 预请求阶段
     * - post_response: 后响应阶段
     */
    context?: 'pre_request' | 'post_response'
  }
}

/**
 * 用户画像定义
 */
export interface UserProfile {
  // ================================================================
  // 兴趣标签
  // ================================================================

  /**
   * 用户兴趣标签
   *
   * 示例：
   * - ['科技', '音乐', '数码', '运动']
   *
   * SDK 使用：
   * - 匹配相关领域的广告
   * - LeadGen 表单字段优化
   */
  interests?: string[]

  // ================================================================
  // 行为模式
  // ================================================================

  /**
   * 用户行为模式（从使用模式中推导，不包含敏感信息）
   */
  behavior?: {
    /** 偏好的主题（从对话历史中分析） */
    preferredTopics?: string[]

    /** 互动风格 */
    interactionStyle?: 'concise' | 'detailed' | 'technical' | 'casual'

    /** 平均会话长度（轮次） */
    avgSessionLength?: number
  }

  // ================================================================
  // 购买意向（可选，仅在有明确意向时提供）
  // ================================================================

  /**
   * 购买意向
   *
   * 用于：
   * - LeadGen 广告优化
   * - ActionCard 广告匹配
   */
  purchaseIntent?: {
    /** 感兴趣的品类 */
    categories?: string[]

    /** 价格偏好 */
    priceRange?: string

    /** 购买时间线 */
    timeline?: 'immediate' | 'within_week' | 'within_month' | 'researching'
  }
}

/**
 * 广告格式类型
 */
export type AdFormat =
  | 'source'        // 赞助来源
  | 'static'        // 静态横幅
  | 'suffix'        // 后缀广告
  | 'action_card'   // 行动卡片
  | 'followup'      // 跟进问题
  | 'lead_gen'      // 线索收集
```

### 5.3 响应数据详细定义（按 Slot 分组）

```typescript
/**
 * 统一广告响应（按 Slot 分组）
 *
 * 响应结构与请求中的 slots 对应，每个 slot 返回对应的广告和元数据
 */
export interface AdResponse {
  // ================================================================
  // 核心状态
  // ================================================================

  /**
   * 请求是否成功
   */
  success: boolean

  /**
   * 每个 slot 的响应
   *
   * 说明：
   * - slotId 与请求中的 slots 对应
   * - 即使某个 slot 没有广告，也会返回空数组
   * - SDK 根据 conversationContext 完整性智能判断是否能为该 slot 返回广告
   */
  slots: SlotResponse[]

  // ================================================================
  // 全局元数据
  // ================================================================

  /**
   * 全局决策元数据
   *
   * 用途：
   * - 调试和优化
   * - 理解 SDK 整体决策逻辑
   * - 监控和日志
   */
  metadata: {
    /**
     * SDK 检测到的当前阶段
     *
     * 说明：
     * - SDK 自动检测 conversationContext 的完整性
     * - 用于验证时机是否正确
     */
    detectedStage: 'pre_request' | 'post_response' | 'unknown'

    /**
     * 全局上下文可用性
     *
     * 用途：
     * - 了解哪些上下文被使用
     * - 优化后续请求
     */
    availableContext: {
      /** 是否有 query */
      hasQuery: boolean

      /** 是否有 response */
      hasResponse: boolean

      /** 是否有历史 */
      hasHistory: boolean

      /** 是否有画像 */
      hasProfile: boolean

      /** 历史记录长度 */
      historyLength?: number
    }

    /**
     * 全局决策理由
     *
     * 说明：
     * - 解释整体策略
     * - 提供决策依据
     * - 用于调试和优化
     */
    reasoning?: string
  }

  // ================================================================
  // 错误信息（如果失败）
  // ================================================================

  /**
   * 错误信息（仅当 success=false 时有值）
   */
  error?: {
    /** 错误代码 */
    code: string

    /** 错误消息 */
    message: string

    /** 错误详情（开发调试用） */
    details?: any
  }
}

/**
 * 单个 Slot 的响应
 */
export interface SlotResponse {
  /**
   * Slot ID（与请求中的 slotId 对应）
   */
  slotId: string

  /**
   * 该 slot 的广告列表
   *
   * 说明：
   * - SDK 已按相关性和优先级排序
   * - 数量由请求中的 count 决定（或 SDK 智能决策）
   * - 可能为空数组（当上下文不足时）
   */
  ads: Ad[]

  /**
   * 该 slot 的决策元数据
   *
   * 说明：
   * - 解释为什么返回这些广告
   * - 提供格式特定的建议
   */
  metadata?: {
    /**
     * 该 slot 的决策理由
     */
    reasoning?: Array<{
      /** 选择理由 */
      reason: string

      /** 置信度 (0-1) */
      confidence: number
    }>

    /**
     * 该 slot 的展示建议
     *
     * 说明：
     * - SDK 基于上下文和内容提供的展示建议
     * - Chatbox 可以参考但不强制执行
     */
    suggestions?: AdSlotSuggestions
  }
}

/**
 * Slot 级别的展示建议
 */
export interface AdSlotSuggestions {
  /**
   * 建议的布局方式
   *
   * 可能的值：
   * - actionCard: 'horizontal', 'vertical', 'compact'
   * - suffix: 'block', 'inline', 'minimal'
   * - followup: 'bubble', 'pill', 'underline'
   * - source: 'card', 'minimal', 'list_item'
   */
  layout?: string

  /**
   * 建议的样式变体
   */
  variant?: string

  /**
   * 建议的展示位置
   *
   * 说明：
   * - 用于 followup/source 等混合展示的格式
   * - 例如：在第 2 个建议问题后插入
   */
  position?: number

  // ================================================================
  // 格式特定建议
  // ================================================================

  /**
   * 建议的时机（用于 lead_gen）
   *
   * 说明：
   * - 在第几轮对话后展示
   * - 避免过早打扰用户
   */
  timing?: {
    showAfter?: number
    requiresInterest?: string[]
  }

  /**
   * 内容风格建议（用于 suffix/followup）
   *
   * 说明：
   * - 建议的文案风格
   * - SDK 生成内容时会参考
   */
  tone?: 'casual' | 'professional' | 'friendly' | 'technical'
}

/**
 * 单个广告定义
 */
export interface Ad {
  /** 广告唯一标识 */
  id: string

  /** 广告格式类型 */
  type: AdFormat

  /** 相关性分数 (0-1) */
  score?: number

  /** 广告内容 */
  content: AdContent

  /** 追踪信息 */
  tracking: {
    /** 点击追踪 URL */
    clickUrl: string

    /** 展示追踪 URL */
    impressionUrl: string
  }

  /** 元数据 */
  metadata?: {
    /** 广告分类 */
    category?: string

    /** 千次展示收益 */
    ecpm?: number

    /** 广告来源 */
    source?: string
  }

  /** SDK 建议的展示方式 */
  suggestions?: AdSuggestions['byFormat'][AdFormat]
}

/**
 * 广告内容定义
 */
export interface AdContent {
  // ================================================================
  // 通用字段
  // ================================================================

  /**
   * 标题（所有格式通用）
   *
   * SDK 说明：
   * - source: 来源标题
   * - suffix: 后缀文本
   * - actionCard: 产品名称
   * - followup: 跟进问题
   * - leadGen: 表单标题
   * - static: 广告标题
   */
  title?: string

  /**
   * 描述文本
   */
  body?: string

  /**
   * 图片 URL
   */
  image?: string

  /**
   * 链接 URL
   */
  link?: string

  /**
   * URL 别名（用于 source 格式）
   */
  url?: string

  // ================================================================
  // 格式特定字段
  // ================================================================

  /**
   * 行动号召文本
   * 用于：actionCard, followup
   */
  ctaText?: string

  /**
   * 价格
   * 用于：actionCard
   */
  price?: string

  /**
   * 评分
   * 用于：actionCard
   */
  rating?: number

  /**
   * 网站图标
   * 用于：source
   */
  favicon?: string

  /**
   * 表单字段
   * 用于：leadGen
   */
  lead_gen_fields?: Array<{
    type: 'email' | 'name' | 'company' | 'phone' | 'custom'
    placeholder: string
    required: boolean
    label?: string
  }>
}
```

---

## 6. Chatbox 端集成方案

### 6.1 上下文管理器（使用新结构）

```typescript
// src/renderer/packages/ads/core/AdContextManager.ts

/**
 * 广告上下文管理器（适配新的 slot-based 结构）
 *
 * 职责：
 * - 管理广告数据的获取和缓存
 * - 提供统一的数据访问接口
 * - 处理 slot-based 的响应结构
 */
export class AdContextManager {
  private sdk: AIAdNetworkSDK
  private cachedSlots: Map<string, SlotResponse> = new Map()
  private lastFetchTime: number = 0
  private readonly CACHE_TTL = 5 * 60 * 1000 // 5分钟缓存

  constructor(private config: AdConfig) {
    this.sdk = new AIAdNetworkSDK({
      apiKey: config.api.apiKey,
      baseUrl: config.api.baseUrl,
      debug: config.debug,
    })
  }

  // ================================================================
  // 阶段1：预请求（Pre-Request）
  // ================================================================

  /**
   * 预请求阶段获取广告
   *
   * 时机：用户输入后、LLM 请求前
   * 目的：获取 Source 和 Static 广告
   *
   * @param query - 用户输入
   * @param userProfile - 用户画像（可选）
   * @returns Source 广告（用于 LLM）和原始响应
   */
  async fetchPreRequest(
    query: string,
    userProfile?: UserProfile
  ): Promise<{
    /** Source 广告（可直接嵌入 LLM context 的格式） */
    sourceForLLM: Array<{
      title: string
      url: string
      sponsored: boolean
      description?: string
    }>
    /** 原始 SDK 响应（用于调试和缓存） */
    rawResponse: AdResponse
  }> {
    console.log('[AdContextManager] fetchPreRequest called', {
      query: query.substring(0, 50),
      hasProfile: !!userProfile,
    })

    // 调用 SDK 统一接口（新结构）
    const response = await this.sdk.fetchAds({
      conversationContext: {
        query: query,
      },
      userContext: {
        sessionId: this.getSessionId(),
        demographics: this.getDemographics(),
        profile: userProfile,
      },
      slots: [
        {
          slotId: 'slot-source',
          format: 'source',
          variant: 'card',
          count: 2,
          placement: { context: 'pre_request' }
        },
        {
          slotId: 'slot-static',
          format: 'static',
          variant: 'banner',
          count: 1
        }
      ]
    })

    if (!response.success) {
      console.error('[AdContextManager] fetchPreRequest failed', response.error)
      return { sourceForLLM: [], rawResponse: response }
    }

    // 从 slots 中提取 source 广告用于 LLM
    const sourceSlot = response.slots.find(s => s.slotId === 'slot-source')
    const sourceAds = sourceSlot?.ads || []
    const sourceForLLM = sourceAds.map(ad => ({
      title: ad.content.title || '',
      url: ad.content.link || ad.content.url || '',
      sponsored: true,
      description: ad.content.body,
    }))

    // 缓存所有 slots
    response.slots.forEach(slot => {
      this.cachedSlots.set(slot.slotId, slot)
    })

    console.log('[AdContextManager] fetchPreRequest success', {
      sourceCount: sourceForLLM.length,
      totalSlots: response.slots.length,
      metadata: response.metadata,
    })

    return { sourceForLLM, rawResponse: response }
  }

  // ================================================================
  // 阶段2：后响应（Post-Response）
  // ================================================================

  /**
   * 后响应阶段获取广告
   *
   * 时机：LLM 返回完成后
   * 目的：获取需要完整对话上下文的广告
   *
   * @param query - 用户输入
   * @param response - AI 响应
   * @param conversationHistory - 对话历史
   * @param userProfile - 用户画像
   * @returns 广告响应
   */
  async fetchPostResponse(
    query: string,
    response: string,
    conversationHistory?: ConversationMessage[],
    userProfile?: UserProfile
  ): Promise<AdResponse> {
    console.log('[AdContextManager] fetchPostResponse called', {
      query: query.substring(0, 50),
      responseLength: response.length,
      historyLength: conversationHistory?.length || 0,
      hasProfile: !!userProfile,
    })

    // 调用 SDK 统一接口（新结构）
    const fullResponse = await this.sdk.fetchAds({
      conversationContext: {
        query: query,
        response: response,
        conversationHistory: conversationHistory,
      },
      userContext: {
        sessionId: this.getSessionId(),
        demographics: this.getDemographics(),
        profile: userProfile,
      },
      slots: [
        {
          slotId: 'slot-suffix',
          format: 'suffix',
          variant: 'block',
          count: 1,
          placement: { context: 'post_response' }
        },
        {
          slotId: 'slot-action_card',
          format: 'action_card',
          variant: 'horizontal',
          count: 1
        },
        {
          slotId: 'slot-followup',
          format: 'followup',
          variant: 'bubble',
          count: 1
        },
        {
          slotId: 'slot-lead_gen',
          format: 'lead_gen',
          variant: 'default',
          count: 1
        }
      ]
    })

    if (!fullResponse.success) {
      console.error('[AdContextManager] fetchPostResponse failed', fullResponse.error)
      return fullResponse
    }

    // 合并缓存（保留之前的 source/static）
    fullResponse.slots.forEach(slot => {
      if (!this.cachedSlots.has(slot.slotId)) {
        this.cachedSlots.set(slot.slotId, slot)
      }
    })

    console.log('[AdContextManager] fetchPostResponse success', {
      slotsCount: fullResponse.slots.length,
      metadata: fullResponse.metadata,
    })

    return fullResponse
  }

  // ================================================================
  // 数据访问接口（适配 slot-based 结构）
  // ================================================================

  /**
   * 获取指定 slot 的广告
   *
   * @param slotId - Slot ID
   * @returns 广告列表
   */
  getAdsBySlot(slotId: string): Ad[] {
    return this.cachedSlots.get(slotId)?.ads || []
  }

  /**
   * 获取指定格式的所有广告（遍历所有 slots）
   *
   * @param format - 广告格式
   * @returns 广告列表
   */
  getAdsByFormat(format: string): Ad[] {
    const allAds: Ad[] = []
    this.cachedSlots.forEach(slot => {
      allAds.push(...slot.ads.filter(ad => ad.type === format))
    })
    return allAds
  }

  /**
   * 获取 Source 广告用于 LLM
   */
  getSourceForLLM(): Array<{
    title: string
    url: string
    sponsored: boolean
  }> {
    return this.getAdsByFormat('source').map(ad => ({
      title: ad.content.title || '',
      url: ad.content.link || ad.content.url || '',
      sponsored: true,
    }))
  }

  // ================================================================
  // 私有方法
  // ================================================================

  /**
   * 获取会话 ID
   */
  private getSessionId(): string {
    // 从会话存储中获取
    return getCurrentSessionId()
  }

  /**
   * 获取人口统计信息
   */
  private getDemographics() {
    // 从用户设置中获取
    return {
      language: navigator.language,
      country: null, // 如果可用
    }
  }
}
```

### 6.2 ChatInput 集成

```typescript
// src/renderer/components/ChatInput.tsx

export function ChatInput() {
  const adManager = useAdContextManager()
  const userProfile = useUserProfile()

  /**
   * 处理发送消息
   */
  const handleSend = async (message: string) => {
    // ================================================================
    // 阶段1：预请求
    // ================================================================

    // 在发送到 LLM 之前，获取广告
    const { sourceForLLM } = await adManager.fetchPreRequest(
      message,
      userProfile
    )

    // ================================================================
    // 构建 LLM 请求
    // ================================================================

    const llmRequest = {
      messages: [{ role: 'user', content: message }],
      // 将 Source 广告嵌入 LLM context
      sources: sourceForLLM.length > 0 ? sourceForLLM : undefined,
    }

    // ================================================================
    // 发送到 LLM
    // ================================================================

    await sendToLLM(llmRequest)
  }

  return <div>...</div>
}
```

### 6.3 Message 组件集成

```typescript
// src/renderer/components/Message.tsx

export function Message({ msg, sessionId }) {
  const adManager = useAdContextManager()
  const userProfile = useUserProfile()

  /**
   * 监听消息完成事件
   */
  useEffect(() => {
    // ================================================================
    // 阶段2：后响应
    // ================================================================

    // 当 assistant 消息完成生成时，获取广告
    if (msg.role === 'assistant' && !msg.generating) {
      const fetchAds = async () => {
        // 收集上下文数据
        const userQuery = getPreviousUserMessage()
        const response = getMessageText(msg)
        const history = getConversationHistory()

        // 调用后响应接口
        await adManager.fetchPostResponse(
          userQuery,
          response,
          history,
          userProfile
        )
      }

      fetchAds()
    }
  }, [msg.generating, msg.id])

  // ================================================================
  // 渲染广告（从 slot 中获取）
  // ================================================================

  const suffixAds = adManager.getAdsBySlot('slot-suffix')
  const actionCardAds = adManager.getAdsBySlot('slot-action_card')
  const followUpAds = adManager.getAdsBySlot('slot-followup')
  const leadGenAds = adManager.getAdsBySlot('slot-lead_gen')

  return (
    <>
      {/* 消息内容 */}
      <MessageContent message={msg} />

      {/* Suffix 广告 */}
      {suffixAds.map(ad => (
        <SuffixSlot key={ad.id} ad={ad} />
      ))}

      {/* ActionCard 广告 */}
      {actionCardAds.map(ad => (
        <ActionCardSlot key={ad.id} ad={ad} />
      ))}

      {/* FollowUp 广告 */}
      {followUpAds.map(ad => (
        <FollowUpSlot key={ad.id} ad={ad} />
      ))}

      {/* LeadGen 广告 */}
      {leadGenAds.map(ad => (
        <LeadGenSlot key={ad.id} ad={ad} />
      ))}
    </>
  )
}
```

### 6.4 React Hook 封装

```typescript
// src/renderer/packages/ads/hooks/useAdContext.ts

/**
 * 使用广告上下文管理器
 */
export function useAdContext() {
  const config = useAdConfig()
  const managerRef = useRef<AdContextManager>()

  // 初始化管理器
  if (!managerRef.current) {
    managerRef.current = new AdContextManager(config)
  }

  // 监听配置变化
  useEffect(() => {
    if (managerRef.current) {
      managerRef.current.updateConfig(config)
    }
  }, [config])

  return managerRef.current
}
```

---

## 7. SDK 端需求

### 7.1 核心功能需求（适配新结构）

#### 需求 1：统一接口实现（Slot-Based）

**描述**：实现 `fetchAds(params)` 统一接口，支持 slot-based 的请求和响应结构

**输入**：
- `params.conversationContext.query`（必需）
- `params.conversationContext.response`（可选）
- `params.conversationContext.conversationHistory`（可选）
- `params.userContext.sessionId`（必需）
- `params.userContext.demographics`（可选）
- `params.userContext.profile`（可选）
- `params.slots`（必需，slot 配置数组）

**输出**：
- `success`: boolean
- `slots`: SlotResponse[]（按 slotId 分组的响应）
- `metadata`: 全局决策元数据

**行为规范**：
1. 遍历所有 slots，为每个 slot 判断是否能在当前上下文返回广告
2. 根据 conversationContext 完整性智能选择广告格式
3. 为每个广告生成合适的内容
4. 提供决策透明度（reasoning + suggestions）
5. 实现合理的缓存策略

**测试用例**：
```typescript
// 测试1：只有 query（pre-request 阶段）
const result1 = await fetchAds({
  conversationContext: { query: '耳机推荐' },
  userContext: { sessionId: 'test-123' },
  slots: [
    { slotId: 'slot-source', format: 'source', count: 2 },
    { slotId: 'slot-suffix', format: 'suffix', count: 1 }
  ]
})
assert(result1.success === true)
assert(result1.slots.find(s => s.slotId === 'slot-source')?.ads.length === 2)
assert(result1.slots.find(s => s.slotId === 'slot-suffix')?.ads.length === 0) // 上下文不足

// 测试2：有 query + response（post-response 阶段）
const result2 = await fetchAds({
  conversationContext: {
    query: '耳机推荐',
    response: '蓝牙耳机是...'
  },
  userContext: { sessionId: 'test-123' },
  slots: [
    { slotId: 'slot-suffix', format: 'suffix', count: 1 },
    { slotId: 'slot-action_card', format: 'action_card', count: 1 }
  ]
})
assert(result2.success === true)
assert(result2.slots.find(s => s.slotId === 'slot-suffix')?.ads.length === 1)
assert(result2.slots.find(s => s.slotId === 'slot-action_card')?.ads.length === 1)
```

**FollowUp 广告**：
- 根据对话历史生成相关问题
- 避免重复已讨论的内容
- 确保问题相关且有引导性

**LeadGen 广告**：
- 根据对话主题选择表单字段
- 根据用户画像简化表单
- 避免过度索取信息

#### 需求 4：决策透明化

**元数据返回**：
```typescript
{
  metadata: {
    detectedStage: 'post_response',
    availableContext: {
      hasQuery: true,
      hasResponse: true,
      hasHistory: true,
      hasProfile: false,
      historyLength: 5
    },
    reasoning: [
      {
        format: 'action_card',
        reason: '对话主题是耳机，匹配相关产品',
        confidence: 0.9
      }
    ],
    suggestions: {
      priority: ['action_card', 'suffix', 'followup'],
      byFormat: {
        action_card: { layout: 'horizontal' }
      }
    }
  }
}
```

### 7.2 性能需求

| 指标 | 目标 | 说明 |
|------|------|------|
| **响应时间** | < 500ms | P95 响应时间 |
| **缓存策略** | 自动缓存 | 相似请求 5 分钟内使用缓存 |
| **并发处理** | 支持并发 | 多个组件同时请求时合并处理 |
| **数据大小** | < 100KB | 单次响应压缩后大小 |

### 7.3 隐私与安全需求

| 需求 | 说明 | 优先级 |
|------|------|--------|
| **数据脱敏** | 不记录 PII 信息 | P0 |
| **用户同意** | 遵守隐私政策 | P0 |
| **数据最小化** | 只收集必要数据 | P1 |
| **可删除** | 用户可要求删除数据 | P1 |

### 7.4 可观测性需求

| 需求 | 说明 |
|------|------|
| **日志输出** | Debug 模式下输出详细日志 |
| **错误处理** | 清晰的错误码和消息 |
| **性能监控** | 提供性能指标（可选） |
| **决策追踪** | 返回 reasoning 元数据 |

---

## 8. 数据流与交互时序

### 8.1 完整交互时序图

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│   用户      │       │  Chatbox    │       │     SDK      │
└──────┬──────┘       └──────┬──────┘       └──────┬──────┘
       │                     │                     │
       │ 1. 输入消息          │                     │
       ├────────────────────>│                     │
       │                     │                     │
       │                     │ 2. 收集上下文        │
       │                     │    (query, profile)  │
       │                     │                     │
       │                     │ 3. fetchAds({        │
       │                     │    context: {        │
       │                     │      query           │
       │                     │    }               │
       │                     │  })                 │
       │                     ├────────────────────>│
       │                     │                     │
       │                     │ 4. 智能决策          │
       │                     │    (检测上下文)      │
       │                     │                     │
       │                     │ 5. 返回 ads          │
       │                     │    (source, static)  │
       │                     │<────────────────────┤
       │                     │                     │
       │                     │ 6. 提取 source       │
       │                     │                     │
       │                     │ 7. 构建 LLM 请求     │
       │                     │    (嵌入 sources)    │
       │                     │                     │
       │                     │ 8. 发送 LLM 请求     │
       │                     ├────────────────────>│ LLM
       │                     │                     │
       │                     │                     │ 9. 返回响应
       │                     │<────────────────────┤
       │                     │                     │
       │ 10. 显示响应        │                     │
       │<────────────────────┤                     │
       │                     │                     │
       │                     │ 11. 收集完整上下文   │
       │                     │    (query + response  │
       │                     │     + history)      │
       │                     │                     │
       │                     │ 12. fetchAds({      │
       │                     │      context: {      │
       │                     │        query,        │
       │                     │        response,     │
       │                     │        history       │
       │                     │      }             │
       │                     │    })               │
       │                     ├────────────────────>│
       │                     │                     │
       │                     │ 13. 智能决策         │
       │                     │    (检测完整上下文)  │
       │                     │                     │
       │                     │ 14. 返回 ads         │
       │                     │    (suffix, action...  │
       │                     │     + 原有缓存)      │
       │                     │<────────────────────┤
       │                     │                     │
       │ 15. 渲染所有广告    │                     │
       │<────────────────────┤                     │
```

### 8.2 状态转换图

```
┌─────────────────────────────────────────────────────────────┐
│                    广告数据状态                                │
└─────────────────────────────────────────────────────────────┘

状态1：初始 (Empty)
    │
    │ 用户输入
    ▼
状态2：预请求 (Pre-Request)
    │
    │ 包含：source, static
    │ 用途：嵌入 LLM context
    │
    │ LLM 返回
    ▼
状态3：后响应 (Post-Response)
    │
    │ 包含：所有格式
    │ 用途：渲染展示
    │
    │ 后续对话
    ▼
状态4：累积 (Accumulated)
    │
    │ 包含：所有格式（更多历史）
    │ 用途：更精准匹配
```

---

## 9. SDK 智能决策逻辑

### 9.1 决策引擎架构（适配新结构）

```typescript
class AdDecisionEngine {
  /**
   * 主决策函数（处理按 Slot 分组的请求）
   */
  decide(params: AdRequestParams): AdResponse {
    // ================================================================
    // 步骤1：评估对话上下文完整性
    // ================================================================

    const contextScore = this.evaluateContext(params.conversationContext)

    console.log('[SDK] Context Score:', contextScore)

    // ================================================================
    // 步骤2：为每个 Slot 处理广告
    // ================================================================

    const slotResponses: SlotResponse[] = []

    for (const slot of params.slots) {
      // 判断该 slot 是否能在当前上下文返回广告
      const canFill = this.canFillSlot(slot.format, contextScore)

      if (!canFill) {
        // 上下文不足，返回空数组
        slotResponses.push({
          slotId: slot.slotId,
          ads: [],
          metadata: {
            reasoning: [{
              reason: `上下文不足：${this.getMissingContextReason(slot.format, contextScore)}`,
              confidence: 0,
            }],
          },
        })
        continue
      }

      // 从数据库匹配该 slot 的广告
      const matchedAds = this.matchAdsFromDatabase({
        format: slot.format,
        query: params.conversationContext.query,
        response: params.conversationContext.response,
        history: params.conversationContext.conversationHistory,
        profile: params.userContext.profile,
        count: slot.count || 1,
        preferences: slot.preferences,
      })

      // 生成智能内容
      const enhancedAds = this.generateSmartContent(
        matchedAds,
        params.conversationContext,
        slot.format
      )

      // 排序
      const rankedAds = this.rankByRelevance(enhancedAds, contextScore)

      // 生成该 slot 的建议
      const suggestions = this.generateSlotSuggestions(rankedAds, slot)

      slotResponses.push({
        slotId: slot.slotId,
        ads: rankedAds.slice(0, slot.count || 1),
        metadata: {
          reasoning: [{
            reason: `上下文完整，成功匹配 ${rankedAds.length} 个广告`,
            confidence: 0.9,
          }],
          suggestions,
        },
      })
    }

    // ================================================================
    // 步骤3：生成全局元数据
    // ================================================================

    const metadata = this.generateGlobalMetadata(contextScore, slotResponses)

    return {
      success: true,
      slots: slotResponses,
      metadata: metadata,
    }
  }

  /**
   * 判断某个格式是否能在当前上下文返回广告
   */
  private canFillSlot(format: AdFormat, contextScore: ContextScore): boolean {
    // source, static 只需要 query
    if (format === 'source' || format === 'static') {
      return contextScore.hasQuery
    }

    // 其他格式需要 query + response
    return contextScore.hasQuery && contextScore.hasResponse
  }

  /**
   * 获取缺失上下文的理由
   */
  private getMissingContextReason(format: AdFormat, contextScore: ContextScore): string {
    if (format === 'source' || format === 'static') {
      if (!contextScore.hasQuery) return '缺少 query'
    }

    if (!contextScore.hasQuery) return '缺少 query'
    if (!contextScore.hasResponse) return '缺少 response'

    return '上下文不完整'
  }
}
```

### 9.2 上下文评估

```typescript
/**
 * 评估对话上下文完整性
 */
private evaluateContext(conversationContext: AdRequestParams['conversationContext']) {
  return {
    hasQuery: !!conversationContext.query,
    hasResponse: !!conversationContext.response,
    hasHistory: !!(conversationContext.conversationHistory &&
                   conversationContext.conversationHistory.length > 0),
    historyLength: conversationContext.conversationHistory?.length || 0,
  }
}
```

### 9.3 Slot 处理逻辑

```typescript
/**
 * 为单个 Slot 匹配广告
 */
private matchAdsFromDatabase(params: {
  format: AdFormat
  query: string
  response?: string
  history?: ConversationMessage[]
  profile?: UserProfile
  count?: number
  preferences?: AdSlot['preferences']
}): Ad[] {
  // 根据格式、上下文和偏好匹配广告
  // ...
  return []
}
```

### 9.4 内容生成

```typescript
/**
 * 为每个广告生成智能内容
 */
private generateSmartContent(
  ads: Ad[],
  conversationContext: AdRequestParams['conversationContext'],
  format: AdFormat
): Ad[] {
  return ads.map(ad => {
    const enhanced = { ...ad }

    switch (format) {
      case 'suffix':
        // 根据对话生成自然后缀
        enhanced.content.title = this.generateNaturalSuffix(
          conversationContext.query,
          conversationContext.response
        )
        break

      case 'followup':
        // 根据对话生成相关问题
        enhanced.content.title = this.generateRelevantQuestion(
          conversationContext.query,
          conversationContext.response,
          conversationContext.conversationHistory
        )
        break

      case 'lead_gen':
        // 根据主题选择字段（使用 slot preferences 中的配置）
        enhanced.content.lead_gen_fields = ad.content.lead_gen_fields
        break
    }

    return enhanced
  })
}

/**
 * 生成自然后缀文本
 */
private generateNaturalSuffix(query: string, response?: string): string {
  // 分析对话主题
  const topic = this.analyzeTopic(query, response || '')

  // 根据主题生成后缀模板
  const templates = {
    product: '顺便说一句，{product} 的{feature} 不错，可以考虑一下。',
    service: '另外，{service} 可能也对你有帮助。',
    general: '对了，{related} 也可以了解一下。',
  }

  // 选择合适的模板
  const template = this.selectTemplate(topic)

  // 填充模板
  return this.fillTemplate(template, {
    product: this.extractProductName(response || ''),
    feature: this.extractFeature(response),
    related: this.extractRelated(response),
  })
}
```

---

## 10. 场景示例

### 10.1 场景1：首次查询（只有 query）

**用户行为**：
```
用户：帮我推荐一款蓝牙耳机吧
```

**调用流程**：

```typescript
// ChatInput.tsx
const response = await sdk.fetchAds({
  conversationContext: {
    query: '帮我推荐一款蓝牙耳机吧'
  },
  userContext: {
    sessionId: 'ee5be264-6225-4a16-811b-b264cf244a57',
    demographics: {
      country: 'US',
      language: 'en'
    }
  },
  slots: [
    {
      slotId: 'slot-source',
      format: 'source',
      variant: 'card',
      count: 2,
      preferences: {
        maxTitleLength: 50,
        showSponsoredLabel: true
      }
    },
    {
      slotId: 'slot-static',
      format: 'static',
      variant: 'banner',
      count: 1
    }
  ]
})
```

**SDK 返回**（按 Slot 分组）：
```json
{
  "success": true,
  "slots": [
    {
      "slotId": "slot-source",
      "ads": [
        {
          "id": "source_sony_001",
          "type": "source",
          "content": {
            "title": "Sony 官方耳机页面",
            "url": "https://sony.com/headphones",
            "body": "Sony 官方耳机产品页面"
          },
          "tracking": {
            "clickUrl": "https://...",
            "impressionUrl": "https://..."
          },
          "metadata": {
            "sponsored": true
          }
        },
        {
          "id": "source_bose_001",
          "type": "source",
          "content": {
            "title": "Bose 官网",
            "url": "https://bose.com",
            "body": "Bose 音频设备官方网站"
          },
          "tracking": {
            "clickUrl": "https://...",
            "impressionUrl": "https://..."
          },
          "metadata": {
            "sponsored": true
          }
        }
      ],
      "metadata": {
        "reasoning": [
          {
            "reason": "只需要 query，可以用于 LLM context",
            "confidence": 0.9
          }
        ]
      }
    },
    {
      "slotId": "slot-static",
      "ads": [
        {
          "id": "static_banner_001",
          "type": "static",
          "content": {
            "title": "音频设备特惠活动",
            "body": "精选耳机品牌限时优惠",
            "image": "https://...",
            "link": "https://..."
          }
        }
      ]
    }
  ],
  "metadata": {
    "detectedStage": "pre_request",
    "availableContext": {
      "hasQuery": true,
      "hasResponse": false,
      "hasHistory": false,
      "hasProfile": false
    },
    "reasoning": "检测到只有 query，返回 source 和 static 格式广告"
  }
}
```

**Chatbox 处理**：
```typescript
// 提取 source 广告用于 LLM
const sourceSlot = response.slots.find(s => s.slotId === 'slot-source')
const sourceForLLM = sourceSlot?.ads.map(ad => ({
  title: ad.content.title,
  url: ad.content.url,
  sponsored: true
})) || []

// 构建 LLM 请求
const llmRequest = {
  messages: [{ role: 'user', content: '帮我推荐一款蓝牙耳机吧' }],
  sources: sourceForLLM
}
```

### 10.2 场景2：响应完成（有 query + response）

**LLM 返回**：
```
您好！为了更好地帮您推荐，我需要了解您的一些偏好：

1. 您的预算大概是多少？
2. 您主要在什么场景下使用？
...
```

**调用流程**：

```typescript
// Message.tsx
const response = await sdk.fetchAds({
  conversationContext: {
    query: '帮我推荐一款蓝牙耳机吧',
    response: '您好！为了更好地帮您推荐...',
    conversationHistory: [
      { role: 'user', content: '耳机多少钱？' },
      { role: 'assistant', content: '价格从几百到几千不等...' },
      { role: 'user', content: '帮我推荐一款蓝牙耳机吧' }
    ]
  },
  userContext: {
    sessionId: 'ee5be264-6225-4a16-811b-b264cf244a57',
    demographics: {
      country: 'US',
      language: 'en'
    }
  },
  slots: [
    {
      slotId: 'slot-suffix',
      format: 'suffix',
      variant: 'block',
      count: 1,
      preferences: {
        maxTitleLength: 50,
        showDivider: true
      },
      placement: {
        position: 'above_fold',
        context: 'post_response'
      }
    },
    {
      slotId: 'slot-action_card',
      format: 'action_card',
      variant: 'horizontal',
      count: 1,
      preferences: {
        showRating: true,
        showPrice: true
      }
    },
    {
      slotId: 'slot-followup',
      format: 'followup',
      variant: 'bubble',
      count: 1,
      preferences: {
        mixPosition: 2
      }
    },
    {
      slotId: 'slot-lead_gen',
      format: 'lead_gen',
      variant: 'default',
      count: 1,
      preferences: {
        fields: [
          { type: 'email', required: true, placeholder: 'your@email.com' }
        ]
      }
    }
  ]
})
```

**SDK 返回**（部分 slot 可能为空，取决于上下文）：
```json
{
  "success": true,
  "slots": [
    {
      "slotId": "slot-suffix",
      "ads": [
        {
          "id": "suffix_001",
          "type": "suffix",
          "content": {
            "title": "顺便说一句，Sony 的 WH-1000XM5 降噪效果很不错。"
          }
        }
      ],
      "metadata": {
        "reasoning": [
          {
            "reason": "有 response，可以生成相关后缀",
            "confidence": 0.95
          }
        ],
        "suggestions": {
          "tone": "casual"
        }
      }
    },
    {
      "slotId": "slot-action_card",
      "ads": [
        {
          "id": "action_card_001",
          "type": "action_card",
          "content": {
            "title": "Sony WH-1000XM5",
            "body": "行业领先的降噪技术",
            "image": "https://...",
            "price": "$348",
            "rating": 4.8
          }
        }
      ]
    },
    {
      "slotId": "slot-followup",
      "ads": [
        {
          "id": "followup_001",
          "type": "followup",
          "content": {
            "title": "想了解更多关于降噪耳机的使用场景吗？"
          }
        }
      ]
    },
    {
      "slotId": "slot-lead_gen",
      "ads": [
        {
          "id": "lead_gen_001",
          "type": "lead_gen",
          "content": {
            "title": "订阅音频设备资讯",
            "body": "获取最新耳机评测和优惠",
            "lead_gen_fields": [
              { "type": "email", "placeholder": "your@email.com", "required": true }
            ]
          }
        }
      ]
    }
  ],
  "metadata": {
    "detectedStage": "post_response",
    "availableContext": {
      "hasQuery": true,
      "hasResponse": true,
      "hasHistory": true,
      "hasProfile": false,
      "historyLength": 3
    },
    "reasoning": "检测到完整上下文（query + response + history），返回所有格式的广告"
  }
}
```

---

## 11. 优势分析

### 11.1 与分接口方案对比

| 方面 | 分接口方案 | 统一接口方案 |
|------|-----------|-------------|
| **接口数量** | 2个（pre-request + post-response） | 1个 |
| **参数复杂度** | 需要区分阶段，容易出错 | 统一参数，自动检测 |
| **SDK 灵活性** | 受限于阶段划分 | 完全智能决策 |
| **扩展性** | 新格式需要修改接口 | 新格式自动支持 |
| **权限管理** | 需要分别授权 | 统一授权，清晰简单 |
| **Chatbox 复杂度** | 需要维护两个调用逻辑 | 一个调用逻辑，简单清晰 |
| **测试复杂度** | 需要测试两个接口 | 只需测试一个接口 |
| **文档维护** | 两套文档 | 一套文档 |

### 11.2 核心优势

#### 优势1：简化集成

**Chatbox 端**：
```typescript
// 之前：需要两个接口
const preResponse = await sdk.fetchPreRequestAds({ query })
const postResponse = await sdk.fetchPostResponseAds({ query, response })

// 现在：只需要一个接口
const result1 = await sdk.fetchAds({ context: { query } })
const result2 = await sdk.fetchAds({ context: { query, response } })
```

#### 优势2：SDK 智能化

```typescript
// SDK 自动检测上下文完整性
const ads = await sdk.fetchAds({
  context: {
    query: '...',
    response: undefined,  // SDK 自动处理
    history: undefined,     // SDK 自动处理
  }
})

// SDK 根据 context 完整性自动决定返回什么
```

#### 优势3：向后兼容

```typescript
// 现有代码只需少量修改
// 之前
const { ads } = await fetchAds(query, response)

// 现在
const { ads } = await fetchAds({ context: { query, response } })
```

#### 优势4：扩展性强

```typescript
// 新增广告格式时，SDK 内部添加逻辑即可
// Chatbox 端完全不需要修改

// SDK 内部
class AdDecisionEngine {
  private selectCandidateFormats(context: ContextScore) {
    const formats = ['source', 'static', 'suffix', ...]

    // 新增格式自动支持
    if (context.hasSpecialCondition) {
      formats.push('new_format')
    }

    return formats
  }
}
```

---

## 12. 风险评估与缓解

### 12.1 风险识别

| 风险 | 影响 | 可能性 | 缓解措施 |
|------|------|--------|---------|
| **SDK 过度决策** | Chatbox 失去对广告的控制 | 中 | 提供 `preferences.includeFormats` 选项 |
| **向后兼容** | 破坏现有功能 | 中 | 分阶段迁移，保留旧接口 |
| **性能影响** | 额外的上下文评估 | 低 | 内部缓存，异步处理 |
| **隐私问题** | 收集更多上下文信息 | 中 | 明确隐私政策，用户可控 |

### 12.2 缓解策略

#### 风险1：SDK 过度决策

**缓解**：
- Chatbox 可以通过 `preferences.includeFormats` 控制返回的格式
- 提供详细的 `metadata.reasoning` 帮助理解 SDK 决策
- 保留覆盖机制（Chatbox 可以过滤 SDK 返回的广告）

#### 风险2：向后兼容

**缓解**：
- 分两个阶段迁移
  - 阶段1：旧接口继续工作，新接口并行开发
  - 阶段2：逐步迁移到新接口
- 提供适配器兼容旧接口

```typescript
// 适配器示例
class SDKAdapter {
  // 兼容旧接口
  async fetchPreRequestAds(params) {
    return this.fetchAds({
      context: { query: params.query },
      placement: { stage: 'pre_request' }
    })
  }
}
```

#### 风险3：性能影响

**缓解**：
- SDK 内部实现智能缓存
- Chatbox 端实现防抖和合并
- 异步处理，不阻塞主线程

---

## 13. 实施计划

### 13.1 阶段划分

```
┌─────────────────────────────────────────────────────────────┐
│                    实施阶段                                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  阶段1：SDK 接口开发 (2-3 周)                                 │
│  • 实现 fetchAds 统一接口                                    │
│  • 实现智能决策引擎                                            │
│  • 实现内容生成逻辑                                            │
│  • 编写单元测试                                                │
│                                                              │
│  阶段2：Chatbox 集成 (2-3 周)                                  │
│  • 实现 AdContextManager                                     │
│  • 集成到 ChatInput 和 Message                                │
│  • 迁移现有组件到新架构                                        │
│  • 端到端测试                                                  │
│                                                              │
│  阶段3：测试与优化 (1-2 周)                                   │
│  • 性能测试                                                  │
│  • 用户测试                                                  │
│  • 收集反馈优化                                                │
│                                                              │
│  阶段4：发布与监控 (1 周)                                     │
│  • 灰度发布                                                  │
│  • 监控指标                                                  │
│  • 快速修复问题                                                │
│                                                              │
│  总计：6-9 周                                                 │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 13.2 详细里程碑

#### 里程碑1：SDK 接口完成

**交付物**：
- SDK 统一接口实现
- 智能决策引擎实现
- SDK 单元测试覆盖率 > 80%
- SDK 文档（API 说明、示例代码）

**验收标准**：
- 所有单元测试通过
- 性能指标达标（响应时间 < 500ms）
- 文档完整准确

#### 里程碑2：Chatbox 集成完成

**交付物**：
- AdContextManager 实现
- ChatInput 集成
- Message 组件集成
- 端到端测试用例

**验收标准**：
- 所有集成测试通过
- 现有功能不受影响
- 新功能按预期工作

#### 里程碑3：生产环境就绪

**交付物**：
- 性能测试报告
- 用户验收测试报告
- 监控和日志系统

**验收标准**：
- 性能指标达标
- 用户测试反馈良好
- 无严重 bug

---

## 14. 附录

### 14.1 术语表

| 术语 | 说明 |
|------|------|
| **Pre-Request** | 预请求阶段，指用户输入后、LLM 请求前的阶段 |
| **Post-Response** | 后响应阶段，指 LLM 返回完成后的阶段 |
| **Context** | 上下文信息，包括 query、response、history 等 |
| **Format** | 广告格式类型，如 source、suffix、action_card 等 |
| **SDK** | @ai-ad-network/frontend-sdk，广告前端 SDK |
| **Chatbox** | 本项目，AI 聊天应用 |

### 14.2 参考文档

- [SDK 集成指南](./SDK_INTEGRATION.md)
- [广告格式说明](./FORMAT_SPECIFICATION.md)
- [隐私政策](./PRIVACY_POLICY.md)

### 14.3 变更历史

| 版本 | 日期 | 变更内容 | 作者 |
|------|------|---------|------|
| v1.0.0 | 2026-01-24 | 初始版本 | Chatbox 团队 |

---

## 文档评审

请评审以下方面：

1. **完整性**：是否覆盖所有必要的场景？
2. **可行性**：技术上是否可行？是否有遗漏？
3. **优先级**：P0/P1/P2 划分是否合理？
4. **协作边界**：Chatbox 和 SDK 的职责是否清晰？
5. **实施计划**：时间估算是否合理？

请提供反馈，我们将据此调整设计。
