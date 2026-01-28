# Entity Link 实体链接 - 快速入门

> **⚡ 5分钟完成接入** - AI驱动的原生广告格式

---

## 📋 什么是 Entity Link？

Entity Link 是一种**原生广告格式**，能够智能识别 AI 生成内容中的产品/品牌，并自动将其转换为联盟链接。

### 核心特点

- ✅ **非侵入式** - 链接自然融入内容，不影响用户体验
- ✅ **智能识别** - AI 自动识别产品、品牌、服务
- ✅ **自动匹配** - 自动匹配联盟产品数据库
- ✅ **多框架支持** - React、Vue、Angular、原生 JS 均可接入
- ✅ **完整追踪** - 自动追踪点击和展示数据

### 示例效果

**原文**：
```
我推荐 Sony WH-1000XM5 降噪耳机，音质出色。
```

**增强后**：
```
我推荐 Sony WH-1000XM5† 降噪耳机，音质出色。
```

"Sony WH-1000XM5" 现在是一个可点击的联盟链接！

---

## 🚀 React 快速接入

### 第 1 步：安装 SDK

```bash
npm install @ai-ad-network/frontend-sdk
# 或
yarn add @ai-ad-network/frontend-sdk
# 或
pnpm add @ai-ad-network/frontend-sdk
```

### 第 2 步：配置 AdProvider

```tsx
// src/App.tsx
import { AdProvider } from '@ai-ad-network/frontend-sdk';

function App() {
  return (
    <AdProvider
      config={{
        apiBaseUrl: 'https://api.ai-ad-network.com/v1',  // 替换为实际的 API 地址
        apiKey: 'ak_your_tenant_your_key',                // 您的 API Key
        debug: process.env.NODE_ENV === 'development',
      }}
    >
      <YourChatApp />
    </AdProvider>
  );
}
```

### 第 3 步：配置广告位

```tsx
// src/components/ChatApp.tsx
import { useAdSlots } from '@ai-ad-network/frontend-sdk';

function ChatApp() {
  const { slots, requestAds } = useAdSlots({
    slots: [
      {
        slotId: 'entity-links',
        slotName: '实体链接增强',
        format: 'entity_link',           // ← Entity Link 格式
        variant: 'subtle',               // 徽章样式
        size: { width: 0, height: 0 },
        count: 1,
        preferences: {
          maxLinks: 5,                    // 最多添加 5 个链接
          badgeStyle: 'subtle',          // 徽章样式
        },
        placement: {
          position: 'inline',
          context: 'AI 回复中的实体链接',
        },
      },
    ],
  });

  return (
    // ... 您的聊天 UI
  );
}
```

### 第 4 步：请求广告

```tsx
const handleSendMessage = async (userMessage: string) => {
  // 1. 发送用户消息到您的后端或 AI
  const aiResponse = await fetchYourAIChatAPI(userMessage);
  const responseText = aiResponse.content;

  // 2. 请求 Entity Link 广告
  await requestAds({
    conversationContext: {
      query: userMessage,
      response: responseText,
    },
    userContext: {
      sessionId: 'session-123',  // 您的会话 ID
    },
  });
};
```

### 第 5 步：渲染广告

```tsx
import { EnhancedContent } from '@ai-ad-network/frontend-sdk';

function MessageWithAds({ message }) {
  const entityLinkAd = slots['entity-links']?.ads?.[0];

  return (
    <div className="message">
      <div className="message-content">
        {message.content}
      </div>

      {/* Entity Link 广告 */}
      {entityLinkAd && (
        <div className="entity-link-section">
          <EnhancedContent
            content={message.content}  // ← 传入原始文本
            enhancements={{
              entities: entityLinkAd.content.entity_link_content.entities,
              replacements: entityLinkAd.content.entity_link_content.replacements,
              maxLinks: 5,
              badgeStyle: 'subtle',
            }}
            onEntityClick={(entity) => {
              console.log('用户点击了产品:', entity);
              // 您的自定义处理逻辑
            }}
          />
        </div>
      )}
    </div>
  );
}
```

---

## 🌐 其他框架接入

### Vue 3

```vue
<script setup>
import { onMounted, ref } from 'vue';
import { AdManager, DOMRenderer } from '@ai-ad-network/frontend-sdk/universal';

const entityLinkContainer = ref(null);
const entityLinkAd = ref(null);

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

  entityLinkAd.value = result.slots[0]?.ad;

  if (entityLinkAd.value && entityLinkContainer.value) {
    DOMRenderer.renderEnhancedContent(
      entityLinkAd.value.content.entity_link_content,
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

### Angular

```typescript
import { AdManager, DOMRenderer } from '@ai-ad-network/frontend-sdk/universal';

@Component({
  selector: 'app-chat',
  template: `
    <div #entityLinkContainer class="entity-link-section"></div>
  `,
})
export class ChatComponent implements OnInit {
  @ViewChild('entityLinkContainer') entityLinkContainer!: ElementRef;

  private adManager = new AdManager({
    apiBaseUrl: 'https://api.ai-ad-network.com/v1',
    apiKey: 'ak_your_tenant_your_key',
    slots: [{ slotId: 'entity-links', format: 'entity_link' }],
  });

  async ngOnInit() {
    const result = await this.adManager.requestAds({
      conversationContext: { query: '...', response: '...' },
    });

    const entityLinkAd = result.slots[0]?.ad;
    if (entityLinkAd) {
      DOMRenderer.renderEnhancedContent(
        entityLinkAd.content.entity_link_content,
        this.entityLinkContainer.nativeElement,
        { badgeStyle: 'subtle' }
      );
    }
  }
}
```

### 原生 JavaScript

```html
<script src="https://cdn.example.com/ai-ad-network-universal.iife.js"></script>

<script>
  const adManager = new window.AiAdNetwork.AdManager({
    apiBaseUrl: 'https://api.ai-ad-network.com/v1',
    apiKey: 'ak_your_tenant_your_key',
    slots: [{ slotId: 'entity-links', format: 'entity_link' }],
  });

  adManager.requestAds({
    conversationContext: {
      query: '推荐好的耳机',
      response: '我推荐 Sony WH-1000XM5 降噪耳机...',
    },
  }).then(result => {
    const entityLinkAd = result.slots[0]?.ad;

    if (entityLinkAd) {
      window.AiAdNetwork.DOMRenderer.renderEnhancedContent(
        entityLinkAd.content.entity_link_content,
        document.getElementById('entity-link-container'),
        {
          badgeStyle: 'subtle',
          onClick: (entity) => console.log('点击产品:', entity),
        }
      );
    }
  });
</script>
```

---

## 📦 数据结构

### 请求配置

```typescript
{
  slotId: 'entity-links',
  format: 'entity_link',
  variant: 'subtle',
  size: { width: 0, height: 0 },
  count: 1,
  preferences: {
    maxLinks: 5,
    badgeStyle: 'subtle',
  },
}
```

### 响应数据

```typescript
{
  id: "entity_link_abc123",
  type: "entity_link",
  content: {
    entity_link_content: {
      originalText: "我推荐 Sony WH-1000XM5",
      processedText: "我推荐 Sony WH-1000XM5†",
      entities: [
        {
          text: "Sony WH-1000XM5",
          type: "product",
          startPosition: 4,
          endPosition: 19,
          confidence: 0.95,
          category: "audio",
          brand: "Sony"
        }
      ],
      replacements: [
        {
          originalText: "Sony WH-1000XM5",
          affiliateUrl: "https://amazon.cn/dp/B09XS7JWHH?tag=your-tag",
          trackingId: "entity_sony_xm5",
          affiliateNetwork: "amazon"
        }
      ],
      metadata: {
        processingTime: 234,
        entityCount: 1,
        linkCount: 1,
        avgConfidence: 0.95
      }
    }
  }
}
```

---

## 🎨 配置选项

### 徽章样式 (badgeStyle)

| 值 | 效果 | 使用场景 |
|-----|------|---------|
| `subtle` | 产品† | 默认推荐，最不突兀 |
| `hover` | 产品 ▶ | 悬停时显示图标 |
| `explicit` | 产品 [广告] | 合规要求明确标识 |
| `none` | 产品 | 完全原生体验 |

### 链接数量 (maxLinks)

```typescript
maxLinks: 3  // 推荐 2-5 个，避免过度营销
```

| 链接数 | 效果 | 建议 |
|-------|------|------|
| 1-2 | 较少 | 内容较短时 |
| 3-5 | 适中 | **推荐** |
| 6-10 | 较多 | 长内容，注意用户体验 |

---

## ✅ 接入检查清单

### 必需步骤

- [ ] 安装 `@ai-ad-network/frontend-sdk` 包
- [ ] 使用 `AdProvider` 包裹应用根组件
- [ ] 配置 API 地址和 API Key
- [ ] 在广告位配置中添加 `entity_link` 格式
- [ ] 调用 `requestAds` 请求广告
- [ ] 使用 `EnhancedContent` 组件渲染

### 可选步骤

- [ ] 配置自定义 `badgeStyle`
- [ ] 实现 `onEntityClick` 回调
- [ ] 添加自定义样式
- [ ] 配置分析追踪

---

## 🐛 常见问题

### Q: 为什么没有返回 Entity Link 广告？

**A:** 可能的原因：
1. ✅ 内容中没有可识别的产品/品牌
2. ✅ 产品数据库中没有匹配的产品
3. ✅ API Key 配置错误
4. ✅ 网络请求失败

**检查方法**：
```typescript
console.log('Entity Link 广告:', slots['entity-links']);
console.log('所有广告位:', slots);
```

### Q: 链接没有渲染出来？

**A:** 检查：
1. ✅ `entities` 和 `replacements` 数组有数据
2. ✅ `EnhancedContent` 组件接收了正确的 props
3. ✅ 没有控制台错误

### Q: 可以控制添加哪些链接吗？

**A:** 可以！通过以下方式：
- 调整 `maxLinks` 限制链接数量
- 提高识别准确度
- 选择合适的 `badgeStyle` 平衡用户体验

---

## 📚 相关文档

- **[完整技术文档](./ENTITY_LINK_技术文档.md)** - 详细技术指南
- **[API 文档](../API_DOCUMENTATION.md)** - 完整 API 参考
- **[示例代码](../../demo-app/src/App.tsx)** - 完整工作示例

---

## 🆘 获取帮助

- 📧 技术支持: support@ai-ad-network.com
- 📖 在线文档: https://docs.ai-ad-network.com
- 💬 GitHub: https://github.com/ai-ad-network/discussions

---

**SDK 版本**: 1.0.7
**文档版本**: 2.0.0
**最后更新**: 2026-01-27
