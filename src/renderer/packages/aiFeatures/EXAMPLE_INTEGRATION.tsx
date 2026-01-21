/**
 * Chat组件集成示例
 *
 * 这是一个示例文件，展示如何在Chat组件中集成三大AI功能
 * 实际集成时需要根据chatbox项目进行调整
 */

import React, { useState, useMemo } from 'react';
import { AIFeaturesCoordinator } from '@/packages/aiFeatures';
import { SuggestionChips } from '@/packages/aiFeatures/followUp';
import { RecommendationPanel } from '@/packages/aiFeatures/recommendation';
import { ThinkIndicator } from '@/packages/aiFeatures/thinkMode';
import { useAIFeaturesStore } from '@/stores/aiFeaturesStore';

/**
 * Chat组件集成示例
 */
export function ChatWithAIFeatures() {
  const [messages, setMessages] = useState<any[]>([]);
  const [followUpSuggestions, setFollowUpSuggestions] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [currentThinkProcess, setCurrentThinkProcess] = useState<any>(null);

  const {
    followUpEnabled,
    recommendationEnabled,
    thinkModeEnabled,
  } = useAIFeaturesStore();

  // 初始化协调器
  const coordinator = useMemo(() => new AIFeaturesCoordinator({
    followUp: {
      maxSuggestions: 4,
      minConfidence: 0.6,
      enableLLM: false, // 暂时关闭LLM生成
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

  /**
   * 处理发送消息
   */
  const handleSendMessage = async (content: string) => {
    // 添加用户消息
    const newUserMessage = {
      id: `msg_${Date.now()}`,
      role: 'user' as const,
      content,
      timestamp: Date.now(),
    };
    setMessages(prev => [...prev, newUserMessage]);

    // 如果开启Think模式
    if (thinkModeEnabled) {
      setCurrentThinkProcess({
        steps: [],
        startTime: Date.now(),
        status: 'thinking',
      });

      try {
        const thinkResponse = await coordinator.executeThinkMode(
          content,
          messages,
          useAIFeaturesStore.getState().thinkModeConfig
        );

        setCurrentThinkProcess(thinkResponse.thoughtProcess);

        setTimeout(() => {
          const aiMessage = {
            id: `msg_${Date.now()}`,
            role: 'assistant' as const,
            content: thinkResponse.finalAnswer,
            timestamp: Date.now(),
            metadata: {
              thinkProcess: thinkResponse.thoughtProcess,
            },
          };
          setMessages(prev => [...prev, aiMessage]);
          setCurrentThinkProcess(null);

          // 生成追问和推荐
          handleAfterResponse(aiMessage);
        }, 500);

      } catch (error) {
        console.error('Think mode failed:', error);
        setCurrentThinkProcess(null);
      }
    } else {
      // 普通发送 - 这里需要调用实际的LLM API
      const aiMessage = {
        id: `msg_${Date.now()}`,
        role: 'assistant' as const,
        content: '这是AI的回复内容（实际使用时需要调用LLM API）',
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, aiMessage]);

      // 生成追问和推荐
      handleAfterResponse(aiMessage);
    }
  };

  /**
   * 处理AI回复后的操作
   */
  const handleAfterResponse = async (aiMessage: any) => {
    const results = await coordinator.handleAfterResponse(
      aiMessage,
      [...messages, aiMessage],
      {
        followUpEnabled,
        recommendationEnabled,
      }
    );

    setFollowUpSuggestions(results.followUpSuggestions);
    setRecommendations(results.recommendations);
  };

  /**
   * 处理追问选择
   */
  const handleSuggestionSelect = (suggestion: any) => {
    // 将建议的文本设置为输入内容
    // setInputText(suggestion.text);
    console.log('Selected suggestion:', suggestion.text);
    setFollowUpSuggestions([]);
  };

  /**
   * 处理推荐选择
   */
  const handleRecommendationSelect = (recommendation: any) => {
    if (recommendation.action?.type === 'link' && recommendation.action.payload) {
      window.open(recommendation.action.payload, '_blank');
    } else if (recommendation.action?.type === 'conversation') {
      // setInputText(recommendation.action.payload.prompt);
      console.log('Branch conversation:', recommendation.action.payload.prompt);
    }
    setRecommendations([]);
  };

  return (
    <div className="chat-container" style={{ padding: '20px' }}>
      {/* 功能切换工具栏 */}
      <div style={{
        padding: '12px',
        marginBottom: '16px',
        background: '#f3f4f6',
        borderRadius: '8px',
        display: 'flex',
        gap: '12px',
      }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <input
            type="checkbox"
            checked={followUpEnabled}
            onChange={() => useAIFeaturesStore.getState().toggleFollowUp()}
          />
          智能追问
        </label>

        <label style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <input
            type="checkbox"
            checked={recommendationEnabled}
            onChange={() => useAIFeaturesStore.getState().toggleRecommendation()}
          />
          主动推荐
        </label>

        <label style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <input
            type="checkbox"
            checked={thinkModeEnabled}
            onChange={() => useAIFeaturesStore.getState().toggleThinkMode()}
          />
          Think模式
        </label>
      </div>

      {/* 消息列表 */}
      <div style={{ marginBottom: '16px' }}>
        {messages.map((message) => (
          <div
            key={message.id}
            style={{
              padding: '12px',
              marginBottom: '8px',
              background: message.role === 'user' ? '#e0e7ff' : '#f3f4f6',
              borderRadius: '8px',
            }}
          >
            <strong>{message.role === 'user' ? '用户' : 'AI'}:</strong>
            <p style={{ margin: '4px 0 0 0' }}>{message.content}</p>
          </div>
        ))}

        {/* 当前Think过程 */}
        {currentThinkProcess && (
          <ThinkIndicator
            thoughtProcess={currentThinkProcess}
            defaultCollapsed={false}
          />
        )}
      </div>

      {/* 追问建议 */}
      {followUpSuggestions.length > 0 && (
        <SuggestionChips
          suggestions={followUpSuggestions}
          onSelect={handleSuggestionSelect}
        />
      )}

      {/* 主动推荐 */}
      {recommendations.length > 0 && (
        <RecommendationPanel
          recommendations={recommendations}
          onSelect={handleRecommendationSelect}
          onDismiss={() => setRecommendations([])}
        />
      )}

      {/* 输入框 */}
      <div style={{ marginTop: '16px' }}>
        <input
          type="text"
          placeholder="输入消息..."
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              const target = e.target as HTMLInputElement;
              if (target.value.trim()) {
                handleSendMessage(target.value);
                target.value = '';
              }
            }
          }}
          style={{
            width: '100%',
            padding: '12px',
            border: '1px solid #d1d5db',
            borderRadius: '8px',
            fontSize: '14px',
          }}
        />
      </div>
    </div>
  );
}

/**
 * 使用说明
 *
 * 1. 在实际的Chat组件中，导入需要的组件和hook:
 *    import { AIFeaturesCoordinator } from '@/packages/aiFeatures';
 *    import { SuggestionChips } from '@/packages/aiFeatures/followUp';
 *    import { RecommendationPanel } from '@/packages/aiFeatures/recommendation';
 *    import { ThinkIndicator } from '@/packages/aiFeatures/thinkMode';
 *    import { useAIFeaturesStore } from '@/stores/aiFeaturesStore';
 *
 * 2. 初始化协调器:
 *    const coordinator = useMemo(() => new AIFeaturesCoordinator({...}), []);
 *
 * 3. 在发送消息时处理Think模式:
 *    - 如果开启Think模式，调用 coordinator.executeThinkMode()
 *    - 显示思考过程
 *    - 思考完成后显示答案
 *
 * 4. 在AI回复后生成追问和推荐:
 *    await coordinator.handleAfterResponse(message, allMessages, settings);
 *
 * 5. 渲染UI组件:
 *    - <ThinkIndicator /> 显示思考过程
 *    - <SuggestionChips /> 显示追问建议
 *    - <RecommendationPanel /> 显示推荐内容
 *
 * 6. 实际LLM调用:
 *    需要替换示例中的模拟LLM调用为实际的LLM API
 */
