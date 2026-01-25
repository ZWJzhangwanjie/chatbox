# 统一广告 API 使用指南

## 概述

新的统一广告 API (`fetchAds`) 支持在所有阶段（pre-request 和 post-response）获取广告，后端会根据上下文完整性智能决定返回哪些格式的广告。

## 核心特性

- ✅ **统一接口**：一个函数支持所有阶段
- ✅ **智能决策**：后端自动检测阶段并选择合适的广告格式
- ✅ **上下文感知**：支持对话历史和用户画像
- ✅ **决策透明**：返回详细的元数据说明决策过程

## 快速开始

### 安装

```bash
npm install @ai-ad-network/frontend-sdk
```

### 基础用法

```tsx
import { fetchAds } from '@ai-ad-network/frontend-sdk';

// 预请求阶段（只有 query）
const preRequest = await fetchAds({
  conversationContext: {
    query: '推荐蓝牙耳机'
  },
  userContext: {
    sessionId: 'session-123'
  },
  slots: [
    {
      slotId: 'slot-source',
      slotName: 'Sponsored Sources',
      format: 'source',
      variant: 'card',
      size: { width: 0, height: 40 },
      count: 2,
      placement: { position: 'above_fold', context: 'In LLM context' }
    },
    {
      slotId: 'slot-static',
      slotName: 'Sidebar Banner',
      format: 'static',
      variant: 'banner',
      size: { width: 300, height: 250 },
      count: 1,
      placement: { position: 'sidebar', context: 'Sidebar banner' }
    }
  ]
});

// 后响应阶段（有 query + response）
const postResponse = await fetchAds({
  conversationContext: {
    query: '推荐蓝牙耳机',
    response: '根据您的需求，我推荐以下几款蓝牙耳机...',
    conversationHistory: [
      { role: 'user', content: '你好' },
      { role: 'assistant', content: '你好！有什么可以帮助您的吗？' },
      { role: 'user', content: '推荐蓝牙耳机' }
    ]
  },
  userContext: {
    sessionId: 'session-123',
    profile: {
      interests: ['科技', '数码'],
      behavior: {
        interactionStyle: 'detailed',
        avgSessionLength: 5
      }
    }
  },
  slots: [
    {
      slotId: 'slot-suffix',
      slotName: 'Response Suffix',
      format: 'suffix',
      size: { width: 0, height: 0 },
      count: 1,
      placement: { position: 'below_fold', context: 'After AI response' }
    },
    {
      slotId: 'slot-action_card',
      slotName: 'Product Cards',
      format: 'action_card',
      variant: 'horizontal',
      size: { width: 400, height: 100 },
      count: 3,
      placement: { position: 'above_fold', context: 'Product recommendations' }
    }
  ]
});
```

## 完整示例

### ChatInput 组件集成（预请求阶段）

```tsx
import { useState } from 'react';
import { fetchAds, adaptAdToKoahAd } from '@ai-ad-network/frontend-sdk';

export function ChatInput() {
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async (message: string) => {
    // ================================================================
    // 阶段1：预请求（在 LLM 请求前获取广告）
    // ================================================================

    setIsLoading(true);

    try {
      // 获取 Source 和 Static 广告
      const adResponse = await fetchAds(
        {
          conversationContext: {
            query: message,
          },
          userContext: {
            sessionId: getSessionId(),
          },
          slots: [
            {
              slotId: 'slot-source',
              slotName: 'Sponsored Sources',
              format: 'source',
              variant: 'card',
              size: { width: 0, height: 40 },
              count: 2,
              placement: {
                position: 'above_fold',
                context: 'For LLM context',
              },
            },
            {
              slotId: 'slot-static',
              slotName: 'Sidebar Banner',
              format: 'static',
              variant: 'banner',
              size: { width: 300, height: 250 },
              count: 1,
              placement: {
                position: 'sidebar',
                context: 'Sidebar banner',
              },
            },
          ],
        },
        {
          apiBaseUrl: '/api/v1',
        }
      );

      // 提取 Source 广告用于 LLM context
      const sourceSlot = adResponse.slots.find((s) => s.slotId === 'slot-source');
      const sourceAds = sourceSlot?.ads || [];

      const sourcesForLLM = sourceAds.map((ad) => ({
        title: ad.adapted.title,
        url: ad.adapted.ctaText, // 或从其他字段获取
        sponsored: true,
      }));

      // ================================================================
      // 阶段2：构建 LLM 请求（嵌入 Source 广告）
      // ================================================================

      const llmRequest = {
        messages: [{ role: 'user', content: message }],
        sources: sourcesForLLM.length > 0 ? sourcesForLLM : undefined,
      };

      // 发送到 LLM
      await sendToLLM(llmRequest);

      // 保存 adResponse 以便后续使用
      saveAdResponse(adResponse);
    } catch (error) {
      console.error('Failed to fetch ads:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <input type="text" placeholder="输入消息..." />
      <button onClick={() => handleSend(inputValue)} disabled={isLoading}>
        {isLoading ? '获取广告中...' : '发送'}
      </button>
    </div>
  );
}
```

### Message 组件集成（后响应阶段）

```tsx
import { useEffect, useState } from 'react';
import { fetchAds, ActionCardAd, SuffixAd } from '@ai-ad-network/frontend-sdk';

export function Message({ msg, sessionId }) {
  const [adResponse, setAdResponse] = useState(null);

  useEffect(() => {
    // ================================================================
    // 阶段2：后响应（LLM 返回完成后获取广告）
    // ================================================================

    if (msg.role === 'assistant' && !msg.generating && msg.isComplete) {
      const fetchPostResponseAds = async () => {
        try {
          // 收集对话历史
          const conversationHistory = getConversationHistory();

          // 获取需要完整上下文的广告
          const response = await fetchAds(
            {
              conversationContext: {
                query: getPreviousUserMessage(),
                response: msg.content,
                conversationHistory,
              },
              userContext: {
                sessionId,
                profile: getUserProfile(), // 可选
              },
              slots: [
                {
                  slotId: 'slot-suffix',
                  slotName: 'Response Suffix',
                  format: 'suffix',
                  size: { width: 0, height: 0 },
                  count: 1,
                  placement: {
                    position: 'below_fold',
                    context: 'After AI response',
                  },
                },
                {
                  slotId: 'slot-action_card',
                  slotName: 'Product Cards',
                  format: 'action_card',
                  variant: 'horizontal',
                  size: { width: 400, height: 100 },
                  count: 3,
                  placement: {
                    position: 'above_fold',
                    context: 'Product recommendations',
                  },
                },
                {
                  slotId: 'slot-followup',
                  slotName: 'Follow-up Questions',
                  format: 'followup',
                  variant: 'bubble',
                  size: { width: 200, height: 40 },
                  count: 2,
                  placement: {
                    position: 'below_fold',
                    context: 'Follow-up questions',
                  },
                },
              ],
            },
            {
              apiBaseUrl: '/api/v1',
            }
          );

          setAdResponse(response);
        } catch (error) {
          console.error('Failed to fetch post-response ads:', error);
        }
      };

      fetchPostResponseAds();
    }
  }, [msg.generating, msg.isComplete]);

  // ================================================================
  // 渲染广告（按 slot 分组）
  // ================================================================

  if (!adResponse) {
    return <MessageContent message={msg} />;
  }

  const suffixAds = adResponse.slots.find((s) => s.slotId === 'slot-suffix')?.ads || [];
  const actionCardAds = adResponse.slots.find((s) => s.slotId === 'slot-action_card')?.ads || [];
  const followUpAds = adResponse.slots.find((s) => s.slotId === 'slot-followup')?.ads || [];

  return (
    <div>
      {/* 消息内容 */}
      <MessageContent message={msg} />

      {/* Suffix 广告 */}
      {suffixAds.map((ad) => (
        <SuffixSlot key={ad.original.id} ad={adaptAdToKoahAd(ad)} />
      ))}

      {/* ActionCard 广告 */}
      <div className="flex gap-4">
        {actionCardAds.map((ad) => (
          <ActionCardAd key={ad.original.id} ad={adaptAdToKoahAd(ad)} />
        ))}
      </div>

      {/* FollowUp 广告 */}
      <div className="flex gap-2">
        {followUpAds.map((ad) => (
          <FollowUpAd key={ad.original.id} ad={adaptAdToKoahAd(ad)} />
        ))}
      </div>
    </div>
  );
}
```

## 响应结构

### 全局响应

```typescript
{
  requestId: string,
  timestamp: number,
  intent: {
    type: 'shopping' | 'lead_gen' | 'software' | 'content' | 'generic',
    confidence: number,
    keywords: string[]
  },
  slots: SlotResponse[],
  globalSuggestions?: {
    priority?: string[],
    hideIfNoFill?: string[]
  },
  metadata?: {
    detectedStage: 'pre_request' | 'post_response' | 'unknown',
    availableContext: {
      hasQuery: boolean,
      hasResponse: boolean,
      hasHistory: boolean,
      hasProfile: boolean,
      historyLength?: number
    },
    reasoning?: string
  }
}
```

### Slot 响应

```typescript
{
  slotId: string,
  status: 'filled' | 'no_fill' | 'error',
  error?: string,
  ads: AdaptedAdContent[],
  suggestions?: {
    layout?: 'horizontal' | 'vertical' | 'grid',
    columns?: number,
    spacing?: string
  },
  metadata?: {
    reasoning?: Array<{
      reason: string,
      confidence: number
    }>,
    suggestions?: {
      layout?: string,
      variant?: string,
      tone?: 'casual' | 'professional' | 'friendly' | 'technical'
    }
  }
}
```

## 智能决策规则

### Pre-Request 阶段（只有 query）

**可返回格式**：
- ✅ `source` - 用于 LLM context
- ✅ `static` - 侧边栏横幅

**不返回格式**：
- ❌ `suffix` - 需要 response
- ❌ `action_card` - 需要 response
- ❌ `followup` - 需要 response
- ❌ `lead_gen` - 需要 response

### Post-Response 阶段（有 query + response）

**可返回格式**：
- ✅ 所有格式（`source`, `static`, `suffix`, `action_card`, `followup`, `lead_gen`）

### 上下文增强

有额外上下文时的优化：
- **对话历史**：避免重复推荐，理解主题演变
- **用户画像**：个性化推荐，优化排序
- **购买意向**：优先展示相关产品

## 类型定义

### ConversationContext

```typescript
interface ConversationContext {
  query: string; // 必需
  response?: string; // 可选
  intent?: IntentResult; // 可选
  conversationHistory?: ConversationMessage[]; // 新增
}

interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: number;
}
```

### UserContext

```typescript
interface UserContext {
  userId?: string;
  sessionId: string; // 必需
  demographics?: {
    country?: string;
    language?: string;
  };
  profile?: UserProfile; // 新增
}

interface UserProfile {
  interests?: string[];
  behavior?: {
    preferredTopics?: string[];
    interactionStyle?: 'concise' | 'detailed' | 'technical' | 'casual';
    avgSessionLength?: number;
  };
  purchaseIntent?: {
    categories?: string[];
    priceRange?: string;
    timeline?: 'immediate' | 'within_week' | 'within_month' | 'researching';
  };
}
```

## 错误处理

```tsx
try {
  const response = await fetchAds({ ... }, { apiBaseUrl: '/api/v1' });

  // 检查哪些 slot 被填充
  response.slots.forEach(slot => {
    if (slot.status === 'filled') {
      console.log(`${slot.slotId} filled with ${slot.ads.length} ads`);
    } else if (slot.status === 'no_fill') {
      console.log(`${slot.slotId} no fill: ${slot.metadata?.reasoning?.[0]?.reason}`);
    } else if (slot.status === 'error') {
      console.error(`${slot.slotId} error: ${slot.error}`);
    }
  });

  // 检查全局元数据
  console.log('Detected stage:', response.metadata?.detectedStage);
  console.log('Available context:', response.metadata?.availableContext);
  console.log('Reasoning:', response.metadata?.reasoning);

} catch (error) {
  console.error('Ad request failed:', error);
  // 降级：不展示广告或使用缓存
}
```

## 最佳实践

1. **分阶段获取**：
   - Pre-request: 只获取 `source` 和 `static`
   - Post-response: 获取其他格式

2. **缓存策略**：
   - 缓存 pre-request 结果
   - 合并 post-response 结果

3. **错误处理**：
   - 优雅降级
   - 不阻塞主流程

4. **用户体验**：
   - 不影响 LLM 响应速度
   - 异步加载广告
   - 提供加载状态

## 迁移指南

### 从 `useAdSlots` 迁移

```tsx
// 旧方式
const { slots, requestAds } = useAdSlots({
  slots: AD_SLOTS,
  enabled: true
});

await requestAds({
  conversationContext: { query, response },
  userContext: { sessionId }
});

// 新方式（更灵活）
const response = await fetchAds({
  conversationContext: { query, response },
  userContext: { sessionId },
  slots: AD_SLOTS
});

// 访问结果
const slotsMap = {};
response.slots.forEach(slot => {
  slotsMap[slot.slotId] = slot;
});
```

## 支持

如有问题，请参考：
- [API 文档](./API_REFERENCE.md)
- [示例代码](./examples/)
- [GitHub Issues](https://github.com/ai-ad-network/frontend-sdk/issues)
