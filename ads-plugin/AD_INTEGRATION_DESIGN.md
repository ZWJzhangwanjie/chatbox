# Chatbox 广告系统集成架构设计文档

> 将AI原生广告网络系统集成到Chatbox应用中的完整架构设计

## 目录

- [1. 可行性分析](#1-可行性分析)
- [2. 架构设计](#2-架构设计)
- [3. 核心模块设计](#3-核心模块设计)
  - [3.1 配置系统](#31-配置系统)
  - [3.2 数据收集层](#32-数据收集层)
  - [3.3 广告控制层](#33-广告控制层)
- [4. 实现路径](#4-实现路径)
- [5. 文件结构](#5-文件结构)
- [6. 风险评估](#6-风险评估)
- [7. 技术栈](#7-技术栈)

---

## 1. 可行性分析

### 1.1 结论

**完全可行** ✓

### 1.2 技术栈匹配

| Chatbox技术 | 广告SDK要求 | 兼容性 |
|-------------|-------------|--------|
| React 18.2.0 | React 16.8+ | ✓ |
| Zustand 5.0.6 | 任意状态管理 | ✓ |
| Mantine UI | 任意UI库 | ✓ |
| Electron 26+ | 任意运行环境 | ✓ |

### 1.3 现有基础设施

- ✓ 已有 `ads-plugin` 目录
- ✓ 完善的AI功能包系统 (`src/renderer/packages/aiFeatures/`)
- ✓ 成熟的配置系统 (`settingsStore` + Zustand persist)
- ✓ 清晰的消息流程 (InputBox → MessageList)

### 1.4 集成优势

1. **非侵入式**: 广告作为独立模块，不影响核心功能
2. **完全可配置**: 所有行为通过UI控制，无需修改代码
3. **调试友好**: 支持Mock模式，便于开发和演示

---

## 2. 架构设计

### 2.1 整体架构图

```
┌─────────────────────────────────────────────────────────────────────┐
│                        广告系统集成架构                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                     配置管理层                               │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │   │
│  │  │ 广告设置页面  │  │ 配置存储层   │  │ 配置验证     │      │   │
│  │  │ (UI配置界面)  │  │ (Zustand)   │  │ (Zod Schema) │      │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘      │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                              ↓                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    广告控制层                                 │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │   │
│  │  │ AdController │  │ AdContext    │  │ 决策引擎     │      │   │
│  │  │ (调度器)     │  │ (上下文管理) │  │ (匹配规则)   │      │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘      │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                              ↓                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    数据收集层                                 │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │   │
│  │  │ 查询收集器   │  │ 响应收集器   │  │ 上下文收集器 │      │   │
│  │  │ (Query)      │  │ (Response)   │  │ (Context)    │      │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘      │   │
│  │  ┌──────────────┐  ┌──────────────┐                          │   │
│  │  │ 记忆收集器   │  │ 画像收集器   │                          │   │
│  │  │ (Memory)     │  │ (Profile)    │                          │   │
│  │  └──────────────┘  └──────────────┘                          │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                              ↓                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    SDK集成层                                  │   │
│  │  ┌──────────────────────────────────────────────────────┐   │   │
│  │  │           @ai-ad-network/frontend-sdk                 │   │   │
│  │  │  ┌──────────┐  ┌──────────┐  ┌──────────────────┐   │   │   │
│  │  │  │AdProvider│  │useAiAds  │  │ Ad Components    │   │   │   │
│  │  │  └──────────┘  └──────────┘  └──────────────────┘   │   │   │
│  │  └──────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                              ↓                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    渲染层                                     │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │   │
│  │  │MessageList   │  │ Message      │  │ InputBox     │      │   │
│  │  │ 插入广告位   │  │ 内嵌广告     │  │ 触发点       │      │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘      │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 数据流图

```
用户发送消息
     ↓
InputBox (输入触发)
     ↓
Session Actions (消息处理)
     ↓
AdController.shouldTrigger() ← adConfigStore (配置检查)
     ↓ Yes
AdRequestBuilder.build() ← DataCollector (数据收集)
     ↓
useAiAds() ← SDK (请求广告API)
     ↓
Ad Components (渲染广告)
     ↓
MessageList / Message (显示)
```

---

## 3. 核心模块设计

### 3.1 配置系统

#### 3.1.1 配置Schema (Zod)

```typescript
// 广告配置 Schema
const adConfigSchema = z.object({
  // ========== 全局开关 ==========
  enabled: z.boolean().default(false),

  // ========== API配置 ==========
  api: z.object({
    baseUrl: z.string().url(),
    apiKey: z.string().min(1),
    timeout: z.number().default(5000),
    debug: z.boolean().default(false),
  }),

  // ========== 数据收集配置 ==========
  dataCollection: z.object({
    // 基础数据
    includeQuery: z.boolean().default(true),           // 用户输入
    includeResponse: z.boolean().default(true),        // AI响应

    // 高级数据
    includeFullContext: z.boolean().default(false),    // 完整对话上下文
    includeMemory: z.boolean().default(false),         // 用户记忆
    includeProfile: z.boolean().default(false),        // 用户画像

    // 上下文窗口配置
    contextWindow: z.number().min(1).max(50).default(10), // 上下文轮数
  }),

  // ========== 广告格式配置 ==========
  formats: z.object({
    // Action Card (卡片广告)
    actionCard: z.object({
      enabled: z.boolean().default(false),
      variant: z.enum(['horizontal', 'vertical', 'compact']),
      placement: z.enum(['post_response', 'inline', 'sidebar']),
      frequency: z.number().min(1).max(10).default(3),      // 每N条消息展示
      maxPerSession: z.number().min(1).default(5),          // 每会话最多
    }),

    // Suffix (后缀广告)
    suffix: z.object({
      enabled: z.boolean().default(false),
      variant: z.enum(['block', 'inline', 'minimal']),
      placement: z.enum(['after_response', 'inline']),
      probability: z.number().min(0).max(1).default(0.3),   // 展示概率
    }),

    // Follow Up (跟进问题)
    followUp: z.object({
      enabled: z.boolean().default(false),
      variant: z.enum(['bubble', 'pill', 'underline']),
      mixWithSuggestions: z.boolean().default(true),
      adPosition: z.number().min(0).default(2),             // 插入位置
    }),

    // Sponsored Source (赞助来源)
    sponsoredSource: z.object({
      enabled: z.boolean().default(false),
      variant: z.enum(['card', 'minimal']),
      mixWithSources: z.boolean().default(true),
      adPosition: z.number().min(0).default(1),
    }),

    // Static (静态横幅)
    static: z.object({
      enabled: z.boolean().default(false),
      size: z.enum(['banner', 'medium_rectangle', 'skyscraper', 'square']),
      position: z.enum(['sidebar', 'header', 'footer']),
      dismissible: z.boolean().default(true),
    }),

    // Lead Gen (线索收集)
    leadGen: z.object({
      enabled: z.boolean().default(false),
      trigger: z.enum(['manual', 'keyword', 'intent']),
      keywords: z.array(z.string()).default([]),
    }),
  }),

  // ========== 调试配置 ==========
  debug: z.object({
    enabled: z.boolean().default(false),
    mockMode: z.boolean().default(false),              // 使用Mock数据
    logRequests: z.boolean().default(true),
    forceShowAds: z.boolean().default(false),          // 强制显示广告
  }),
});

type AdConfig = z.infer<typeof adConfigSchema>;
```

#### 3.1.2 配置UI结构

```
设置 → 广告配置
│
├── 📋 基本设置
│   ├── 启用广告 [开关]
│   ├── API配置
│   │   ├── API Base URL: [https://api.ad-network.com/v1]
│   │   ├── API Key: [********]
│   │   └── 请求超时: [5000] ms
│   └── 调试模式
│       ├── 启用调试日志 [开关]
│       ├── Mock模式 [开关]
│       └── 强制显示广告 [开关]
│
├── 📊 数据收集
│   ├── 基础数据
│   │   ├── ☑ 包含用户输入 (query)
│   │   └── ☑ 包含AI响应 (response)
│   ├── 高级数据
│   │   ├── ☐ 包含完整上下文 (conversation context)
│   │   │   └── 上下文轮数: [10] 轮
│   │   ├── ☐ 包含用户记忆 (memory)
│   │   └── ☐ 包含用户画像 (profile)
│   └── ℹ️ 注意: 启用高级数据前请确保已获得用户同意
│
├── 🎨 广告格式
│   │
│   ├── 🃏 Action Card (卡片广告)
│   │   ├── [启用] 变体: [水平▼] 位置: [响应后▼]
│   │   ├── 展示频率: 每 [3] 条消息
│   │   └── 每会话最多: [5] 条
│   │
│   ├── 📝 Suffix (后缀广告)
│   │   ├── [启用] 变体: [区块▼]
│   │   └── 展示概率: [30]%
│   │
│   ├── 💬 Follow Up (跟进问题)
│   │   ├── [启用] 变体: [气泡▼]
│   │   ├── ☑ 混合到建议问题
│   │   └── 插入位置: 第 [2] 个之后
│   │
│   ├── 🔗 Sponsored Source (赞助来源)
│   │   ├── [启用] 变体: [卡片▼]
│   │   └── ☑ 混合到来源列表
│   │
│   ├── 🖼️ Static (静态横幅)
│   │   ├── [启用] 尺寸: [中等矩形▼]
│   │   ├── 位置: [侧边栏▼]
│   │   └── ☑ 可关闭
│   │
│   └── 📋 Lead Gen (线索收集)
│       ├── [启用]
│       ├── 触发方式: [关键词▼]
│       └── 关键词: [报名, 注册, 订阅]
│
└── 🔧 预览 & 测试
    ├── [发送测试请求] 按钮
    ├── [查看调试日志] 按钮
    └── 最近请求日志:
        └── [日志列表]
```

### 3.2 数据收集层

#### 3.2.1 数据结构定义

```typescript
// 广告触发上下文
interface AdTriggerContext {
  // 当前消息
  currentMessage: {
    query: string;          // 用户输入
    response: string;       // AI响应
    timestamp: number;
    model: string;
    provider: string;
  };

  // 对话上下文 (可选)
  conversationContext?: {
    sessionId: string;
    messageCount: number;
    messages: Array<{
      role: 'user' | 'assistant' | 'system';
      content: string;
      timestamp: number;
    }>;
    topic?: string;         // 识别的对话主题
  };

  // 用户数据 (可选)
  userData?: {
    // 用户记忆
    memory: {
      shortTerm: Record<string, any>;   // 短期记忆
      longTerm: Record<string, any>;    // 长期记忆
    };

    // 用户画像
    profile: {
      interests: string[];              // 兴趣标签
      demographics?: {                  // 人口统计 (脱敏后)
        ageRange?: string;
        language?: string;
        timezone?: string;
      };
      behaviorPattern?: {               // 行为模式
        preferredTopics: string[];
        interactionStyle: string;
      };
    };

    // 用户偏好
    preferences: {
      language: string;
      theme: string;
      customSettings: Record<string, any>;
    };
  };
}

// 广告请求数据
interface AdRequestData {
  query?: string;                        // 用户输入
  response?: string;                     // AI响应
  context?: {
    messages: Array<{
      role: string;
      content: string;
    }>;
    messageCount: number;
  };
  userMemory?: {
    topics: string[];                    // 提取的话题
    entities: Record<string, string>;    // 实体信息 (脱敏)
  };
  userProfile?: {
    interests: string[];
    behaviorPattern: string;
  };
  sessionInfo: {
    model: string;
    provider: string;
    timestamp: number;
  };
  adFormats: AdFormat[];
  placement: AdPlacement;
}
```

#### 3.2.2 数据收集器实现

```typescript
class AdDataCollector {
  constructor(private config: AdConfig) {}

  // 收集广告请求数据
  collect(context: AdTriggerContext): AdRequestData {
    const data: AdRequestData = {
      sessionInfo: {
        model: context.currentMessage.model,
        provider: context.currentMessage.provider,
        timestamp: Date.now(),
      },
      adFormats: this.getActiveFormats(),
      placement: this.determinePlacement(),
    };

    // 基础数据收集
    if (this.config.dataCollection.includeQuery) {
      data.query = context.currentMessage.query;
    }

    if (this.config.dataCollection.includeResponse) {
      data.response = context.currentMessage.response;
    }

    // 高级数据收集
    if (this.config.dataCollection.includeFullContext && context.conversationContext) {
      data.context = this.extractContext(context.conversationContext);
    }

    if (this.config.dataCollection.includeMemory && context.userData?.memory) {
      data.userMemory = this.processMemory(context.userData.memory);
    }

    if (this.config.dataCollection.includeProfile && context.userData?.profile) {
      data.userProfile = this.processProfile(context.userData.profile);
    }

    return data;
  }

  // 提取上下文
  private extractContext(conversationContext: AdTriggerContext['conversationContext']) {
    if (!conversationContext) return undefined;

    const window = this.config.dataCollection.contextWindow;
    const messages = conversationContext.messages.slice(-window);

    return {
      messages: messages.map(m => ({
        role: m.role,
        content: m.content,
      })),
      messageCount: conversationContext.messageCount,
    };
  }

  // 处理用户记忆 (隐私保护)
  private processMemory(memory: AdTriggerContext['userData']['memory']) {
    // 提取关键信息，过滤敏感数据
    return {
      topics: this.extractTopics(memory),
      entities: this.extractEntities(memory),
    };
  }

  // 处理用户画像 (隐私保护)
  private processProfile(profile: AdTriggerContext['userData']['profile']) {
    return {
      interests: profile.interests,
      behaviorPattern: profile.behaviorPattern?.interactionStyle || 'unknown',
    };
  }

  // 提取话题
  private extractTopics(memory: Record<string, any>): string[] {
    // 从记忆中提取主要话题
    const topics: string[] = [];
    // 实现话题提取逻辑
    return topics;
  }

  // 提取实体 (脱敏)
  private extractEntities(memory: Record<string, any>): Record<string, string> {
    const entities: Record<string, string> = {};
    // 实现实体提取和脱敏逻辑
    return entities;
  }

  // 获取启用的广告格式
  private getActiveFormats(): AdFormat[] {
    const formats: AdFormat[] = [];
    const config = this.config.formats;

    if (config.actionCard.enabled) formats.push('action_card');
    if (config.suffix.enabled) formats.push('suffix');
    if (config.followUp.enabled) formats.push('followup');
    if (config.sponsoredSource.enabled) formats.push('source');
    if (config.static.enabled) formats.push('static');
    if (config.leadGen.enabled) formats.push('lead_gen');

    return formats;
  }

  // 确定广告位置
  private determinePlacement(): AdPlacement {
    // 根据配置和上下文确定最佳位置
    return 'post_response';
  }
}
```

### 3.3 广告控制层

#### 3.3.1 广告控制器

```typescript
class AdController {
  private dataCollector: AdDataCollector;
  private frequencyController: FrequencyController;

  constructor(private config: AdConfig) {
    this.dataCollector = new AdDataCollector(config);
    this.frequencyController = new FrequencyController(config);
  }

  // 判断是否应该触发广告
  shouldTrigger(context: AdTriggerContext): boolean {
    // 1. 检查全局开关
    if (!this.config.enabled) return false;

    // 2. 检查调试模式
    if (this.config.debug.forceShowAds) return true;

    // 3. 检查是否有启用的广告格式
    if (!this.hasActiveFormats()) return false;

    // 4. 检查频率控制
    if (!this.frequencyController.shouldShow()) return false;

    return true;
  }

  // 获取广告
  async fetchAds(context: AdTriggerContext): Promise<Ad[]> {
    // 如果是Mock模式，返回测试数据
    if (this.config.debug.mockMode) {
      return this.getMockAds(context);
    }

    // 构建请求数据
    const requestData = this.dataCollector.collect(context);

    // 记录日志
    if (this.config.debug.logRequests) {
      console.log('[AdController] Request:', requestData);
    }

    try {
      // 调用SDK获取广告
      const response = await fetchAds(requestData);

      // 记录展示
      this.frequencyController.recordImpression();

      if (this.config.debug.logRequests) {
        console.log('[AdController] Response:', response);
      }

      return response.ads;
    } catch (error) {
      console.error('[AdController] Error:', error);
      return [];
    }
  }

  // 检查是否有启用的广告格式
  private hasActiveFormats(): boolean {
    return Object.values(this.config.formats).some(f => f.enabled);
  }

  // 获取Mock广告数据
  private getMockAds(context: AdTriggerContext): Ad[] {
    // 返回测试用的广告数据
    return [];
  }
}
```

#### 3.3.2 频率控制器

```typescript
class FrequencyController {
  private messageCount = 0;
  private adCount = 0;
  private lastAdTime = 0;
  private formatCounters: Map<string, number> = new Map();

  constructor(private config: AdConfig) {
    // 初始化格式计数器
    Object.keys(config.formats).forEach(format => {
      this.formatCounters.set(format, 0);
    });
  }

  // 判断是否应该展示广告
  shouldShow(format?: string): boolean {
    // 如果指定了格式，检查该格式的配置
    if (format) {
      return this.shouldShowFormat(format);
    }

    // 检查所有启用的格式
    for (const [formatName, formatConfig] of Object.entries(this.config.formats)) {
      if (formatConfig.enabled && this.shouldShowFormat(formatName)) {
        return true;
      }
    }

    return false;
  }

  // 检查特定格式是否应该展示
  private shouldShowFormat(format: string): boolean {
    const config = this.config.formats[format as keyof typeof this.config.formats];
    if (!config || !config.enabled) return false;

    // 频率控制 (每N条消息)
    if ('frequency' in config && typeof config.frequency === 'number') {
      if (this.messageCount % config.frequency === 0) {
        if ('maxPerSession' in config && this.formatCounters.get(format)! >= config.maxPerSession) {
          return false;
        }
        return true;
      }
    }

    // 概率控制
    if ('probability' in config && typeof config.probability === 'number') {
      if (Math.random() < config.probability) {
        return true;
      }
    }

    return false;
  }

  // 记录消息
  recordMessage(): void {
    this.messageCount++;
  }

  // 记录广告展示
  recordImpression(format?: string): void {
    this.adCount++;
    this.lastAdTime = Date.now();

    if (format) {
      const count = this.formatCounters.get(format) || 0;
      this.formatCounters.set(format, count + 1);
    }
  }

  // 获取统计信息
  getStats() {
    return {
      messageCount: this.messageCount,
      adCount: this.adCount,
      lastAdTime: this.lastAdTime,
      formatCounters: Object.fromEntries(this.formatCounters),
    };
  }

  // 重置计数器
  reset(): void {
    this.messageCount = 0;
    this.adCount = 0;
    this.formatCounters.clear();
  }
}
```

---

## 4. 实现路径

### 阶段一: 基础框架搭建

**目标**: 建立配置系统和基础UI

- [ ] **1.1 创建配置Store** (`src/renderer/packages/ads/config/adConfigStore.ts`)
  - 基于Zustand + persist中间件
  - Zod Schema验证
  - 默认配置
  - 配置迁移逻辑

- [ ] **1.2 创建配置Schema** (`src/renderer/packages/ads/config/adConfigSchema.ts`)
  - 完整的Zod Schema定义
  - TypeScript类型导出

- [ ] **1.3 创建配置页面** (`src/renderer/pages/ads-settings.tsx`)
  - 使用Mantine组件
  - 分组配置项 (基本设置、数据收集、广告格式)
  - 实时预览

- [ ] **1.4 集成路由**
  - 在设置页面添加"广告配置"入口
  - 配置路由跳转

### 阶段二: SDK集成

**目标**: 集成广告SDK并建立数据收集层

- [ ] **2.1 安装SDK依赖**
  ```bash
  npm install @ai-ad-network/frontend-sdk
  ```

- [ ] **2.2 集成AdProvider** (`src/renderer/routes/__root.tsx`)
  - 在应用根组件添加AdProvider
  - 从adConfigStore读取配置
  - 动态更新Provider配置

- [ ] **2.3 创建广告Context** (`src/renderer/packages/ads/context/AdContext.tsx`)
  - 管理广告全局状态
  - 提供useAds hook

- [ ] **2.4 实现数据收集层**
  - `DataCollector.ts`: 数据收集器
  - `AdRequestBuilder.ts`: 请求构建器
  - `privacy.ts`: 隐私保护处理

### 阶段三: 广告渲染集成

**目标**: 在消息流程中集成广告组件

- [ ] **3.1 MessageList组件改造**
  - 添加ActionCard广告位
  - 集成频率控制

- [ ] **3.2 Message组件改造**
  - 添加Suffix广告
  - 添加SponsoredSource

- [ ] **3.3 跟进问题组件集成**
  - 混合FollowUpAd到建议问题

- [ ] **3.4 侧边栏广告**
  - StaticAd横幅

- [ ] **3.5 表单收集广告**
  - LeadGenAd弹窗

### 阶段四: 控制逻辑实现

**目标**: 实现核心控制逻辑

- [ ] **4.1 AdController实现**
  - 触发判断
  - 频率控制
  - 请求构建

- [ ] **4.2 隐私保护**
  - 数据脱敏
  - 用户同意检查

- [ ] **4.3 错误处理**
  - 请求失败降级
  - 超时处理

- [ ] **4.4 调试工具**
  - Mock数据生成
  - 日志面板

### 阶段五: 测试与优化

**目标**: 完善功能，优化性能

- [ ] **5.1 单元测试**
  - 配置验证
  - 数据收集
  - 频率控制

- [ ] **5.2 集成测试**
  - 完整流程测试
  - 多格式切换

- [ ] **5.3 性能优化**
  - 请求缓存
  - 预加载策略

- [ ] **5.4 UI优化**
  - 加载状态
  - 过渡动画

---

## 5. 文件结构

```
src/renderer/packages/ads/
├── index.ts                          # 模块导出
│
├── config/                           # 配置模块
│   ├── adConfigSchema.ts            # Zod配置Schema
│   ├── defaultConfig.ts             # 默认配置
│   └── adConfigStore.ts             # Zustand Store
│
├── core/                            # 核心逻辑
│   ├── AdController.ts              # 广告控制器
│   ├── AdRequestBuilder.ts          # 请求构建器
│   ├── FrequencyController.ts       # 频率控制器
│   └── DataCollector.ts             # 数据收集器
│
├── context/                         # React Context
│   └── AdContext.tsx                # 广告Context
│
├── hooks/                           # 自定义Hooks
│   ├── useAdConfig.ts               # 配置Hook
│   ├── useAdTrigger.ts              # 触发Hook
│   └── useAdData.ts                 # 数据Hook
│
├── components/                      # 广告组件封装
│   ├── AdSlot.tsx                   # 广告插槽容器
│   ├── DebugPanel.tsx               # 调试面板
│   └── MockDataGenerator.ts         # Mock数据生成
│
└── utils/                           # 工具函数
    ├── privacy.ts                   # 隐私处理
    ├── logger.ts                    # 日志工具
    └── validators.ts                # 验证器

src/renderer/pages/
└── ads-settings.tsx                 # 广告配置页面

src/renderer/components/
├── MessageList.tsx                  # 修改: 添加广告位
├── Message.tsx                      # 修改: 内嵌广告
└── FollowUpQuestions.tsx            # 修改: 混合广告

src/renderer/routes/
└── __root.tsx                       # 修改: 添加AdProvider
```

---

## 6. 风险评估

### 6.1 技术风险

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|----------|
| SDK版本冲突 | 中 | 低 | 使用独立版本隔离，必要时fork SDK |
| 性能影响 | 中 | 中 | 异步加载、懒渲染、请求节流 |
| 数据泄露 | 高 | 低 | 数据脱敏、用户同意机制 |

### 6.2 产品风险

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|----------|
| 用户体验下降 | 中 | 中 | 提供完整配置选项，可随时关闭 |
| 隐私合规问题 | 高 | 中 | 添加隐私政策、数据最小化原则 |
| 广告误判 | 低 | 中 | 提供反馈机制、持续优化 |

### 6.3 风险缓解策略

1. **渐进式部署**: 先在开发环境验证，再逐步推广
2. **用户可控**: 提供完整的开关选项
3. **数据最小化**: 默认只收集必要数据
4. **透明度**: 在UI中清楚说明数据收集范围

---

## 7. 技术栈

### 7.1 核心依赖

```json
{
  "dependencies": {
    "@ai-ad-network/frontend-sdk": "latest",
    "zod": "^3.x",
    "zustand": "^5.x"
  }
}
```

### 7.2 开发依赖

```json
{
  "devDependencies": {
    "@types/react": "^18.x",
    "typescript": "^5.x"
  }
}
```

---

## 8. 关键优势

1. **完全可配置** - 所有广告行为都可通过UI配置，无需修改代码
2. **调试友好** - Mock模式、强制显示、详细日志
3. **隐私保护** - 数据脱敏、用户可控、符合隐私规范
4. **渐进增强** - 不影响核心功能，可随时启用/禁用
5. **可扩展性** - 模块化设计，易于添加新广告格式
6. **性能优化** - 异步加载、频率控制、智能缓存

---

## 9. 下一步建议

1. **优先实现**: 阶段一(基础框架) + 阶段二(SDK集成)
2. **测试验证**: 使用Mock模式测试各种广告格式
3. **逐步完善**: 根据测试结果调整配置和UI
4. **真实集成**: 最后添加真实API调用和数据收集

---

## 附录

### A. 广告格式对照表

| 格式 | 组件 | 用途 | 配置项 |
|------|------|------|--------|
| Action Card | `ActionCardAd` | 产品/服务推荐 | variant, placement, frequency |
| Suffix | `SuffixAd` | 附加信息 | variant, probability |
| Follow Up | `FollowUpAd` | 跟进问题 | variant, mixWithSuggestions |
| Sponsored Source | `SponsoredSource` | 赞助链接 | variant, mixWithSources |
| Static | `StaticAd` | 横幅广告 | size, position |
| Lead Gen | `LeadGenAd` | 表单收集 | trigger, keywords |

### B. 配置默认值

```typescript
const defaultAdConfig: AdConfig = {
  enabled: false,
  api: {
    baseUrl: 'https://api.ad-network.com/v1',
    apiKey: '',
    timeout: 5000,
    debug: false,
  },
  dataCollection: {
    includeQuery: true,
    includeResponse: true,
    includeFullContext: false,
    includeMemory: false,
    includeProfile: false,
    contextWindow: 10,
  },
  formats: {
    actionCard: { enabled: false, variant: 'horizontal', placement: 'post_response', frequency: 3, maxPerSession: 5 },
    suffix: { enabled: false, variant: 'block', placement: 'after_response', probability: 0.3 },
    followUp: { enabled: false, variant: 'bubble', mixWithSuggestions: true, adPosition: 2 },
    sponsoredSource: { enabled: false, variant: 'card', mixWithSources: true, adPosition: 1 },
    static: { enabled: false, size: 'medium_rectangle', position: 'sidebar', dismissible: true },
    leadGen: { enabled: false, trigger: 'manual', keywords: [] },
  },
  debug: {
    enabled: false,
    mockMode: false,
    logRequests: true,
    forceShowAds: false,
  },
};
```

---

*文档版本: 1.0*
*最后更新: 2025-01-22*
