# Frontend SDK Analytics 升级提案

## 📋 文档信息

| 项目 | 内容 |
|------|------|
| **标题** | Frontend SDK Analytics API 升级 |
| **版本** | 1.0 |
| **日期** | 2026-01-30 |
| **状态** | 待实施 |
| **优先级** | 高 |
| **负责人** | Frontend SDK Team |
| **审核人** | Backend Team |

---

## 📑 目录

1. [背景与上下文](#背景与上下文)
2. [问题分析](#问题分析)
3. [技术架构](#技术架构)
4. [解决方案](#解决方案)
5. [实施计划](#实施计划)
6. [测试计划](#测试计划)
7. [风险评估](#风险评估)
8. [附录](#附录)

---

## 🎯 背景与上下文

### 系统概述

我们的广告系统采用**事件驱动架构**，完整的数据流如下：

```
┌─────────────┐     ┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Frontend  │     │   Backend   │     │  Redis       │     │  Worker     │
│     SDK     │────▶│    API      │────▶│   Streams    │────▶│  (Go)       │
└─────────────┘     └─────────────┘     └──────────────┘     └─────────────┘
                           │                                        │
                           │                                        ▼
                           │                                   ┌─────────────┐
                           │                                   │   MySQL     │
                           │                                   │  Database   │
                           │                                   └─────────────┘
```

### 已完成的工作

#### Backend API ✅

**Analytics API 端点已实现并运行中：**

| 端点 | 方法 | 功能 | 状态 |
|------|------|------|------|
| `/api/v1/ads/impression` | POST | 记录广告展示事件 | ✅ 已实现 |
| `/api/v1/ads/click` | POST | 记录广告点击事件 | ✅ 已实现 |
| `/api/v1/ads/request` | POST | 获取广告 | ✅ 已实现 |
| `/api/v1/ads/fill` | POST | 记录广告填充 | ✅ 已实现 |

**Event Sender 服务：**

- ✅ 已实现 `analytics.trackAdImpression()` - 发送事件到 Redis Stream `ad.impression`
- ✅ 已实现 `analytics.trackAdClick()` - 发送事件到 Redis Stream `ad.click`
- ✅ 自动提取设备信息（OS, 设备类型, 语言等）
- ✅ 支持数据隔离（publisher_id）

#### Data Center Worker ✅

**Consumer 状态：**

| Stream | Consumer | 状态 |
|--------|----------|------|
| `ad.request` | worker-1 | ✅ 运行中 |
| `ad.fill` | worker-1 | ✅ 运行中 |
| `ad.impression` | worker-1 | ✅ 运行中（等待数据）|
| `ad.click` | worker-1 | ✅ 运行中（等待数据）|
| `ad.feedback` | worker-1 | ✅ 运行中 |

**验证结果：**

```bash
# ad.request 事件成功处理
2026-01-30T14:58:01 INFO Processing event {"requestId": "verify-fix-001", ...}
2026-01-30T14:58:01 INFO Ad request event processed
2026-01-30T14:58:01 INFO Event processed successfully

# 数据库验证
mysql> SELECT request_id, publisher_id FROM ad_requests WHERE request_id = 'verify-fix-001';
+-----------------+---------------+
| request_id      | publisher_id  |
+-----------------+---------------+
| verify-fix-001  | dev_client_id |
+-----------------+---------------+
```

---

## 🔍 问题分析

### 当前问题

**现象：`ad.impression` 和 `ad.click` streams 没有数据**

Worker 消费者已启动并正常运行，但 Redis Streams 中没有展示和点击事件。

### 根本原因

**Frontend SDK 和 Backend Analytics API 不匹配：**

| 组件 | 当前实现 | 问题 |
|------|----------|------|
| **Backend API** | `POST /api/v1/ads/impression`<br>接收完整事件数据 | ✅ 已就绪 |
| **Frontend SDK** | `GET /track/impression`<br>简单 pixel tracking | ⚠️ **调用错误端点** |

### 当前 Frontend SDK 实现

**文件：** `frontend-sdk/src/utils/tracking.ts`

```typescript
// 当前实现 - 简单 Pixel Tracking
export async function trackImpression(url: string): Promise<boolean> {
  try {
    await fetch(url, {
      method: 'GET',      // ← 问题：使用 GET
      mode: 'no-cors',    // ← 问题：无响应数据
      cache: 'no-store',
      keepalive: true,
    });
    return true;
  } catch (error) {
    console.error('[Ad Tracking] Failed to track impression:', error);
    return false;
  }
}

export async function trackClick(url: string): Promise<boolean> {
  // 同样的问题
  await fetch(url, {
    method: 'GET',
    mode: 'no-cors',
    cache: 'no-store',
    keepalive: true,
  });
  return true;
}
```

**问题点：**

1. ❌ 调用错误的端点（`/track/impression` 而不是 `/api/v1/ads/impression`）
2. ❌ 使用 GET 请求，无法发送复杂的 JSON 数据
3. ❌ `no-cors` 模式意味着无法获取响应
4. ❌ 只接受 URL 字符串，没有事件数据结构
5. ❌ 缺少关键字段：`requestId`, `position`, `totalAds`, `sessionId`

---

## 🏗️ 技术架构

### Backend Analytics API 规范

#### 1. POST /api/v1/ads/impression

**请求体：**

```typescript
interface ImpressionEvent {
  // 必填字段
  requestId: string;      // 广告请求 ID（从 /api/v1/ads/response 中获取）
  adId: string;           // 广告 ID
  position: number;       // 广告在列表中的位置（从 0 开始）
  totalAds: number;       // 该 slot 返回的广告总数
  sessionId: string;      // 会话 ID

  // 可选字段
  adTitle?: string;       // 广告标题
  slotId?: string;        // 广告位 ID
  format?: string;        // 广告格式（entity_link, action_card, etc.）
  source?: string;        // 广告来源（internal, pinecone, etc.）
  userId?: string;        // 用户 ID
  viewToken?: string;     // 展示令牌（用于去重）
}
```

**响应：**

```typescript
interface ImpressionResponse {
  success: boolean;
  eventId: string;        // 事件 ID
  impressionId: string;   // 展示 ID
}
```

**事件流程：**

```
Frontend SDK → POST /api/v1/ads/impression
                        ↓
                  Backend 验证数据
                        ↓
              发送到 Redis Stream (ad.impression)
                        ↓
                  Data Center Worker
                        ↓
                  插入 ad_impressions 表
```

#### 2. POST /api/v1/ads/click

**请求体：**

```typescript
interface ClickEvent {
  // 必填字段
  requestId: string;           // 广告请求 ID
  adId: string;                // 广告 ID
  sessionId: string;           // 会话 ID
  destinationUrl: string;      // 目标 URL

  // 可选字段
  adTitle?: string;            // 广告标题
  slotId?: string;             // 广告位 ID
  userId?: string;             // 用户 ID
  impressionEventId?: string;  // 对应的展示事件 ID
  timeToClickMs?: number;      // 从展示到点击的时间（毫秒）
}
```

**响应：**

```typescript
interface ClickResponse {
  success: boolean;
  eventId: string;        // 事件 ID
  redirectUrl: string;    // 重定向 URL（与 destinationUrl 相同）
}
```

### 数据流对比

#### 当前数据流（❌ 断裂）

```
Frontend SDK
    │
    │ trackImpression(url)
    │   ↓
    │ GET /track/impression (简单 pixel)
    │   ↓
    │ ❌ 不会发送到 Redis Streams
    │
    ▼
Backend (旧端点)
    │
    │ ❌ 没有集成 Redis Streams
    │
    ▼
Worker (空闲等待...)
```

#### 目标数据流（✅ 完整）

```
Frontend SDK
    │
    │ trackAdImpression({ requestId, adId, ... })
    │   ↓
    │ POST /api/v1/ads/impression (完整数据)
    │   ↓
    ▼
Backend Analytics API
    │
    │ analytics.trackAdImpression()
    │   ↓
    ▼
Redis Stream (ad.impression)
    │
    │ XREADGROUP data-center-group
    │   ↓
    ▼
Worker (Go)
    │
    │ AdImpressionHandler.Handle()
    │   ↓
    ▼
MySQL (ad_impressions 表)
```

---

## 💡 解决方案

### 方案概述

**升级 Frontend SDK 的 Analytics 调用，从简单的 pixel tracking 迁移到完整的 analytics API。**

### 修改范围

| 文件 | 修改类型 | 说明 |
|------|----------|------|
| `src/utils/tracking.ts` | 新增功能 | 添加新的 analytics API 调用函数 |
| `src/hooks/useAdTracking.ts` | 修改 | 使用新的 API，传递完整数据 |
| `src/hooks/useAiAds.ts` | 修改 | 保存并传递 requestId |
| `src/types/index.ts` | 新增 | Analytics API 类型定义 |
| `src/utils/session.ts` | 新增 | Session ID 管理（如果不存在）|

### 详细实施步骤

#### 步骤 1：添加类型定义

**文件：** `src/types/analytics.ts` (新文件)

```typescript
/**
 * Analytics API 事件类型定义
 */

// 展示事件
export interface ImpressionEventData {
  // 必填
  requestId: string;
  adId: string;
  position: number;
  totalAds: number;
  sessionId: string;

  // 可选
  adTitle?: string;
  slotId?: string;
  format?: string;
  source?: string;
  userId?: string;
  viewToken?: string;
}

// 点击事件
export interface ClickEventData {
  // 必填
  requestId: string;
  adId: string;
  sessionId: string;
  destinationUrl: string;

  // 可选
  adTitle?: string;
  slotId?: string;
  userId?: string;
  impressionEventId?: string;
  timeToClickMs?: number;
}

// API 响应
export interface ImpressionResponse {
  success: boolean;
  eventId: string;
  impressionId: string;
}

export interface ClickResponse {
  success: boolean;
  eventId: string;
  redirectUrl: string;
}
```

#### 步骤 2：实现新的 Analytics API

**文件：** `src/utils/analytics.ts` (新文件)

```typescript
/**
 * Analytics API - 发送展示和点击事件到 Backend
 *
 * 替代简单的 pixel tracking，支持完整的事件数据
 */

import type {
  ImpressionEventData,
  ClickEventData,
  ImpressionResponse,
  ClickResponse
} from '../types/analytics';

const ANALYTICS_BASE_URL = '/api/v1/ads';

/**
 * 发送广告展示事件
 *
 * @param data - 展示事件数据
 * @returns Promise<boolean> - 是否发送成功
 */
export async function trackAdImpression(
  data: ImpressionEventData
): Promise<boolean> {
  try {
    const response = await fetch(`${ANALYTICS_BASE_URL}/impression`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
      keepalive: true, // 确保页面卸载时也能发送
    });

    if (!response.ok) {
      console.error('[Analytics] Impression tracking failed:', response.status);
      return false;
    }

    const result: ImpressionResponse = await response.json();
    console.debug('[Analytics] Impression tracked:', result.eventId);
    return true;
  } catch (error) {
    console.error('[Analytics] Failed to track impression:', error);
    return false;
  }
}

/**
 * 发送广告点击事件
 *
 * @param data - 点击事件数据
 * @returns Promise<ClickResponse | null> - 响应数据或 null
 */
export async function trackAdClick(
  data: ClickEventData
): Promise<ClickResponse | null> {
  try {
    const response = await fetch(`${ANALYTICS_BASE_URL}/click`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
      keepalive: true,
    });

    if (!response.ok) {
      console.error('[Analytics] Click tracking failed:', response.status);
      return null;
    }

    const result: ClickResponse = await response.json();
    console.debug('[Analytics] Click tracked:', result.eventId);
    return result;
  } catch (error) {
    console.error('[Analytics] Failed to track click:', error);
    return null;
  }
}
```

#### 步骤 3：更新 useAdTracking Hook

**文件：** `src/hooks/useAdTracking.ts`

**当前实现：**

```typescript
export function useAdTracking({
  ad,
  trackingUrl,
  onClick,
}: UseAdTrackingParams): void {
  // ... Intersection Observer 逻辑

  const handleImpression = useCallback(() => {
    if (hasTrackedRef.current) return;
    hasTrackedRef.current = true;

    // ❌ 当前：调用旧的 pixel tracking
    trackImpression(trackingUrl.impression);
  }, [trackingUrl]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();

    // ❌ 当前：调用旧的 pixel tracking
    trackClick(trackingUrl.click).then(() => {
      if (onClick) onClick();
    });
  }, [trackingUrl, onClick]);
}
```

**修改后：**

```typescript
import { trackAdImpression, trackAdClick } from '../utils/analytics';
import type { ImpressionEventData, ClickEventData } from '../types/analytics';

export interface UseAdTrackingParams {
  // 广告信息
  ad: Ad;

  // Analytics 数据
  requestId: string;          // 新增：从 useAiAds 传入
  position: number;           // 新增：广告位置
  totalAds: number;           // 新增：广告总数
  sessionId?: string;         // 新增：会话 ID（可选，内部有默认）

  // 回调
  onClick?: () => void;
}

export function useAdTracking({
  ad,
  requestId,
  position,
  totalAds,
  sessionId: externalSessionId,
  onClick,
}: UseAdTrackingParams): {
  impressionTracked: boolean;
  handleClick: (e: React.MouseEvent) => void;
} {
  const [impressionTracked, setImpressionTracked] = useState(false);
  const [impressionTime, setImpressionTime] = useState<number>(0);

  // 生成或使用传入的 sessionId
  const sessionId = useMemo(() => {
    return externalSessionId || getSessionId();
  }, [externalSessionId]);

  // Intersection Observer 用于检测可见性
  const observerRef = useRef<IntersectionObserver | null>(null);
  const elementRef = useRef<HTMLElement | null>(null);

  // 处理展示
  const handleImpression = useCallback(() => {
    if (impressionTracked) return;

    const impressionData: ImpressionEventData = {
      requestId,
      adId: ad.id,
      adTitle: ad.title,
      slotId: ad.slotId,
      format: ad.format,
      source: ad.source,
      position,
      totalAds,
      sessionId,
      viewToken: generateViewToken(ad.id, sessionId), // 用于去重
    };

    // ✅ 新：调用 analytics API
    trackAdImpression(impressionData).then((success) => {
      if (success) {
        setImpressionTracked(true);
        setImpressionTime(Date.now());
      }
    });
  }, [ad, requestId, position, totalAds, sessionId, impressionTracked]);

  // 处理点击
  const handleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();

    const clickData: ClickEventData = {
      requestId,
      adId: ad.id,
      adTitle: ad.title,
      slotId: ad.slotId,
      destinationUrl: ad.destinationUrl || ad.link,
      sessionId,
      // 计算从展示到点击的时间
      timeToClickMs: impressionTime ? Date.now() - impressionTime : undefined,
    };

    // ✅ 新：调用 analytics API
    trackAdClick(clickData).then((response) => {
      // 无论 tracking 是否成功，都进行导航
      if (ad.destinationUrl || ad.link) {
        window.open(ad.destinationUrl || ad.link, '_blank');
      }
      if (onClick) onClick();
    });
  }, [ad, requestId, sessionId, impressionTime, onClick]);

  // Intersection Observer 设置
  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !impressionTracked) {
            // 延迟 1 秒后发送展示事件（确保真正可见）
            setTimeout(() => {
              handleImpression();
            }, 1000);
          }
        });
      },
      {
        threshold: 0.5, // 50% 可见
      }
    );

    observerRef.current.observe(element);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [handleImpression, impressionTracked]);

  return {
    impressionTracked,
    handleClick,
    elementRef, // 暴露 ref 供组件使用
  };
}
```

#### 步骤 4：更新 useAiAds Hook

**文件：** `src/hooks/useAiAds.ts`

**需要添加的功能：**

```typescript
export function useAiAds(params: UseAiAdsParams) {
  // ...

  // 保存 requestId（用于后续的 impression/click 事件）
  const requestIdRef = useRef<string | null>(null);

  useSWR(
    shouldFetch ? requestKey : null,
    async () => {
      const response = await fetch('/api/v1/ads/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData),
      });

      const result = await response.json();

      // ✅ 新：保存 requestId
      if (result.success && result.data?.requestId) {
        requestIdRef.current = result.data.requestId;
      }

      return result;
    },
    // ...
  );

  // 返回 requestId 供组件使用
  return {
    ads,
    loading,
    error,
    requestId: requestIdRef.current, // 新增
  };
}
```

#### 步骤 5：更新广告组件

**示例：ActionCardAd 组件**

**修改前：**

```typescript
export function ActionCardAd({ ad }: ActionCardAdProps) {
  useAdTracking({
    ad,
    trackingUrl: ad.trackingUrl, // ❌ 旧的 pixel URL
  });

  return <div>...</div>;
}
```

**修改后：**

```typescript
export function ActionCardAd({
  ad,
  requestId,
  position,
  totalAds,
}: ActionCardAdProps) {
  const { handleClick, elementRef } = useAdTracking({
    ad,
    requestId,      // ✅ 新增
    position,       // ✅ 新增
    totalAds,       // ✅ 新增
  });

  return (
    <div ref={elementRef} onClick={handleClick}>
      {/* 广告内容 */}
    </div>
  );
}
```

#### 步骤 6：Session 管理（可选）

**文件：** `src/utils/session.ts` (新文件)

```typescript
/**
 * Session 管理
 */

/**
 * 获取或生成 Session ID
 *
 * Session ID 存储在 sessionStorage 中，
 * 用于在同一会话中关联用户的广告交互。
 */
export function getSessionId(): string {
  const SESSION_KEY = 'ad_session_id';

  // 尝试从 sessionStorage 获取
  let sessionId = sessionStorage.getItem(SESSION_KEY);

  if (!sessionId) {
    // 生成新的 session ID
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    sessionStorage.setItem(SESSION_KEY, sessionId);
  }

  return sessionId;
}

/**
 * 生成 View Token（用于展示去重）
 */
export function generateViewToken(adId: string, sessionId: string): string {
  return `vt_${adId}_${sessionId}`;
}
```

---

## 📋 实施计划

### 阶段划分

| 阶段 | 任务 | 预计时间 | 负责人 |
|------|------|----------|--------|
| **阶段 1** | 基础设施 | 2-3 小时 | Frontend Team |
| 1.1 | 创建类型定义文件 | 30 分钟 | |
| 1.2 | 实现 analytics.ts | 1 小时 | |
| 1.3 | 实现 session.ts | 30 分钟 | |
| 1.4 | 单元测试 | 30 分钟 | |
| **阶段 2** | Hook 更新 | 3-4 小时 | Frontend Team |
| 2.1 | 更新 useAdTracking | 2 小时 | |
| 2.2 | 更新 useAiAds | 1 小时 | |
| 2.3 | Hook 测试 | 1 小时 | |
| **阶段 3** | 组件更新 | 2-3 小时 | Frontend Team |
| 3.1 | 更新 ActionCardAd | 30 分钟 | |
| 3.2 | 更新其他广告组件 | 1.5 小时 | |
| 3.3 | 集成测试 | 30 分钟 | |
| **阶段 4** | 验证与发布 | 2-3 小时 | Frontend + Backend |
| 4.1 | 本地验证 | 1 小时 | |
| 4.2 | 后端联调 | 1 小时 | |
| 4.3 | 发布新版本 | 30 分钟 | |

### 任务清单

**阶段 1：基础设施**

- [ ] 创建 `src/types/analytics.ts`
- [ ] 定义 `ImpressionEventData` 接口
- [ ] 定义 `ClickEventData` 接口
- [ ] 定义 API 响应接口
- [ ] 创建 `src/utils/analytics.ts`
- [ ] 实现 `trackAdImpression()` 函数
- [ ] 实现 `trackAdClick()` 函数
- [ ] 添加错误处理
- [ ] 创建 `src/utils/session.ts`
- [ ] 实现 `getSessionId()` 函数
- [ ] 实现 `generateViewToken()` 函数

**阶段 2：Hook 更新**

- [ ] 更新 `useAdTracking` hook
- [ ] 添加 `requestId` 参数
- [ ] 添加 `position` 和 `totalAds` 参数
- [ ] 修改 `handleImpression` 使用新 API
- [ ] 修改 `handleClick` 使用新 API
- [ ] 添加 `impressionTime` 记录
- [ ] 计算 `timeToClickMs`
- [ ] 更新 `useAiAds` hook
- [ ] 保存 `requestId`
- [ ] 返回 `requestId` 供组件使用

**阶段 3：组件更新**

- [ ] 更新 `ActionCardAd` 组件
- [ ] 更新 `SuffixAd` 组件
- [ ] 更新 `FollowUpAd` 组件
- [ ] 更新 `SponsoredSource` 组件
- [ ] 更新 `LeadGenAd` 组件（如果有）
- [ ] 更新 `StaticAd` 组件（如果有）

**阶段 4：验证与发布**

- [ ] 本地测试展示事件
- [ ] 本地测试点击事件
- [ ] 验证 Redis Streams 收到数据
- [ ] 验证 Worker 处理事件
- [ ] 验证数据库插入
- [ ] 后端联调测试
- [ ] 更新文档
- [ ] 发布新版本（例如 v1.1.0）
- [ ] 通知集成方更新

---

## 🧪 测试计划

### 单元测试

**analytics.ts 测试：**

```typescript
describe('Analytics API', () => {
  describe('trackAdImpression', () => {
    it('should send impression event to backend', async () => {
      const data: ImpressionEventData = {
        requestId: 'test-req-001',
        adId: 'ad-001',
        position: 0,
        totalAds: 3,
        sessionId: 'session-123',
      };

      const result = await trackAdImpression(data);
      expect(result).toBe(true);
    });

    it('should handle network errors', async () => {
      // Mock fetch 失败
      jest.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('Network error'));

      const result = await trackAdImpression({
        requestId: 'test',
        adId: 'ad',
        position: 0,
        totalAds: 1,
        sessionId: 'session',
      });

      expect(result).toBe(false);
    });
  });

  describe('trackAdClick', () => {
    it('should send click event and return response', async () => {
      const data: ClickEventData = {
        requestId: 'test-req-001',
        adId: 'ad-001',
        sessionId: 'session-123',
        destinationUrl: 'https://example.com',
      };

      const result = await trackAdClick(data);
      expect(result).toHaveProperty('eventId');
      expect(result).toHaveProperty('redirectUrl');
    });
  });
});
```

### 集成测试

**测试场景：**

| 场景 | 测试步骤 | 预期结果 |
|------|----------|----------|
| **展示跟踪** | 1. 加载广告<br>2. 等待 Intersection Observer 触发<br>3. 检查 Redis Stream | ✅ ad.impression stream 收到事件<br>✅ 数据库 ad_impressions 表插入记录 |
| **点击跟踪** | 1. 展示广告<br>2. 点击广告<br>3. 检查 Redis Stream | ✅ ad.click stream 收到事件<br>✅ 数据库 ad_clicks 表插入记录<br>✅ timeToClickMs 有值 |
| **重复展示** | 1. 展示广告<br>2. 重新加载<br>3. 再次展示 | ✅ 每次展示都记录（去重由后端处理） |
| **跨页面** | 1. 在页面 A 展示广告<br>2. 导航到页面 B<br>3. 检查 session ID | ✅ 两个页面使用相同的 session ID |

### 端到端测试流程

```bash
# 1. 启动本地测试环境
npm run dev

# 2. 打开浏览器开发者工具
# - Network 面板：查看 API 调用
# - Console 面板：查看日志

# 3. 触发广告展示
# - 导航到广告页面
# - 等待广告加载
# - 检查 Network：POST /api/v1/ads/impression

# 4. 验证后端接收
redis-cli> XREVRANGE ad.impression + - COUNT 1
# 应该看到新的事件

# 5. 验证数据库
mysql> SELECT * FROM ad_impressions ORDER BY timestamp DESC LIMIT 1;
# 应该看到新记录

# 6. 触发点击
# - 点击广告
# - 检查 Network：POST /api/v1/ads/click

# 7. 验证点击数据
redis-cli> XREVRANGE ad.click + - COUNT 1
mysql> SELECT * FROM ad_clicks ORDER BY timestamp DESC LIMIT 1;
```

---

## ⚠️ 风险评估

### 潜在风险

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|----------|
| **Breaking Changes** | 高 | 中 | 保留旧函数，标记为 deprecated |
| **API 兼容性** | 中 | 低 | 后端 API 已实现并测试 |
| **性能影响** | 低 | 低 | keepalive 确保不影响性能 |
| **Session 管理** | 中 | 低 | sessionStorage 广泛支持 |
| **数据丢失** | 中 | 低 | fetch keepalive + 重试机制 |

### 向后兼容性

**保留旧的 pixel tracking 函数：**

```typescript
/**
 * @deprecated 使用 trackAdImpression 代替
 */
export async function trackImpression(url: string): Promise<boolean> {
  // 保留实现以向后兼容
  console.warn('[Analytics] trackImpression is deprecated. Use trackAdImpression instead.');

  try {
    await fetch(url, {
      method: 'GET',
      mode: 'no-cors',
      cache: 'no-store',
      keepalive: true,
    });
    return true;
  } catch (error) {
    console.error('[Ad Tracking] Failed to track impression:', error);
    return false;
  }
}
```

### 性能考虑

**使用 `keepalive`：**

```typescript
// ✅ 即使页面卸载，请求也会完成
fetch('/api/v1/ads/impression', {
  method: 'POST',
  body: JSON.stringify(data),
  keepalive: true,  // 关键：确保请求发送
});
```

**不影响用户体验：**

- 异步发送，不阻塞渲染
- 不等待响应（fire-and-forget）
- 失败不影响广告展示

---

## 📊 预期效果

### 数据完整性

修复后，我们将获得完整的事件链：

```
用户行为         事件类型         Redis Stream     数据库表
─────────────────────────────────────────────────────────
请求广告    →    ad.request    →   ad.request   →  ad_requests
系统返回    →    ad.fill       →   ad.fill      →  ad_fills
广告展示    →    ad.impression →   ad.impression →  ad_impressions  ← ✅ 新增
用户点击    →    ad.click      →   ad.click     →  ad_clicks       ← ✅ 新增
```

### 分析能力提升

| 指标 | 修复前 | 修复后 |
|------|--------|--------|
| 展示率 | ❌ 无法计算 | ✅ 可以计算 (impressions/requests) |
| 点击率 | ❌ 无法计算 | ✅ 可以计算 (clicks/impressions) |
| 转化率 | ❌ 无法计算 | ✅ 可以计算 |
| 广告位效果 | ⚠️ 有限 | ✅ 完整的 slot_id 数据 |
| 用户行为分析 | ❌ 无数据 | ✅ 完整的 time_to_click 数据 |

### 示例查询

**计算展示率：**

```sql
SELECT
  slot_id,
  COUNT(DISTINCT r.request_id) as requests,
  COUNT(DISTINCT i.request_id) as impressions,
  ROUND(COUNT(DISTINCT i.request_id) / COUNT(DISTINCT r.request_id) * 100, 2) as fill_rate
FROM ad_requests r
LEFT JOIN ad_impressions i ON r.request_id = i.request_id
GROUP BY slot_id;
```

**计算点击率：**

```sql
SELECT
  ad_source,
  COUNT(DISTINCT i.impression_id) as impressions,
  COUNT(DISTINCT c.event_id) as clicks,
  ROUND(COUNT(DISTINCT c.event_id) / COUNT(DISTINCT i.impression_id) * 100, 2) as ctr
FROM ad_impressions i
LEFT JOIN ad_clicks c ON i.request_id = c.request_id AND i.ad_id = c.ad_id
GROUP BY ad_source;
```

---

## 📚 附录

### A. Backend API 文档

详细的 API 文档位于：
- `backend/src/api/routes/analytics.ts`
- Swagger 文档：`http://localhost:3000/api-docs`

### B. 相关文件路径

**Frontend SDK：**

```
frontend-sdk/
├── src/
│   ├── types/
│   │   └── analytics.ts          [新增]
│   ├── utils/
│   │   ├── analytics.ts          [新增]
│   │   ├── session.ts            [新增]
│   │   └── tracking.ts           [修改：标记为 deprecated]
│   ├── hooks/
│   │   ├── useAdTracking.ts      [修改]
│   │   └── useAiAds.ts           [修改]
│   └── components/
│       ├── ActionCardAd.tsx      [修改]
│       ├── SuffixAd.tsx          [修改]
│       ├── FollowUpAd.tsx        [修改]
│       └── ...
└── package.json
```

**Backend：**

```
backend/
├── src/
│   ├── api/
│   │   └── routes/
│   │       └── analytics.ts      [已实现]
│   └── services/
│       └── analytics/
│           └── event-sender.ts   [已实现]
```

**Data Center：**

```
data-center/
├── internal/
│   ├── events/
│   │   ├── handlers/
│   │   │   └── handlers.go       [已实现]
│   │   └── consumers/
│   │       └── base.go           [已实现]
```

### C. 版本发布计划

**Frontend SDK 版本：v1.1.0**

```bash
# 更新版本号
npm version minor  # 1.0.0 → 1.1.0

# 发布
npm publish

# Git tag
git tag v1.1.0
git push origin v1.1.0
```

**CHANGELOG.md：**

```markdown
## [1.1.0] - 2026-01-30

### Added
- Analytics API 集成 (trackAdImpression, trackAdClick)
- 完整的事件数据支持
- Session ID 管理
- View Token 用于去重
- timeToClickMs 指标

### Changed
- useAdTracking hook 现在接收完整的 analytics 数据
- useAiAds hook 返回 requestId 供跟踪使用

### Deprecated
- trackImpression() - 请使用 trackAdImpression() 代替
- trackClick() - 请使用 trackAdClick() 代替
```

### D. 联系方式

| 团队 | 联系人 |
|------|--------|
| Frontend SDK Team | [待填写] |
| Backend Team | [待填写] |
| Data Center Team | [待填写] |

---

## ✅ 审批清单

- [ ] Frontend Team Lead 审批
- [ ] Backend Team Lead 审核
- [ ] Product Manager 确认
- [ ] QA Team 确认测试计划

---

**文档版本：** 1.0
**最后更新：** 2026-01-30
**状态：** 待审批
