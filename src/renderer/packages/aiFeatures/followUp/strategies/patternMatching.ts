/**
 * 智能追问 - 模式匹配策略
 */

import type { FollowUpContext, FollowUpSuggestion } from '../types';
import { getMessageText } from '../../utils/messageUtils';

export class PatternMatchingStrategy {
  /**
   * 基于模式匹配生成追问
   */
  async generate(context: FollowUpContext): Promise<FollowUpSuggestion[]> {
    const suggestions: FollowUpSuggestion[] = [];
    const lastUserMessage = this.getLastUserMessage(context.messages);
    const lastAIMessage = this.getLastAIMessage(context.messages);

    if (!lastUserMessage) return suggestions;

    const userContent = getMessageText(lastUserMessage);
    if (!userContent) return suggestions;

    // 模式1: 问题包含"什么"但AI回复比较简短
    if (this.matchesWhatQuestion(userContent) &&
        this.isShortResponse(lastAIMessage)) {
      suggestions.push({
        id: this.generateId(),
        text: `能否详细说明一下${this.extractTopic(userContent)}？`,
        type: 'elaboration',
        confidence: 0.75,
        source: 'pattern',
      });
    }

    // 模式2: 问题是关于"怎么"
    if (this.matchesHowQuestion(userContent)) {
      suggestions.push({
        id: this.generateId(),
        text: '有没有具体的示例或步骤？',
        type: 'example',
        confidence: 0.8,
        source: 'pattern',
      });
      suggestions.push({
        id: this.generateId(),
        text: '这需要什么准备工作？',
        type: 'clarification',
        confidence: 0.7,
        source: 'pattern',
      });
    }

    // 模式3: 问题包含"为什么"
    if (this.matchesWhyQuestion(userContent)) {
      suggestions.push({
        id: this.generateId(),
        text: '背后的原理是什么？',
        type: 'elaboration',
        confidence: 0.75,
        source: 'pattern',
      });
    }

    // 模式4: 对话达到一定深度
    if (this.isDeepConversation(context.messages)) {
      suggestions.push({
        id: this.generateId(),
        text: '还有什么相关的知识我应该了解？',
        type: 'elaboration',
        confidence: 0.65,
        source: 'pattern',
      });
    }

    return suggestions;
  }

  private matchesWhatQuestion(content: string): boolean {
    const patterns = [/什么/g, /哪些/g, /what/gi];
    return patterns.some(p => p.test(content));
  }

  private matchesHowQuestion(content: string): boolean {
    const patterns = [/怎么/g, /如何/g, /how/gi];
    return patterns.some(p => p.test(content));
  }

  private matchesWhyQuestion(content: string): boolean {
    const patterns = [/为什么/g, /why/gi];
    return patterns.some(p => p.test(content));
  }

  private isShortResponse(message: any | null): boolean {
    if (!message) return false;
    const content = getMessageText(message);
    return content.length < 300;
  }

  private isDeepConversation(messages: any[]): boolean {
    const userMessages = messages.filter(m => m.role === 'user');
    return userMessages.length >= 3;
  }

  private extractTopic(content: string): string {
    if (!content) return '这个话题';
    const words = content.split(/\s+/).filter(w => w.length > 2);
    return words[0] || '这个话题';
  }

  private getLastUserMessage(messages: any[]): any | null {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'user') return messages[i];
    }
    return null;
  }

  private getLastAIMessage(messages: any[]): any | null {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'assistant') return messages[i];
    }
    return null;
  }

  private generateId(): string {
    return `pattern_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
