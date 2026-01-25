# Backend API Documentation

## 统一广告API

### 概述

统一广告API提供单一接口 `/api/v1/ads/request`，支持两个请求阶段：
- **Pre-Request**: 在AI响应之前请求广告（仅需要query）
- **Post-Response**: 在AI响应之后请求广告（需要query + response）

### 请求端点

```
POST /api/v1/ads/request
```

### 请求参数

#### 请求体结构

```typescript
{
  conversationContext: {
    query: string;                    // 用户查询 (必填)
    response?: string;                // AI响应 (可选，用于post-response阶段)
    intent?: {                        // 意图识别结果 (可选，后端可自动识别)
      type: IntentType;               // 意图类型
      confidence: number;             // 置信度 (0-1)
      keywords: string[];             // 关键词
      reasoning?: string;             // 推理过程
    };
    conversationHistory?: ConversationMessage[];  // 对话历史 (可选)
  };
  userContext?: {
    userId?: string;                  // 用户ID (可选)
    sessionId: string;                // 会话ID (必填)
    demographics?: {                  // 人口统计信息 (可选)
      country?: string;
      language?: string;
    };
    profile?: {                       // 用户画像 (可选，用于个性化)
      interests?: string[];           // 用户兴趣
      behavior?: {                    // 行为模式
        preferredTopics?: string[];   // 偏好话题
        interactionStyle?: 'concise' | 'detailed' | 'technical' | 'casual';
        avgSessionLength?: number;
      };
      purchaseIntent?: {              // 购买意向
        categories?: string[];        // 感兴趣的类别
        priceRange?: string;          // 价格偏好
        timeline?: 'immediate' | 'within_week' | 'within_month' | 'researching';
      };
    };
  };
  slots: AdSlotRequest[];             // 广告位请求列表 (1-20个)
}
```

#### ConversationMessage (对话历史消息)

```typescript
{
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: number;
}
```

#### AdSlotRequest (广告位请求)

```typescript
{
  slotId: string;                     // 广告位唯一标识
  slotName: string;                   // 广告位名称
  format: AdFormat;                   // 广告格式
  variant?: string;                   // 变体 (可选)
  size: {                             // 尺寸要求
    width: number;
    height: number;
    minWidth?: number;
    maxWidth?: number;
    aspectRatio?: string;
  };
  count?: number;                     // 数量 (默认1)
  preferences?: {                     // 内容偏好 (可选)
    maxTitleLength?: number;
    maxBodyLength?: number;
    requireImage?: boolean;
    imageAspectRatio?: string;
    showPrice?: boolean;
    showRating?: boolean;
  };
  placement: {                        // 放置位置
    position: 'above_fold' | 'below_fold' | 'sidebar' | 'inline';
    context: string;
  };
}
```

#### AdFormat (广告格式)

```typescript
type AdFormat =
  | 'action_card'    // 行动卡片广告 (需要query + response)
  | 'suffix'         // 后缀广告 (需要query + response)
  | 'followup'       // 跟进问题广告 (需要query + response)
  | 'source'         // 赞助来源广告 (只需要query)
  | 'static'         // 静态广告 (只需要query)
  | 'lead_gen'       // 线索生成广告 (需要query + response);
```

#### IntentType (意图类型)

```typescript
enum IntentType {
  SHOPPING = 'shopping',     // 购物意图
  LEAD_GEN = 'lead_gen',     // 线索生成
  SOFTWARE = 'software',     // 软件相关
  CONTENT = 'content',       // 内容推荐
  GENERIC = 'generic',       // 通用意图
}
```

### 响应格式

#### 响应体结构

```typescript
{
  success: true;
  data: {
    requestId: string;              // 请求唯一标识
    timestamp: number;              // 响应时间戳
    intent: IntentResult;           // 识别的意图
    slots: AdSlotResponse[];        // 广告位响应列表
    globalSuggestions?: {           // 全局建议 (可选)
      priority?: string[];          // 优先显示的广告位
      hideIfNoFill?: string[];      // 无填充时隐藏的广告位
    };
    metadata?: {                    // 响应元数据 (可选)
      detectedStage: 'pre_request' | 'post_response' | 'unknown';
      availableContext: {
        hasQuery: boolean;
        hasResponse: boolean;
        hasHistory: boolean;
        hasProfile: boolean;
        historyLength?: number;
      };
      reasoning?: string;           // 决策推理过程
    };
  };
}
```

#### AdSlotResponse (广告位响应)

```typescript
{
  slotId: string;                   // 对应请求的slotId
  status: 'filled' | 'no_fill' | 'error';
  error?: string;                   // 错误信息 (仅当status='error'时)
  ads: AdaptedAdContent[];          // 适配的广告内容列表
  suggestions?: {                   // 展示建议 (可选)
    layout?: 'horizontal' | 'vertical' | 'grid';
    columns?: number;
    spacing?: string;
  };
  metadata?: {                      // 决策元数据 (可选)
    reasoning?: Array<{
      reason: string;
      confidence: number;
    }>;
    suggestions?: {
      layout?: string;
      variant?: string;
      position?: number;
      timing?: {
        showAfter?: number;
        requiresInterest?: string[];
      };
      tone?: 'casual' | 'professional' | 'friendly' | 'technical';
    };
  };
}
```

#### AdaptedAdContent (适配的广告内容)

```typescript
{
  original: {                       // 原始广告信息
    id: string;
    type: AdFormat;
    score: number;                  // 相关性得分 (0-1)
  };
  adapted: {                        // 适配后的内容
    title: string;                  // 标题 (已根据slot要求调整)
    body: string;                   // 正文 (已根据slot要求调整)
    ctaText: string;                // 行动号召文本
    image?: {                       // 图片信息 (如果适用)
      url: string;
      width: number;
      height: number;
      aspectRatio: string;
      fallbackColor?: string;
    };
    price?: {                       // 价格信息 (如果适用)
      display: string;              // 显示文本 (如 "$299")
      value: number;                // 数值
      currency: string;             // 货币代码
    };
    rating?: number;                // 评分 (如果适用)
    brand?: string;                 // 品牌名 (如果适用)
    styling?: {                     // 样式建议 (可选)
      backgroundColor?: string;
      textColor?: string;
      accentColor?: string;
      borderRadius?: string;
      padding?: string;
    };
  };
  tracking: {                       // 追踪信息
    impressionUrl: string;          // 展示追踪URL
    clickUrl: string;               // 点击追踪URL
    viewToken: string;              // 视图令牌 (用于反作弊)
  };
}
```

### 智能决策逻辑

#### 阶段检测 (Stage Detection)

后端根据上下文完整性自动检测请求阶段：

```typescript
// Pre-Request: 只有query
if (hasQuery && !hasResponse) {
  return 'pre_request';
}

// Post-Response: 有query和response
if (hasQuery && hasResponse) {
  return 'post_response';
}

// Unknown: 无法确定
return 'unknown';
```

#### 广告格式填充规则

| 广告格式 | Pre-Request | Post-Response | 所需上下文 |
|---------|-------------|---------------|-----------|
| `source` | ✅ | ✅ | query |
| `static` | ✅ | ✅ | query |
| `action_card` | ❌ | ✅ | query + response |
| `suffix` | ❌ | ✅ | query + response |
| `followup` | ❌ | ✅ | query + response |
| `lead_gen` | ❌ | ✅ | query + response |

**说明**:
- ✅ 表示该阶段可返回此格式
- ❌ 表示该阶段不返回此格式（会返回 `no_fill`）

### 对话历史增强功能

#### 提及的产品过滤

系统会分析对话历史，提取已提及的产品，避免重复推荐：

```typescript
// 示例对话
[
  { role: 'user', content: '推荐一款蓝牙耳机' },
  { role: 'assistant', content: '我推荐Sony WH-1000XM5' },
  { role: 'user', content: 'Bose怎么样？' }
]

// 分析结果
{
  mentionedProducts: [
    { name: 'sony', category: 'audio', firstMentionedAt: 1, mentionCount: 1 },
    { name: 'bose', category: 'audio', firstMentionedAt: 2, mentionCount: 1 }
  ]
}

// 广告过滤: 会过滤掉标题包含"sony"或"bose"的广告
```

#### 用户意图推断

系统会根据对话模式推断用户意图：

| 意图类型 | 关键词示例 | 特征 |
|---------|-----------|------|
| `researching` | 什么是、如何、怎么用、原理 | 学习阶段 |
| `comparing` | 对比、哪个好、vs、还是 | 比较阶段 |
| `ready_to_buy` | 价格、多少钱、哪里买、购买 | 准备购买 |
| `browsing` | (默认) | 浏览探索 |
| `support` | 问题、故障、怎么解决 | 需要帮助 |

### 用户画像个性化

#### 兴趣匹配 (最多20%提升)

根据用户兴趣提升相关广告的得分：

```typescript
// 用户画像
{
  interests: ['科技', '音乐']
}

// 广告提升
// 标题包含"音乐"的广告: +20%得分
// 类别为audio的广告: +15%得分
```

#### 购买意向匹配 (最多15%提升)

根据用户购买意向提升相关广告的得分：

```typescript
// 用户画像
{
  purchaseIntent: {
    categories: ['audio'],
    priceRange: 'medium',
    timeline: 'immediate'
  }
}

// 广告提升
// 类别匹配: +10%得分
// 价格匹配: +6%得分
// 有明确CTA: +4%得分 (immediate timeline)
```

#### 行为模式匹配 (最多10%提升)

根据用户交互偏好调整广告：

```typescript
// 用户画像
{
  behavior: {
    interactionStyle: 'concise',
    preferredTopics: ['降噪', '音质']
  }
}

// 广告调整
// 简短描述的广告: +6%得分
// 包含偏好话题: +4%得分
```

### 智能内容生成

对于 `suffix` 和 `followup` 格式，系统使用LLM生成自然广告内容：

#### Suffix格式

```typescript
// LLM生成的后缀内容
{
  prefix: "P.S.",
  text: "顺便说一句，Sony WH-1000XM5 的降噪效果很不错。",
  product_name: "Sony WH-1000XM5"
}
```

**特点**:
- 使用过渡词（"顺便说一句"、"对了"、"另外"）
- 简洁友好，1-2句话
- 3秒超时保护
- 自动回退到模板

#### Followup格式

```typescript
// LLM生成的跟进问题
{
  question_text: "想了解更多降噪耳机的使用场景吗？",
  is_ad: true,
  ad_destination: "https://example.com/sony-headphones"
}
```

**特点**:
- 自然相关的问题
- 简洁（10字以内）
- 以问号结尾

### 缓存策略

#### 缓存键生成

```typescript
// 统一API缓存键考虑：
// - query内容
// - response内容（如果有）
// - 广告格式列表
// - 用户画像hash（如果有）

key = `ad:v2:${queryHash}:${formats.join(',')}`
     + `:resp:${responseHash}`  // 如果有response
     + `:profile:${profileHash}` // 如果有profile
```

#### 动态TTL

```typescript
// 基础TTL基于置信度
if (confidence > 0.8) {
  baseTTL = 600;  // 10分钟
} else if (confidence > 0.5) {
  baseTTL = 300;  // 5分钟
} else {
  baseTTL = 60;   // 1分钟
}

// 根据上下文完整性调整
if (hasHistory && hasProfile) {
  baseTTL *= 1.5; // 增加50%
} else if (hasResponse) {
  baseTTL *= 1.2; // 增加20%
}

// 上限30分钟
return Math.min(baseTTL, 1800);
```

### 请求示例

#### Pre-Request 示例

```bash
curl -X POST http://localhost:3000/api/v1/ads/request \
  -H "Content-Type: application/json" \
  -d '{
    "conversationContext": {
      "query": "推荐一款蓝牙耳机"
    },
    "userContext": {
      "sessionId": "session-123"
    },
    "slots": [
      {
        "slotId": "sidebar-ad",
        "slotName": "侧边栏广告",
        "format": "source",
        "size": { "width": 300, "height": 250 },
        "placement": {
          "position": "sidebar",
          "context": "搜索结果页"
        }
      }
    ]
  }'
```

#### Post-Response 示例

```bash
curl -X POST http://localhost:3000/api/v1/ads/request \
  -H "Content-Type: application/json" \
  -d '{
    "conversationContext": {
      "query": "推荐一款蓝牙耳机",
      "response": "根据您的需求，我推荐Sony WH-1000XM5，它具有出色的降噪效果...",
      "conversationHistory": [
        { "role": "user", "content": "推荐一款蓝牙耳机" },
        { "role": "assistant", "content": "我推荐Sony WH-1000XM5" }
      ]
    },
    "userContext": {
      "sessionId": "session-123",
      "profile": {
        "interests": ["科技", "音乐"],
        "purchaseIntent": {
          "categories": ["audio"],
          "priceRange": "medium",
          "timeline": "within_week"
        }
      }
    },
    "slots": [
      {
        "slotId": "suffix-ad",
        "slotName": "后缀广告",
        "format": "suffix",
        "size": { "width": 0, "height": 0 },
        "placement": {
          "position": "below_fold",
          "context": "对话下方"
        }
      },
      {
        "slotId": "action-card",
        "slotName": "行动卡片",
        "format": "action_card",
        "size": { "width": 400, "height": 200 },
        "placement": {
          "position": "above_fold",
          "context": "回答右侧"
        }
      }
    ]
  }'
```

### 错误响应

```typescript
{
  success: false;
  error: string;              // 错误消息
  details?: any;              // 错误详情 (可选)
}
```

#### 常见错误码

| HTTP状态 | 错误类型 | 说明 |
|---------|---------|------|
| 400 | `ValidationError` | 请求参数验证失败 |
| 429 | `RateLimitError` | 请求频率超限 |
| 500 | `InternalError` | 服务器内部错误 |
| 503 | `ServiceUnavailable` | 服务暂时不可用 |

### 性能优化建议

1. **缓存利用**: 尽可能提供 `conversationContext.response` 以提高缓存命中率
2. **批量请求**: 单次请求可包含最多20个广告位，减少网络开销
3. **用户画像**: 提供 `profile` 可获得个性化推荐，但会增加缓存键复杂度
4. **对话历史**: 提供 `conversationHistory` 可提升广告相关性，但会增加处理时间

### 向后兼容性

- 所有新增字段均为可选
- 现有API调用方式继续有效
- 缺少新字段时系统会降级到基础功能
