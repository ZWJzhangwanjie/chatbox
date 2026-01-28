# AI Ad Network SDK - 快速开始指南

> 🚀 **Zero-config** SDK for AI-powered native ads
>
> **📦 双 SDK 支持**: React SDK + Universal Framework-Agnostic SDK

---

## 🎯 选择你的 SDK

### React 项目
```bash
npm install @ai-ad-network/frontend-sdk
```
```tsx
import { AdProvider, useAiAds, ActionCardAd } from '@ai-ad-network/frontend-sdk';
```

### 其他框架 (Vue, Angular, Vanilla JS 等)
```bash
npm install @ai-ad-network/frontend-sdk
```
```javascript
import { AdManager, DOMRenderer } from '@ai-ad-network/frontend-sdk/universal';
```

**Universal SDK 支持所有框架**：Vue 2/3, Angular, Svelte, SolidJS, Vanilla JS 等

---

## 📦 React SDK 快速开始 (3 步)

### 步骤 1: 安装

```bash
npm install @ai-ad-network/frontend-sdk
```

### 步骤 2: 包裹应用

```tsx
import { AdProvider } from '@ai-ad-network/frontend-sdk';

function App() {
  return (
    <AdProvider
      config={{
        apiBaseUrl: 'https://your-api.com/api/v1',
        apiKey: 'ak_your_tenant_your_key',
        debug: process.env.NODE_ENV === 'development',
      }}
    >
      <ChatApp />
    </AdProvider>
  );
}
```

### 步骤 3: 使用广告

```tsx
import { useAiAds, ActionCardAd } from '@ai-ad-network/frontend-sdk';

function ChatApp() {
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState('');
  const [isFinished, setIsFinished] = useState(false);

  // ✅ ClientInfo 自动采集
  const { ads, isLoading } = useAiAds(query, response, isFinished, {
    formats: ['action_card', 'suffix'],
    placement: 'post_response',
  });

  return (
    <div>
      {ads.map(ad => (
        <ActionCardAd key={ad.id} ad={ad} variant="horizontal" />
      ))}
    </div>
  );
}
```

---

## 🌐 Universal SDK 快速开始 (3 步)

### 步骤 1: 安装

```bash
npm install @ai-ad-network/frontend-sdk
```

### 步骤 2: 导入 SDK

```javascript
// ES Module
import { AdManager, DOMRenderer } from '@ai-ad-network/frontend-sdk/universal';

// CDN (HTML)
// <script src="https://cdn.example.com/ai-ad-network-universal.iife.js"></script>
```

### 步骤 3: 使用广告

```javascript
// 创建 AdManager
const adManager = new AdManager({
  apiBaseUrl: 'https://your-api.com/api/v1',
  slots: [{
    slotId: 'hero-banner',
    position: 'top',
    adTypes: ['action-card']
  }]
});

// 请求广告
const result = await adManager.requestAds({
  conversationContext: {
    topic: 'technology',
    messages: []
  }
});

// 渲染广告
if (result.slots[0]?.ad) {
  const container = document.getElementById('ad-container');
  DOMRenderer.renderActionCard(result.slots[0].ad, container);
}
```

**或使用 Web Components (适用于所有框架)**:

```html
<ad-action-card
  ad-data='{"original": {...}, "adapted": {...}, "tracking": {...}}'
  variant="horizontal">
</ad-action-card>
```

---

## 🆕 ClientInfo API

**直接访问客户端信息用于分析、个性化、A/B 测试等**

```typescript
// React SDK
import { getUserId, getDeviceInfo, getClientInfo } from '@ai-ad-network/frontend-sdk';

// Universal SDK
import { getUserId, getDeviceInfo, getClientInfo } from '@ai-ad-network/frontend-sdk/universal';

// CDN
const userId = window.AiAdNetwork.getUserId();
```

### 可用函数

| 函数 | 说明 |
|------|------|
| `getClientInfo()` | 获取完整客户端信息 |
| `getUserId()` | 获取用户 ID (持久化) |
| `getDeviceInfo()` | 获取设备信息 |
| `getUserInfo()` | 获取用户信息 |
| `getAppInfo()` | 获取应用信息 |
| `getGeoInfo()` | 获取地理位置信息 |
| `getClientInfoJSON()` | 获取 JSON 字符串 |
| `getClientInfoSummary()` | 获取可读摘要 |
| `clearClientInfoCache()` | 清除缓存 |

### 使用示例

```typescript
// 集成分析系统
const userId = getUserId();
analytics.identify(userId);

// 条件功能
const device = getDeviceInfo();
if (device.devicetype === 1) {
  // 手机端
  enableMobileOptimizations();
}

// 国际化
const geo = getGeoInfo();
if (geo?.country === 'CN') {
  loadChinesePaymentMethods();
}

// A/B 测试
const userId = getUserId();
const variant = hashCode(userId) % 2 === 0 ? 'A' : 'B';
```

---

## 🔑 关键特性

### ✅ 零配置 ClientInfo 自动采集
- 设备信息: OS, 型号, 屏幕尺寸, 语言
- 应用信息: Bundle ID, 名称, 版本号
- 用户信息: 唯一 ID (自动生成并持久化)
- 地理信息: 国家, 语言 (从时区推断)

**不需要任何配置代码，自动注入到每个广告请求中！**

### 🎨 多种广告格式
- **ActionCardAd** - 横向/纵向/紧凑卡片 (horizontal/vertical/compact)
- **SuffixAd** - 后缀广告 (block/inline/minimal)
- **SponsoredSource** - 赞助来源 (card/minimal)
- **LeadGenAd** - 潜客生成
- **FollowUpAd** - 后续问题 (bubble/pill/underline)
- **StaticAd** - 静态横幅

### 📊 自动事件跟踪
- ✅ 展示跟踪 (Intersection Observer)
- ✅ 点击跟踪 (自动)
- ✅ 自定义回调支持

---

## 📊 数据结构

### 自动采集的 ClientInfo

```typescript
{
  device: {
    ua: string,           // User Agent
    os: string,           // 操作系统
    osv: string,          // OS 版本
    devicetype: number,   // 设备类型 (1=手机, 2=平板, 3=PC)
    model?: string,       // 设备型号
    language: string,     // 系统语言
  },
  user: {
    id: string,           // 唯一用户 ID (持久化)
    language: string,     // 用户语言
  },
  app: {
    bundle: string,       // 应用包名/域名
    name: string,         // 应用名称
    ver: string,          // 版本号
    publisher: {
      id: string,         // 发布商 ID
      domain: string,     // 域名
    },
  },
  geo?: {
    country?: string,     // 国家代码
    language?: string,    // 语言
  }
}
```

---

## 🎨 可用组件 (React SDK)

| 组件 | 说明 | 变体 |
|------|------|------|
| `ActionCardAd` | 产品卡片 | horizontal, vertical, compact |
| `SuffixAd` | 后缀广告 | block, inline, minimal |
| `SponsoredSource` | 赞助来源 | card, minimal |
| `LeadGenAd` | 潜客生成 | - |
| `FollowUpAd` | 后续问题 | bubble, pill, underline |
| `StaticAd` | 静态横幅 | - |

---

## 🔧 高级配置

### React SDK - 自定义 Ad Slots

```tsx
const { slots, requestAds } = useAdSlots({
  apiBaseUrl: '/api/v1',
  slots: [
    {
      slotId: 'product-cards',
      format: 'action_card',
      variant: 'horizontal',
      count: 3,
    }
  ],
  enabled: true,
});

await requestAds({
  conversationContext: { query, response },
  userContext: { sessionId: 'session-123' },
});
```

### Universal SDK - 事件监听

```javascript
adManager.on('adsLoading', () => {
  console.log('Loading ads...');
});

adManager.on('adsUpdated', (slots) => {
  console.log('Ads loaded:', slots);
});

adManager.on('adsError', (error) => {
  console.error('Failed:', error);
});
```

### 样式自定义

```css
:root {
  /* 卡片样式 */
  --ai-ad-card-bg: #ffffff;
  --ai-ad-card-border: #e5e7eb;
  --ai-ad-card-border-radius: 12px;

  /* 排版 */
  --ai-ad-title-color: #111827;
  --ai-ad-body-color: #6b7280;
  --ai-ad-cta-bg: #10b981;
  --ai-ad-cta-color: #ffffff;
}
```

---

## ⚠️ 故障排查

### 广告不显示？

**检查清单**:
1. ✅ Console 显示 SDK 版本 (v1.0.7+)
2. ✅ `apiBaseUrl` 配置正确
3. ✅ `apiKey` 有效
4. ✅ Network 请求成功 (DevTools → Network)

### Console 显示旧版本？

```bash
rm -rf node_modules package-lock.json
npm install @ai-ad-network/frontend-sdk@latest
```

### ClientInfo 未在请求中？

**React**: 检查是否使用了 `useAdSlots` 或 `useAiAds`
**Universal**: 检查是否使用了 `AdManager`

---

## ✅ 集成检查清单

- [ ] SDK 已安装 (`npm install @ai-ad-network/frontend-sdk`)
- [ ] Console 显示版本 v1.0.7+
- [ ] React: App 包裹了 `AdProvider`
- [ ] Universal: 初始化了 `AdManager`
- [ ] Console 显示 ClientInfo 已采集
- [ ] Network 请求包含 `clientInfo` 字段
- [ ] 广告正确渲染
- [ ] 分析事件正常触发

---

## 📚 完整文档

- 📖 **[README.md](../README.md)** - 项目主文档
- 📖 **[UNIVERSAL_SDK_GUIDE.md](./UNIVERSAL_SDK_GUIDE.md)** - Universal SDK 完整指南

**Universal SDK 指南包含**:
- 详细的 AdManager API
- DOMRenderer 和 HTMLRenderer 用法
- Web Components 使用
- Vue/Angular/Vanilla JS 完整示例
- ClientInfo API 完整参考
- 所有框架的使用示例

---

## 🆘 获取帮助

- 📧 Email: support@ai-ad-network.com
- 📖 文档: https://docs.ai-ad-network.com
- 🐛 Issues: https://github.com/ai-ad-network/frontend-sdk/issues

---

**SDK 版本**: 1.0.7
**最后更新**: 2026-01-26
