# SDK 开发任务清单

> AI Ad Network Frontend SDK 需要完成的功能

**版本**: 2.0.0
**最后更新**: 2025-01-22
**状态**: 进行中

---

## 📋 概述

本文档列出了 `@ai-ad-network/frontend-sdk` 需要完成的开发和优化任务。

**核心原则**：提供两种接入模式
- **标准版**：90% 的应用，10-30 分钟完成接入
- **旗舰版**：Chatbox 等试验田，完整功能展示

---

## 🎯 双层接入策略

### 定位对比

```
┌─────────────────────────────────────────────────────────────────┐
│                    两种接入模式对比                              │
└─────────────────────────────────────────────────────────────────┘

🚀 标准版（Standard Mode）
├─ 目标用户：90% 的普通应用
├─ 接入时间：10-30 分钟
├─ 代码量：~20 行
├─ 配置：仅需 apiKey
├─ 功能：80% 核心功能
└─ 文档：QUICKSTART.md

🏆 旗舰版（Advanced Mode）
├─ 目标用户：Chatbox 等试验田/深度定制应用
├─ 接入时间：1-3 天
├─ 代码量：~5000 行（宿主端）
├─ 配置：完整可配置
├─ 功能：100% 功能
└─ 文档：ADVANCED.md
```

### 代码对比

#### 标准版接入（目标状态）

```typescript
// === 步骤 1: 安装 ===
npm install @ai-ad-network/frontend-sdk

// === 步骤 2: 包裹应用（3行） ===
import { AdProvider } from '@ai-ad-network/frontend-sdk';

<AdProvider apiKey="ak_xxx">
  <App />
</AdProvider>

// === 步骤 3: 展示广告（5行） ===
import { useAiAds, ActionCardAd } from '@ai-ad-network/frontend-sdk';

function ChatMessage({ query, response }) {
  const { ads } = useAiAds(query, response);
  return (
    <>
      {ads.map(ad => <ActionCardAd key={ad.id} ad={ad} />)}
    </>
  );
}

// 总计：不到 20 行代码 ✅
```

#### 旗舰版接入（Chatbox 当前实现）

```typescript
// 完整的配置系统
// 5000+ 行代码，包含：
// - 配置 Schema 和 Store
// - 数据收集器
// - 频率控制器
// - 6种广告格式配置
// - 完整的调试面板
// - 隐私保护配置
// 等等...
```

---

## 🚀 标准版模式（高优先级）

### 目标

让 90% 的应用能在 **10-30 分钟内** 完成接入，只需要：
1. 安装 SDK
2. 添加 3 行代码
3. 调用一个 hook

### 任务清单

#### STD-1: 默认配置系统

**描述**: SDK 提供合理的默认值，无需配置即可使用

**默认配置**:
```typescript
const DEFAULT_CONFIG = {
  // 自动展示的广告格式
  formats: ['action_card', 'suffix'],

  // 自动位置推断
  placement: 'auto', // SDK 根据 context 自动选择

  // 频率控制（内部处理）
  frequency: {
    action_card: { perSession: 3, perMessages: 5 },
    suffix: { perSession: 2, perMessages: 10 },
  },

  // 自动数据收集
  dataCollection: {
    auto: true, // 自动收集 query, response
    includeContext: false, // 默认不收集上下文（隐私）
  },

  // 自动设备信息收集
  deviceInfo: 'auto', // SDK 自动收集
};
```

**实现要点**:
- 宿主不传任何配置时使用默认值
- 默认值适合 80% 的场景
- 自动推断最佳广告位置

---

#### STD-2: 简化的 AdProvider

**描述**: 最小化参数要求

**API 设计**:
```typescript
// 最简用法：只需要 apiKey
<AdProvider apiKey="ak_xxx">
  <App />
</AdProvider>

// 可选：传递基本上下文
<AdProvider
  apiKey="ak_xxx"
  userId="user_123"  // 可选，用于跨设备追踪
>
  <App />
</AdProvider>

// 可选：启用调试
<AdProvider
  apiKey="ak_xxx"
  debug={process.env.NODE_ENV === 'development'}
>
  <App />
</AdProvider>
```

**实现要点**:
- 所有参数都是可选的（除了 apiKey）
- 自动推断缺失的参数
- 不传配置时使用内部默认值

---

#### STD-3: 智能 useAiAds Hook

**描述**: 自动推断参数，简化调用

**API 设计**:
```typescript
// 最简用法：自动推断所有参数
const { ads } = useAiAds(query, response);

// 等价于：
const { ads } = useAiAds({
  query: query,
  response: response,
  formats: ['action_card', 'suffix'],
  placement: 'auto',
  context: { /* SDK 自动填充 */ }
});

// 可选：指定格式
const { ads } = useAiAds(query, response, {
  formats: ['action_card'], // 只要卡片广告
});

// 可选：自定义上下文
const { ads } = useAiAds(query, response, {
  context: {
    userId: 'xxx',
    customField: 'value',
  },
});
```

**实现要点**:
- 参数位置智能识别（string = query, string = response）
- 自动格式化上下文
- 自动选择广告位置

---

#### STD-4: 自动设备信息收集

**描述**: SDK 自动收集所有必要信息，无需宿主传递

**自动收集的信息**:
```typescript
const autoContext = {
  // 设备信息
  userAgent: navigator.userAgent,
  screen: { width, height },
  viewport: { width, height },
  language: navigator.language,
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,

  // 会话信息
  sessionId: autoGenerate(), // SDK 自动生成
  timestamp: Date.now(),

  // 页面信息
  pageUrl: window.location.href,
  referrer: document.referrer,
};
```

**实现要点**:
- 完全自动，宿主不需要传任何信息
- 如果宿主传了 context，自动合并
- 保证所有必需字段都有值

---

#### STD-5: 零配置广告组件

**描述**: 广告组件开箱即用，无需配置

```typescript
// 自动适配的组件
<ActionCardAd ad={ad} />  // 自动选择最佳样式
<SuffixAd ad={ad} />      // 自动处理样式
<FollowUpAd ad={ad} />    // 自动处理交互
```

**实现要点**:
- 自动检测容器宽度
- 自动选择最佳样式变体
- 自动处理点击追踪

---

#### STD-6: 快速开始文档

**描述**: 创建 10 分钟快速开始指南

**文档结构** (`QUICKSTART.md`):
```markdown
# 快速开始（10 分钟）

## 步骤 1: 安装（1 分钟）
npm install @ai-ad-network/frontend-sdk

## 步骤 2: 集成（5 分钟）
# 复制粘贴这些代码...

## 步骤 3: 展示广告（4 分钟）
# 复制粘贴这些代码...

## 完成！
```

**要点**:
- 所有代码可复制粘贴
- 不需要理解原理
- 提供常见问题解答

---

## 🏆 旗舰版模式（已完成 - Chatbox）

### 目标

展示广告系统的完整能力，作为：
1. 功能演示平台
2. 压力测试环境
3. 最佳实践参考
4. 高级功能的试验场

### 已实现功能（Chatbox 当前状态）

#### 配置系统
- ✅ 完整的 Zod Schema（400 行）
- ✅ Zustand Store + 持久化（250 行）
- ✅ 默认配置 + 4种预设（200 行）
- ✅ 20+ 配置 Hooks（450 行）

#### 核心逻辑
- ✅ 数据收集器（400 行）
- ✅ 频率控制器（300 行）
- ✅ 广告控制器（300 行）
- ✅ 请求构建器（300 行）

#### UI 组件
- ✅ 完整配置页面（967 行）
- ✅ 调试面板（~500 行）
- ✅ 广告插槽组件（~400 行）
- ✅ 消息集成组件（~300 行）

#### 6种广告格式
- ✅ ActionCard（卡片广告）
- ✅ Suffix（后缀广告）
- ✅ FollowUp（跟进问题）
- ✅ SponsoredSource（赞助来源）
- ✅ Static（静态横幅）
- ✅ LeadGen（线索收集）

#### 高级功能
- ✅ 上下文窗口控制
- ✅ 隐私脱敏
- ✅ 数据收集选择
- ✅ Mock 模式
- ✅ 调试日志

### 旗舰版保留价值

即使有标准版，旗舰版仍有价值：

1. **功能验证** - 验证所有功能可用性
2. **性能测试** - 压力测试和性能基准
3. **用户参考** - 展示系统能力
4. **高级需求** - 满足特殊定制需求

---

## 🔄 SDK 内部架构

### 统一的核心

标准版和旗舰版共享同一个 SDK 核心：

```
┌─────────────────────────────────────────────────────────────────┐
│                      SDK 内部架构                                │
└─────────────────────────────────────────────────────────────────┘

应用层
├─ 标准版 API（简化）
└─ 旗舰版 API（完整）

┌─────────────────────────────────────┐
│         SDK 核心（共享）              │
├─────────────────────────────────────┤
│ - API 通信                          │
│ - 广告数据管理                      │
│ - 频率控制（内部）                  │
│ - 设备信息收集                      │
│ - 渲染组件                          │
└─────────────────────────────────────┘

后端 API
```

### 配置合并逻辑

```typescript
// SDK 内部处理
class AdProvider {
  constructor(props) {
    // 1. 基础配置
    this.apiKey = props.apiKey;

    // 2. 默认配置
    this.config = { ...DEFAULT_CONFIG };

    // 3. 旗舰版：合并用户配置
    if (props.mode === 'advanced' && props.config) {
      this.config = deepMerge(this.config, props.config);
    }

    // 4. 自动收集设备信息
    this.deviceInfo = this.collectDeviceInfo();
  }
}
```

---

## 📋 SDK 开发任务优先级

### 🔴 P0 - 标准版核心（必须）

| 任务 | 描述 | 工作量 |
|------|------|--------|
| STD-1 | 默认配置系统 | 2 天 |
| STD-2 | 简化的 AdProvider | 1 天 |
| STD-3 | 智能 useAiAds | 2 天 |
| STD-4 | 自动设备信息收集 | 1 天 |
| STD-5 | 零配置广告组件 | 2 天 |
| STD-6 | 快速开始文档 | 1 天 |

**总计**: ~9 天

### 🟡 P1 - 用户体验（重要）

| 任务 | 描述 | 工作量 |
|------|------|--------|
| UX-1 | TypeScript 类型定义 | 2 天 |
| UX-2 | 错误处理和降级 | 2 天 |
| UX-3 | 加载状态指示 | 1 天 |
| UX-4 | 常见问题文档 | 1 天 |

**总计**: ~6 天

### 🟢 P2 - 优化增强（可选）

| 任务 | 描述 | 工作量 |
|------|------|--------|
| OPT-1 | 性能优化 | 3 天 |
| OPT-2 | 调试工具（标准版） | 2 天 |
| OPT-3 | 高级文档 | 2 天 |
| OPT-4 | 示例项目 | 2 天 |

**总计**: ~9 天

---

## 🔧 后端 API 需求

### 统一 API 设计

后端不需要区分标准版/旗舰版，统一处理：

```typescript
// POST /api/v1/ads/decision
interface AdApiRequest {
  // 基础参数
  query?: string;
  response?: string;
  adFormats: string[];
  placement: string;

  // 上下文（两种模式都会传）
  context: {
    // 标准版：SDK 自动填充
    // 旗舰版：宿主自定义
    userId?: string;
    sessionId?: string;
    app?: { name, version, type };
    platform?: { type };
    [key: string]: unknown;
  };

  // SDK 自动收集的设备信息
  sdkContext: {
    userAgent: string;
    screen: { width, height };
    viewport: { width, height };
    language: string;
    timezone: string;
    [key: string]: unknown;
  };
}
```

**要点**:
- 统一接口，不区分模式
- context 字段灵活，支持任意扩展
- 后端选择性解析字段

---

## 📊 成功指标

### 标准版

| 指标 | 目标 |
|------|------|
| 接入时间 | < 30 分钟 |
| 代码量 | < 50 行 |
| 配置项 | 0 个必需 |
| 文档页数 | < 5 页 |

### 旗舰版

| 指标 | 目标 |
|------|------|
| 功能覆盖率 | 100% |
| 配置灵活性 | 完全可配置 |
| 调试能力 | 完整面板 |
| 参考价值 | 可作为最佳实践 |

---

## 📝 文档结构

```
docs/
├── README.md              # 总览
├── QUICKSTART.md          # 标准版快速开始 ⭐
├── ADVANCED.md            # 旗舰版完整指南
├── API_REFERENCE.md       # API 参考
├── EXAMPLES.md            # 代码示例
├── TROUBLESHOOTING.md     # 故障排查
└── MIGRATION.md           # 版本迁移指南
```

---

## 🎯 实施建议

### 阶段 1: 标准版优先（第 1-2 周）

1. 实现默认配置系统
2. 简化 AdProvider API
3. 智能化 useAiAds
4. 编写快速开始文档

### 阶段 2: 用户体验（第 3 周）

1. 完善 TypeScript 类型
2. 优化错误处理
3. 添加加载状态
4. 补充文档

### 阶段 3: 优化增强（第 4 周）

1. 性能优化
2. 调试工具
3. 示例项目
4. 高级文档

---

## 🔗 相关文档

- [Chatbox 集成指南](./CHATBOX_INTEGRATION.md) - 旗舰版参考
- [组件文档](./COMPONENT_DOCUMENTATION.md)
- [工程师A任务总结](../src/renderer/packages/ads/ENGINEER_A_SUPPLEMENT.md)

---

## 💡 核心原则

> **"Make it work, then make it right, then make it fast."**
>
> - 先让标准版能用（10分钟接入）
> - 再让旗舰版完整（展示全部能力）
> - 最后优化两者性能

---

**文档维护**: SDK 团队
**最后审阅**: 2025-01-22
**版本历史**:
- v1.0.0: 初始版本（单一模式）
- v2.0.0: 双层策略（标准版 + 旗舰版）
