/**
 * 主动推荐系统 - 排序器
 */

import type { Recommendation, RecommendationContext } from '../types';

export class RecommendationRanker {
  /**
   * 对推荐进行排序和过滤
   */
  rank(recommendations: Recommendation[], context: RecommendationContext): Recommendation[] {
    // 根据用户专业水平调整评分
    const adjusted = recommendations.map(rec => ({
      ...rec,
      score: this.adjustScore(rec, context.userState.expertiseLevel),
    }));

    // 按分数排序
    const sorted = adjusted.sort((a, b) => b.score - a.score);

    return sorted;
  }

  /**
   * 根据用户水平调整分数
   */
  private adjustScore(rec: Recommendation, expertiseLevel: string): number {
    let adjustedScore = rec.score;

    const difficultyMatch = this.getDifficultyMatch(rec.metadata.difficulty, expertiseLevel);
    adjustedScore *= difficultyMatch;

    return Math.min(adjustedScore, 1);
  }

  /**
   * 计算难度匹配度
   */
  private getDifficultyMatch(
    difficulty: string,
    userLevel: string
  ): number {
    const levels = ['beginner', 'intermediate', 'expert'];
    const itemIndex = levels.indexOf(difficulty);
    const userIndex = levels.indexOf(userLevel);

    if (itemIndex === -1 || userIndex === -1) return 1;

    const diff = Math.abs(itemIndex - userIndex);

    // 差距越小，匹配度越高
    switch (diff) {
      case 0:
        return 1.2; // 完全匹配，加权
      case 1:
        return 1.0; // 相近水平
      case 2:
        return 0.7; // 差距较大
      default:
        return 0.5; // 差距很大
    }
  }
}
