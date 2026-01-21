/**
 * 智能追问引擎 - 类型定义
 */

import type { Message as ChatboxMessage } from 'src/shared/types';

// Re-export Message for backward compatibility
export type Message = ChatboxMessage;

export interface FollowUpContext {
  // 对话消息
  messages: Message[];

  // 用户画像
  userProfile: {
    interests: string[];
    historyTopics: string[];
    preferredDepth: 'shallow' | 'medium' | 'deep';
    expertiseLevel: 'beginner' | 'intermediate' | 'expert';
  };

  // 对话元数据
  metadata: {
    topic: string;
    intent: string;
    sentiment: 'positive' | 'neutral' | 'negative';
    complexity: number;
  };
}

export interface FollowUpSuggestion {
  id: string;
  text: string;
  type: 'clarification' | 'elaboration' | 'example' | 'action';
  confidence: number;
  source: 'rule' | 'pattern' | 'llm';
  metadata?: {
    relatedTopics?: string[];
    difficulty?: 'beginner' | 'intermediate' | 'advanced';
  };
}

export interface FollowUpConfig {
  maxSuggestions: number;
  minConfidence: number;
  enableLLM: boolean;
  llmModel: string;
  llmMaxTokens: number;
}

// 规则引擎相关类型
export interface Rule {
  id: string;
  keywords: string[];
  type?: 'clarification' | 'elaboration' | 'example' | 'action';
  confidence?: number;
  conditions?: {
    minLength?: number;
    hasQuestionMark?: boolean;
  };
  suggestions: string[];
}

export interface RuleCondition {
  minLength?: number;
  hasQuestionMark?: boolean;
  [key: string]: any;
}
