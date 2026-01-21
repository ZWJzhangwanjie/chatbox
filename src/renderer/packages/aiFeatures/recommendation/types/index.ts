/**
 * 主动推荐系统 - 类型定义
 */

import type { Message as ChatboxMessage } from 'src/shared/types';

// Re-export Message for backward compatibility
export type Message = ChatboxMessage;

export interface RecommendationContext {
  messages: Message[];
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

export interface RecommendationConfig {
  maxPerType: number;
  minRelevanceScore: number;
  refreshInterval: number;
  enableCollaborativeFiltering: boolean;
}

// 工具注册表相关类型
export interface Tool {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  icon: string;
  action: {
    type: string;
    handler?: string;
    params?: Record<string, any>;
  };
}

// 内容索引相关类型
export interface ContentItem {
  id: string;
  title: string;
  description: string;
  url: string;
  category: string;
  tags: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  duration: string;
  views: number;
  relevance: number;
  icon?: string;
}

export interface UserAction {
  type: string;
  timestamp: number;
  details?: Record<string, any>;
}

export interface RelatedTopic {
  id: string;
  displayName: string;
  description: string;
  category: string;
  tags: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  similarity: number;
  introContext: string;
}
