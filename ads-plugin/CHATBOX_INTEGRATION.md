# Chatbox 集成指南

本指南详细说明如何将 AI Ad Network SDK 集成到 Chatbox 应用中，实现完美的广告展示。

## 目录

- [快速开始](#快速开始)
- [认证配置](#认证配置)
- [广告组件映射](#广告组件映射)
- [API 数据格式](#api-数据格式)
- [集成示例](#集成示例)
- [调试技巧](#调试技巧)

---

## 快速开始

### 1. 安装 SDK

```bash
cd your-chatbox-project
npm install @ai-ad-network/frontend-sdk
```

### 2. 配置 API 密钥

首先，你需要从广告网络获取 API 密钥。联系管理员获取你的 `API Key`。

```tsx
// app/layout.tsx (Next.js) or src/App.tsx (React)
import { AdProvider } from '@ai-ad-network/frontend-sdk';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <AdProvider
          config={{
            apiBaseUrl: 'https://your-ad-network.com/api/v1',
            apiKey: 'ak_your_tenant_your_key', // 从管理员获取
            defaultFormats: ['action_card', 'suffix'],
            debug: process.env.NODE_ENV === 'development',
          }}
        >
          {children}
        </AdProvider>
      </body>
    </html>
  );
}
```

### 3. 使用广告组件

```tsx
import { useAiAds, ActionCardAd } from '@ai-ad-network/frontend-sdk';

function ChatMessage({ query, response, isStreaming }) {
  const [isFinished, setIsFinished] = useState(false);

  useEffect(() => {
    if (!isStreaming) setIsFinished(true);
  }, [isStreaming]);

  const { ads, isLoading } = useAiAds(query, response, isFinished, {
    formats: ['action_card'],
    placement: 'post_response',
  });

  return (
    <div>
      <div>{response}</div>
      {ads.map(ad => (
        <ActionCardAd key={ad.id} ad={ad} />
      ))}
    </div>
  );
}
```

---

## 认证配置

SDK 会自动处理认证。API Key 通过 AdProvider 配置：

```tsx
<AdProvider config={{
  apiKey: 'ak_your_tenant_your_key', // 必需
}}>
```

SDK 会在每个请求中自动添加：
```typescript
headers: {
  'Authorization': 'Bearer ak_your_tenant_your_key',
  'X-API-Key': 'ak_your_tenant_your_key',
}
```

---

## 广告组件映射

根据 AI 响应的不同场景，选择合适的广告组件：

| 场景 | 推荐组件 | Ad Type | 示例 |
|------|----------|---------|------|
| **AI 响应后的卡片广告** | `ActionCardAd` | `action_card` | 产品推荐、服务介绍 |
| **附加在 AI 回答末尾** | `SuffixAd` | `suffix` | "顺便说一下..." |
| **混在建议问题中** | `FollowUpAdMixed` | `followup` | "了解更多关于..." |
| **混在来源列表中** | `SourceListWithAds` | `source` | 赞助链接 |
| **侧边栏横幅** | `StaticAd` | `static` | 品牌横幅 |
| **表单收集** | `LeadGenAd` | `lead_gen` | 报名、注册 |

---

## API 数据格式

### 请求格式

SDK 自动发送以下请求到后端 API：

```typescript
POST /api/v1/ads/decision
Headers: {
  'Authorization': 'Bearer ak_your_tenant_your_key',
  'X-API-Key': 'ak_your_tenant_your_key',
  'Content-Type': 'application/json'
}

Body: {
  query: string;           // 用户的提问
  response?: string;        // AI 的回答（可选）
  adFormats: AdFormat[];   // 期望的广告格式
  placement: 'post_response' | 'sidebar' | 'inline';
}
```

### 响应格式

后端 API 返回格式（SDK 自动解析）：

```typescript
{
  "success": true,
  "data": {
    "ads": [
      {
        "id": "ad_12345",
        "type": "action_card",
        "score": 0.95,
        "source": "internal",
        "content": {
          "title": "产品标题",
          "body": "产品描述...",
          "image": "https://...",
          "cta_text": "立即购买",
          "price": "$99.00",
          "rating": 4.8
          // 格式特定字段
          // "suffix_content": { ... },
          // "followup_content": { ... },
          // "source_content": { ... },
        },
        "tracking": {
          "click_url": "/track/click?ad_id=ad_12345",
          "impression_url": "/track/impression?ad_id=ad_12345"
        },
        "metadata": {
          "category": "软件工具",
          "ecpm": 5.2
        }
      }
    ],
    "intent": {
      "type": "software",
      "confidence": 0.9,
      "keywords": ["工具", "软件"]
    },
    "routing": {
      "primarySource": "internal",
      "fallbackTriggered": false
    }
  }
}
```

---

## 集成示例

### 场景 1: AI 响应后展示广告

```tsx
import { useAiAds, ActionCardAd, SuffixAd } from '@ai-ad-network/frontend-sdk';

function ChatMessage({ query, response, isStreaming }) {
  const [isFinished, setIsFinished] = useState(false);

  useEffect(() => {
    if (!isStreaming) setIsFinished(true);
  }, [isStreaming]);

  const { ads, isLoading } = useAiAds(query, response, isFinished, {
    formats: ['action_card', 'suffix'],
    placement: 'post_response',
  });

  return (
    <div className="message">
      <div className="ai-response">{response}</div>

      {!isLoading && ads.map((ad) => {
        if (ad.type === 'action_card') {
          return <ActionCardAd key={ad.id} ad={ad} variant="horizontal" />;
        }
        if (ad.type === 'suffix') {
          return <SuffixAd key={ad.id} ad={ad} aiContext={response} />;
        }
        return null;
      })}
    </div>
  );
}
```

### 场景 2: 混合广告到建议问题

```tsx
import { FollowUpAdMixed } from '@ai-ad-network/frontend-sdk';

function SuggestedQuestions({ questions, ads }) {
  const followUpAd = ads.find(ad => ad.type === 'followup');

  return (
    <FollowUpAdMixed
      questions={questions}
      ad={followUpAd}
      adPosition={2}
      onQuestionClick={(question) => console.log('Clicked:', question)}
    />
  );
}
```

### 场景 3: 来源列表混合广告

```tsx
import { SourceListWithAds } from '@ai-ad-network/frontend-sdk';

function Citations({ sources, ads }) {
  const sourceAd = ads.find(ad => ad.type === 'source');

  return (
    <SourceListWithAds
      sources={sources}
      ad={sourceAd}
      adPosition={1}
      variant="list-item"
    />
  );
}
```

---

## 调试技巧

### 1. 开启调试模式

```tsx
<AdProvider config={{ debug: true }}>
  {/* ... */}
</AdProvider>
```

### 2. 查看广告数据

```tsx
const { ads, intent, routing } = useAiAds(...);

useEffect(() => {
  console.log('📊 Intent:', intent);
  console.log('🎯 Ads:', ads);
  console.log('🔀 Routing:', routing);
}, [ads, intent, routing]);
```

### 3. 处理无广告情况

```tsx
const { ads, isLoading, error } = useAiAds(...);

if (error) {
  console.error('Ad loading failed:', error);
}

if (ads.length === 0) {
  return null; // 无广告时隐藏
}
```

---

## 常见问题

### Q: 为什么有时没有返回广告？

A: 可能的原因：
- API Key 无效或未配置
- 当前查询内容没有匹配的广告
- 后端广告库中没有相关内容

### Q: 如何自定义广告样式？

A: 通过 CSS 变量：

```css
:root {
  --ad-primary: #3b82f6;
  --ad-background: #f8fafc;
  --ad-border: #e2e8f0;
}
```

### Q: 如何禁用广告？

A: 设置 `enabled: false`：

```tsx
<AdProvider config={{ enabled: false }}>
  {/* ... */}
</AdProvider>
```

---

## 数据格式同步说明

后端和前端的 `KoahAd` 类型定义已完全同步：

- **基础字段**: `id`, `type`, `score`, `source`, `content`, `tracking`, `metadata`
- **格式特定字段**:
  - `suffix_content`: 后缀广告内容
  - `followup_content`: 跟进问题内容
  - `source_content`: 赞助来源内容

这确保了所有广告类型都能正确解析和显示。

---

## 技术支持

如有问题，请联系技术支持或提交 Issue。

