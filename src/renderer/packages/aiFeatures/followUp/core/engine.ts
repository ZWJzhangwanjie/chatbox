/**
 * 智能追问引擎 - 核心引擎
 */

import { LLMBasedStrategy } from '../strategies/llmBased';
import type { FollowUpContext, FollowUpSuggestion, FollowUpConfig } from '../types';

export class FollowUpEngine {
  private llmStrategy: LLMBasedStrategy;
  private config: FollowUpConfig;

  constructor(config: FollowUpConfig) {
    this.config = config;
    this.llmStrategy = new LLMBasedStrategy();
    console.log('[AI Features Engine] FollowUpEngine initialized with config:', config);
  }

  /**
   * 生成追问建议 - 使用LLM生成高质量追问
   * LLM策略：高质量、上下文感知、智能分类
   */
  async generateSuggestions(
    context: FollowUpContext
  ): Promise<FollowUpSuggestion[]> {
    console.log('[AI Features Engine] FollowUpEngine.generateSuggestions called', {
      messagesCount: context.messages.length,
      maxSuggestions: this.config.maxSuggestions,
      minConfidence: this.config.minConfidence,
      hasSessionSettings: !!context.sessionSettings,
    });

    // 使用LLM生成追问建议
    console.log('[AI Features Engine] Starting LLM-based strategy');
    const suggestions = await this.llmStrategy.generate(context);
    console.log('[AI Features Engine] LLM strategy returned:', {
      count: suggestions.length,
      suggestions: suggestions,
    });

    // 去重、排序、过滤
    const refined = this.refineSuggestions(suggestions);
    console.log('[AI Features Engine] Final refined suggestions:', {
      originalCount: suggestions.length,
      refinedCount: refined.length,
      suggestions: refined,
    });

    return refined;
  }

  /**
   * 优化建议列表
   */
  private refineSuggestions(
    suggestions: FollowUpSuggestion[]
  ): FollowUpSuggestion[] {
    // 按置信度排序
    const sorted = suggestions.sort((a, b) => b.confidence - a.confidence);

    // 去重
    const unique = this.deduplicateSuggestions(sorted);

    // 过滤低置信度
    const filtered = unique.filter(
      s => s.confidence >= this.config.minConfidence
    );

    // 限制数量
    return filtered.slice(0, this.config.maxSuggestions);
  }

  /**
   * 去重建议
   */
  private deduplicateSuggestions(
    suggestions: FollowUpSuggestion[]
  ): FollowUpSuggestion[] {
    const seen = new Set<string>();
    return suggestions.filter(s => {
      const normalized = s.text.toLowerCase().trim();
      if (seen.has(normalized)) return false;
      seen.add(normalized);
      return true;
    });
  }
}
