/**
 * 智能追问 - 规则引擎策略
 */

import rules from '../config/rules.json';
import type { FollowUpContext, FollowUpSuggestion, Rule } from '../types';
import { getMessageText } from '../../utils/messageUtils';

export class RuleBasedStrategy {
  /**
   * 基于预定义规则生成追问
   */
  async generate(context: FollowUpContext): Promise<FollowUpSuggestion[]> {
    console.log('[AI Features Rule] RuleBasedStrategy.generate called');
    const suggestions: FollowUpSuggestion[] = [];

    const lastUserMessage = this.getLastUserMessage(context.messages);
    if (!lastUserMessage) {
      console.log('[AI Features Rule] No user message found');
      return suggestions;
    }

    const lastAIMessage = this.getLastAIMessage(context.messages);
    const userContent = getMessageText(lastUserMessage);
    console.log('[AI Features Rule] Last user message content:', userContent);

    // 匹配规则
    console.log('[AI Features Rule] Total rules to check:', rules.rules.length);
    let matchedRules = 0;
    for (const rule of rules.rules) {
      const matchResult = this.matchRule(lastUserMessage, lastAIMessage, rule);
      if (matchResult) {
        matchedRules++;
        console.log('[AI Features Rule] Matched rule:', rule.id, 'with', matchResult.length, 'suggestions');
        suggestions.push(...matchResult);
      }
    }

    console.log('[AI Features Rule] Total matched rules:', matchedRules, 'Total suggestions:', suggestions.length);
    return suggestions.slice(0, 4); // 最多返回4条建议
  }

  /**
   * 匹配单个规则
   */
  private matchRule(
    userMessage: any,
    aiMessage: any | null,
    rule: any // Accept any type since rules.json may have optional fields
  ): FollowUpSuggestion[] | null {
    const userContent = getMessageText(userMessage);
    if (!userContent) return null;

    // 检查关键词
    const matchedKeywords = rule.keywords.filter((keyword: string) =>
      userContent.toLowerCase().includes(keyword.toLowerCase())
    );

    if (matchedKeywords.length === 0) return null;

    console.log('[AI Features Rule] Rule', rule.id, 'matched keywords:', matchedKeywords);

    // 检查上下文条件
    if (rule.conditions && !this.checkConditions(rule.conditions, userContent)) {
      console.log('[AI Features Rule] Rule', rule.id, 'conditions not met');
      return null;
    }

    // 生成建议
    const suggestions = rule.suggestions.map((text: string) => ({
      id: this.generateId(),
      text: this.personalizeText(text, userContent),
      type: rule.type || 'elaboration',
      confidence: rule.confidence || 0.7,
      source: 'rule' as const,
    }));

    console.log('[AI Features Rule] Rule', rule.id, 'generated suggestions:', suggestions);
    return suggestions;
  }

  /**
   * 检查规则条件
   */
  private checkConditions(conditions: any, content: string): boolean {
    if (conditions.minLength && content.length < conditions.minLength) {
      return false;
    }

    if (conditions.hasQuestionMark && !content.includes('?')) {
      return false;
    }

    return true;
  }

  /**
   * 个性化建议文本
   */
  private personalizeText(template: string, messageContent: string): string {
    const topic = this.extractTopic(messageContent);
    return template
      .replace('{topic}', topic)
      .replace('{user_name}', '您');
  }

  /**
   * 提取话题
   */
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
    return `suggestion_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
