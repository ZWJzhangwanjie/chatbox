# Chatbox 广告系统集成 - 任务分配计划

> **项目周期**: 预计 2-3 周
> **团队配置**: 3名资深前端工程师 (并行开发)
> **协作模式**: 按模块拆分，接口契约优先

---

## 📋 任务分配总览

```
┌─────────────────────────────────────────────────────────────────────┐
│                        并行开发架构                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐ │
│  │   工程师 A      │    │   工程师 B      │    │   工程师 C      │ │
│  │  配置与基础     │    │  核心逻辑层     │    │  UI与集成层     │ │
│  ├─────────────────┤    ├─────────────────┤    ├─────────────────┤ │
│  │ • 配置Schema    │    │ • AdController  │    │ • 配置页面UI    │ │
│  │ • Zustand Store │    │ • DataCollector │    │ • 广告组件封装  │ │
│  │ • 类型定义      │    │ • FrequencyCtrl │    │ • Message集成   │ │
│  │ • AdProvider    │    │ • 请求构建      │    │ • 调试工具      │ │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘ │
│           │                      │                      │          │
│           └──────────────────────┼──────────────────────┘          │
│                                  ↓                                 │
│                    ┌─────────────────────────┐                     │
│                    │     集成验收点          │                     │
│                    │   (由工程师C主导)       │                     │
│                    └─────────────────────────┘                     │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🎯 团队角色与边界

### 工程师 A - 配置与基础设施专家

**职责范围**: 系统底层配置、状态管理、类型定义

**交付物**:
- 完整的配置系统
- TypeScript类型定义
- SDK基础集成

**协作接口**:
- 向 B 提供: `AdConfig` 类型、`adConfigStore` 接口
- 向 C 提供: 配置组件、类型定义

---

### 工程师 B - 核心逻辑专家

**职责范围**: 广告控制逻辑、数据收集、请求构建

**交付物**:
- 完整的广告控制系统
- 数据收集器
- 隐私保护处理

**协作接口**:
- 依赖 A 的: `AdConfig` 类型、配置读取
- 向 C 提供: `AdController` API、`useAdTrigger` hook

---

### 工程师 C - UI与集成专家

**职责范围**: 配置页面、广告组件集成、调试工具

**交付物**:
- 完整的配置UI
- 消息组件集成
- 调试面板

**协作接口**:
- 依赖 A 的: 配置组件、类型定义
- 依赖 B 的: 控制器API、hooks

---

## 📅 详细任务清单

---

## 👨‍💻 工程师 A: 配置与基础设施

### Sprint 1 (Day 1-3)

#### 任务 A1: 配置Schema设计
**文件**: `src/renderer/packages/ads/config/adConfigSchema.ts`
**工时**: 4小时
**优先级**: P0 (阻塞其他任务)

```typescript
// 交付内容
- adConfigSchema (Zod)
- AdConfig 类型导出
- AdFormat, AdPlacement 等枚举类型
```

**验收标准**:
- [ ] Schema 完整覆盖设计文档中的所有配置项
- [ ] Zod 验证正常工作
- [ ] TypeScript 类型正确导出

---

#### 任务 A2: Zustand配置Store
**文件**: `src/renderer/packages/ads/config/adConfigStore.ts`
**工时**: 4小时
**优先级**: P0

```typescript
// 交付内容
interface AdConfigStore {
  config: AdConfig;
  updateConfig: (updates: Partial<AdConfig>) => void;
  resetConfig: () => void;
  isDebugMode: () => boolean;
  getActiveFormats: () => AdFormat[];
}
```

**验收标准**:
- [ ] Store 持久化到 localStorage
- [ ] 配置更新触发重新渲染
- [ ] 默认配置正确加载

---

#### 任务 A3: 默认配置文件
**文件**: `src/renderer/packages/ads/config/defaultConfig.ts`
**工时**: 2小时
**优先级**: P1

**验收标准**:
- [ ] 默认值与设计文档一致
- [ ] 所有可选字段都有合理默认值

---

### Sprint 2 (Day 4-6)

#### 任务 A4: AdProvider集成
**文件**: `src/renderer/routes/__root.tsx`
**工时**: 4小时
**优先级**: P0

```typescript
// 交付内容
- 在应用根组件集成 @ai-ad-network/frontend-sdk 的 AdProvider
- 从 adConfigStore 动态读取配置
- 处理配置更新时的Provider重渲染
```

**验收标准**:
- [ ] AdProvider 正确包裹应用
- [ ] API配置动态更新
- [ ] 不影响现有功能

---

#### 任务 A5: 类型定义导出
**文件**: `src/renderer/packages/ads/index.ts`
**工时**: 2小时
**优先级**: P1

```typescript
// 交付内容
export * from './config/adConfigSchema';
export * from './config/adConfigStore';
export * from './config/defaultConfig';
export type { AdConfig, AdFormat, AdPlacement, ... };
```

**验收标准**:
- [ ] 所有类型正确导出
- [ ] 其他工程师可正常导入

---

#### 任务 A6: 配置相关Hooks
**文件**: `src/renderer/packages/ads/hooks/useAdConfig.ts`
**工时**: 3小时
**优先级**: P1

```typescript
// 交付内容
export function useAdConfig(): AdConfig;
export function useAdConfigUpdater(): (updates: Partial<AdConfig>) => void;
export function useIsAdEnabled(): boolean;
export function useActiveFormats(): AdFormat[];
```

**验收标准**:
- [ ] Hooks 正常工作
- [ ] 响应式更新

---

### Sprint 3 (Day 7-9)

#### 任务 A7: 集成支持
**工时**: 4小时
**优先级**: P2

```typescript
// 交付内容
- 协助工程师C解决类型问题
- 审查PR，确保类型安全
- 修复Store相关问题
```

---

## 👨‍💻 工程师 B: 核心逻辑层

### Sprint 1 (Day 1-3)

#### 任务 B1: 频率控制器
**文件**: `src/renderer/packages/ads/core/FrequencyController.ts`
**工时**: 4小时
**优先级**: P1

```typescript
// 交付内容
class FrequencyController {
  shouldShow(format?: string): boolean;
  recordMessage(): void;
  recordImpression(format?: string): void;
  getStats(): FrequencyStats;
  reset(): void;
}
```

**依赖**: A 的 `AdConfig` 类型定义

**验收标准**:
- [ ] 频率控制逻辑正确
- [ ] 支持每格式独立计数
- [ ] 单元测试通过

---

#### 任务 B2: 数据收集器
**文件**: `src/renderer/packages/ads/core/DataCollector.ts`
**工时**: 6小时
**优先级**: P0

```typescript
// 交付内容
class DataCollector {
  collect(context: AdTriggerContext): AdRequestData;
  private extractContext(): ContextData;
  private processMemory(): MemoryData;
  private processProfile(): ProfileData;
}
```

**依赖**: A 的类型定义

**验收标准**:
- [ ] 根据配置选择性收集数据
- [ ] 隐私脱敏处理正确
- [ ] 上下文窗口限制生效

---

### Sprint 2 (Day 4-6)

#### 任务 B3: 广告控制器
**文件**: `src/renderer/packages/ads/core/AdController.ts`
**工时**: 8小时
**优先级**: P0

```typescript
// 交付内容
class AdController {
  shouldTrigger(context: AdTriggerContext): boolean;
  fetchAds(context: AdTriggerContext): Promise<Ad[]>;
  private getMockAds(): Ad[];
}
```

**依赖**: B1, B2, A的类型定义

**验收标准**:
- [ ] 触发判断逻辑完整
- [ ] SDK调用正确
- [ ] Mock模式正常工作
- [ ] 错误处理完善

---

#### 任务 B4: 请求构建器
**文件**: `src/renderer/packages/ads/core/AdRequestBuilder.ts`
**工时**: 4小时
**优先级**: P1

```typescript
// 交付内容
class AdRequestBuilder {
  build(context: AdTriggerContext): AdRequestData;
  private getActiveFormats(): AdFormat[];
  private determinePlacement(): AdPlacement;
}
```

**验收标准**:
- [ ] 请求数据格式正确
- [ ] 支持所有配置的数据收集选项

---

### Sprint 3 (Day 7-9)

#### 任务 B5: 广告Hooks
**文件**: `src/renderer/packages/ads/hooks/useAdTrigger.ts`, `useAdData.ts`
**工时**: 6小时
**优先级**: P0

```typescript
// 交付内容
export function useAdTrigger(): {
  shouldTrigger: (context: AdTriggerContext) => boolean;
  fetchAds: (context: AdTriggerContext) => Promise<Ad[]>;
};

export function useAdData(context: AdTriggerContext): {
  ads: Ad[];
  isLoading: boolean;
  error: Error | null;
};
```

**验收标准**:
- [ ] Hooks 正常工作
- [ ] 缓存机制有效
- [ ] 错误处理完善

---

#### 任务 B6: 隐私处理工具
**文件**: `src/renderer/packages/ads/utils/privacy.ts`
**工时**: 4小时
**优先级**: P1

```typescript
// 交付内容
export function anonymizeText(text: string): string;
export function anonymizeMemory(memory: UserMemory): AnonymizedMemory;
export function anonymizeProfile(profile: UserProfile): AnonymizedProfile;
```

**验收标准**:
- [ ] 敏感信息正确脱敏
- [ ] 保留广告相关有效信息

---

## 👨‍💻 工程师 C: UI与集成层

### Sprint 1 (Day 1-3)

#### 任务 C1: 配置页面框架
**文件**: `src/renderer/pages/ads-settings.tsx`
**工时**: 6小时
**优先级**: P0

```typescript
// 交付内容
- 配置页面基础布局
- 使用Mantine组件
- 路由集成
```

**依赖**: A 的类型定义

**验收标准**:
- [ ] 页面正常渲染
- [ ] 路由跳转正常
- [ ] 响应式布局

---

#### 任务 C2: 基本设置UI
**文件**: `src/renderer/pages/ads-settings.tsx` - BasicSettingsSection
**工时**: 4小时
**优先级**: P0

**交付内容**:
- 启用广告开关
- API配置表单
- 调试模式开关

**验收标准**:
- [ ] 表单验证正常
- [ ] 配置保存生效
- [ ] 实时预览

---

### Sprint 2 (Day 4-6)

#### 任务 C3: 数据收集配置UI
**文件**: `src/renderer/pages/ads-settings.tsx` - DataCollectionSection
**工时**: 4小时
**优先级**: P1

**交付内容**:
- 数据收集选项复选框
- 上下文轮数输入
- 隐私提示信息

**验收标准**:
- [ ] 所有选项可配置
- [ ] 配置即时生效

---

#### 任务 C4: 广告格式配置UI
**文件**: `src/renderer/pages/ads-settings.tsx` - FormatConfigSection
**工时**: 8小时
**优先级**: P0

**交付内容**:
- 6种广告格式的独立配置区
- 每个格式的开关、变体选择
- 频率/概率配置

**验收标准**:
- [ ] 所有格式可独立配置
- [ ] UI交互流畅

---

#### 任务 C5: 广告插槽组件
**文件**: `src/renderer/packages/ads/components/AdSlot.tsx`
**工时**: 6小时
**优先级**: P0

```typescript
// 交付内容
interface AdSlotProps {
  format: AdFormat;
  context: AdTriggerContext;
  variant?: string;
  onLoading?: () => void;
  onError?: (error: Error) => void;
}
```

**依赖**: B 的 hooks

**验收标准**:
- [ ] 支持所有广告格式
- [ ] 加载状态正确显示
- [ ] 错误处理完善

---

### Sprint 3 (Day 7-9)

#### 任务 C6: MessageList集成
**文件**: `src/renderer/components/MessageList.tsx`
**工时**: 6小时
**优先级**: P0

**交付内容**:
- 在消息间插入 ActionCard 广告
- 集成频率控制
- 处理广告加载状态

**依赖**: B 的 hooks, C5 的 AdSlot

**验收标准**:
- [ ] 广告正确插入
- [ ] 不影响消息滚动
- [ ] 频率控制生效

---

#### 任务 C7: Message组件集成
**文件**: `src/renderer/components/Message.tsx`
**工时**: 4小时
**优先级**: P1

**交付内容**:
- 在消息末尾添加 Suffix 广告
- 添加 SponsoredSource

**验收标准**:
- [ ] 广告正确显示
- [ ] 不破坏原有样式

---

#### 任务 C8: 调试面板
**文件**: `src/renderer/packages/ads/components/DebugPanel.tsx`
**工时**: 6小时
**优先级**: P2

**交付内容**:
- 请求日志显示
- Mock数据生成器
- 广告预览

**验收标准**:
- [ ] 日志实时更新
- [ ] Mock数据可自定义

---

#### 任务 C9: 集成联调
**工时**: 8小时
**优先级**: P0

**交付内容**:
- 整合所有模块
- 端到端测试
- Bug修复

**验收标准**:
- [ ] 完整流程正常
- [ ] 所有广告格式可展示
- [ ] 配置实时生效

---

## 🔄 依赖关系图

```
A1 (Schema) ─────┬───> A2 (Store) ───> A4 (AdProvider) ──┐
                 │                                        │
                 ├───> A5 (类型导出) ──┬──> A6 (Hooks)   │
                 │                    │                  │
                 └────────────────────┴──────────────────┤
                                                            │
B1 (FreqCtrl) ────┬───> B3 (Controller) ──> B5 (Hooks) ──┤
                  │                                     │
B2 (Collector) ───┘                                     │
                  │                                     │
                  └──> B4 (Builder) ──> B6 (Privacy) ──┘
                                                            │
C1 (页面框架) ────┬──> C2 (基本设置)                       │
                 │                                        │
C3 (数据配置) ────┤                                   ┌───┤
                 │                                   │   │
C4 (格式配置) ────┴──> C5 (AdSlot) ──> C6 (MsgList) ──┤   │
                 │                       │             │   │
                 └──> C7 (Message) ───────┤             │   │
                                         │             │   │
C8 (调试面板) ────────────────────────────┘             │   │
                                                      │   │
C9 (集成联调) <────────────────────────────────────────┘   │
                                                          │
└──────────────────── 最终验收 ───────────────────────────┘
```

---

## 📊 里程碑与时间线

| 里程碑 | 时间 | 交付物 | 负责人 |
|--------|------|--------|--------|
| **M1: 基础就绪** | Day 3 | Schema、Store、类型定义 | A |
| **M2: 逻辑完成** | Day 6 | 核心控制器、Hooks | B |
| **M3: UI完成** | Day 6 | 配置页面、AdSlot | C |
| **M4: 集成完成** | Day 9 | 消息组件集成、调试工具 | C |
| **M5: 验收通过** | Day 10 | 完整功能测试通过 | 全员 |

---

## ✅ 验收标准

### 单人任务验收
- [ ] 代码符合TypeScript规范
- [ ] 单元测试覆盖率 > 80%
- [ ] PR Review通过
- [ ] 无TypeScript错误

### 集成验收
- [ ] 所有广告格式可正常展示
- [ ] 配置修改实时生效
- [ ] Mock模式正常工作
- [ ] 调试面板功能完整
- [ ] 无控制台错误
- [ ] 性能无明显下降

---

## 🔧 协作规范

### 分支策略
```
main (生产分支)
  │
  └── develop (开发分支)
        │
        ├── feature/ads-config (工程师A)
        ├── feature/ads-core (工程师B)
        └── feature/ads-ui (工程师C)
```

### 接口契约

**A → B 接口**:
```typescript
// A提供
export type { AdConfig, AdFormat, AdPlacement } from './config/adConfigSchema';
export { useAdConfig, useAdConfigUpdater } from './hooks/useAdConfig';
```

**B → C 接口**:
```typescript
// B提供
export { useAdTrigger, useAdData } from './hooks';
export type { AdTriggerContext } from './core/types';
```

### 沟通机制
- **每日站会**: 15分钟，同步进度和问题
- **接口会议**: Day 1结束时，确认所有接口定义
- **集成准备**: Day 6结束前，完成各自模块
- **集成周**: Day 7-9，集中联调

---

## 📌 注意事项

### 工程师 A 注意事项
1. **优先完成 A1 (Schema)**，这是其他人的依赖
2. 类型定义变更需及时通知 B 和 C
3. AdProvider 集成要小心，避免破坏现有功能

### 工程师 B 注意事项
1. 等待 A 的 Schema 完成后再开始编码
2. 重点关注隐私处理和错误处理
3. 提供详细的hooks文档给 C

### 工程师 C 注意事项
1. UI可以先使用Mock数据开发
2. 集成组件时要注意不影响现有消息流
3. 最后负责整体集成和测试

### 全员注意事项
1. **严格按接口契约开发**，不要随意修改约定接口
2. **Code Review 必须由另一工程师完成**
3. **遇到接口问题及时沟通**，不要私自修改
4. **保持代码风格一致**

---

## 📞 问题升级路径

```
技术问题
   ↓
组内讨论 (15分钟)
   ↓
未解决 → 拉人会议 (相关人员)
   ↓
未解决 → 技术负责人决策
```

---

*文档版本: 1.0*
*创建日期: 2025-01-22*
