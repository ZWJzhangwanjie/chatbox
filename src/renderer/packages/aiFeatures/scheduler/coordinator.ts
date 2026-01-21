/**
 * AI功能 - 统一调度器
 */

import { FollowUpEngine } from '../followUp/core/engine';
import { RecommendationEngine } from '../recommendation/core/engine';
import { ThinkModeEngine } from '../thinkMode/core/engine';
import type { Message } from '../followUp/types';
import type { FollowUpSuggestion } from '../followUp/types';
import type { Recommendation } from '../recommendation/types';
import { getMessageText, getLastUserMessage } from '../utils/messageUtils';

export class AIFeaturesCoordinator {
  private followUpEngine: FollowUpEngine;
  private recommendationEngine: RecommendationEngine;
  private thinkModeEngine: ThinkModeEngine;

  constructor(config: {
    followUp: any;
    recommendation: any;
    thinkMode: any;
  }) {
    this.followUpEngine = new FollowUpEngine(config.followUp);
    this.recommendationEngine = new RecommendationEngine(config.recommendation);
    this.thinkModeEngine = new ThinkModeEngine(config.thinkMode);
  }

  /**
   * 处理AI回复后的操作
   */
  async handleAfterResponse(
    message: Message,
    allMessages: Message[],
    userSettings: {
      followUpEnabled: boolean;
      recommendationEnabled: boolean;
    },
    sessionSettings?: any
  ): Promise<{ followUpSuggestions: FollowUpSuggestion[]; recommendations: Recommendation[] }> {
    const results: { followUpSuggestions: FollowUpSuggestion[]; recommendations: Recommendation[] } = {
      followUpSuggestions: [],
      recommendations: [],
    };

    // 并行执行
    const tasks: Promise<void>[] = [];

    if (userSettings.followUpEnabled) {
      tasks.push(
        this.followUpEngine.generateSuggestions({
          messages: allMessages,
          userProfile: this.getUserProfile(),
          metadata: this.getConversationMetadata(allMessages),
          sessionSettings: sessionSettings,
        }).then(suggestions => {
          results.followUpSuggestions = suggestions;
        })
      );
    }

    if (userSettings.recommendationEnabled) {
      tasks.push(
        this.recommendationEngine.processMessage(message, {
          messages: allMessages,
          currentTopic: this.extractCurrentTopic(allMessages),
          userState: this.getUserState(),
        }).then(recommendations => {
          results.recommendations = recommendations;
        })
      );
    }

    await Promise.all(tasks);

    return results;
  }

  /**
   * 执行Think模式
   */
  async executeThinkMode(
    prompt: string,
    context: Message[],
    config: any
  ) {
    return this.thinkModeEngine.think({
      prompt,
      context,
      config,
    });
  }

  // 辅助方法
  private getUserProfile() {
    return {
      interests: [],
      historyTopics: [],
      preferredDepth: 'medium' as const,
      expertiseLevel: 'intermediate' as const,
    };
  }

  private getConversationMetadata(messages: Message[]) {
    const lastUserMsg = getLastUserMessage(messages);
    const content = lastUserMsg ? getMessageText(lastUserMsg) : '';

    // 简单的话题提取
    const topic = this.extractKeyword(content);

    return {
      topic,
      intent: this.detectIntent(content),
      sentiment: this.detectSentiment(content),
      complexity: Math.min(content.length / 500, 1),
    };
  }

  private extractCurrentTopic(messages: Message[]) {
    const lastUserMsg = getLastUserMessage(messages);
    const content = lastUserMsg ? getMessageText(lastUserMsg) : '';
    const topic = this.extractKeyword(content);

    return {
      id: `topic_${Date.now()}`,
      name: topic || 'general',
      category: this.categorizeContent(content),
      confidence: topic ? 0.7 : 0.3,
    };
  }

  private getUserState() {
    return {
      expertiseLevel: 'intermediate' as const,
      interests: [],
      recentActions: [],
    };
  }

  /**
   * 提取关键词
   */
  private extractKeyword(content: string): string {
    if (!content) return '';

    // 移除标点符号和特殊字符
    const cleanContent = content.replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s]/g, ' ');

    // 提取词汇（优先中文）
    const chineseWords = cleanContent.match(/[\u4e00-\u9fa5]{2,}/g) || [];
    const englishWords = cleanContent.match(/[a-zA-Z]{3,}/g) || [];

    const allWords = [...chineseWords, ...englishWords];

    // 返回第一个有意义的词
    return allWords[0] || '';
  }

  /**
   * 检测意图
   */
  private detectIntent(content: string): string {
    if (!content) return 'unknown';

    if (content.includes('怎么') || content.includes('如何') || content.includes('how')) {
      return 'how_to';
    }
    if (content.includes('什么') || content.includes('which') || content.includes('what')) {
      return 'what_is';
    }
    if (content.includes('为什么') || content.includes('why')) {
      return 'why';
    }
    if (content.includes('错误') || content.includes('bug') || content.includes('问题')) {
      return 'troubleshooting';
    }

    return 'general_inquiry';
  }

  /**
   * 检测情感
   */
  private detectSentiment(content: string): 'positive' | 'neutral' | 'negative' {
    if (!content) return 'neutral';

    const negativeWords = ['错误', '失败', '问题', 'bug', 'error', '不行', '无法'];
    const positiveWords = ['好', '成功', '正确', '谢谢', '感谢', '可以'];

    const hasNegative = negativeWords.some(w => content.includes(w));
    const hasPositive = positiveWords.some(w => content.includes(w));

    if (hasNegative) return 'negative';
    if (hasPositive) return 'positive';
    return 'neutral';
  }

  /**
   * 分类内容
   */
  private categorizeContent(content: string): string {
    if (!content) return 'general';

    const categories = {
      programming: ['代码', '函数', '类', '变量', 'code', 'function', 'class', 'programming'],
      data: ['数据', '数据库', 'sql', 'data', 'database'],
      web: ['网页', '网站', 'html', 'css', 'web', 'website', 'frontend'],
      tools: ['工具', '软件', '命令', 'tool', 'software', 'command'],
      learning: ['学习', '教程', '如何', 'learn', 'tutorial', 'how'],
    };

    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(kw => content.toLowerCase().includes(kw))) {
        return category;
      }
    }

    return 'general';
  }
}
