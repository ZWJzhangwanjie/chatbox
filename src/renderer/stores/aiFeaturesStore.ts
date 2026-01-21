/**
 * AI功能 - Zustand状态管理
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { FollowUpSuggestion, Recommendation } from '@/packages/aiFeatures/types';
import type { ThoughtProcess } from '@/packages/aiFeatures/thinkMode/types';

// Session级别的AI功能数据
interface SessionAIFeaturesData {
  followUpSuggestions: FollowUpSuggestion[];
  recommendations: Recommendation[];
  // Think模式数据
  thoughtProcess?: ThoughtProcess;
  thinkMessageId?: string; // 关联的消息ID
  timestamp: number;
}

interface AIFeaturesState {
  // 功能开关
  followUpEnabled: boolean;
  recommendationEnabled: boolean;
  thinkModeEnabled: boolean;

  // 配置
  followUpConfig: {
    maxSuggestions: number;
    minConfidence: number;
    enableLLM: boolean;
  };

  recommendationConfig: {
    maxPerType: number;
    refreshInterval: number;
  };

  thinkModeConfig: {
    strategy: 'cot' | 'self_consistency';
    maxSteps: number;
    defaultCollapsed: boolean;
  };

  // 用户偏好
  userPreferences: {
    expertiseLevel: 'beginner' | 'intermediate' | 'expert';
    interests: string[];
  };

  // Session级别的AI功能数据（不持久化）
  sessionFeatures: Record<string, SessionAIFeaturesData>;

  // 操作
  toggleFollowUp: () => void;
  toggleRecommendation: () => void;
  toggleThinkMode: () => void;
  updateFollowUpConfig: (config: Partial<AIFeaturesState['followUpConfig']>) => void;
  updateRecommendationConfig: (config: Partial<AIFeaturesState['recommendationConfig']>) => void;
  updateThinkModeConfig: (config: Partial<AIFeaturesState['thinkModeConfig']>) => void;
  updateUserPreferences: (preferences: Partial<AIFeaturesState['userPreferences']>) => void;

  // Session数据操作
  setSessionFeatures: (sessionId: string, data: SessionAIFeaturesData) => void;
  getSessionFeatures: (sessionId: string) => SessionAIFeaturesData | undefined;
  clearSessionFeatures: (sessionId: string) => void;
  clearSessionRecommendations: (sessionId: string) => void;

  // Think模式数据操作
  setThoughtProcess: (sessionId: string, messageId: string, thoughtProcess: ThoughtProcess) => void;
  getThoughtProcess: (sessionId: string, messageId: string) => ThoughtProcess | undefined;
  clearThoughtProcess: (sessionId: string) => void;
}

export const useAIFeaturesStore = create<AIFeaturesState>()(
  persist(
    (set, get) => ({
      // 默认值
      followUpEnabled: true,
      recommendationEnabled: false,  // 暂时禁用推荐功能
      thinkModeEnabled: false,

      followUpConfig: {
        maxSuggestions: 4,
        minConfidence: 0.6,
        enableLLM: false,
      },

      recommendationConfig: {
        maxPerType: 3,
        refreshInterval: 3,
      },

      thinkModeConfig: {
        strategy: 'cot',
        maxSteps: 3,
        defaultCollapsed: true,
        useSameModel: true,  // 默认使用主模型
        // thinkModelProvider: '',  // 用户可以单独配置
        // thinkModelId: '',
        // answerModelProvider: '',
        // answerModelId: '',
      },

      userPreferences: {
        expertiseLevel: 'intermediate',
        interests: [],
      },

      sessionFeatures: {},

      // 操作
      toggleFollowUp: () => set((state) => ({ followUpEnabled: !state.followUpEnabled })),
      toggleRecommendation: () => set((state) => ({ recommendationEnabled: !state.recommendationEnabled })),
      toggleThinkMode: () => set((state) => ({ thinkModeEnabled: !state.thinkModeEnabled })),

      updateFollowUpConfig: (config) => set((state) => ({
        followUpConfig: { ...state.followUpConfig, ...config }
      })),

      updateRecommendationConfig: (config) => set((state) => ({
        recommendationConfig: { ...state.recommendationConfig, ...config }
      })),

      updateThinkModeConfig: (config) => set((state) => ({
        thinkModeConfig: { ...state.thinkModeConfig, ...config }
      })),

      updateUserPreferences: (preferences) => set((state) => ({
        userPreferences: { ...state.userPreferences, ...preferences }
      })),

      // Session数据操作
      setSessionFeatures: (sessionId, data) => {
        console.log('[AI Features Store] setSessionFeatures called', {
          sessionId,
          followUpCount: data.followUpSuggestions.length,
          recommendationCount: data.recommendations.length,
        });
        set((state) => {
          // 保留已有的思考过程数据（如果有）
          const existingData = state.sessionFeatures[sessionId];
          return {
            sessionFeatures: {
              ...state.sessionFeatures,
              [sessionId]: {
                ...data,
                // 保留已有的思考过程数据
                thoughtProcess: existingData?.thoughtProcess,
                thinkMessageId: existingData?.thinkMessageId,
              },
            },
          };
        });
      },

      getSessionFeatures: (sessionId) => {
        return get().sessionFeatures[sessionId];
      },

      clearSessionFeatures: (sessionId) => set((state) => {
        const newFeatures = { ...state.sessionFeatures };
        delete newFeatures[sessionId];
        return { sessionFeatures: newFeatures };
      }),

      clearSessionRecommendations: (sessionId) => set((state) => {
        const sessionData = state.sessionFeatures[sessionId];
        if (sessionData) {
          return {
            sessionFeatures: {
              ...state.sessionFeatures,
              [sessionId]: {
                ...sessionData,
                recommendations: [],
              },
            },
          };
        }
        return state;
      }),

      // Think模式数据操作
      setThoughtProcess: (sessionId, messageId, thoughtProcess) => {
        set((state) => {
          const existingData = state.sessionFeatures[sessionId] || {
            followUpSuggestions: [],
            recommendations: [],
            timestamp: Date.now(),
          };
          const newData = {
            ...state.sessionFeatures,
            [sessionId]: {
              ...existingData,
              thoughtProcess,
              thinkMessageId: messageId,
              timestamp: Date.now(),
            },
          };
          return {
            sessionFeatures: newData,
          };
        });
      },

      getThoughtProcess: (sessionId, messageId) => {
        const data = get().sessionFeatures[sessionId];
        const result = (data && data.thinkMessageId === messageId) ? data.thoughtProcess : undefined;
        return result;
      },

      clearThoughtProcess: (sessionId) => set((state) => {
        const sessionData = state.sessionFeatures[sessionId];
        if (sessionData) {
          return {
            sessionFeatures: {
              ...state.sessionFeatures,
              [sessionId]: {
                ...sessionData,
                thoughtProcess: undefined,
                thinkMessageId: undefined,
              },
            },
          };
        }
        return state;
      }),
    }),
    {
      name: 'ai-features-storage',
      // 不持久化 sessionFeatures，因为它是临时数据
      partialize: (state) => ({
        followUpEnabled: state.followUpEnabled,
        recommendationEnabled: state.recommendationEnabled,
        thinkModeEnabled: state.thinkModeEnabled,
        followUpConfig: state.followUpConfig,
        recommendationConfig: state.recommendationConfig,
        thinkModeConfig: state.thinkModeConfig,
        userPreferences: state.userPreferences,
      }),
    }
  )
);
