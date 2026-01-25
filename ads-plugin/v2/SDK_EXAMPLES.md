# SDK 使用示例集合

本文档提供了统一广告SDK的完整使用示例，涵盖各种常见场景。

## 目录

1. [基础示例](#基础示例)
2. [对话历史利用](#对话历史利用)
3. [用户画像个性化](#用户画像个性化)
4. [完整的Chatbot集成](#完整的chatbot集成)
5. [React集成示例](#react集成示例)
6. [错误处理和降级](#错误处理和降级)

## 基础示例

### 最小化示例

```typescript
import { fetchAds } from '@ai-ad-network/frontend-sdk';

// 最简单的请求
const response = await fetchAds({
  conversationContext: {
    query: '推荐一款蓝牙耳机'
  },
  userContext: {
    sessionId: 'session-123'
  },
  slots: [{
    slotId: 'ad-1',
    slotName: 'Main Ad',
    format: 'static',
    size: { width: 300, height: 250 },
    placement: {
      position: 'sidebar',
      context: 'Sidebar'
    }
  }]
});

// 检查结果
const slot = response.slots[0];
if (slot.status === 'filled') {
  const ad = slot.ads[0];
  console.log('Ad title:', ad.adapted.title);
  console.log('Ad CTA:', ad.adapted.ctaText);
}
```

## 对话历史利用

### 场景：避免重复推荐

```typescript
import { fetchAds } from '@ai-ad-network/frontend-sdk';

// 模拟对话历史
const conversationHistory = [
  { role: 'user', content: '你好', timestamp: Date.now() - 10000 },
  { role: 'assistant', content: '你好！有什么可以帮助您的吗？', timestamp: Date.now() - 9000 },
  { role: 'user', content: '推荐一款蓝牙耳机', timestamp: Date.now() - 8000 },
  { role: 'assistant', content: '我推荐Sony WH-1000XM5，它具有出色的降噪效果...', timestamp: Date.now() - 7000 },
  { role: 'user', content: 'Bose怎么样？', timestamp: Date.now() - 6000 },
];

// 请求广告 - 系统会自动过滤已提及的产品
const response = await fetchAds({
  conversationContext: {
    query: 'Bose怎么样？',
    response: 'Bose QuietComfort系列也是不错的选择...',
    conversationHistory // 提供对话历史
  },
  userContext: {
    sessionId: 'session-123'
  },
  slots: [{
    slotId: 'product-card',
    slotName: 'Product Card',
    format: 'action_card',
    size: { width: 400, height: 200 },
    placement: {
      position: 'above_fold',
      context: 'Product recommendation'
    }
  }]
});

// 系统会避免推荐Sony和Bose（因为已在对话中提及）
// 可能推荐其他品牌如Jabra、LG等
```

### 场景：理解用户意图演变

```typescript
// 对话显示用户从"研究"转向"比较"再到"准备购买"
const conversationHistory = [
  { role: 'user', content: '什么是降噪耳机？' },
  { role: 'assistant', content: '降噪耳机使用主动降噪技术...' },
  { role: 'user', content: 'Sony和Bose哪个好？' },
  { role: 'assistant', content: '两者各有优势...' },
  { role: 'user', content: '价格多少？' }, // 进入购买阶段
];

const response = await fetchAds({
  conversationContext: {
    query: '价格多少？',
    response: 'Sony WH-1000XM5售价约￥2500...',
    conversationHistory
  },
  userContext: {
    sessionId: 'session-123'
  },
  slots: [{
    slotId: 'cta-card',
    slotName: 'Call to Action',
    format: 'lead_gen',
    size: { width: 400, height: 150 },
    placement: {
      position: 'above_fold',
      context: 'Purchase CTA'
    }
  }]
});

// 系统检测到用户处于"ready_to_buy"意图
// 会优先返回有明确CTA（购买链接、优惠信息）的广告
```

## 用户画像个性化

### 场景：基于兴趣的推荐

```typescript
import { fetchAds } from '@ai-ad-network/frontend-sdk';

// 获取用户画像
const userProfile = {
  interests: ['科技', '音乐', '摄影'],
  behavior: {
    preferredTopics: ['降噪', '音质', '便携性'],
    interactionStyle: 'detailed',
    avgSessionLength: 300 // 5分钟
  }
};

const response = await fetchAds({
  conversationContext: {
    query: '推荐音频设备'
  },
  userContext: {
    sessionId: 'session-123',
    profile: userProfile
  },
  slots: [{
    slotId: 'personalized-ad',
    slotName: 'Personalized Recommendation',
    format: 'action_card',
    size: { width: 400, height: 200 },
    placement: {
      position: 'above_fold',
      context: 'Personalized'
    }
  }]
});

// 系统会提升与"科技"、"音乐"相关的广告得分
// 优先展示详细描述的产品（因为interactionStyle是detailed）
```

### 场景：购买意向匹配

```typescript
// 用户明确表示想买，且预算是中等价格
const userProfile = {
  purchaseIntent: {
    categories: ['audio', 'headphones'],
    priceRange: 'medium', // 100-500美元
    timeline: 'within_week' // 一周内购买
  }
};

const response = await fetchAds({
  conversationContext: {
    query: '我想买一款蓝牙耳机，预算300-500元'
  },
  userContext: {
    sessionId: 'session-123',
    profile: userProfile
  },
  slots: [{
    slotId: 'purchase-ad',
    slotName: 'Purchase Recommendation',
    format: 'action_card',
    size: { width: 400, height: 200 },
    placement: {
      position: 'above_fold',
      context: 'Purchase intent'
    }
  }]
});

// 系统会优先返回：
// 1. 价格在100-500美元范围内的产品
// 2. 有明确购买链接的广告
// 3. audio/headphones类别的产品
```

### 场景：首次访问用户 vs 老用户

```typescript
// 首次访问用户（无画像）
const newVisitor = await fetchAds({
  conversationContext: { query: '蓝牙耳机推荐' },
  userContext: {
    sessionId: 'new-session-123'
    // 没有profile字段
  },
  slots: [/* ... */]
});

// 返回通用的热门产品推荐

// 老用户（有详细画像）
const returningVisitor = await fetchAds({
  conversationContext: { query: '蓝牙耳机推荐' },
  userContext: {
    sessionId: 'returning-session-123',
    userId: 'user-456',
    profile: {
      interests: ['音乐制作', '专业音频'],
      behavior: {
        interactionStyle: 'technical',
        preferredTopics: ['频响曲线', '阻抗', '驱动单元']
      },
      purchaseIntent: {
        categories: ['studio-headphones'],
        priceRange: 'high',
        timeline: 'researching'
      }
    }
  },
  slots: [/* ... */]
});

// 返回专业级录音室耳机，包含技术参数
```

## 完整的Chatbot集成

```typescript
import { fetchAds } from '@ai-ad-network/frontend-sdk';

class ChatbotWithAds {
  private sessionId: string;
  private conversationHistory: Array<{role: string, content: string, timestamp?: number}> = [];

  constructor() {
    this.sessionId = `session-${Date.now()}`;
  }

  async sendMessage(userMessage: string): Promise<string> {
    // ================================================================
    // 阶段1：Pre-Request - 获取基础广告
    // ================================================================

    let preRequestAds = null;
    try {
      preRequestAds = await fetchAds({
        conversationContext: {
          query: userMessage
        },
        userContext: {
          sessionId: this.sessionId,
          profile: this.getUserProfile() // 可选
        },
        slots: [
          {
            slotId: 'source',
            slotName: 'Sponsored Sources',
            format: 'source',
            size: { width: 0, height: 40 },
            count: 2,
            placement: {
              position: 'above_fold',
              context: 'LLM context'
            }
          },
          {
            slotId: 'static',
            slotName: 'Sidebar Banner',
            format: 'static',
            size: { width: 300, height: 250 },
            placement: {
              position: 'sidebar',
              context: 'Sidebar'
            }
          }
        ]
      });
    } catch (error) {
      console.error('Pre-request ads failed:', error);
      // 继续执行，不阻塞主流程
    }

    // ================================================================
    // 阶段2：构建LLM请求
    // ================================================================

    const sourceAds = preRequestAds?.slots.find(s => s.slotId === 'source')?.ads || [];
    const sponsoredSources = sourceAds.map(ad => ({
      title: ad.adapted.title,
      url: ad.tracking.clickUrl,
      sponsored: true
    }));

    const llmMessages = [
      ...this.buildLLMHistory(),
      {
        role: 'user',
        content: userMessage,
        sources: sponsoredSources.length > 0 ? sponsoredSources : undefined
      }
    ];

    // ================================================================
    // 阶段3：调用LLM
    // ================================================================

    const llmResponse = await this.callLLM(llmMessages);

    // 添加到对话历史
    this.conversationHistory.push(
      { role: 'user', content: userMessage, timestamp: Date.now() },
      { role: 'assistant', content: llmResponse, timestamp: Date.now() }
    );

    // ================================================================
    // 阶段4：Post-Response - 获取完整上下文广告
    // ================================================================

    // 异步获取，不阻塞响应返回
    this.fetchPostResponseAds(userMessage, llmResponse);

    return llmResponse;
  }

  private async fetchPostResponseAds(query: string, response: string): Promise<void> {
    try {
      const postResponseAds = await fetchAds({
        conversationContext: {
          query,
          response,
          conversationHistory: this.conversationHistory
        },
        userContext: {
          sessionId: this.sessionId,
          profile: this.getUserProfile()
        },
        slots: [
          {
            slotId: 'suffix',
            slotName: 'Response Suffix',
            format: 'suffix',
            size: { width: 0, height: 0 },
            placement: {
              position: 'below_fold',
              context: 'After response'
            }
          },
          {
            slotId: 'action-card',
            slotName: 'Product Cards',
            format: 'action_card',
            variant: 'horizontal',
            size: { width: 400, height: 100 },
            count: 3,
            placement: {
              position: 'above_fold',
              context: 'Product recommendations'
            }
          },
          {
            slotId: 'followup',
            slotName: 'Follow-up Questions',
            format: 'followup',
            size: { width: 200, height: 40 },
            count: 2,
            placement: {
              position: 'below_fold',
              context: 'Follow-up'
            }
          }
        ]
      });

      // 触发UI更新
      this.onAdsUpdated(postResponseAds);

    } catch (error) {
      console.error('Post-response ads failed:', error);
    }
  }

  private getUserProfile() {
    // 实现从本地存储、数据库等获取用户画像
    const saved = localStorage.getItem(`user-profile-${this.sessionId}`);
    return saved ? JSON.parse(saved) : null;
  }

  private buildLLMHistory() {
    // 实现构建LLM历史
    return this.conversationHistory.map(msg => ({
      role: msg.role,
      content: msg.content
    }));
  }

  private async callLLM(messages: any[]): Promise<string> {
    // 实现LLM调用
    // ...
    return 'LLM response';
  }

  private onAdsUpdated(adResponse: any): void {
    // 触发UI更新事件
    window.dispatchEvent(new CustomEvent('ads-updated', {
      detail: adResponse
    }));
  }
}

// 使用示例
const chatbot = new ChatbotWithAds();

// 发送消息
chatbot.sendMessage('推荐一款蓝牙耳机').then(response => {
  console.log('LLM Response:', response);

  // 监听广告更新
  window.addEventListener('ads-updated', (event: any) => {
    const adResponse = event.detail;
    console.log('Ads updated:', adResponse);
    // 更新UI显示广告
  });
});
```

## React集成示例

### 使用自定义Hook

```typescript
import { useState, useEffect } from 'react';
import { fetchAds, AdResponseBatch, AdSlotRequest } from '@ai-ad-network/frontend-sdk';

function useUnifiedAds(slots: AdSlotRequest[], options: {
  conversationContext: {
    query: string;
    response?: string;
    conversationHistory?: Array<{role: string, content: string}>;
  };
  userContext: {
    sessionId: string;
    profile?: any;
  };
  enabled?: boolean;
}) {
  const [data, setData] = useState<AdResponseBatch | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!options.enabled) return;

    const fetch = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetchAds({
          conversationContext: options.conversationContext,
          userContext: options.userContext,
          slots
        });
        setData(response);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetch();
  }, [
    options.conversationContext.query,
    options.conversationContext.response,
    options.enabled
  ]);

  return { data, loading, error };
}

// 使用示例
function ChatComponent({ userMessage, aiResponse, conversationHistory }) {
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState('');

  // Pre-request ads
  const preRequest = useUnifiedAds([
    {
      slotId: 'source',
      slotName: 'Sources',
      format: 'source',
      size: { width: 0, height: 40 },
      count: 2,
      placement: { position: 'above_fold', context: 'Context' }
    }
  ], {
    conversationContext: {
      query: userMessage
    },
    userContext: {
      sessionId: 'session-123',
      profile: getUserProfile()
    },
    enabled: !!userMessage && !response
  });

  // Post-response ads
  const postResponse = useUnifiedAds([
    {
      slotId: 'suffix',
      slotName: 'Suffix',
      format: 'suffix',
      size: { width: 0, height: 0 },
      placement: { position: 'below_fold', context: 'After' }
    },
    {
      slotId: 'action-card',
      slotName: 'Cards',
      format: 'action_card',
      size: { width: 400, height: 100 },
      count: 3,
      placement: { position: 'above_fold', context: 'Products' }
    }
  ], {
    conversationContext: {
      query: userMessage,
      response: aiResponse,
      conversationHistory
    },
    userContext: {
      sessionId: 'session-123',
      profile: getUserProfile()
    },
    enabled: !!userMessage && !!aiResponse
  });

  return (
    <div>
      {/* Pre-request ads */}
      {preRequest.data?.slots.map(slot => (
        <AdSlot key={slot.slotId} slot={slot} />
      ))}

      {/* Chat content */}
      <div className="messages">
        <Message content={userMessage} role="user" />
        <Message content={aiResponse} role="assistant" />
      </div>

      {/* Post-response ads */}
      {postResponse.data?.slots.map(slot => (
        <AdSlot key={slot.slotId} slot={slot} />
      ))}
    </div>
  );
}
```

## 错误处理和降级

### 完整的错误处理示例

```typescript
import { fetchAds } from '@ai-ad-network/frontend-sdk';

async function fetchAdsWithFallback(context: any, slots: any[]) {
  try {
    const response = await fetchAds(context, { slots });

    // 检查每个slot的状态
    const results = {
      success: true,
      slots: {} as Record<string, any>,
      errors: [] as Array<{slotId: string, error: string}>
    };

    response.slots.forEach(slot => {
      if (slot.status === 'filled') {
        results.slots[slot.slotId] = {
          status: 'success',
          ads: slot.ads,
          suggestions: slot.suggestions
        };
      } else if (slot.status === 'no_fill') {
        results.slots[slot.slotId] = {
          status: 'no_fill',
          reason: slot.metadata?.reasoning?.[0]?.reason || 'No ads available'
        };
      } else if (slot.status === 'error') {
        results.errors.push({
          slotId: slot.slotId,
          error: slot.error || 'Unknown error'
        });
        results.slots[slot.slotId] = {
          status: 'error',
          error: slot.error
        };
      }
    });

    return results;

  } catch (error) {
    console.error('Ad request failed:', error);

    // 降级策略：返回空结果
    return {
      success: false,
      slots: {},
      errors: [{ slotId: 'all', error: (error as Error).message }],
      fallback: true
    };
  }
}

// 使用示例
const result = await fetchAdsWithFallback({
  conversationContext: { query: '蓝牙耳机' },
  userContext: { sessionId: 'session-123' },
  slots: [{
    slotId: 'main-ad',
    slotName: 'Main Ad',
    format: 'action_card',
    size: { width: 400, height: 200 },
    placement: { position: 'above_fold', context: 'Main' }
  }]
});

// 处理结果
if (result.success) {
  const mainAd = result.slots['main-ad'];
  if (mainAd?.status === 'success') {
    // 渲染广告
    renderAds(mainAd.ads);
  } else if (mainAd?.status === 'no_fill') {
    // 显示默认内容
    showDefaultContent(mainAd.reason);
  }
} else {
  // 完全失败，显示备用内容
  showBackupContent();
}
```

### 带重试的错误处理

```typescript
async function fetchAdsWithRetry(
  context: any,
  slots: any[],
  maxRetries = 2
): Promise<any> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetchAds(context, { slots });
      return response;

    } catch (error) {
      lastError = error as Error;
      console.warn(`Ad request failed (attempt ${attempt + 1}/${maxRetries + 1}):`, error);

      if (attempt < maxRetries) {
        // 指数退避
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
  }

  // 所有重试都失败
  console.error('All ad request attempts failed:', lastError);
  return null;
}

// 使用
const result = await fetchAdsWithRetry({
  conversationContext: { query: '蓝牙耳机' },
  userContext: { sessionId: 'session-123' },
  slots: [/* ... */]
}, 2); // 最多重试2次

if (result) {
  // 成功
} else {
  // 失败，使用降级策略
}
```

## 性能优化

### 缓存广告响应

```typescript
class AdCache {
  private cache = new Map<string, {data: any, timestamp: number}>();
  private ttl = 300000; // 5分钟

  get(key: string): any | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  set(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  generateKey(context: any, slots: any[]): string {
    const key = JSON.stringify({
      query: context.conversationContext.query,
      slots: slots.map(s => s.slotId + ':' + s.format)
    });
    return btoa(key); // Base64编码
  }
}

const adCache = new AdCache();

async function fetchAdsWithCache(context: any, slots: any[]) {
  const cacheKey = adCache.generateKey(context, slots);

  // 检查缓存
  const cached = adCache.get(cacheKey);
  if (cached) {
    console.log('Using cached ads');
    return cached;
  }

  // 请求新数据
  const response = await fetchAds(context, { slots });

  // 存入缓存
  adCache.set(cacheKey, response);

  return response;
}
```

## 总结

这些示例涵盖了SDK的主要使用场景：

1. **基础集成**: 最简单的广告请求和展示
2. **对话历史**: 利用对话历史提升相关性
3. **用户画像**: 基于用户画像的个性化推荐
4. **完整Chatbot**: 预请求和后响应的完整流程
5. **React集成**: 使用Hook集成到React应用
6. **错误处理**: 优雅的错误处理和降级策略
7. **性能优化**: 缓存和重试机制

根据你的具体需求，可以参考相应的示例进行集成。
