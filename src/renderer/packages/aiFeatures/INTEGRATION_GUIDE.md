# AI功能集成指南 - Chatbox项目

> 本指南说明如何将三大AI功能集成到chatbox项目中

## 📋 集成概述

### 已完成的工作

1. ✅ 核心功能模块（智能追问、主动推荐、Think模式）
2. ✅ 统一调度器和状态管理
3. ✅ UI组件
4. ✅ LLM服务集成适配
5. ✅ 类型适配

### 需要手动集成的部分

由于chatbox项目的架构限制，以下部分需要手动集成到现有代码中：

1. **sessionActions.ts** - 添加AI功能调用
2. **消息列表UI** - 添加AI功能组件显示
3. **输入框** - 添加Think模式切换

---

## 🔧 步骤1: 集成到sessionActions

### 1.1 修改 `submitNewUserMessage` 函数

在 `src/renderer/stores/sessionActions.ts` 中，找到 `submitNewUserMessage` 函数，在AI回复生成后添加AI功能调用：

```typescript
// 在 src/renderer/stores/sessionActions.ts 中

// 文件顶部添加导入
import { AIFeaturesCoordinator } from '@/packages/aiFeatures';
import { useAIFeaturesStore } from '@/stores/aiFeaturesStore';

/**
 * 修改后的 generate 函数 - 在AI回复完成后添加AI功能
 */
async function generate(
  sessionId: string,
  targetMsg: Message,
  options?: { operationType?: 'send_message' | 'regenerate' }
) {
  // ... 原有的生成逻辑 ...

  const result = await streamText(model, {
    sessionId: session.id,
    messages: promptMsgs,
    onResultChangeWithCancel: modifyMessageCache,
    providerOptions: settings.providerOptions,
    knowledgeBase,
    webBrowsing,
  });

  targetMsg = {
    ...targetMsg,
    generating: false,
    cancel: undefined,
    tokensUsed: targetMsg.tokensUsed ?? estimateTokensFromMessages([...promptMsgs, targetMsg]),
    status: [],
    finishReason: result.finishReason,
    usage: result.usage,
  };
  await modifyMessage(sessionId, targetMsg, true);

  // ========== 添加：AI功能触发 ==========
  // 在AI回复完成后，触发追问和推荐
  triggerAIFeatures(sessionId, targetMsg, session);

  // ... 原有的其他逻辑 ...
}

/**
 * 新增：触发AI功能的函数
 */
async function triggerAIFeatures(
  sessionId: string,
  aiMessage: Message,
  session: Session
) {
  const { followUpEnabled, recommendationEnabled } = useAIFeaturesStore.getState();

  if (!followUpEnabled && !recommendationEnabled) {
    return;
  }

  try {
    const coordinator = new AIFeaturesCoordinator({
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
      thinkMode: useAIFeaturesStore.getState().thinkModeConfig,
    });

    const results = await coordinator.handleAfterResponse(
      aiMessage,
      session.messages,
      {
        followUpEnabled,
        recommendationEnabled,
      }
    );

    // 存储结果到session metadata
    if (results.followUpSuggestions.length > 0 || results.recommendations.length > 0) {
      await chatStore.updateSession(sessionId, {
        metadata: {
          ...session.metadata,
          aiFeatures: {
            followUpSuggestions: results.followUpSuggestions,
            recommendations: results.recommendations,
            timestamp: Date.now(),
          },
        },
      } as any);
    }
  } catch (error) {
    console.error('AI features trigger failed:', error);
  }
}
```

### 1.2 添加Think模式支持

在 `submitNewUserMessage` 函数中添加Think模式检查：

```typescript
export async function submitNewUserMessage(
  sessionId: string,
  params: { newUserMsg: Message; needGenerating: boolean }
) {
  const { thinkModeEnabled } = useAIFeaturesStore.getState();

  // ... 原有的代码 ...

  // 在生成回复前检查Think模式
  if (thinkModeEnabled && needGenerating) {
    const thinkSuccess = await executeThinkModeForMessage(
      sessionId,
      params.newUserMsg,
      session,
      settings,
      globalSettings
    );

    if (thinkSuccess) {
      return; // Think模式已处理，直接返回
    }
  }

  // ... 原有的 generate 调用 ...
}

/**
 * 新增：执行Think模式
 */
async function executeThinkModeForMessage(
  sessionId: string,
  userMessage: Message,
  session: Session,
  settings: SessionSettings,
  globalSettings: Settings
): Promise<boolean> {
  try {
    const { ThinkModeEngine } = await import('@/packages/aiFeatures/thinkMode/core/engine.integration');
    const { thinkModeConfig } = useAIFeaturesStore.getState();

    const thinkEngine = new ThinkModeEngine(thinkModeConfig);

    // 1. 创建思考过程消息
    const thinkProcessMsg = createMessage('assistant', '');
    thinkProcessMsg.metadata = {
      isThinkProcess: true,
      thinkStartTime: Date.now(),
    };
    await insertMessage(sessionId, thinkProcessMsg);

    // 2. 执行思考
    const messages = session.messages.slice(0, session.messages.findIndex(m => m.id === userMessage.id));
    const thinkResponse = await thinkEngine.think(
      {
        prompt: getMessageText(userMessage),
        context: messages,
        config: thinkModeConfig,
      },
      settings
    );

    // 3. 更新思考过程
    thinkProcessMsg.metadata = {
      ...thinkProcessMsg.metadata,
      thinkProcess: thinkResponse.thoughtProcess,
      thinkEndTime: Date.now(),
    };
    await modifyMessage(sessionId, thinkProcessMsg);

    // 4. 创建答案消息
    const answerMsg = createMessage('assistant', thinkResponse.finalAnswer);
    answerMsg.metadata = {
      generatedFromThink: true,
      thinkProcess: thinkResponse.thoughtProcess,
    };

    await insertMessage(sessionId, answerMsg);

    // 5. 触发追问和推荐
    await triggerAIFeatures(sessionId, answerMsg, session);

    return true;
  } catch (error) {
    console.error('Think mode failed:', error);
    return false;
  }
}
```

---

## 🎨 步骤2: 集成到消息列表UI

### 2.1 找到消息渲染组件

在chatbox项目中，消息列表通常在类似 `Messages.tsx` 或 `MessageList.tsx` 的组件中渲染。

### 2.2 添加AI功能组件导入

```typescript
// 在消息列表组件中添加导入
import { AIFeaturesMessage } from '@/packages/aiFeatures/integration/MessageComponents';
```

### 2.3 在AI消息后添加AI功能组件

```typescript
// 在消息列表渲染函数中
{messages.map((message, index) => (
  <div key={message.id}>
    {/* 原有的消息渲染 */}
    <MessageBubble message={message} />

    {/* 添加：AI功能组件 */}
    {message.role === 'assistant' && index === messages.length - 1 && (
      <AIFeaturesMessage
        sessionId={sessionId}
        lastAssistantMessage={message}
        sessionMetadata={session.metadata?.aiFeatures}
      />
    )}
  </div>
))}
```

---

## ⌨️ 步骤3: 添加Think模式切换UI

### 3.1 在输入框区域添加切换按钮

在 `src/renderer/components/InputBox/InputBox.tsx` 或类似文件中添加：

```typescript
import { useAIFeaturesStore } from '@/stores/aiFeaturesStore';

export function InputBox() {
  const { thinkModeEnabled, toggleThinkMode } = useAIFeaturesStore();

  return (
    <div className="input-box-container">
      {/* 添加Think模式切换按钮 */}
      <button
        className={`think-mode-toggle ${thinkModeEnabled ? 'active' : ''}`}
        onClick={toggleThinkMode}
        title="开启Think模式，AI将在回答前展示思考过程"
      >
        💭
      </button>

      {/* 原有的输入框UI */}
      <textarea />
      <button>发送</button>
    </div>
  );
}
```

### 3.2 添加样式

```css
/* 在InputBox的样式文件中 */
.think-mode-toggle {
  padding: 8px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: white;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 16px;
}

.think-mode-toggle:hover {
  border-color: #8b5cf6;
  background: rgba(139, 92, 246, 0.05);
}

.think-mode-toggle.active {
  border-color: #8b5cf6;
  background: rgba(139, 92, 246, 0.1);
  box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.2);
}
```

---

## ⚙️ 步骤4: 添加设置页面

### 4.1 在设置页面添加AI功能配置

在 `src/renderer/routes/settings/chat.tsx` 或类似文件中添加：

```typescript
import { AIFeaturesSettings } from '@/packages/aiFeatures/integration/SettingsPanel';

export function ChatSettings() {
  return (
    <div className="settings-page">
      {/* 原有设置 */}

      {/* 添加AI功能设置 */}
      <AIFeaturesSettings />
    </div>
  );
}
```

### 4.2 创建设置面板组件

```typescript
// src/renderer/packages/aiFeatures/integration/SettingsPanel.tsx

import React from 'react';
import { useAIFeaturesStore } from '@/stores/aiFeaturesStore';

export const AIFeaturesSettings: React.FC = () => {
  const {
    followUpEnabled,
    recommendationEnabled,
    thinkModeEnabled,
    followUpConfig,
    recommendationConfig,
    thinkModeConfig,
    toggleFollowUp,
    toggleRecommendation,
    toggleThinkMode,
    updateFollowUpConfig,
    updateRecommendationConfig,
    updateThinkModeConfig,
  } = useAIFeaturesStore();

  return (
    <div className="settings-section">
      <h2>AI智能功能</h2>

      {/* 智能追问 */}
      <SettingItem
        title="智能追问"
        description="AI回答后，智能建议下一步可能的问题"
        enabled={followUpEnabled}
        onToggle={toggleFollowUp}
      >
        {followUpEnabled && (
          <div className="setting-details">
            <label>
              最大建议数:
              <input
                type="number"
                min="2"
                max="6"
                value={followUpConfig.maxSuggestions}
                onChange={(e) => updateFollowUpConfig({
                  maxSuggestions: parseInt(e.target.value)
                })}
              />
            </label>
            <label>
              最小置信度:
              <input
                type="number"
                min="0"
                max="1"
                step="0.1"
                value={followUpConfig.minConfidence}
                onChange={(e) => updateFollowUpConfig({
                  minConfidence: parseFloat(e.target.value)
                })}
              />
            </label>
          </div>
        )}
      </SettingItem>

      {/* 主动推荐 */}
      <SettingItem
        title="主动推荐"
        description="对话中主动推荐相关资源、工具和探索方向"
        enabled={recommendationEnabled}
        onToggle={toggleRecommendation}
      >
        {recommendationEnabled && (
          <div className="setting-details">
            <label>
              刷新间隔:
              <input
                type="number"
                min="2"
                max="10"
                value={recommendationConfig.refreshInterval}
                onChange={(e) => updateRecommendationConfig({
                  refreshInterval: parseInt(e.target.value)
                })}
              />
            </label>
          </div>
        )}
      </SettingItem>

      {/* Think模式 */}
      <SettingItem
        title="Think模式"
        description="AI回答前展示思考过程，提高答案可靠性和可解释性"
        enabled={thinkModeEnabled}
        onToggle={toggleThinkMode}
      >
        {thinkModeEnabled && (
          <div className="setting-details">
            <label>
              策略:
              <select
                value={thinkModeConfig.strategy}
                onChange={(e) => updateThinkModeConfig({
                  strategy: e.target.value as 'cot' | 'self_consistency'
                })}
              >
                <option value="cot">思维链推理 (CoT)</option>
                <option value="self_consistency">自我一致性</option>
              </select>
            </label>

            <label>
              最大步骤:
              <input
                type="number"
                min="3"
                max="7"
                value={thinkModeConfig.maxSteps}
                onChange={(e) => updateThinkModeConfig({
                  maxSteps: parseInt(e.target.value)
                })}
              />
            </label>

            <label>
              <input
                type="checkbox"
                checked={thinkModeConfig.defaultCollapsed}
                onChange={(e) => updateThinkModeConfig({
                  defaultCollapsed: e.target.checked
                })}
              />
              默认折叠思考过程
            </label>
          </div>
        )}
      </SettingItem>
    </div>
  );
};

// 设置项组件
const SettingItem: React.FC<{
  title: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
  children?: React.ReactNode;
}> = ({ title, description, enabled, onToggle, children }) => (
  <div className="setting-item">
    <div className="setting-header">
      <div>
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      <label className="toggle">
        <input
          type="checkbox"
          checked={enabled}
          onChange={onToggle}
        />
        <span className="slider" />
      </label>
    </div>
    {children}
  </div>
);
```

---

## 📝 步骤5: 测试集成

### 5.1 功能测试清单

- [ ] 智能追问
  - [ ] AI回复后显示追问建议
  - [ ] 点击追问建议自动填充到输入框
  - [ ] 追问建议符合对话上下文

- [ ] 主动推荐
  - [ ] 对话达到条件时触发推荐
  - [ ] 推荐内容类型正确（工具、资源、探索）
  - [ ] 点击推荐正确跳转或执行

- [ ] Think模式
  - [ ] 开启Think模式后显示思考过程
  - [ ] 思考步骤清晰可读
  - [ ] 基于思考生成答案
  - [ ] 可以展开/收起思考过程

### 5.2 性能测试

- [ ] 追问生成延迟 < 2秒
- [ ] 推荐触发延迟 < 1秒
- [ ] Think模式总耗时 < 15秒
- [ ] UI渲染流畅无卡顿

---

## 🐛 常见问题解决

### 问题1: 类型不匹配

**错误**: `Type 'Message' is not assignable to type...`

**解决**: 使用适配的类型
```typescript
import type { ChatboxMessage } from '@/packages/aiFeatures/types/chatbox';
const messages: ChatboxMessage[] = session.messages;
```

### 问题2: 导入路径错误

**错误**: `Cannot find module '@/packages/aiFeatures'`

**解决**: 检查 `tsconfig.json` 中的路径映射
```json
{
  "compilerOptions": {
    "paths": {
      "@/packages/*": ["src/renderer/packages/*"]
    }
  }
}
```

### 问题3: LLM调用失败

**错误**: `model.chat is not a function`

**解决**: 确保正确使用 `generateText` 或 `streamText`
```typescript
import { generateText, streamText } from '@/packages/model-calls';

// 对于非流式
const result = await generateText(model, messages);

// 对于流式
const result = await streamText(model, {
  messages,
  onResultChangeWithCancel: (data) => { ... }
});
```

---

## 📚 参考文件位置

- **AI功能主目录**: `src/renderer/packages/aiFeatures/`
- **状态管理**: `src/renderer/stores/aiFeaturesStore.ts`
- **sessionActions**: `src/renderer/stores/sessionActions.ts`
- **类型定义**: `src/renderer/packages/aiFeatures/types/chatbox.ts`
- **集成示例**: `src/renderer/packages/aiFeatures/EXAMPLE_INTEGRATION.tsx`
- **LLM调用**: `src/renderer/packages/model-calls/stream-text.ts`

---

## 🎉 完成集成

按照以上步骤完成后，您将拥有：

1. ✅ 智能追问 - AI回复后自动建议下一步问题
2. ✅ 主动推荐 - 对话中推荐相关资源、工具
3. ✅ Think模式 - AI展示思考过程，提高可靠性

开始享受更智能的对话体验吧！
