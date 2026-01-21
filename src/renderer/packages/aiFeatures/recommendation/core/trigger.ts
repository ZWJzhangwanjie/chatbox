/**
 * 主动推荐系统 - 触发器
 */

import type { RecommendationContext } from '../types';
import { getMessageText } from '../../utils/messageUtils';

export class RecommendationTrigger {
  /**
   * 评估是否应该触发推荐
   */
  evaluate(context: RecommendationContext): boolean {
    const { messages } = context;

    console.log('[AI Features Trigger] Evaluating triggers', {
      messageCount: messages.length,
    });

    const topicSwitch = this.detectTopicSwitch(messages);
    console.log('[AI Features Trigger] detectTopicSwitch:', topicSwitch);
    if (topicSwitch) return true;

    const deepConversation = this.isDeepConversation(messages, 3);
    console.log('[AI Features Trigger] isDeepConversation:', deepConversation);
    if (deepConversation) return true;

    const problem = this.detectProblem(messages);
    console.log('[AI Features Trigger] detectProblem:', problem);
    if (problem) return true;

    const helpRequest = this.detectHelpRequest(messages);
    console.log('[AI Features Trigger] detectHelpRequest:', helpRequest);
    if (helpRequest) return true;

    console.log('[AI Features Trigger] No trigger conditions met');
    return false;
  }

  /**
   * 检测话题切换
   */
  private detectTopicSwitch(messages: any[]): boolean {
    if (messages.length < 4) {
      console.log('[AI Features Trigger] detectTopicSwitch: false (not enough messages)');
      return false;
    }

    const topics = messages.slice(-4).map(m => this.extractTopic(getMessageText(m)));
    const uniqueTopics = new Set(topics);

    console.log('[AI Features Trigger] detectTopicSwitch: topics', topics, 'unique:', uniqueTopics.size);
    return uniqueTopics.size >= 2;
  }

  /**
   * 检测深度对话
   */
  private isDeepConversation(messages: any[], threshold: number): boolean {
    const userMessages = messages.filter(m => m.role === 'user');
    const result = userMessages.length >= threshold;
    console.log('[AI Features Trigger] isDeepConversation:', result, `(userMessages: ${userMessages.length}, threshold: ${threshold})`);
    return result;
  }

  /**
   * 检测问题
   */
  private detectProblem(messages: any[]): boolean {
    const lastMessage = messages[messages.length - 1];
    if (!lastMessage || lastMessage.role !== 'assistant') {
      console.log('[AI Features Trigger] detectProblem: false (no assistant message)');
      return false;
    }

    const content = getMessageText(lastMessage);
    if (!content) {
      console.log('[AI Features Trigger] detectProblem: false (no content)');
      return false;
    }

    const problemKeywords = ['错误', '问题', 'bug', 'error', 'issue', '失败', '无法'];
    const hasProblem = problemKeywords.some(kw =>
      content.toLowerCase().includes(kw)
    );
    console.log('[AI Features Trigger] detectProblem:', hasProblem);
    return hasProblem;
  }

  /**
   * 检测帮助请求
   */
  private detectHelpRequest(messages: any[]): boolean {
    const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
    if (!lastUserMessage) {
      console.log('[AI Features Trigger] detectHelpRequest: false (no user message)');
      return false;
    }

    const content = getMessageText(lastUserMessage);
    if (!content) {
      console.log('[AI Features Trigger] detectHelpRequest: false (no content)');
      return false;
    }

    const helpKeywords = ['帮助', 'help', '怎么办', '如何解决', '求助'];
    const hasHelp = helpKeywords.some(kw =>
      content.toLowerCase().includes(kw)
    );
    console.log('[AI Features Trigger] detectHelpRequest:', hasHelp);
    return hasHelp;
  }

  private extractTopic(content: string): string {
    if (!content) return '';
    const words = content.split(/\s+/);
    return words[0] || '';
  }
}
