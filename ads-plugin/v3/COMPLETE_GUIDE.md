# AI Ad Network SDK - 完整使用指南

> 文档版本: v1.1.0
> 最后更新: 2026-01-30
> 目标读者: 接入方开发者

---

## 目录

1. [概述](#概述)
2. [React SDK 完整指南](#react-sdk-完整指南)
3. [Universal SDK 完整指南](#universal-sdk-完整指南)
4. [API 参考](#api-参考)
5. [高级用法](#高级用法)
6. [最佳实践](#最佳实践)

---

## 概述

AI Ad Network SDK 提供两种集成方式：

| SDK | 适用场景 | 特点 |
|-----|---------|------|
| **React SDK** | React 项目 | 组件化，Hooks 自动管理 |
| **Universal SDK** | Vue/Angular/Vanilla JS | 框架无关，类 API |

### 新功能：简化 API (v1.1.0+)

从 v1.1.0 开始，两种 SDK 都支持简化 API：

**React SDK:**
```tsx
// ✅ 只需 3 个参数
<ActionCardAd ad={ad} slotId="banner" variant="horizontal" />
```

**Universal SDK:**
```javascript
// ✅ 一行代码
adManager.renderTo('banner', container, { variant: 'horizontal' });
```

---

## React SDK 完整指南

### 安装

```bash
npm install @ai-ad-network/frontend-sdk
```

### 1. AdProvider 配置

AdProvider 是所有广告组件的上下文提供者，必须放在应用的最外层。

```tsx
import { AdProvider } from '@ai-ad-network/frontend-sdk';

function App() {
  return (
    <AdProvider config={{
      apiBaseUrl: '/api/v1',        // 必需：API 基础路径
      apiKey: 'your-api-key',       // 可选：API Key
      debug: process.env.NODE_ENV === 'development', // 可选：调试模式
    }}>
      <YourApp />
    </AdProvider>
  );
}
```

**配置参数：**

| 参数 | 类型 | 必需 | 默认值 | 说明 |
|------|------|------|--------|------|
| `apiBaseUrl` | `string` | ✅ | - | API 基础路径 |
| `apiKey` | `string` | ❌ | - | API 密钥 |
| `debug` | `boolean` | ❌ | `false` | 是否启用调试日志 |

### 2. useAiAds Hook

`useAiAds` 是获取广告数据的核心 Hook。

```tsx
import { useAiAds } from '@ai-ad-network/frontend-sdk';

function ChatComponent() {
  const [query, setQuery] = useState('用户问题');
  const [response, setResponse] = useState('AI 回答');
  const [isFinished, setIsFinished] = useState(false);

  const {
    ads,           // 广告数据数组
    intent,         // 意图分析结果
    routing,        // 路由信息
    isLoading,      // 加载状态
    error,          // 错误信息
    refetch,        // 手动重新获取
  } = useAiAds(query, response, isFinished, {
    enabled: true,                    // 是否启用
    formats: ['action_card', 'suffix'], // 广告格式
    placement: 'post_response',       // 放置位置
    apiBaseUrl: '/api/v1',            // 可选：覆盖默认 API 地址
    apiKey: 'your-api-key',           // 可选：覆盖默认 API Key
  });

  return (
    <div>
      {isLoading && <div>加载中...</div>}
      {error && <div>错误: {error.message}</div>}
      {ads.map(ad => <ActionCardAd key={ad.id} ad={ad} slotId="banner" />)}
    </div>
  );
}
```

**参数说明：**

| 参数 | 类型 | 必需 | 默认值 | 说明 |
|------|------|------|--------|------|
| `query` | `string` | ✅ | - | 用户查询/问题 |
| `response` | `string` | ✅ | - | AI 回复内容 |
| `isStreamFinished` | `boolean` | ✅ | - | 流是否结束 |
| `options` | `object` | ❌ | - | 配置选项 |

**options 参数：**

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `enabled` | `boolean` | `true` | 是否启用 |
| `formats` | `string[]` | `['action_card', 'suffix']` | 广告格式 |
| `placement` | `string` | `'post_response'` | 放置位置 |
| `apiBaseUrl` | `string` | - | 覆盖 API 地址 |
| `apiKey` | `string` | - | 覆盖 API Key |

**返回值：**

| 字段 | 类型 | 说明 |
|------|------|------|
| `ads` | `KoahAd[]` | 广告数据数组 |
| `intent` | `IntentResult \| null` | 意图分析结果 |
| `routing` | `RoutingInfo \| null` | 路由信息 |
| `isLoading` | `boolean` | 加载状态 |
| `error` | `Error \| null` | 错误信息 |
| `refetch` | `function` | 重新获取函数 |

### 3. 广告组件

#### ActionCardAd - 产品卡片

```tsx
import { ActionCardAd } from '@ai-ad-network/frontend-sdk';

<ActionCardAd
  ad={ad}                    // 必需：广告数据
  slotId="banner-top"        // 必需：广告位 ID
  variant="horizontal"       // 可选：变体 (horizontal | vertical | compact)
  className="custom-class"   // 可选：自定义类名
  isLoading={false}          // 可选：加载状态
  onClick={() => {           // 可选：点击回调
    console.log('点击广告');
  }}
  onImpression={() => {      // 可选：展示回调
    console.log('广告展示');
  }}
/>
```

**变体说明：**

| 变体 | 说明 | 适用场景 |
|------|------|---------|
| `horizontal` | 横向布局 | Banner、顶部 |
| `vertical` | 纵向布局 | 侧边栏 |
| `compact` | 紧凑布局 | 内联 |

#### SuffixAd - 后缀广告

```tsx
import { SuffixAd } from '@ai-ad-network/frontend-sdk';

<SuffixAd
  ad={ad}                    // 必需：广告数据
  slotId="chat-suffix"       // 必需：广告位 ID
  variant="block"            // 可选：变体 (block | inline | minimal)
  aiContext={aiResponse}     // 可选：AI 上下文
  className="custom-class"   // 可选：自定义类名
  onClick={() => {}}
  onImpression={() => {}}
/>
```

**变体说明：**

| 变体 | 说明 | 适用场景 |
|------|------|---------|
| `block` | 块级布局 | 聊天结束后 |
| `inline` | 内联布局 | 文本中嵌入 |
| `minimal` | 极简布局 | 空间有限 |

#### SponsoredSourceAd - 赞助来源

```tsx
import { SponsoredSourceAd } from '@ai-ad-network/frontend-sdk';

<SponsoredSourceAd
  ad={ad}                    // 必需：广告数据
  slotId="citations"         // 必需：广告位 ID
  variant="card"             // 可选：变体 (card | list-item | minimal)
  className="custom-class"
  onClick={() => {}}
  onImpression={() => {}}
/>
```

**变体说明：**

| 变体 | 说明 | 适用场景 |
|------|------|---------|
| `card` | 卡片布局 | 来源列表 |
| `list-item` | 列表项 | 内联列表 |
| `minimal` | 极简布局 | 紧凑空间 |

### 4. 完整示例

```tsx
import { useState } from 'react';
import { useAiAds, ActionCardAd, SuffixAd, SponsoredSourceAd } from '@ai-ad-network/frontend-sdk';

function ChatApplication() {
  const [messages, setMessages] = useState([
    { role: 'user', content: '推荐一些好的耳机' },
    { role: 'assistant', content: '根据您的需求，我推荐以下几款...' }
  ]);

  const lastMessage = messages[messages.length - 1];
  const query = messages.find(m => m.role === 'user')?.content || '';
  const response = lastMessage?.content || '';
  const isFinished = true;

  const { ads, isLoading, error } = useAiAds(query, response, isFinished, {
    formats: ['action_card', 'suffix', 'source'],
    placement: 'post_response',
  });

  return (
    <div className="chat-container">
      {/* 消息列表 */}
      {messages.map((msg, i) => (
        <div key={i} className={`message ${msg.role}`}>
          {msg.content}
        </div>
      ))}

      {/* Banner 广告 */}
      {isLoading && <div>广告加载中...</div>}
      {error && <div>广告加载失败</div>}

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
          aiContext={response}
        />
      ))}

      {/* 赞助来源 */}
      {ads.map(ad => (
        <SponsoredSourceAd
          key={ad.id}
          ad={ad}
          slotId="citations"
          variant="card"
        />
      ))}
    </div>
  );
}
```

---

## Universal SDK 完整指南

### 安装

```bash
npm install @ai-ad-network/frontend-sdk
```

### 1. AdManager 类

AdManager 是 Universal SDK 的核心类。

```javascript
import { AdManager } from '@ai-ad-network/frontend-sdk/universal';

const adManager = new AdManager({
  apiBaseUrl: '/api/ads',        // 必需：API 基础路径
  apiKey: 'your-api-key',       // 可选：API Key
  slots: [                      // 必需：广告位配置
    {
      slotId: 'banner',         // 广告位 ID
      format: 'action_card',    // 格式
      position: 'top',          // 位置
      adTypes: ['action-card']  // 广告类型
    }
  ],
  enabled: true,                // 可选：是否启用
  debug: true,                  // 可选：调试模式
});
```

**配置参数：**

| 参数 | 类型 | 必需 | 默认值 | 说明 |
|------|------|------|--------|------|
| `apiBaseUrl` | `string` | ✅ | - | API 基础路径 |
| `apiKey` | `string` | ❌ | - | API 密钥 |
| `slots` | `AdSlotRequest[]` | ✅ | - | 广告位配置 |
| `enabled` | `boolean` | ❌ | `true` | 是否启用 |
| `debug` | `boolean` | ❌ | `false` | 调试模式 |

### 2. requestAds 方法

```javascript
const result = await adManager.requestAds({
  conversationContext: {
    query: '用户问题',
    response: 'AI 回答',
    // 或使用简化格式
    topic: '话题',
    messages: []
  },
  userContext: {
    sessionId: 'session-123',  // 可选
    userId: 'user-456',        // 可选
  }
});

// result 结构
// {
//   requestId: 'req-123',
//   slots: [
//     { slotId: 'banner', ads: [...], status: 'filled' }
//   ],
//   intent: {...},
//   routing: {...}
// }
```

**参数说明：**

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `conversationContext` | `object` | ✅ | 对话上下文 |
| `conversationContext.query` | `string` | ❌ | 用户查询 |
| `conversationContext.response` | `string` | ❌ | AI 回复 |
| `conversationContext.topic` | `string` | ❌ | 话题 |
| `conversationContext.messages` | `array` | ❌ | 消息历史 |
| `userContext` | `object` | ❌ | 用户上下文 |
| `userContext.sessionId` | `string` | ❌ | 会话 ID |
| `userContext.userId` | `string` | ❌ | 用户 ID |

### 3. renderTo 方法

```javascript
// 简化渲染 - 自动分析追踪
adManager.renderTo('banner', container, {
  variant: 'horizontal',       // 可选：变体
  onClick: (ad) => {           // 可选：点击回调
    console.log('点击:', ad.adapted.title);
  },
  onImpression: (ad) => {      // 可选：展示回调
    console.log('展示:', ad.adapted.title);
  },
  adIndex: 0,                  // 可选：广告索引（默认 0）
});
```

**参数说明：**

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `slotId` | `string` | ✅ | 广告位 ID |
| `container` | `HTMLElement \| string` | ✅ | 容器元素或 ID |
| `options` | `object` | ❌ | 渲染选项 |
| `options.variant` | `string` | ❌ | 视觉变体 |
| `options.onClick` | `function` | ❌ | 点击回调 |
| `options.onImpression` | `function` | ❌ | 展示回调 |
| `options.adIndex` | `number` | ❌ | 广告索引 |

### 4. renderAll 方法

```javascript
// 渲染 slot 中的所有广告
adManager.renderAll('banner', container, {
  onClick: (ad) => console.log('点击:', ad.adapted.title),
  onImpression: (ad) => console.log('展示:', ad.adapted.title),
});
```

### 5. 事件监听

```javascript
// 监听广告更新
adManager.on('adsUpdated', (slots) => {
  console.log('广告已更新:', slots);
});

// 监听加载状态
adManager.on('adsLoading', () => {
  console.log('广告加载中...');
});

// 监听错误
adManager.on('adsError', (error) => {
  console.error('广告加载失败:', error);
});

// 监听点击
adManager.on('adClicked', (adId, slotId) => {
  console.log('广告被点击:', adId, slotId);
});

// 监听展示
adManager.on('adImpression', (adId, slotId) => {
  console.log('广告已展示:', adId, slotId);
});
```

### 6. 其他方法

```javascript
// 获取 slot 数据
const slot = adManager.getSlots('banner');

// 检查是否有广告
const hasAds = adManager.hasAds('banner');

// 获取广告数组
const ads = adManager.getAds('banner');

// 检查加载状态
const isLoading = adManager.getLoadingStatus();

// 启用/禁用
adManager.setEnabled(false);  // 禁用
adManager.setEnabled(true);   // 启用

// 更新配置
adManager.updateConfig({ debug: true });

// 清除数据
adManager.clearSlots();

// 移除监听器
adManager.off('adsUpdated', callback);

// 销毁
adManager.destroy();
```

### 7. Vue 完整示例

```vue
<template>
  <div class="chat-app">
    <div class="messages">
      <div v-for="msg in messages" :key="msg.id" :class="msg.role">
        {{ msg.content }}
      </div>
    </div>

    <div ref="bannerContainer" class="banner-ad"></div>
    <div ref="suffixContainer" class="suffix-ad"></div>

    <div v-if="isLoading" class="loading">广告加载中...</div>
    <div v-if="error" class="error">{{ error.message }}</div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { AdManager } from '@ai-ad-network/frontend-sdk/universal';

const messages = ref([
  { id: 1, role: 'user', content: '推荐一些好的耳机' },
  { id: 2, role: 'assistant', content: '根据您的需求，我推荐以下几款...' }
]);

const bannerContainer = ref(null);
const suffixContainer = ref(null);
const isLoading = ref(false);
const error = ref(null);

let adManager = null;

onMounted(async () => {
  // 创建 AdManager
  adManager = new AdManager({
    apiBaseUrl: '/api/ads',
    slots: [
      { slotId: 'banner', format: 'action_card', position: 'top', adTypes: ['action-card'] },
      { slotId: 'suffix', format: 'suffix', position: 'bottom', adTypes: ['suffix'] },
    ],
    debug: true,
  });

  // 监听事件
  adManager.on('adsLoading', () => {
    isLoading.value = true;
  });

  adManager.on('adsUpdated', () => {
    isLoading.value = false;
  });

  adManager.on('adsError', (err) => {
    error.value = err;
    isLoading.value = false;
  });

  // 请求广告
  try {
    await adManager.requestAds({
      conversationContext: {
        topic: '耳机推荐',
        messages: messages.value.map(m => ({
          role: m.role,
          content: m.content
        }))
      }
    });

    // 渲染广告
    adManager.renderTo('banner', bannerContainer.value, { variant: 'horizontal' });
    adManager.renderTo('suffix', suffixContainer.value, { variant: 'block' });
  } catch (err) {
    error.value = err;
  }
});

onUnmounted(() => {
  if (adManager) {
    adManager.destroy();
  }
});
</script>

<style scoped>
.banner-ad {
  margin: 20px 0;
}

.suffix-ad {
  margin-top: 20px;
}

.loading {
  color: #666;
}

.error {
  color: #f00;
}
</style>
```

### 8. Angular 完整示例

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
        { slotId: 'banner', format: 'action_card', position: 'top', adTypes: ['action-card'] },
        { slotId: 'suffix', format: 'suffix', position: 'bottom', adTypes: ['suffix'] },
      ],
    });
  }

  async requestAds(context: any) {
    await this.adManager.requestAds({
      conversationContext: context
    });
  }

  renderTo(slotId: string, container: HTMLElement, options?: any) {
    this.adManager.renderTo(slotId, container, options);
  }

  onDestroy() {
    this.adManager.destroy();
  }
}

// chat.component.ts
import { Component, AfterViewInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { AdService } from './ad.service';

@Component({
  selector: 'app-chat',
  template: `
    <div class="messages">
      <div *ngFor="let msg of messages" [class]="msg.role">
        {{ msg.content }}
      </div>
    </div>
    <div #bannerContainer class="banner-ad"></div>
    <div #suffixContainer class="suffix-ad"></div>
  `
})
export class ChatComponent implements AfterViewInit, OnDestroy {
  @ViewChild('bannerContainer') bannerContainer!: ElementRef;
  @ViewChild('suffixContainer') suffixContainer!: ElementRef;

  messages = [
    { role: 'user', content: '推荐一些好的耳机' },
    { role: 'assistant', content: '根据您的需求，我推荐以下几款...' }
  ];

  constructor(private adService: AdService) {}

  async ngAfterViewInit() {
    await this.adService.requestAds({
      topic: '耳机推荐',
      messages: this.messages
    });

    this.adService.renderTo('banner', this.bannerContainer.nativeElement, {
      variant: 'horizontal'
    });

    this.adService.renderTo('suffix', this.suffixContainer.nativeElement, {
      variant: 'block'
    });
  }

  ngOnDestroy() {
    this.adService.onDestroy();
  }
}
```

---

## API 参考

### React SDK 组件 Props

#### ActionCardAd Props

| 参数 | 类型 | 必需 | 默认值 | 说明 |
|------|------|------|--------|------|
| `ad` | `KoahAd` | ✅ | - | 广告数据 |
| `slotId` | `string` | ✅ | - | 广告位 ID |
| `variant` | `ActionCardVariant` | ❌ | `'horizontal'` | 视觉变体 |
| `className` | `string` | ❌ | - | 自定义类名 |
| `isLoading` | `boolean` | ❌ | `false` | 加载状态 |
| `onClick` | `function` | ❌ | - | 点击回调 |
| `onImpression` | `function` | ❌ | - | 展示回调 |

#### SuffixAd Props

| 参数 | 类型 | 必需 | 默认值 | 说明 |
|------|------|------|--------|------|
| `ad` | `KoahAd` | ✅ | - | 广告数据 |
| `slotId` | `string` | ✅ | - | 广告位 ID |
| `variant` | `SuffixVariant` | ❌ | `'block'` | 视觉变体 |
| `aiContext` | `string` | ❌ | - | AI 上下文 |
| `className` | `string` | ❌ | - | 自定义类名 |
| `isLoading` | `boolean` | ❌ | `false` | 加载状态 |
| `onClick` | `function` | ❌ | - | 点击回调 |
| `onImpression` | `function` | ❌ | - | 展示回调 |

#### SponsoredSourceAd Props

| 参数 | 类型 | 必需 | 默认值 | 说明 |
|------|------|------|--------|------|
| `ad` | `KoahAd` | ✅ | - | 广告数据 |
| `slotId` | `string` | ✅ | - | 广告位 ID |
| `variant` | `SourceVariant` | ❌ | `'card'` | 视觉变体 |
| `className` | `string` | ❌ | - | 自定义类名 |
| `isLoading` | `boolean` | ❌ | `false` | 加载状态 |
| `onClick` | `function` | ❌ | - | 点击回调 |
| `onImpression` | `function` | ❌ | - | 展示回调 |

### Universal SDK 方法

#### AdManager 构造函数

```typescript
new AdManager(config: AdManagerConfig)
```

**AdManagerConfig 类型：**

```typescript
interface AdManagerConfig {
  apiBaseUrl: string;           // 必需
  apiKey?: string;              // 可选
  slots: AdSlotRequest[];       // 必需
  enabled?: boolean;            // 可选，默认 true
  debug?: boolean;              // 可选，默认 false
}
```

#### requestAds

```typescript
async requestAds(context: {
  conversationContext: ConversationContext;
  userContext?: UserContext;
}): Promise<AdResponseBatch>
```

#### renderTo

```typescript
renderTo(
  slotId: string,
  container: HTMLElement | string,
  options?: {
    variant?: string;
    onClick?: (ad: any) => void;
    onImpression?: (ad: any) => void;
    adIndex?: number;
  }
): HTMLElement | null
```

#### renderAll

```typescript
renderAll(
  slotId: string,
  container: HTMLElement | string,
  options?: {
    onClick?: (ad: any) => void;
    onImpression?: (ad: any) => void;
  }
): HTMLElement | null
```

---

## 高级用法

### 1. 手动控制分析参数

如果需要手动控制分析参数，可以使用 V2 组件：

```tsx
import { ActionCardAdV2 } from '@ai-ad-network/frontend-sdk';

<ActionCardAdV2
  ad={ad}
  requestId="req-123"
  slotId="banner"
  position={0}
  totalAds={3}
  variant="horizontal"
/>
```

### 2. 自定义样式

```tsx
<ActionCardAd
  ad={ad}
  slotId="banner"
  variant="horizontal"
  className="my-custom-ad"
/>

<style>
.my-custom-ad {
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}
.my-custom-ad :global(.ai-ad-title) {
  font-size: 18px;
  font-weight: 600;
}
</style>
```

### 3. 多个广告位

```tsx
const { ads } = useAiAds(query, response, isFinished, {
  formats: ['action_card', 'action_card', 'suffix'],
});

// 使用不同的 slotId 区分
<ActionCardAd ad={ads[0]} slotId="banner-top" variant="horizontal" />
<ActionCardAd ad={ads[1]} slotId="banner-bottom" variant="compact" />
<SuffixAd ad={ads[2]} slotId="chat-suffix" variant="block" />
```

### 4. 条件渲染

```tsx
const { ads, isLoading } = useAiAds(query, response, isFinished);

{isLoading && <AdSkeleton />}

{!isLoading && ads.length > 0 && (
  <ActionCardAd ad={ads[0]} slotId="banner" variant="horizontal" />
)}

{!isLoading && ads.length === 0 && (
  <div>暂无广告</div>
)}
```

### 5. 错误处理

```tsx
const { ads, error } = useAiAds(query, response, isFinished);

if (error) {
  if (error.message.includes('401')) {
    return <div>API 配置错误</div>;
  }
  if (error.message.includes('403')) {
    return <div>域名未授权</div>;
  }
  if (error.message.includes('429')) {
    return <div>请求过多，请稍后再试</div>;
  }
  return <div>广告加载失败</div>;
}
```

### 6. 懒加载

```tsx
const { fetchAds, ads, isLoading } = useAiAdsLazy();

// 用户点击按钮时加载
const handleLoadAds = () => {
  fetchAds('best headphones', 'Here are some options...', ['action_card']);
};

return (
  <div>
    <button onClick={handleLoadAds}>加载广告</button>
    {isLoading && <div>加载中...</div>}
    {ads.map(ad => <ActionCardAd key={ad.id} ad={ad} slotId="banner" />)}
  </div>
);
```

---

## 最佳实践

### 1. 请求时机

```tsx
// ✅ 正确：只在流结束后请求
const { ads } = useAiAds(query, response, isStreamFinished);

// ❌ 错误：流未结束就请求
const { ads } = useAiAds(query, response, false);
```

### 2. 错误处理

```tsx
// ✅ 正确：处理错误状态
const { ads, error } = useAiAds(query, response, isFinished);
if (error) {
  return <ErrorMessage error={error} />;
}

// ❌ 错误：忽略错误
const { ads } = useAiAds(query, response, isFinished);
return ads.map(ad => <ActionCardAd ad={ad} slotId="banner" />);
```

### 3. 内存清理

```typescript
// ✅ 正确：组件卸载时清理
useEffect(() => {
  const adManager = new AdManager({...});
  return () => adManager.destroy();
}, []);

// ❌ 错误：没有清理
const adManager = new AdManager({...});
```

### 4. 调试模式

```tsx
// ✅ 正确：只在开发环境启用
<AdProvider config={{
  apiBaseUrl: '/api/v1',
  debug: process.env.NODE_ENV === 'development'
}}>
```

### 5. 样式隔离

```tsx
// ✅ 正确：使用自定义类名
<ActionCardAd ad={ad} slotId="banner" className="my-banner-ad" />

// ❌ 错误：直接修改全局样式
<style>
.global-ad-style { ... }
</style>
```

---

## 附录

### 广告格式对照表

| 格式 | format 值 | React 组件 | Universal |
|------|----------|-----------|-----------|
| 产品卡片 | `action_card` | `ActionCardAd` | `renderTo(slotId, container, { variant })` |
| 后缀广告 | `suffix` | `SuffixAd` | `renderTo(slotId, container, { variant })` |
| 赞助来源 | `source` | `SponsoredSourceAd` | `renderTo(slotId, container, { variant })` |
| 潜客生成 | `lead_gen` | `LeadGenAd` | 手动渲染 |
| 后续问题 | `follow_up` | `FollowUpAd` | 手动渲染 |

### 变体对照表

| 变体 | ActionCard | Suffix | Source |
|------|-----------|--------|--------|
| 默认 | `horizontal` | `block` | `card` |
| 横向 | `horizontal` | - | - |
| 纵向 | `vertical` | - | - |
| 紧凑 | `compact` | - | - |
| 内联 | - | `inline` | - |
| 极简 | - | `minimal` | `minimal` |
| 列表项 | - | - | `list-item` |

---

**需要帮助？**

- 📧 Email: support@ai-ad-network.com
- 📖 Docs: https://docs.ai-ad-network.com
- 🐛 Issues: https://github.com/ai-ad-network/frontend-sdk/issues
