# AI Ad Network - Chatbox 集成包

> 工程师A负责的广告系统配置与基础设施模块

## 📦 模块概述

本模块提供完整的广告系统配置管理，包括：

- **配置 Schema**: 使用 Zod v4 进行类型安全的配置验证
- **状态管理**: 基于 Zustand v5 的配置 Store，支持持久化
- **React Hooks**: 20+ 便捷的配置读取和更新 hooks
- **Provider 集成**: 动态加载 SDK 并管理配置

## 🚀 快速开始

### 1. 基础使用

```tsx
import { useAdConfig, useIsAdEnabled, useActiveFormats } from '@/packages/ads';

function AdSettings() {
  const config = useAdConfig();
  const isEnabled = useIsAdEnabled();
  const activeFormats = useActiveFormats();

  return (
    <div>
      <p>广告系统: {isEnabled ? '已启用' : '已禁用'}</p>
      <p>启用的格式: {activeFormats.join(', ')}</p>
    </div>
  );
}
```

### 2. 更新配置

```tsx
import { useToggleAds, useUpdateApiConfig } from '@/packages/ads';

function ApiConfigForm() {
  const toggleAds = useToggleAds();
  const updateApiConfig = useUpdateApiConfig();

  return (
    <>
      <button onClick={toggleAds}>切换广告开关</button>
      <button onClick={() => updateApiConfig({ apiKey: 'new-key' })}>
        更新 API Key
      </button>
    </>
  );
}
```

### 3. 检查格式配置

```tsx
import { useIsFormatEnabled, useFormatConfig } from '@/packages/ads';

function FormatSettings() {
  const isEnabled = useIsFormatEnabled('actionCard');
  const config = useFormatConfig('actionCard');

  return (
    <div>
      <p>ActionCard: {isEnabled ? '启用' : '禁用'}</p>
      <p>变体: {config.variant}</p>
      <p>频率: 每 {config.frequency} 条消息</p>
    </div>
  );
}
```

## 📖 API 文档

### 核心 Hooks

#### `useAdConfig()`
获取完整的广告配置对象。

```typescript
const config: AdConfig = useAdConfig();
```

#### `useIsAdEnabled()`
检查广告系统是否启用。

```typescript
const enabled: boolean = useIsAdEnabled();
```

#### `useActiveFormats()`
获取当前启用的广告格式列表。

```typescript
const formats: AdFormat[] = useActiveFormats();
// 返回: ['action_card', 'suffix', ...]
```

### 配置更新 Hooks

#### `useToggleAds()`
切换广告系统开关。

```typescript
const toggle = useToggleAds();
toggle(); // 切换
```

#### `useUpdateApiConfig()`
更新 API 配置。

```typescript
const updateApi = useUpdateApiConfig();
updateApi({ apiKey: 'new-key', timeout: 3000 });
```

#### `useUpdateFormatConfig()`
更新指定格式的配置。

```typescript
const updateFormat = useUpdateFormatConfig();
updateFormat('actionCard', { frequency: 5, variant: 'vertical' });
```

#### `useToggleFormat()`
切换格式的启用状态。

```typescript
const toggleFormat = useToggleFormat();
toggleFormat('actionCard'); // 切换 action_card
```

### 状态查询 Hooks

#### `useAdSystemReady()`
检查广告系统是否准备好展示广告。

```typescript
const ready = useAdSystemReady();
// true 当: 广告启用 && API已配置 && 至少有一种格式启用
```

#### `useAdSystemStatus()`
获取广告系统状态摘要。

```typescript
const status = useAdSystemStatus();
// {
//   enabled: boolean,
//   apiConfigured: boolean,
//   activeFormats: string[],
//   activeFormatCount: number,
//   debugMode: boolean,
//   useMock: boolean,
//   privacyEnabled: boolean,
//   ready: boolean
// }
```

### 数据收集 Hooks

#### `useShouldCollectData()`
检查是否应该收集指定类型的数据。

```typescript
const collectQuery = useShouldCollectData('includeQuery');
const collectMemory = useShouldCollectData('includeMemory');
```

## 📁 文件结构

```
src/renderer/packages/ads/
├── config/
│   ├── adConfigSchema.ts    # Zod Schema + 类型定义
│   ├── adConfigStore.ts     # Zustand Store
│   └── defaultConfig.ts     # 默认配置
├── hooks/
│   └── useAdConfig.ts       # React Hooks
├── AdProviderWrapper.tsx    # SDK Provider 包装器
├── index.ts                 # 统一导出
└── README.md               # 本文档
```

## 🔧 类型定义

### AdConfig

完整的广告配置类型：

```typescript
interface AdConfig {
  enabled: boolean;
  api: {
    baseUrl: string;
    apiKey: string;
    timeout: number;
    useMock: boolean;
  };
  dataCollection: {
    includeQuery: boolean;
    includeResponse: boolean;
    includeFullContext: boolean;
    includeMemory: boolean;
    includeProfile: boolean;
    contextWindow: number;
    enableAnonymization: boolean;
  };
  formats: {
    actionCard: ActionCardFormatConfig;
    suffix: SuffixFormatConfig;
    followup: FollowUpFormatConfig;
    source: SourceFormatConfig;
    static: StaticFormatConfig;
    leadGen: LeadGenFormatConfig;
  };
  privacy: {
    enabled: boolean;
    requireConsent: boolean;
    dataRetentionDays: number;
    allowedDataTypes: string[];
  };
  debug: boolean;
}
```

### AdFormat

广告格式枚举：

```typescript
type AdFormat =
  | 'action_card'  // 卡片广告
  | 'suffix'       // 后缀广告
  | 'followup'     // 跟进问题广告
  | 'source'       // 赞助来源广告
  | 'static'       // 静态横幅广告
  | 'lead_gen';    // 线索收集广告
```

## 🎯 向其他工程师提供的接口

### 给工程师B (核心逻辑)

```typescript
// 类型定义
import type {
  AdConfig,
  AdTriggerContext,
  Ad,
  FrequencyStats,
} from '@/packages/ads';

// Store 访问
import { useAdConfigStore } from '@/packages/ads';

// 配置读取
import {
  useAdConfig,
  useIsAdEnabled,
  useActiveFormats,
  useDataCollectionConfig,
} from '@/packages/ads';
```

### 给工程师C (UI与集成)

```typescript
// 所有 hooks
import {
  useAdConfig,
  useIsFormatEnabled,
  useFormatConfig,
  useToggleFormat,
  useAdSystemReady,
  useAdSystemStatus,
} from '@/packages/ads';

// 组件映射
import {
  AD_FORMAT_COMPONENT_MAP,
  SUPPORTED_AD_FORMATS,
  SUPPORTED_AD_PLACEMENTS,
} from '@/packages/ads';
```

## 🔍 验证工具

### 验证配置

```typescript
import { validateAdConfig, parseAdConfig, getAdConfigErrors } from '@/packages/ads';

// 安全验证（不抛出异常）
const result = validateAdConfig(someConfig);
if (result.success) {
  console.log(result.data);
} else {
  console.error(result.error);
}

// 解析配置（抛出异常）
try {
  const config = parseAdConfig(someConfig);
} catch (error) {
  console.error(error);
}

// 获取错误信息
const errors = getAdConfigErrors(someConfig);
// ['api.baseUrl: Invalid URL', 'api.apiKey: Required']
```

## ⚙️ 持久化

配置自动持久化到 `ad-config-storage`，使用项目的 `storage` 封装。

### 初始化 Store

```typescript
import { initAdConfigStore } from '@/packages/ads';

// 在应用启动时调用
await initAdConfigStore();
```

## 🧪 预设配置

```typescript
import {
  getDefaultAdConfig,
  getDevPresetConfig,
  getDemoPresetConfig,
  getMinimalPresetConfig,
  mergePreset,
} from '@/packages/ads';

// 获取默认配置
const defaults = getDefaultAdConfig();

// 获取开发环境预设
const devConfig = mergePreset(getDevPresetConfig());

// 获取演示环境预设
const demoConfig = mergePreset(getDemoPresetConfig());

// 获取最小化配置
const minimalConfig = mergePreset(getMinimalPresetConfig());
```

## 🐛 调试

### 启用调试模式

```typescript
import { useUpdateDataCollectionConfig } from '@/packages/ads';

function DebugToggle() {
  const updateConfig = useAdConfigStore((s) => s.updateConfig);

  return (
    <button onClick={() => updateConfig({ debug: true })}>
      启用调试模式
    </button>
  );
}
```

### 检查系统状态

```typescript
import { useAdSystemStatus } from '@/packages/ads';

function DebugInfo() {
  const status = useAdSystemStatus();

  return (
    <pre>
      {JSON.stringify(status, null, 2)}
    </pre>
  );
}
```

## ⚠️ 注意事项

1. **SDK 未安装时**: AdProviderWrapper 会安全降级，不影响应用运行
2. **配置验证**: 所有配置变更都会经过 Zod Schema 验证
3. **持久化**: 配置变更自动保存，无需手动处理
4. **类型安全**: 所有配置都有完整的 TypeScript 类型支持

## 📝 更新日志

### v1.0.0 (当前版本)

- ✅ 完整的 Zod Schema 定义
- ✅ Zustand Store + persist 中间件
- ✅ 默认配置和预设配置
- ✅ AdProvider 动态加载和集成
- ✅ 20+ React Hooks
- ✅ 完整的 TypeScript 类型导出

## 🔗 相关文档

- [任务分配计划](../../../ads-plugin/works_plan.md)
- [集成设计文档](../../../ads-plugin/AD_INTEGRATION_DESIGN.md)
- [Chatbox 集成指南](../../../ads-plugin/CHATBOX_INTEGRATION.md)
- [组件文档](../../../ads-plugin/COMPONENT_DOCUMENTATION.md)

---

**维护者**: 工程师A
**状态**: Sprint 1-2 完成 ✅
