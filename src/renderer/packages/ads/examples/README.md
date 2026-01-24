# AI Ad Network - 集成示例

> 为工程师B和工程师C提供的集成参考代码

## 📁 文件列表

- `EngineerB_Examples.tsx` - 工程师B (核心逻辑层) 参考示例
- `EngineerC_Examples.tsx` - 工程师C (UI与集成层) 参考示例
- `DataCollector_Example.tsx` - 数据收集器实现示例
- `FrequencyController_Example.tsx` - 频率控制器实现示例

## 🚀 快速开始

### 对于工程师B

参考 `EngineerB_Examples.tsx` 了解如何：

1. 读取配置数据
2. 构建广告请求
3. 处理数据收集
4. 实现频率控制

### 对于工程师C

参考 `EngineerC_Examples.tsx` 了解如何：

1. 使用 hooks 读取配置
2. 创建配置UI组件
3. 格式化显示配置
4. 处理配置更新

---

## 工程师A 交付说明

所有核心接口已完成并可以使用：

### 类型定义位置
```typescript
import type { AdConfig, AdFormat, AdTriggerContext } from '@/packages/ads';
```

### Store 使用
```typescript
import { useAdConfigStore } from '@/packages/ads';

// 直接使用 store
const config = useAdConfigStore((state) => state);
const updateConfig = useAdConfigStore((state) => state.updateConfig);
```

### Hooks 使用
```typescript
import {
  useAdConfig,
  useIsAdEnabled,
  useActiveFormats,
  useFormatConfig,
  useToggleFormat,
  useAdSystemReady,
  useDataCollectionConfig,
  useShouldCollectData,
} from '@/packages/ads';
```

### 验证工具
```typescript
import {
  validateAdConfig,
  parseAdConfig,
  getAdConfigErrors,
} from '@/packages/ads';
```

---

如有问题，请联系工程师A。
