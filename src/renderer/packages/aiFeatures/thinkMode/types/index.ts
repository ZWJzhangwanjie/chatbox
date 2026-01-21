/**
 * Think模式（思维链）- 类型定义
 */

import type { Message as ChatboxMessage } from 'src/shared/types';

// Re-export Message for backward compatibility
export type Message = ChatboxMessage;

export interface ThoughtStep {
  order: number;
  type: 'understanding' | 'decomposition' | 'analysis' | 'reasoning' | 'verification' | 'summary';
  title: string;
  content: string;
  completed: boolean;
  duration?: number;
  subSteps?: ThoughtStep[];
}

export interface ThoughtProcess {
  steps: ThoughtStep[];
  startTime: number;
  endTime?: number;
  totalDuration?: number;
  status: 'thinking' | 'completed' | 'failed';
  error?: string;
}

export interface ThinkModeConfig {
  enabled: boolean;
  strategy: 'cot' | 'self_consistency' | 'tree_of_thoughts';
  maxSteps: number;
  defaultCollapsed: boolean;
  showDuration: boolean;
  allowInterrupt: boolean;
  timeout: number;

  // 模型配置
  useSameModel?: boolean;  // 是否使用主模型（默认 true）
  thinkModelProvider?: string;  // 思考阶段的模型提供商
  thinkModelId?: string;  // 思考阶段的模型 ID
  answerModelProvider?: string;  // 答案阶段的模型提供商
  answerModelId?: string;  // 答案阶段的模型 ID
}

export interface ThinkRequest {
  prompt: string;
  context?: Message[];
  config: ThinkModeConfig;
}

export interface ThinkResponse {
  thoughtProcess: ThoughtProcess;
  finalAnswer: string;
  metadata: {
    model: string;
    totalTokens: number;
    thoughtTokens: number;
    answerTokens: number;
    thinkingTime: number;
    answeringTime: number;
  };
}
