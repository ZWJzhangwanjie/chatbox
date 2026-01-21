/**
 * AI功能 - Chatbox类型适配
 * 适配chatbox项目的Message类型
 */

import type { Message } from 'src/shared/types';

// 统一的消息接口 - 使用chatbox的Message类型
export type ChatboxMessage = Message;

// 适配后的追问上下文
export interface FollowUpContext {
  messages: ChatboxMessage[];
  userProfile: {
    interests: string[];
    historyTopics: string[];
    preferredDepth: 'shallow' | 'medium' | 'deep';
    expertiseLevel: 'beginner' | 'intermediate' | 'expert';
  };
  metadata: {
    topic: string;
    intent: string;
    sentiment: 'positive' | 'neutral' | 'negative';
    complexity: number;
  };
  sessionSettings?: any; // 当前会话的设置，用于获取模型配置
}

// 适配后的追问建议
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

// 适配后的推荐上下文
export interface RecommendationContext {
  messages: ChatboxMessage[];
  currentTopic: {
    id: string;
    name: string;
    category: string;
    confidence: number;
  };
  userState: {
    expertiseLevel: 'beginner' | 'intermediate' | 'expert';
    interests: string[];
    recentActions: UserAction[];
  };
}

// 适配后的推荐
export interface Recommendation {
  id: string;
  type: 'resource' | 'tool' | 'branch' | 'faq';
  title: string;
  description: string;
  url?: string;
  icon?: string;
  score: number;
  metadata: {
    category: string;
    tags: string[];
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    estimatedTime?: string;
    popularity?: number;
  };
  action?: {
    type: 'link' | 'function' | 'conversation';
    payload?: any;
  };
}

// 适配后的思考过程
export interface ThoughtProcess {
  steps: ThoughtStep[];
  startTime: number;
  endTime?: number;
  totalDuration?: number;
  status: 'thinking' | 'completed' | 'failed';
  error?: string;
}

export interface ThoughtStep {
  order: number;
  type: 'understanding' | 'decomposition' | 'analysis' | 'reasoning' | 'verification' | 'summary';
  title: string;
  content: string;
  completed: boolean;
  duration?: number;
  subSteps?: ThoughtStep[];
}

// 用户操作
export interface UserAction {
  type: string;
  timestamp: number;
  details?: Record<string, any>;
}
