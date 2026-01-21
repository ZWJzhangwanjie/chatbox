/**
 * 主动推荐系统 - 推荐引擎
 */

import { ContentBasedStrategy } from '../strategies/contentBased';
import { RecommendationTrigger } from './trigger';
import { RecommendationRanker } from './ranker';
import type { RecommendationContext, Recommendation, RecommendationConfig } from '../types';

export class RecommendationEngine {
  private contentStrategy: ContentBasedStrategy;
  private trigger: RecommendationTrigger;
  private ranker: RecommendationRanker;
  private config: RecommendationConfig;
  private messageCount = 0;

  constructor(config: RecommendationConfig) {
    this.config = config;
    this.contentStrategy = new ContentBasedStrategy();
    this.trigger = new RecommendationTrigger();
    this.ranker = new RecommendationRanker();
    console.log('[AI Features Recommendation] RecommendationEngine initialized with config:', config);
  }

  /**
   * 处理新消息并生成推荐
   */
  async processMessage(
    message: any,
    context: RecommendationContext
  ): Promise<Recommendation[]> {
    this.messageCount++;

    console.log('[AI Features Recommendation] processMessage called', {
      messageCount: this.messageCount,
      refreshInterval: this.config.refreshInterval,
      topic: context.currentTopic,
    });

    // 检查是否应该触发推荐
    if (!this.shouldTrigger(context)) {
      console.log('[AI Features Recommendation] Trigger conditions not met, skipping');
      return [];
    }

    console.log('[AI Features Recommendation] Trigger conditions met, generating recommendations');
    this.messageCount = 0;

    // 生成推荐
    const recommendations = await this.generateRecommendations(context);

    // 排序和过滤
    const ranked = this.ranker.rank(recommendations, context);
    console.log('[AI Features Recommendation] Final ranked recommendations:', {
      originalCount: recommendations.length,
      rankedCount: ranked.length,
      recommendations: ranked,
    });

    return ranked;
  }

  /**
   * 判断是否应该触发
   */
  private shouldTrigger(context: RecommendationContext): boolean {
    if (this.messageCount >= this.config.refreshInterval) {
      console.log('[AI Features Recommendation] shouldTrigger: true (messageCount threshold)');
      return true;
    }

    const triggerResult = this.trigger.evaluate(context);
    console.log('[AI Features Recommendation] shouldTrigger:', triggerResult, '(from trigger.evaluate)');
    return triggerResult;
  }

  /**
   * 生成推荐
   */
  private async generateRecommendations(
    context: RecommendationContext
  ): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];

    const contentBased = await this.contentStrategy.generate(context);
    recommendations.push(...contentBased);

    return recommendations;
  }
}
