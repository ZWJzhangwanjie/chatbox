# 接入方申请指南

## 概述

本文档面向平台管理员和接入方，说明如何使用**统一接入 API**一站式创建 Backend 和 Data-center 两个系统的完整凭证。

---

## 目录

- [快速开始](#快速开始)
- [统一接入 API](#统一接入-api-推荐)
  - [API 规范](#api-规范)
  - [使用示例](#使用示例)
  - [响应格式](#响应格式)
- [传统方式（分步创建）](#传统方式分步创建)
- [接入方配置指南](#接入方配置指南)
- [接入方 API Key 处理](#接入方-api-key-处理)
- [权限等级说明](#权限等级说明)
- [API Key 管理](#api-key-管理)
- [测试与验证](#测试与验证)
- [常见问题](#常见问题)

---

## 快速开始

### 前置条件

1. **管理员权限**：需要拥有 `X-Admin-Key` 来调用管理 API
2. **环境变量**：确保以下配置已设置
3. **服务运行**：Backend 服务正常运行（Data-center 可选）

### 环境配置

```bash
# backend/.env

# Admin 认证
ADMIN_SECRET_KEY=your_admin_secret_key
ENABLE_AUTH=true

# Data-center API 配置（统一接入需要）
DATA_CENTER_API_BASE=http://localhost:8080
DATA_CENTER_ADMIN_API_KEY=sk_admin_system
DATA_CENTER_DASHBOARD_URL=http://localhost:8080/dashboard
```

### 一键接入

```bash
curl -X POST http://localhost:3000/api/onboard \
  -H "Content-Type: application/json" \
  -H "X-Admin-Key: ${ADMIN_SECRET_KEY}" \
  -d '{
    "name": "ChatBox AI",
    "email": "tech@acme.com",
    "tier": "GROWTH"
  }'
```

> ⚠️ **注意**: `tier` 参数必须使用大写值：`STARTER` | `GROWTH` | `SCALE` | `CUSTOM`

**一次调用**，即可获得：
- ✅ Backend 应用凭证 (`ak_*` Key)
- ✅ Data-center Publisher 凭证 (`sk_*` Key)
- ✅ Analytics API 凭证
- ✅ 完整配置说明

---

## 统一接入 API（推荐）

### 概述

统一接入 API (`POST /api/onboard`) 提供一站式接入服务，可以**一次调用**同时在以下两个系统创建完整资源：

```text
┌─────────────────────────────────────────────────────────────┐
│                  POST /api/onboard                          │
│                         Backend                             │
└─────────────────────────────┬───────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
┌─────────────────────────┐     ┌─────────────────────────┐
│   Backend 系统          │     │   Data-center 系统      │
│   (广告请求 API)        │     │   (数据分析平台)        │
├─────────────────────────┤     ├─────────────────────────┤
│ ✅ 创建 Client          │     │ ✅ 创建 Publisher        │
│ ✅ 生成 ak_* Key        │     │ ✅ 生成 sk_* Key         │
│ ✅ 配置配额和域名       │     │ ✅ 创建 Analytics API    │
│ ✅ 返回完整凭证         │     │ ✅ 返回登录凭证          │
└─────────────────────────┘     └─────────────────────────┘
              │                               │
              └───────────────┬───────────────┘
                              ▼
                    ┌─────────────────┐
                    │  返回统一响应    │
                    └─────────────────┘
```

### API 规范

#### 端点

```text
POST /api/onboard
```

#### 认证

需要 Admin Key（通过 `X-Admin-Key` header 传递）

#### 请求参数

| 参数 | 类型 | 必填 | 说明 | 示例 |
|------|------|------|------|------|
| name | string | ✅ | 应用名称 | "ChatBox AI" |
| email | string | ✅ | 联系邮箱 | "tech@acme.com" |
| company | string | | 公司名称 | "Acme Corporation" |
| website | string | | 网站 URL | "https://acme.com" |
| tier | string | | 套餐等级（大写） | "STARTER" \| "GROWTH" \| "SCALE" \| "CUSTOM" |
| allowedOrigins | array | | 域名白名单 | ["https://acme.com"] |
| useCase | string | | 使用场景 | "AI Chatbot" |
| metadata | object | | 其他元数据 | {...} |

### 使用示例

#### 示例 1：创建 Growth 套餐应用

```bash
curl -X POST http://localhost:3000/api/onboard \
  -H "Content-Type: application/json" \
  -H "X-Admin-Key: ${ADMIN_SECRET_KEY}" \
  -d '{
    "name": "ChatBox AI",
    "company": "Acme Corporation",
    "email": "tech@acme.com",
    "website": "https://acme.com",
    "tier": "GROWTH",
    "allowedOrigins": ["https://acme.com", "https://app.acme.com"],
    "useCase": "AI Chatbot Ad Integration",
    "metadata": {
      "industry": "SaaS",
      "expectedTraffic": "10k requests/day"
    }
  }'
```

#### 示例 2：创建 Starter 套餐（测试环境）

```bash
curl -X POST http://localhost:3000/api/onboard \
  -H "Content-Type: application/json" \
  -H "X-Admin-Key: ${ADMIN_SECRET_KEY}" \
  -d '{
    "name": "Test App",
    "email": "test@example.com",
    "tier": "STARTER"
  }'
```

### 响应格式

#### 成功响应

```json
{
  "success": true,
  "application": {
    "name": "ChatBox AI",
    "company": "Acme Corporation",
    "email": "tech@acme.com",
    "website": "https://acme.com"
  },
  "backend": {
    "clientId": "client_abc123xyz",
    "name": "ChatBox AI",
    "apiKey": "ak_chatbox_k8Hj3mN9pQ2rT5vY8xZ1cD4fG6hJ9kLm",
    "tier": "GROWTH",
    "status": "ACTIVE",
    "quota": {
      "requestsPerDay": 10000,
      "requestsPerMonth": 200000,
      "concurrentRequests": 10
    }
  },
  "dataCenter": {
    "publisher": {
      "id": "pub-chatbox-001",
      "name": "chatbox-ai",
      "displayName": "ChatBox AI",
      "contactEmail": "tech@acme.com",
      "apiKey": "sk_chatbox_A1B2C3D4E5F6G7H8",
      "permissionLevel": "standard",
      "status": "active"
    },
    "apiKey": {
      "id": "key_xyz789",
      "keyName": "default-key",
      "apiKey": "sk_default_chatbox_X9Y8Z7W6V5U4T3S2",
      "scopes": ["overview", "stats", "performance", "trends"],
      "rateLimitPerMinute": 1000
    },
    "dashboardUrl": "http://localhost:8080/dashboard",
    "analyticsApiUrl": "http://localhost:8080/api/v1/analytics"
  },
  "instructions": {
    "backend": {
      "apiBaseUrl": "http://localhost:3000/api/v1",
      "integrationGuide": "使用提供的 API Key 集成 Frontend SDK"
    },
    "dataCenter": {
      "dashboardUrl": "http://localhost:8080/dashboard",
      "loginInstructions": "使用 API Key 登录: sk_default_chatbox_X9Y8Z7W6V5U4T3S2"
    }
  }
}
```

#### 带警告的响应（Data-center 不可用）

```json
{
"success":true,
"application":{
"name":"ChatBox",
"email":"tech@acme.com"
},
"backend":{
"clientId":"2a75c71f-40a3-4ca4-aea1-b7cf0eb61dde",
"name":"ChatBox",
"apiKey":"ak_2a75c71f_g999MT1Kv0m-bHF0O2QdedvCR41inFwIkFJjn3UVM9U",
"tier":"GROWTH",
"status":"PENDING",
"quota":{
"requestsPerDay":10000,
"requestsPerMonth":200000,
"concurrentRequests":20
}
},
"dataCenter":{
"publisher":{
"id":"39f3fe20-fe20-fe20-fe20-ccb839f3fe20",
"name":"chatbox",
"displayName":"ChatBox",
"contactEmail":"tech@acme.com",
"apiKey":"sk_chatbox_188eccb839f405f0",
"permissionLevel":"standard",
"status":"active"
},
"apiKey":{
"keyName":"default-key",
"apiKey":"sk_default-key_188eccb83d9bc4b8",
"scopes":[
"overview",
"stats",
"performance",
"trends"
],
"rateLimitPerMinute":1000
},
"dashboardUrl":"http://localhost:8080/dashboard",
"analyticsApiUrl":"http://localhost:8080/api/v1/analytics"
},
"instructions":{
"backend":{
"apiBaseUrl":"http://localhost:3000/api/v1",
"integrationGuide":"使用提供的 API Key 集成 Frontend SDK"
},
"dataCenter":{
"dashboardUrl":"http://localhost:8080/dashboard",
"loginInstructions":"使用 API Key 登录: sk_default-key_188eccb83d9bc4b8"
}
}
}
```

#### 错误响应

```json
{
  "success": false,
  "error": "Unauthorized: Invalid admin key"
}
```

### 套餐映射

| Backend Tier | Data-center Permission | 配额 | 适用场景 |
|--------------|----------------------|------|---------|
| STARTER | basic | 1K/天, 20K/月 | 个人项目、原型验证 |
| GROWTH | standard | 10K/天, 200K/月 | 小型团队、创业公司 |
| SCALE | advanced | 100K/天, 2M/月 | 中大型企业 |
| CUSTOM | advanced | 自定义 | 大客户、企业级 |

### 其他端点

#### 健康检查

```bash
curl http://localhost:3000/api/onboard/health
```

#### 查询接入状态

```bash
curl http://localhost:3000/api/onboard/{clientId} \
  -H "X-Admin-Key: ${ADMIN_SECRET_KEY}"
```

---

## 传统方式（分步创建）

> 💡 如果需要更细粒度的控制，或者只需要创建其中一个系统的资源，可以使用传统方式。

### 步骤 1：创建 Backend Client

```bash
curl -X POST http://localhost:3000/api/clients \
  -H "Content-Type: application/json" \
  -H "X-Admin-Key: ${ADMIN_SECRET_KEY}" \
  -d '{
    "name": "ChatBox AI",
    "email": "tech@acme.com",
    "tier": "GROWTH"
  }'
```

### 步骤 2：生成 Backend API Key

```bash
curl -X POST http://localhost:3000/api/clients/{clientId}/keys \
  -H "Content-Type: application/json" \
  -H "X-Admin-Key: ${ADMIN_SECRET_KEY}" \
  -d '{
    "type": "production"
  }'
```

### 步骤 3：创建 Data-center Publisher（可选）

```bash
curl -X POST http://localhost:8080/api/v1/admin/publishers \
  -H "Content-Type: application/json" \
  -H "X-API-Key: ${DATA_CENTER_ADMIN_API_KEY}" \
  -d '{
    "name": "chatbox-ai",
    "displayName": "ChatBox AI",
    "contactEmail": "tech@acme.com",
    "apiSecret": "your-api-secret-min-16-chars",
    "permissionLevel": "standard"
  }'
```

### 步骤 4：创建 Data-center API Key（可选）

```bash
curl -X POST http://localhost:8080/api/v1/admin/api-keys \
  -H "Content-Type: application/json" \
  -H "X-API-Key: ${DATA_CENTER_ADMIN_API_KEY}" \
  -d '{
    "publisherId": "pub-chatbox-001",
    "keyName": "default-key",
    "apiSecret": "your-api-secret-min-16-chars",
    "scopes": ["overview", "stats", "performance", "trends"]
  }'
```

---

## 接入方配置指南

### 发送给接入方的凭证模板

使用统一接入 API 创建后，发送以下信息给接入方：

---

**主题**: 🎉 您的广告平台接入申请已批准

亲爱的 {{接入方名称}}，

您的接入申请已成功创建！以下是您在两个系统的完整凭证：

### 📋 应用信息

| 项目 | 内容 |
|------|------|
| **应用名称** | ChatBox AI |
| **公司** | Acme Corporation |
| **联系邮箱** | tech@acme.com |
| **网站** | https://acme.com |

---

### 🔑 Backend 系统凭证（广告请求 API）

| 项目 | 内容 |
|------|------|
| **应用 ID** | `client_abc123xyz` |
| **API Key** | `ak_chatbox_k8Hj3mN9pQ2rT5vY8xZ1cD4fG6hJ9kLm` |
| **套餐等级** | GROWTH |
| **状态** | ✅ 已激活 |

**配额限制**：
- 每日请求：10,000 次
- 每月请求：200,000 次
- 并发请求：10 个

**API Base URL**: `https://api.example.com/v1`

---

### 📊 Data-center 系统凭证（数据分析平台）

#### Publisher 信息

| 项目 | 内容 |
|------|------|
| **Publisher ID** | `pub-chatbox-001` |
| **Publisher API Key** | `sk_chatbox_A1B2C3D4E5F6G7H8` |

#### Analytics API Key

| 项目 | 内容 |
|------|------|
| **Key 名称** | default-key |
| **API Key** | `sk_default_chatbox_X9Y8Z7W6V5U4T3S2` |
| **权限范围** | overview, stats, performance, trends |
| **速率限制** | 1000 次/分钟 |

**Dashboard URL**: `https://analytics.example.com/dashboard`
**Analytics API**: `https://analytics.example.com/api/v1/analytics`

---

### 🚀 快速开始

#### 1. Backend 集成（广告请求）

```bash
npm install @ai-ad-network/frontend-sdk
```

```tsx
import { AdProvider } from '@ai-ad-network/frontend-sdk';

function App() {
  return (
    <AdProvider
      config={{
        apiKey: 'ak_chatbox_k8Hj3mN9pQ2rT5vY8xZ1cD4fG6hJ9kLm',
        apiBaseUrl: 'https://api.example.com/v1',
        enabled: true,
      }}
    >
      <YourApp />
    </AdProvider>
  );
}
```

#### 2. Data-center 登录（数据分析）

1. 访问: https://analytics.example.com/dashboard
2. 输入 API Key: `sk_default_chatbox_X9Y8Z7W6V5U4T3S2`
3. 登录后即可查看广告效果数据

---

### 🔐 安全建议

1. ✅ **Backend API Key** (`ak_*`) - 用于服务端，不要在前端暴露
2. ✅ **Data-center API Key** (`sk_*`) - 可在前端使用，需配置域名白名单
3. ✅ 定期轮换 API Key（建议每 3-6 个月）
4. ❌ 不要在代码仓库中硬编码 API Key
5. ❌ 不要在浏览器控制台或 localStorage 存储

---

### 📚 文档链接

- [Backend 集成文档](https://docs.example.com/backend)
- [Data-center 使用指南](https://docs.example.com/analytics)
- [API 参考文档](https://docs.example.com/api)

---

### 💬 技术支持

- 📧 Email: support@yourplatform.com
- 📚 文档: https://docs.yourplatform.com
- 💬 Discord: https://discord.gg/yourserver

如有任何问题，请随时联系我们！

祝接入顺利！

---

**重要提醒**：
- ⚠️ API Key 仅在创建时显示一次，请妥善保管
- 📝 建议将凭证保存到安全的密码管理器中
- 🔄 建议每 3-6 个月轮换一次 API Key

---

## 接入方 API Key 处理

### 处理流程概览

```text
收到 API Key
    ↓
安全存储（环境变量 / 密钥管理服务）
    ↓
应用配置
    ↓
测试连接
    ↓
错误处理配置
    ↓
监控使用情况
    ↓
定期轮换
```

### 第一步：安全存储 API Key

| 场景 | 存储方式 | 示例 |
|------|---------|------|
| **本地开发** | `.env` 文件（加入 .gitignore） | `AD_API_KEY=ak_xxx_prod_xxx` |
| **容器化部署** | Docker Secrets / 环境变量 | `docker run -e AD_API_KEY=...` |
| **云平台** | 密钥管理服务 | AWS Secrets Manager, Azure Key Vault |
| **Serverless** | 平台环境变量 | Vercel Env Vars, Lambda Env Vars |
| **Kubernetes** | Secrets + ConfigMap | `kubectl create secret generic` |

### 第二步：应用配置

#### 推荐架构：前端 → 后端代理 → 广告 API

```javascript
// server.js - 后端代理
const AD_API_KEY = process.env.AD_API_KEY; // 服务端存储

app.post('/api/ads/request', async (req, res) => {
  const response = await fetch('https://api.example.com/v1/ads/request', {
    headers: {
      'X-API-Key': AD_API_KEY,  // ← 服务端添加
    },
    body: JSON.stringify(req.body),
  });
  res.json(await response.json());
});
```

### 第三步：测试连接

```javascript
// test-connection.js
const response = await fetch('https://api.example.com/v1/ads/request', {
  headers: { 'X-API-Key': process.env.AD_API_KEY },
  body: JSON.stringify({ query: 'test' }),
});
console.log(response.ok ? '✅ 连接成功' : '❌ 连接失败');
```

### 第四步：错误处理

| 错误代码 | 含义 | 处理方案 |
|---------|------|---------|
| `401` | API Key 无效 | 检查 Key 配置 |
| `403` | 域名不在白名单 | 联系管理员添加 |
| `429` | 超出速率限制 | 实现指数退避重试 |
| `500` | 服务器错误 | 联系技术支持 |

### 第五步：监控使用情况

```typescript
class UsageMonitor {
  private requestCount = 0;
  private dailyLimit: number;

  trackRequest() {
    this.requestCount++;
    if (this.requestCount >= this.dailyLimit * 0.8) {
      console.warn(`⚠️ 配额使用率: ${this.requestCount}/${this.dailyLimit} (80%)`);
    }
  }
}
```

### 第六步：API Key 轮换

**推荐轮换周期**：
- 生产环境：每 3-6 个月
- 测试环境：每 1-3 个月
- 安全事件：立即轮换

**轮换步骤**：
1. 生成新 Key（旧 Key 仍可用）
2. 更新应用配置
3. 验证新 Key 工作
4. 撤销旧 Key

---

## 权限等级说明

### Backend 套餐等级

| 等级 | 配额 | 适用场景 |
|------|------|---------|
| **STARTER** | 1,000/天, 20,000/月 | 个人项目、原型验证 |
| **GROWTH** | 10,000/天, 200,000/月 | 小型团队、创业公司 |
| **SCALE** | 100,000/天, 2,000,000/月 | 中大型企业 |
| **CUSTOM** | 自定义 | 大客户、企业级 |

### Data-center 权限级别

| 级别 | 可访问范围 |
|------|-----------|
| `basic` | overview, stats |
| `standard` | overview, stats, performance, trends |
| `advanced` | 所有分析功能 + export |
| `admin` | 所有功能 + 管理接口 |

### API Key 类型

| 类型 | 用途 | 限制 |
|------|------|------|
| **Testing** | 开发、测试 | 无配额限制 |
| **Development** | 预发布 | 与生产相同配额 |
| **Production** | 生产环境 | 严格配额限制 |

---

## API Key 管理

### 查看 API Key 列表

```bash
curl http://localhost:3000/api/clients/{clientId}/keys \
  -H "X-Admin-Key: ${ADMIN_SECRET_KEY}"
```

### 撤销 API Key

```bash
curl -X DELETE http://localhost:3000/api/clients/{clientId}/keys/{keyId} \
  -H "X-Admin-Key: ${ADMIN_SECRET_KEY}"
```

### 查看使用统计

```bash
curl "http://localhost:3000/api/clients/{clientId}/usage?startDate=2024-01-01&endDate=2024-01-31" \
  -H "X-Admin-Key: ${ADMIN_SECRET_KEY}"
```

---

## 测试与验证

### 自动化测试脚本

```bash
cd backend
./scripts/test-onboard-api.sh
```

测试脚本会验证：
- ✅ 服务状态检查
- ✅ 创建接入应用
- ✅ Backend API Key 验证
- ✅ Data-center API Key 验证
- ✅ 查询接入状态

### 手动验证步骤

#### 1. 验证 Backend API Key

```bash
export AD_API_KEY=ak_chatbox_k8Hj3mN9pQ2rT5vY8xZ1cD4fG6hJ9kLm

curl -X POST http://localhost:3000/api/v1/ads/request \
  -H "X-API-Key: ${AD_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"query": "test", "clientInfo": {"device": {"os": "web"}}}'
```

#### 2. 验证 Data-center API Key

```bash
export DC_API_KEY=sk_default_chatbox_X9Y8Z7W6V5U4T3S2

curl -H "X-API-Key: ${DC_API_KEY}" \
  http://localhost:8080/api/v1/analytics/overview
```

#### 3. 测试 Data-center Dashboard 登录

1. 访问: http://localhost:8080/dashboard
2. 输入 API Key
3. 验证可以看到数据

---

## 常见问题

### Q1: Data-center 创建失败怎么办？

**A**: Backend Client 仍然创建成功。可以稍后手动在 Data-center 创建 Publisher：

1. 检查 Data-center 服务是否运行
2. 检查 `DATA_CENTER_API_BASE` 配置是否正确
3. 检查 `DATA_CENTER_ADMIN_API_KEY` 是否正确（默认: `sk_admin_system`）
4. 修复后重新调用统一接入 API（会创建新的 Client）

### Q2: 如何只创建 Backend Client？

**A**: 使用传统的 `/api/clients` 端点：

```bash
curl -X POST http://localhost:3000/api/clients \
  -H "X-Admin-Key: ${ADMIN_SECRET_KEY}" \
  -d '{"name": "My App", "email": "test@example.com"}'
```

### Q3: 接入方丢失凭证怎么办？

**A**: API Key 无法找回，需要重新生成：

```bash
# 1. 撤销旧 Key
curl -X DELETE /api/clients/{clientId}/keys/{keyId}

# 2. 创建新 Key
curl -X POST /api/clients/{clientId}/keys
```

### Q4: 如何升级套餐？

**A**:

```bash
curl -X PUT http://localhost:3000/api/clients/{clientId} \
  -H "X-Admin-Key: ${ADMIN_SECRET_KEY}" \
  -d '{"tier": "SCALE"}'
```

### Q5: 测试环境和生产环境的 Key 有什么区别？

**A**:

| 特性 | 测试 Key | 生产 Key |
|------|----------|----------|
| 前缀 | `ak_xxx_test_` | `ak_xxx_prod_` |
| 配额限制 | 无 | 严格 |
| 过期时间 | 短期（30天） | 长期（1年+） |

### Q6: 统一接入 API 会创建哪些资源？

**A**:
- ✅ Backend Client + API Key (`ak_*`)
- ✅ Data-center Publisher + API Key (`sk_*`)
- ✅ Data-center Analytics API Key
- ✅ 自动配置套餐和权限映射

---

## 附录

### A. 数据库 Schema

```sql
-- Backend Clients 表
CREATE TABLE clients (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  company VARCHAR(100),
  email VARCHAR(255) NOT NULL,
  website VARCHAR(255),
  status ENUM('PENDING', 'ACTIVE', 'SUSPENDED', 'BLOCKED'),
  tier ENUM('STARTER', 'GROWTH', 'SCALE', 'CUSTOM'),
  quota_requests_per_day INT,
  quota_requests_per_month INT,
  allowed_origins JSON,
  metadata JSON,
  created_at TIMESTAMP
);

-- Backend API Keys 表
CREATE TABLE api_keys (
  id VARCHAR(36) PRIMARY KEY,
  client_id VARCHAR(36),
  key_hash VARCHAR(64) UNIQUE,
  key_prefix VARCHAR(20) UNIQUE,
  type ENUM('PRODUCTION', 'DEVELOPMENT', 'TESTING'),
  is_active BOOLEAN,
  created_at TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id)
);
```

### B. 完整 API 列表

#### 统一接入 API

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/onboard` | POST | 创建统一接入 |
| `/api/onboard/health` | GET | 健康检查 |
| `/api/onboard/:clientId` | GET | 查询接入状态 |

#### Backend 管理 API

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/clients` | POST | 创建应用 |
| `/api/clients` | GET | 列出所有应用 |
| `/api/clients/{id}` | GET | 获取应用详情 |
| `/api/clients/{id}` | PUT | 更新应用 |
| `/api/clients/{id}/keys` | POST | 创建 API Key |
| `/api/clients/{id}/keys` | GET | 列出 API Key |
| `/api/clients/{id}/keys/{keyId}` | DELETE | 撤销 API Key |
| `/api/clients/{id}/usage` | GET | 获取使用统计 |

#### Data-center 管理 API

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/v1/admin/publishers` | POST | 创建 Publisher |
| `/api/v1/admin/publishers` | GET | 列出 Publishers |
| `/api/v1/admin/api-keys` | POST | 创建 API Key |
| `/api/v1/admin/api-keys` | GET | 列出 API Key |

### C. 相关文档

- [统一接入 API 技术文档](./UNIFIED_ONBOARDING_API.md)
- [Backend API 文档](./API_DOCUMENTATION.md)
- [Data-center 文档](../data-center/README.md)

---

**文档版本**: v2.1.0
**最后更新**: 2025-01-28
**维护者**: Platform Team
