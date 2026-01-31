# AI Ad Network SDK - 快速接入指南

> 文档版本: v1.1.0
> 最后更新: 2026-01-30
> 目标读者: 接入方开发者

---

## 目录

1. [30 秒快速开始](#30-秒快速开始)
2. [React 接入](#react-接入)
3. [Vue 接入](#vue-接入)
4. [Angular 接入](#angular-接入)
5. [常见问题](#常见问题)

---

## 30 秒快速开始

### React

```bash
npm install @ai-ad-network/frontend-sdk
```

```tsx
import { AdProvider, useAiAds, ActionCardAd } from '@ai-ad-network/frontend-sdk';

function App() {
  return (
    <AdProvider config={{ apiBaseUrl: '/api/v1' }}>
      <ChatApp />
    </AdProvider>
  );
}

function ChatApp() {
  const [query, setQuery] = useState('best headphones');
  const [response, setResponse] = useState('Here are some options...');
  const [isFinished, setIsFinished] = useState(true);

  const { ads } = useAiAds(query, response, isFinished, {
    formats: ['action_card'],
  });

  return (
    <div>
      {ads.map(ad => (
        <ActionCardAd key={ad.id} ad={ad} slotId="banner" variant="horizontal" />
      ))}
    </div>
  );
}
```

### Vue / Angular / Vanilla JS

```bash
npm install @ai-ad-network/frontend-sdk
```

```javascript
import { AdManager } from '@ai-ad-network/frontend-sdk/universal';

const adManager = new AdManager({
  apiBaseUrl: '/api/ads',
  slots: [{ slotId: 'banner', format: 'action_card', position: 'top', adTypes: ['action-card'] }]
});

await adManager.requestAds({
  conversationContext: { topic: 'best headphones', messages: [] }
});

adManager.renderTo('banner', document.getElementById('ad-container'), {
  variant: 'horizontal'
});
```

---

## React 接入

### 步骤 1: 安装

```bash
npm install @ai-ad-network/frontend-sdk
```

### 步骤 2: 配置 Provider

```tsx
import { AdProvider } from '@ai-ad-network/frontend-sdk';

function RootApp() {
  return (
    <AdProvider config={{ apiBaseUrl: '/api/v1' }}>
      <YourApp />
    </AdProvider>
  );
}
```

### 步骤 3: 使用广告

```tsx
import { useAiAds, ActionCardAd, SuffixAd } from '@ai-ad-network/frontend-sdk';

function ChatComponent() {
  const [query, setQuery] = useState('用户问题');
  const [response, setResponse] = useState('AI 回答');
  const [isStreamFinished, setIsStreamFinished] = useState(false);

  // 请求广告
  const { ads, isLoading } = useAiAds(query, response, isStreamFinished, {
    formats: ['action_card', 'suffix'],
  });

  return (
    <div>
      {/* Banner 广告 */}
      {ads.map(ad => (
        <ActionCardAd
          key={ad.id}
          ad={ad}
          slotId="banner-top"
          variant="horizontal"
        />
      ))}

      {/* Suffix 广告 */}
      {ads.map(ad => (
        <SuffixAd
          key={ad.id}
          ad={ad}
          slotId="chat-suffix"
          variant="block"
        />
      ))}
    </div>
  );
}
```

**就这么简单！** 分析追踪会自动处理。

---

## Vue 接入

### 步骤 1: 安装

```bash
npm install @ai-ad-network/frontend-sdk
```

### 步骤 2: 使用 AdManager

```vue
<template>
  <div>
    <div ref="bannerContainer"></div>
    <div ref="suffixContainer"></div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { AdManager } from '@ai-ad-network/frontend-sdk/universal';

const bannerContainer = ref(null);
const suffixContainer = ref(null);

onMounted(async () => {
  // 1. 创建 AdManager
  const adManager = new AdManager({
    apiBaseUrl: '/api/ads',
    slots: [
      { slotId: 'banner', format: 'action_card', position: 'top', adTypes: ['action-card'] },
      { slotId: 'suffix', format: 'suffix', position: 'bottom', adTypes: ['suffix'] },
    ]
  });

  // 2. 请求广告
  await adManager.requestAds({
    conversationContext: {
      topic: '用户话题',
      messages: []
    }
  });

  // 3. 简化渲染
  adManager.renderTo('banner', bannerContainer.value, { variant: 'horizontal' });
  adManager.renderTo('suffix', suffixContainer.value, { variant: 'block' });
});
</script>
```

---

## Angular 接入

### 步骤 1: 安装

```bash
npm install @ai-ad-network/frontend-sdk
```

### 步骤 2: 创建服务

```typescript
// ad.service.ts
import { Injectable } from '@angular/core';
import { AdManager } from '@ai-ad-network/frontend-sdk/universal';

@Injectable({ providedIn: 'root' })
export class AdService {
  private adManager: AdManager;

  constructor() {
    this.adManager = new AdManager({
      apiBaseUrl: '/api/ads',
      slots: [
        { slotId: 'banner', format: 'action_card', position: 'top', adTypes: ['action-card'] }
      ]
    });
  }

  async requestAds(topic: string) {
    await this.adManager.requestAds({
      conversationContext: { topic, messages: [] }
    });
  }

  renderBanner(container: HTMLElement) {
    this.adManager.renderTo('banner', container, { variant: 'horizontal' });
  }
}
```

### 步骤 3: 在组件中使用

```typescript
import { Component, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { AdService } from './ad.service';

@Component({
  selector: 'app-banner',
  template: '<div #bannerContainer></div>'
})
export class BannerComponent implements AfterViewInit {
  @ViewChild('bannerContainer') bannerContainer!: ElementRef;

  constructor(private adService: AdService) {}

  async ngAfterViewInit() {
    await this.adService.requestAds('best headphones');
    this.adService.renderBanner(this.bannerContainer.nativeElement);
  }
}
```

---

## 可用组件速查

### React 组件

| 组件 | 用途 | 变体 |
|------|------|------|
| `ActionCardAd` | 产品卡片 | horizontal, vertical, compact |
| `SuffixAd` | 后缀广告 | block, inline, minimal |
| `SponsoredSourceAd` | 赞助来源 | card, list-item, minimal |

### Universal 渲染

| 格式 | format 值 | variant |
|------|----------|---------|
| 产品卡片 | action_card | horizontal, vertical, compact |
| 后缀广告 | suffix | block, inline, minimal |
| 赞助来源 | source | card, list-item, minimal |

---

## 配置说明

### AdProvider 配置

```tsx
<AdProvider config={{
  apiBaseUrl: '/api/v1',      // API 基础路径
  apiKey: 'your-api-key',     // 可选：API Key
  debug: true,                // 可选：调试模式
}}>
```

### AdManager 配置

```javascript
const adManager = new AdManager({
  apiBaseUrl: '/api/ads',     // API 基础路径
  apiKey: 'your-api-key',     // 可选：API Key
  slots: [                    // 广告位配置
    {
      slotId: 'banner',       // 广告位 ID
      format: 'action_card',  // 格式
      position: 'top',        // 位置
      adTypes: ['action-card'] // 广告类型
    }
  ],
  debug: true                 // 可选：调试模式
});
```

---

## 常见问题

### Q: 广告不显示？

**检查清单：**
1. 确认 API 地址配置正确
2. 确认 `isStreamFinished = true`（React）
3. 确认 `await requestAds()` 完成（Universal）
4. 检查浏览器控制台是否有错误

### Q: 分析追踪不工作？

**检查清单：**
1. React: 确认使用简化组件（`ActionCardAd` 不是 `ActionCardAdV2`）
2. Universal: 确认使用 `renderTo()` 不是手动渲染
3. 检查网络请求是否发送成功

### Q: 如何只在流结束后请求广告？

**React:**
```tsx
const { ads } = useAiAds(query, response, isStreamFinished);
// 只有 isStreamFinished = true 时才会请求
```

**Universal:**
```javascript
// 只有在流结束后才调用
if (isStreamFinished) {
  await adManager.requestAds({...});
}
```

### Q: 如何调试？

**React:**
```tsx
<AdProvider config={{ apiBaseUrl: '/api/v1', debug: true }}>
```

**Universal:**
```javascript
const adManager = new AdManager({
  apiBaseUrl: '/api/ads',
  debug: true
});
```

---

## 下一步

- 详细参数说明：查看 [COMPLETE_GUIDE.md](./COMPLETE_GUIDE.md)
- 完整示例：查看 SDK 仓库 examples 目录
- API 参考：查看 [UNIVERSAL_SDK_GUIDE.md](../docs/UNIVERSAL_SDK_GUIDE.md)

---

**需要帮助？**
- 📧 Email: support@ai-ad-network.com
- 📖 Docs: https://docs.ai-ad-network.com
- 🐛 Issues: https://github.com/ai-ad-network/frontend-sdk/issues
