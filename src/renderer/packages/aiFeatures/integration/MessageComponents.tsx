/**
 * AI功能UI组件 - 消息后追加组件
 * 在AI回复后显示追问建议和主动推荐
 */

import React, { memo } from 'react';
import { SuggestionChips } from '../followUp';
import { RecommendationPanel } from '../recommendation';
import type { FollowUpSuggestion, Recommendation } from '../types';
import { createMessage } from '../../../../shared/types';
import { submitNewUserMessage } from '@/stores/sessionActions';
import { useAIFeaturesStore } from '@/stores/aiFeaturesStore';

interface AIFeaturesMessageProps {
  followUpSuggestions: FollowUpSuggestion[];
  recommendations: Recommendation[];
  sessionId: string;
  /** AI Ad Network - 所有格式的广告数据 */
  allAds?: import('@/packages/ads/core/types').Ad[];
  /** AI Ad Network - 广告集成数据（包含 getAdsBySlot 和 getSlot） */
  adData?: {
    ads: import('@/packages/ads/core/types').Ad[];
    slots: import('@/packages/ads/core/types').SlotResponse[];
    getAdsBySlot: (slotId: string) => import('@/packages/ads/core/types').Ad[];
    getSlot: (slotId: string) => import('@/packages/ads/core/types').SlotResponse | undefined;
  };
}

/**
 * 消息后的AI功能组件
 * 接收预计算的数据作为 props，避免无限循环
 * 注意：思考过程已移至消息内容内显示，不再在此处显示
 */
export const AIFeaturesMessage = memo<AIFeaturesMessageProps>(
  ({ followUpSuggestions, recommendations, sessionId, allAds, adData }) => {
    // 从 adData 中获取便捷方法
    const getAdsBySlot = adData?.getAdsBySlot;
    const getSlot = adData?.getSlot;

    // 检查是否有 followup 广告数据
    const hasFollowUpAd = getAdsBySlot && getAdsBySlot('slot-followup')?.length > 0;

    // 如果没有任何数据，不渲染任何内容
    const hasAnyData =
      followUpSuggestions.length > 0 ||
      recommendations.length > 0 ||
      hasFollowUpAd;

    if (!hasAnyData) {
      return null;
    }

    // 显示追问和推荐
    return (
      <>
        {/* 主动推荐 */}
        {recommendations.length > 0 && (
          <div style={{ margin: '16px 0' }}>
            <RecommendationPanel
              recommendations={recommendations}
              onSelect={(rec) => handleRecommendationSelect(rec, sessionId)}
              onDismiss={() => handleDismissRecommendations(sessionId)}
            />
          </div>
        )}

        {/* 智能追问 - 有建议或有广告时都显示 */}
        {(followUpSuggestions.length > 0 || hasFollowUpAd) && (
          <div style={{ margin: '16px 0' }}>
            <SuggestionChips
              suggestions={followUpSuggestions}
              onSelect={(suggestion) => handleSuggestionSelect(suggestion, sessionId)}
              allAds={allAds}
              getAdsBySlot={getAdsBySlot}
              getSlot={getSlot}
            />
          </div>
        )}
      </>
    );
  }
);

AIFeaturesMessage.displayName = 'AIFeaturesMessage';

/**
 * 处理追问选择
 * 将选中的追问建议作为新消息发送
 */
async function handleSuggestionSelect(suggestion: FollowUpSuggestion, sessionId: string) {
  console.log('[AI Features] Selected follow-up:', suggestion.text, 'for session:', sessionId);

  try {
    // 确保文本是字符串
    const text = String(suggestion.text || '');

    // 创建新消息
    const newUserMsg = createMessage('user', text);

    // 清除当前的AI功能数据，避免重复显示
    useAIFeaturesStore.getState().clearSessionFeatures(sessionId);

    // 提交消息到当前会话
    await submitNewUserMessage(sessionId, {
      newUserMsg,
      needGenerating: true,
    });

    console.log('[AI Features] Follow-up message sent successfully');
  } catch (error) {
    console.error('[AI Features] Failed to send follow-up message:', error);
  }
}

/**
 * 处理推荐选择
 */
async function handleRecommendationSelect(recommendation: Recommendation, sessionId: string) {
  console.log('[AI Features] Selected recommendation:', recommendation.title, recommendation);

  // 优先处理 action 类型
  if (recommendation.action?.type === 'link') {
    const url = recommendation.action.payload || recommendation.url;
    if (url) {
      window.open(url, '_blank');
    }
    return;
  }

  if (recommendation.action?.type === 'conversation') {
    // 将推荐内容作为新消息发送
    try {
      // 安全地提取文本内容
      let text = '';
      if (typeof recommendation.action.payload === 'string') {
        text = recommendation.action.payload;
      } else if (recommendation.title) {
        text = recommendation.title;
      } else if (recommendation.description) {
        text = recommendation.description;
      }

      if (!text) {
        console.warn('[AI Features] No valid text content in recommendation');
        return;
      }

      const newUserMsg = createMessage('user', text);

      // 清除当前的AI功能数据
      useAIFeaturesStore.getState().clearSessionFeatures(sessionId);

      await submitNewUserMessage(sessionId, {
        newUserMsg,
        needGenerating: true,
      });
      console.log('[AI Features] Conversation recommendation sent successfully');
    } catch (error) {
      console.error('[AI Features] Failed to send conversation recommendation:', error);
    }
    return;
  }

  if (recommendation.action?.type === 'function') {
    // TODO: 执行自定义函数
    console.log('[AI Features] Execute function:', recommendation.action.payload);
    return;
  }

  // 如果没有 action 但有 url，则打开链接
  if (recommendation.url) {
    window.open(recommendation.url, '_blank');
    return;
  }

  // 默认行为：将推荐标题作为问题发送
  if (recommendation.title) {
    try {
      const newUserMsg = createMessage('user', recommendation.title);

      // 清除当前的AI功能数据
      useAIFeaturesStore.getState().clearSessionFeatures(sessionId);

      await submitNewUserMessage(sessionId, {
        newUserMsg,
        needGenerating: true,
      });
      console.log('[AI Features] Recommendation sent as message successfully');
    } catch (error) {
      console.error('[AI Features] Failed to send recommendation message:', error);
    }
  }
}

/**
 * 关闭推荐
 */
async function handleDismissRecommendations(sessionId: string) {
  console.log('[AI Features] Dismissing recommendations for session:', sessionId);
  useAIFeaturesStore.getState().clearSessionRecommendations(sessionId);
}
