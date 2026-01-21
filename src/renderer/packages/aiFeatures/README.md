# AI功能模块使用指南

本模块包含三大AI功能：智能追问、主动推荐和Think模式。

## 功能概述

### 1. 智能追问 (FollowUp)
AI回答后，根据对话上下文智能生成追问建议，引导对话深入发展。

**特点**:
- 三层策略：规则引擎 → 模式匹配 → LLM生成
- 8+场景规则配置
- 支持自定义追问

### 2. 主动推荐 (Recommendation)
对话过程中，根据上下文主动推荐相关资源、工具和探索方向。

**特点**:
- 智能触发机制（话题切换、深度对话、遇到问题）
- 10+工具注册表
- 内容索引（文档、教程等）

### 3. Think模式 (ThinkMode)
AI回答前展示其思考过程，提高答案可靠性和可解释性。

**特点**:
- Chain of Thought推理
- 5步思考流程
- 可折叠/展开的思考过程展示

---

## 快速开始

### 1. 状态管理

使用Zustand进行状态管理：

```typescript
import { useAIFeaturesStore } from '@/stores/aiFeaturesStore';

function Chat() {
  const {
    followUpEnabled,
    recommendationEnabled,
    thinkModeEnabled,
    toggleFollowUp,
    toggleRecommendation,
    toggleThinkMode,
  } = useAIFeaturesStore();

  // 使用...
}
```

### 2. 初始化协调器

```typescript
import { AIFeaturesCoordinator } from '@/packages/aiFeatures';

const coordinator = useMemo(() => new AIFeaturesCoordinator({
  followUp: {
    maxSuggestions: 4,
    minConfidence: 0.6,
    enableLLM: false,
  },
  recommendation: {
    maxPerType: 3,
    minRelevanceScore: 0.5,
    refreshInterval: 3,
    enableCollaborativeFiltering: false,
  },
  thinkMode: {
    enabled: true,
    strategy: 'cot',
    maxSteps: 5,
    defaultCollapsed: true,
    showDuration: true,
    allowInterrupt: false,
    timeout: 30000,
  },
}), []);
```

### 3. 基础集成

```typescript
// 发送消息
const handleSendMessage = async (content: string) => {
  // 添加用户消息
  const userMessage = { role: 'user', content };
  setMessages(prev => [...prev, userMessage]);

  // 检查Think模式
  if (thinkModeEnabled) {
    const thinkResponse = await coordinator.executeThinkMode(
      content,
      messages,
      thinkModeConfig
    );

    // 显示思考过程
    setCurrentThinkProcess(thinkResponse.thoughtProcess);

    // 显示答案
    setTimeout(() => {
      const aiMessage = {
        role: 'assistant',
        content: thinkResponse.finalAnswer,
      };
      setMessages(prev => [...prev, aiMessage]);
      setCurrentThinkProcess(null);

      // 生成追问和推荐
      handleAfterResponse(aiMessage);
    }, 500);
  } else {
    // 普通模式
    const aiMessage = await sendToLLM(content);
    setMessages(prev => [...prev, aiMessage]);
    handleAfterResponse(aiMessage);
  }
};

// AI回复后处理
const handleAfterResponse = async (aiMessage: any) => {
  const results = await coordinator.handleAfterResponse(
    aiMessage,
    messages,
    { followUpEnabled, recommendationEnabled }
  );

  setFollowUpSuggestions(results.followUpSuggestions);
  setRecommendations(results.recommendations);
};
```

### 4. UI组件

```tsx
import { ThinkIndicator } from '@/packages/aiFeatures/thinkMode';
import { SuggestionChips } from '@/packages/aiFeatures/followUp';
import { RecommendationPanel } from '@/packages/aiFeatures/recommendation';

// 在消息列表中
{currentThinkProcess && (
  <ThinkIndicator thoughtProcess={currentThinkProcess} />
)}

// 在AI回复后
{followUpSuggestions.length > 0 && (
  <SuggestionChips
    suggestions={followUpSuggestions}
    onSelect={(s) => console.log(s.text)}
  />
)}

{recommendations.length > 0 && (
  <RecommendationPanel
    recommendations={recommendations}
    onSelect={(r) => {
      if (r.action?.type === 'link') {
        window.open(r.action.payload, '_blank');
      }
    }}
    onDismiss={() => setRecommendations([])}
  />
)}
```

---

## 配置说明

### 智能追问配置

```typescript
interface FollowUpConfig {
  maxSuggestions: number;      // 最大建议数量 (默认: 4)
  minConfidence: number;       // 最小置信度 (默认: 0.6)
  enableLLM: boolean;          // 是否启用LLM生成 (默认: false)
  llmModel: string;            // LLM模型 (默认: 'gpt-4o-mini')
  llmMaxTokens: number;        // LLM最大token数 (默认: 500)
}
```

### 主动推荐配置

```typescript
interface RecommendationConfig {
  maxPerType: number;           // 每种类型最大推荐数 (默认: 3)
  minRelevanceScore: number;    // 最小相关度分数 (默认: 0.5)
  refreshInterval: number;      // 刷新间隔-消息数 (默认: 3)
  enableCollaborativeFiltering: boolean; // 协同过滤 (默认: false)
}
```

### Think模式配置

```typescript
interface ThinkModeConfig {
  enabled: boolean;             // 是否启用
  strategy: 'cot' | 'self_consistency'; // 策略
  maxSteps: number;             // 最大步骤数 (默认: 5)
  defaultCollapsed: boolean;    // 默认折叠 (默认: true)
  showDuration: boolean;        // 显示耗时 (默认: true)
  allowInterrupt: boolean;      // 允许中断 (默认: false)
  timeout: number;              // 超时时间ms (默认: 30000)
}
```

---

## 扩展指南

### 添加自定义规则

编辑 `followUp/config/rules.json`:

```json
{
  "id": "custom_rule",
  "keywords": ["关键词1", "关键词2"],
  "type": "elaboration",
  "confidence": 0.8,
  "suggestions": [
    "建议问题1",
    "建议问题2"
  ]
}
```

### 添加自定义工具

```typescript
import { toolRegistry } from '@/packages/aiFeatures';

toolRegistry.registerCategory('custom', [
  {
    id: 'my-tool',
    name: '我的工具',
    description: '工具描述',
    category: 'custom',
    tags: ['tag1', 'tag2'],
    difficulty: 'beginner',
    icon: '🔧',
    action: {
      type: 'open_url',
      handler: 'https://example.com',
    },
  },
]);
```

### 自定义Think策略

```typescript
import { ThinkModeEngine } from '@/packages/aiFeatures';

class CustomStrategy {
  async execute(prompt: string, config: any) {
    // 实现自定义策略
  }
}

// 注册策略
engine.strategies.set('custom', new CustomStrategy());
```

---

## 完整示例

查看 `EXAMPLE_INTEGRATION.tsx` 获取完整的集成示例。

---

## 注意事项

1. **LLM集成**: 需要实际集成chatbox的LLM服务才能正常工作
2. **性能优化**: 建议对追问和推荐进行缓存
3. **错误处理**: 实际使用时需要添加完善的错误处理
4. **类型定义**: 所有类型都已在 `types/index.ts` 中定义

---

## 目录结构

```
aiFeatures/
├── followUp/          # 智能追问
│   ├── core/          # 核心引擎
│   ├── strategies/    # 策略实现
│   ├── config/        # 规则配置
│   ├── ui/            # UI组件
│   └── types/         # 类型定义
├── recommendation/    # 主动推荐
│   ├── core/          # 核心引擎
│   ├── strategies/    # 推荐策略
│   ├── resources/     # 资源注册
│   ├── ui/            # UI组件
│   └── types/         # 类型定义
├── thinkMode/         # Think模式
│   ├── core/          # 核心引擎
│   ├── strategies/    # 推理策略
│   ├── templates/     # 提示词模板
│   ├── ui/            # UI组件
│   └── types/         # 类型定义
├── scheduler/         # 统一调度器
├── index.ts           # 统一导出
└── EXAMPLE_INTEGRATION.tsx  # 集成示例
```

---

## 技术支持

如有问题，请查看技术方案文档或联系开发团队。
