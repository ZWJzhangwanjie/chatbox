# Entity Link 实体链接 - 技术文档

> **完整技术指南** - 深入了解 Entity Link 原理与最佳实践

---

## 📚 目录

1. [架构概述](#架构概述)
2. [SDK 集成流程](#sdk-集成流程)
3. [组件详解](#组件详解)
4. [配置参考](#配置参考)
5. [最佳实践](#最佳实践)
6. [性能优化](#性能优化)
7. [错误处理](#错误处理)
8. [测试指南](#测试指南)

---

## 架构概述

### 什么是 Entity Link？

Entity Link 是一种**原生广告格式**，工作流程如下：

```
┌─────────────────────────────────────────────────────────────┐
│                      您的应用                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ UI 组件      │  │ useAdSlots   │  │EnhancedContent│     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │
│         │                 │                  │              │
│         └─────────────────┴──────────────────┘              │
│                           │                                 │
└───────────────────────────┼─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                     前端 SDK                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ AdProvider   │  │ AdManager    │  │DOMRenderer   │     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │
│         │                 │                  │              │
└─────────┼─────────────────┼──────────────────┼──────────────┘
          │                 │                  │
          ▼                 ▼                  ▼
    ┌─────────┐       ┌─────────┐       ┌─────────────┐
    │ 您的后端 │       │ SDK API │       │ 联盟产品库  │
    └─────────┘       └─────────┘       └─────────────┘
```

### 核心功能

1. **识别** - 使用 NER 识别内容中的产品/品牌
2. **匹配** - 将识别的实体与联盟产品数据库匹配
3. **增强** - 用联盟链接替换纯文本
4. **追踪** - 自动追踪点击和展示数据

---

## SDK 集成流程

### React 集成

#### 步骤 1：配置 AdProvider

```tsx
import { AdProvider } from '@ai-ad-network/frontend-sdk';

function App() {
  return (
    <AdProvider
      config={{
        apiBaseUrl: 'https://api.ai-ad-network.com/v1',
        apiKey: 'ak_your_tenant_your_key',
        debug: process.env.NODE_ENV === 'development',
      }}
    >
      <YourChatApp />
    </AdProvider>
  );
}
```

**内部处理**：
- 创建 SDK 上下文
- 初始化默认配置
- 设置 HTTP 客户端

#### 步骤 2：配置广告位

```tsx
import { useAdSlots } from '@ai-ad-network/frontend-sdk';

function ChatApp() {
  const { slots, requestAds, isLoading, error } = useAdSlots({
    slots: [
      {
        slotId: 'entity-links',
        format: 'entity_link',
        preferences: {
          maxLinks: 5,
          badgeStyle: 'subtle',
        },
      },
    ],
  });

  return <YourUI />;
}
```

**内部处理**：
- 注册广告位到 SDK
- 创建广告位状态管理
- 准备请求构建器

#### 步骤 3：请求广告

```tsx
const handleSendMessage = async (userMessage: string) => {
  // 您的 AI/后端调用
  const aiResponse = await fetchYourAIChatAPI(userMessage);
  const responseText = aiResponse.content;

  // 请求 Entity Link 广告
  await requestAds({
    conversationContext: {
      query: userMessage,
      response: responseText,
    },
    userContext: {
      sessionId: getSessionId(),
      // ClientInfo 由 SDK v1.0.7+ 自动收集
    },
  });
};
```

**内部处理流程**：
```
1. SDK 自动收集 ClientInfo：
   - 设备信息（OS、浏览器、屏幕）
   - 应用信息（名称、版本）
   - 用户信息（语言、时区）
   - 地理位置（国家、地区）

2. SDK 构建广告请求：
   {
     slotConfigs: [...],
     conversationContext: {...},
     userContext: {
       sessionId: 'session-123',
       clientInfo: {...} // 自动添加
     },
     OpenRTB: {...} // 自动生成
   }

3. SDK 发送 HTTP 请求：
   POST /api/v1/ads/request
   Authorization: Bearer <apiKey>

4. SDK 接收响应并更新状态
```

#### 步骤 4：渲染增强内容

```tsx
import { EnhancedContent } from '@ai-ad-network/frontend-sdk';

function MessageWithAds({ message }) {
  const entityLinkAd = slots['entity-links']?.ads?.[0];

  return (
    <div className="message">
      <div className="message-content">{message.content}</div>

      {entityLinkAd && (
        <div className="entity-link-section">
          <EnhancedContent
            content={message.content}
            enhancements={{
              entities: entityLinkAd.content.entity_link_content.entities,
              replacements: entityLinkAd.content.entity_link_content.replacements,
              maxLinks: 5,
              badgeStyle: 'subtle',
            }}
            onEntityClick={(entity) => {
              console.log('用户点击了产品:', entity);
              // 您的分析追踪
            }}
          />
        </div>
      )}
    </div>
  );
}
```

**内部处理流程**：
```
1. EnhancedContent 接收数据：
   - content: 原始文本
   - enhancements.entities: 识别的产品/品牌
   - enhancements.replacements: 联盟链接
   - maxLinks: 最大显示链接数
   - badgeStyle: 视觉指示器样式

2. 处理流程：
   a) 按置信度过滤实体
   b) 限制到 maxLinks
   c) 按位置排序
   d) 应用重叠策略
   e) 构建 React 片段

3. 渲染结果：
   "我推荐 Sony WH-1000XM5† 降噪..."
   † 是徽章，"Sony WH-1000XM5" 可点击
```

### Universal SDK 集成

#### Vue 3

```vue
<script setup>
import { onMounted, ref } from 'vue';
import { AdManager, DOMRenderer } from '@ai-ad-network/frontend-sdk/universal';

const entityLinkContainer = ref(null);

const adManager = new AdManager({
  apiBaseUrl: 'https://api.ai-ad-network.com/v1',
  apiKey: 'ak_your_tenant_your_key',
  slots: [{
    slotId: 'entity-links',
    format: 'entity_link',
  }],
});

onMounted(async () => {
  const result = await adManager.requestAds({
    conversationContext: { query: '...', response: '...' },
  });

  const entityLinkAd = result.slots[0]?.ad;

  if (entityLinkAd && entityLinkContainer.value) {
    DOMRenderer.renderEnhancedContent(
      entityLinkAd.content.entity_link_content,
      entityLinkContainer.value,
      {
        badgeStyle: 'subtle',
        onClick: (entity) => console.log('点击:', entity),
      }
    );
  }
});
</script>
```

---

## 组件详解

### AdProvider

**位置**: `frontend-sdk/src/context/AdProvider.tsx`

**用途**: 根提供者，管理 SDK 配置和状态

```typescript
interface AdProviderProps {
  config: {
    apiBaseUrl: string;        // SDK API 基础 URL
    apiKey: string;            // 您的 API 密钥
    debug?: boolean;           // 启用调试日志
    timeout?: number;          // 请求超时（毫秒）
  };
  children: React.ReactNode;
}
```

**功能**：
- 所有 SDK 组件的上下文提供者
- 全局配置管理
- HTTP 客户端初始化
- SDK 错误的错误边界

### useAdSlots Hook

**位置**: `frontend-sdk/src/hooks/useAdSlots.ts`

**用途**: 管理广告位和请求广告

```typescript
interface UseAdSlotsOptions {
  apiBaseUrl: string;
  slots: AdSlotConfig[];
}

interface AdSlotConfig {
  slotId: string;
  slotName: string;
  format: 'entity_link' | 'action_card' | ...;
  variant?: string;
  size: { width: number; height: number };
  count: number;
  preferences?: {
    maxLinks?: number;
    badgeStyle?: 'subtle' | 'hover' | 'explicit' | 'none';
  };
  placement?: {
    position: 'inline' | 'banner' | ...;
    context: string;
  };
}
```

**返回值**：
```typescript
interface UseAdSlotsReturn {
  slots: Record<string, AdSlotState>;
  requestAds: (context: RequestContext) => Promise<void>;
  isLoading: boolean;
  error: Error | null;
}
```

### EnhancedContent 组件

**位置**: `frontend-sdk/src/components/EnhancedContent.tsx`

**用途**: 渲染带实体链接的增强内容

```typescript
interface EnhancedContentProps {
  content: string;                  // 原始文本内容
  enhancements: {
    entities: EntityInfo[];         // 识别的实体
    replacements: LinkReplacement[]; // 联盟链接
    maxLinks?: number;              // 最大显示链接数
    badgeStyle?: 'subtle' | 'hover' | 'explicit' | 'none';
    overlapStrategy?: 'longest' | 'first' | 'all';
  };
  onEntityClick?: (entity: EntityInfo) => void;
  className?: string;
}

interface EntityInfo {
  text: string;
  type: 'product' | 'brand' | 'service' | 'category';
  startPosition: number;
  endPosition: number;
  confidence: number;
  category?: string;
  brand?: string;
  affiliateUrl?: string;
  trackingId?: string;
}
```

**渲染逻辑**：
```
1. 构建实体 URL 映射
2. 按置信度和 URL 可用性过滤实体
3. 按位置排序
4. 限制到 maxLinks
5. 应用重叠策略
6. 构建 React 片段（文本 + 链接）
```

### AdManager (Universal SDK)

**位置**: `frontend-sdk/src/universal/managers/ad-manager.ts`

**用途**: 框架无关的广告管理

```typescript
class AdManager {
  constructor(config: AdManagerConfig);

  async requestAds(context: RequestContext): Promise<AdResponse>;

  getSlotState(slotId: string): AdSlotState | null;

  destroy(): void;
}

interface AdManagerConfig {
  apiBaseUrl: string;
  apiKey: string;
  slots: AdSlotConfig[];
  autoCollectClientInfo?: boolean;  // 默认: true
}
```

### DOMRenderer (Universal SDK)

**位置**: `frontend-sdk/src/universal/renderers/dom-renderer.ts`

**用途**: 将增强内容渲染到 DOM

```typescript
class DOMRenderer {
  static renderEnhancedContent(
    adData: EntityLinkAdContent,
    container: HTMLElement,
    options?: {
      badgeStyle?: BadgeStyle;
      onClick?: (entity: EntityInfo) => void;
      className?: string;
    }
  ): HTMLElement;

  static destroy(container: HTMLElement): void;
}
```

**DOM 结构**：
```html
<div class="enhanced-content">
  我推荐
  <a href="https://amazon.cn/dp/..." class="entity-link" data-entity-id="sony-xm5">
    Sony WH-1000XM5
    <span class="entity-badge">†</span>
  </a>
  降噪效果出色...
</div>
```

---

## 配置参考

### 徽章样式

| 样式 | 视觉 | HTML | 最适合 |
|-------|--------|------|--------|
| `subtle` | 产品† | `<span>†</span>` | 默认，最不突兀 |
| `hover` | 产品 ▶ | `<span class="hover-only">▶</span>` | 交互感 |
| `explicit` | 产品 [广告] | `<span class="ad-badge">[广告]</span>` | 合规要求 |
| `none` | 产品 | 无指示器 | 完全原生体验 |

**自定义样式**：
```css
/* Subtle 徽章 */
.entity-badge.subtle {
  color: #9CA3AF;
  font-size: 12px;
  margin-left: 2px;
}

/* Hover 徽章 */
.entity-badge.hover {
  opacity: 0;
  transition: opacity 0.2s;
}
.entity-link:hover .entity-badge.hover {
  opacity: 1;
}

/* Explicit 徽章 */
.entity-badge.explicit {
  background: #FCD34D;
  color: #92400E;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 600;
}
```

### 链接密度配置

```typescript
// 推荐设置
{
  preferences: {
    maxLinks: 3,  // 参与度的最佳平衡点
    minConfidence: 0.7,
  }
}

// 高密度（长内容）
{
  preferences: {
    maxLinks: 5,
  }
}

// 低密度（最少）
{
  preferences: {
    maxLinks: 1,
  }
}
```

### 重叠策略

```typescript
// 示例: "Sony WH-1000XM5" vs "Sony"
// 重叠实体在位置 10-25 和 10-14

// 策略: 'longest'（默认）
// 结果: 只链接 "Sony WH-1000XM5"
overlapStrategy: 'longest'

// 策略: 'first'
// 结果: 只链接第一个找到的实体
overlapStrategy: 'first'

// 策略: 'all'
// 结果: 两个实体都链接（嵌套: Sony WH-1000XM5 > Sony）
overlapStrategy: 'all'
```

---

## 最佳实践

### 1. 内容选择

**最适合实体链接的内容**：
- ✅ 产品推荐
- ✅ 对比文章
- ✅ 评测
- ✅ "最佳"榜单
- ✅ 带产品提及的教程

**避免**：
- ❌ 新闻文章（编辑考虑）
- ❌ 非常短的内容（< 50 字）
- ❌ 没有产品提及的内容

### 2. 链接密度

```typescript
// 推荐: 每个响应 2-5 个链接
maxLinks: 3  // 参与度的最佳平衡点

// 太少:
maxLinks: 1  // 错过变现机会

// 太多:
maxLinks: 10  // 垃圾感，影响用户体验
```

### 3. 徽章样式选择

```typescript
// 通用使用
badgeStyle: 'subtle'  // † 符号，最不突兀

// 合规要求的市场
badgeStyle: 'explicit'  // [广告] 徽章

// 现代、交互感
badgeStyle: 'hover'  // 悬停时显示图标

// 完全原生体验
badgeStyle: 'none'  // 无指示器
```

### 4. 点击处理

```typescript
// 最佳实践: 追踪 + 用户选择
onEntityClick={(entity) => {
  // 1. 追踪分析
  analytics.track('entity_link_clicked', {
    entity: entity.text,
    brand: entity.brand,
    category: entity.category,
    trackingId: entity.trackingId,
    url: entity.affiliateUrl,
  });

  // 2. 让用户决定（可选）
  // window.open(entity.affiliateUrl, '_blank');

  // 3. 或在应用内处理导航
  // router.push(`/product/${entity.trackingId}`);
}}
```

### 5. 错误处理

```tsx
// 优雅降级
function MessageWithEntityLink({ message, slots }) {
  const entityLinkAd = slots['entity-links']?.ads?.[0];

  // 没有广告? 显示原始内容
  if (!entityLinkAd) {
    return <div className="message">{message.content}</div>;
  }

  // 广告错误? 降级方案
  try {
    return (
      <div className="message">
        <div>{message.content}</div>
        <EnhancedContent
          content={message.content}
          enhancements={getEnhancements(entityLinkAd)}
        />
      </div>
    );
  } catch (error) {
    console.error('实体链接渲染错误:', error);
    return <div className="message">{message.content}</div>;
  }
}
```

---

## 性能优化

### 前端优化

#### 1. 懒加载渲染

```tsx
// 只在可见时渲染
import { useInView } from 'react-intersection-observer';

function EntityLinkSection({ ad }) {
  const { ref, inView } = useInView({ triggerOnce: true });

  return (
    <div ref={ref}>
      {inView && <EnhancedContent content={ad.content} />}
    </div>
  );
}
```

#### 2. 记忆化

```tsx
import { useMemo } from 'react';

function EnhancedContentWrapper({ content, enhancements }) {
  const processedContent = useMemo(() => {
    return processEnhancedContent(content, enhancements);
  }, [content, enhancements]);

  return <div>{processedContent}</div>;
}
```

#### 3. 代码分割

```tsx
// 懒加载 EnhancedContent
import { lazy, Suspense } from 'react';

const EnhancedContent = lazy(() =>
  import('@ai-ad-network/frontend-sdk')
    .then(m => ({ default: m.EnhancedContent }))
);

function MessageWithAds({ message }) {
  return (
    <Suspense fallback={<div>加载中...</div>}>
      <EnhancedContent content={message.content} enhancements={...} />
    </Suspense>
  );
}
```

#### 4. 防抖请求

```typescript
import { debounce } from 'lodash-es';

const debouncedRequestAds = debounce(requestAds, 1000);

// 使用
debouncedRequestAds({ conversationContext, userContext });
```

#### 5. 缓存广告响应

```typescript
const adCache = useRef(new Map());

const requestAdsWithCache = async (context) => {
  const cacheKey = JSON.stringify(context);

  // 检查缓存
  if (adCache.current.has(cacheKey)) {
    return adCache.current.get(cacheKey);
  }

  // 获取并缓存
  const result = await requestAds(context);
  adCache.current.set(cacheKey, result);

  // 限制缓存大小
  if (adCache.current.size > 100) {
    const firstKey = adCache.current.keys().next().value;
    adCache.current.delete(firstKey);
  }

  return result;
};
```

---

## 错误处理

### 常见错误

#### 1. 没有返回实体

```typescript
// 不是错误 - 只是没有实体
const entityLinkAd = slots['entity-links']?.ads?.[0];

if (!entityLinkAd) {
  // 内容没有可识别的产品/品牌
  // 这是正常行为
  return <OriginalContent content={content} />;
}
```

#### 2. 无效实体数据

```tsx
function validateEntityLinkAd(ad: KoahAd): boolean {
  if (!ad.content?.entity_link_content) {
    console.warn('缺少 entity_link_content', ad);
    return false;
  }

  const { entities, replacements } = ad.content.entity_link_content;

  if (!entities || !Array.isArray(entities) || entities.length === 0) {
    console.warn('没有找到实体', ad);
    return false;
  }

  if (!replacements || !Array.isArray(replacements) || replacements.length === 0) {
    console.warn('没有找到替换', ad);
    return false;
  }

  return true;
}

// 使用
if (!validateEntityLinkAd(entityLinkAd)) {
  return <OriginalContent content={content} />;
}
```

#### 3. 网络错误

```tsx
const { slots, requestAds, isLoading, error } = useAdSlots({...});

if (error) {
  // 优雅处理 - 显示原始内容
  console.error('广告请求失败:', error);
  // 不要阻塞用户体验
}

return (
  <div>
    {error && <div className="ad-error">广告暂时不可用</div>}
    <OriginalContent />
  </div>
);
```

---

## 测试指南

### 单元测试

```tsx
// frontend-sdk/src/components/__tests__/EnhancedContent.test.tsx

describe('EnhancedContent', () => {
  it('应该正确渲染实体链接', () => {
    const { getByText } = render(
      <EnhancedContent
        content="购买 Sony WH-1000XM5"
        enhancements={{
          entities: [{
            text: 'Sony WH-1000XM5',
            type: 'product',
            startPosition: 4,
            endPosition: 19,
            confidence: 0.95,
            affiliateUrl: 'https://amazon.cn/...',
          }],
          replacements: [{
            originalText: 'Sony WH-1000XM5',
            affiliateUrl: 'https://amazon.cn/...',
          }],
        }}
      />
    );

    const link = getByText('Sony WH-1000XM5');
    expect(link.closest('a')).toHaveAttribute('href', 'https://amazon.cn/...');
  });

  it('点击链接时应调用 onEntityClick', async () => {
    const handleClick = jest.fn();
    const { getByText } = render(
      <EnhancedContent
        content="Sony WH-1000XM5"
        enhancements={enhancements}
        onEntityClick={handleClick}
      />
    );

    await fireEvent.click(getByText('Sony WH-1000XM5'));
    expect(handleClick).toHaveBeenCalledWith(
      expect.objectContaining({ text: 'Sony WH-1000XM5' })
    );
  });

  it('应该处理空实体', () => {
    const { container } = render(
      <EnhancedContent
        content="这里没有产品"
        enhancements={{
          entities: [],
          replacements: [],
        }}
      />
    );

    expect(container.textContent).toBe('这里没有产品');
  });
});
```

### 集成测试

```tsx
describe('Entity Link Integration', () => {
  it('应该请求并渲染实体链接广告', async () => {
    const { result } = renderHook(() => useAdSlots({
      slots: [{
        slotId: 'entity-links',
        format: 'entity_link',
      }],
    }));

    // 请求广告
    await act(async () => {
      await result.current.requestAds({
        conversationContext: {
          query: '推荐耳机',
          response: '我推荐 Sony WH-1000XM5',
        },
      });
    });

    // 验证收到广告
    expect(result.current.slots['entity-links']?.ads).toHaveLength(1);

    // 渲染广告
    const { getByText } = render(
      <EnhancedContent
        content="我推荐 Sony WH-1000XM5"
        enhancements={getEnhancements(result.current.slots['entity-links'].ads[0])}
      />
    );

    expect(getByText('Sony WH-1000XM5')).toBeInTheDocument();
  });
});
```

---

## 指标与分析

### 追踪这些指标

| 指标 | 描述 | 目标 |
|------|-------------|--------|
| **实体识别率** | 找到实体的内容百分比 | 60-80% |
| **匹配率** | 实体匹配产品的百分比 | 70-90% |
| **链接点击率** | 实体链接被点击的百分比 | 2-5% |
| **处理时间** | 增强内容的时间 | <3秒 |

### 分析集成

```tsx
onEntityClick={(entity) => {
  // 发送到多个分析平台
  analytics.track('entity_link_clicked', {
    entity: entity.text,
    brand: entity.brand,
    category: entity.category,
    trackingId: entity.trackingId,
    url: entity.affiliateUrl,
    position: entity.startPosition,
    confidence: entity.confidence,
  });

  // Google Analytics
  gtag('event', 'click', {
    event_category: 'entity_link',
    event_label: entity.text,
    value: 1,
  });

  // Facebook Pixel
  fbq('trackCustom', 'EntityLinkClick', {
    content_name: entity.text,
    content_category: entity.category,
  });
}}
```

---

## 相关文档

- **[快速入门](./ENTITY_LINK_快速入门.md)** - 5分钟快速接入
- **[API 文档](../API_DOCUMENTATION.md)** - 完整 API 参考
- **[示例代码](../../demo-app/src/App.tsx)** - 完整工作示例
- **[前端 SDK 文档](../../frontend-sdk/README.md)** - SDK 文档

---

## 获取帮助

- 📧 技术支持: support@ai-ad-network.com
- 📖 在线文档: https://docs.ai-ad-network.com
- 💬 GitHub: https://github.com/ai-ad-network/discussions

---

**SDK 版本**: 1.0.7
**文档版本**: 2.0.0
**最后更新**: 2026-01-27
