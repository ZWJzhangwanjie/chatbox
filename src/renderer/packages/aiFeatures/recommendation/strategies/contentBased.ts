/**
 * 主动推荐系统 - 基于内容的推荐策略
 */

import { toolRegistry } from '../resources/toolRegistry';
import { contentIndex } from '../resources/contentIndex';
import type { RecommendationContext, Recommendation } from '../types';

export class ContentBasedStrategy {
  async generate(context: RecommendationContext): Promise<Recommendation[]> {
    console.log('[AI Features Content] ContentBasedStrategy.generate called', {
      topic: context.currentTopic,
      userState: context.userState,
    });

    const { currentTopic, userState } = context;
    const recommendations: Recommendation[] = [];

    // 1. 推荐相关工具
    const tools = this.findRelevantTools(currentTopic.name, userState.expertiseLevel);
    console.log('[AI Features Content] Found relevant tools:', tools);
    recommendations.push(...tools);

    // 2. 推荐学习资源
    const resources = this.findRelevantResources(currentTopic.name, userState.interests);
    console.log('[AI Features Content] Found relevant resources:', resources);
    recommendations.push(...resources);

    // 3. 推荐探索方向
    const branches = this.findExplorationBranches(currentTopic);
    console.log('[AI Features Content] Found exploration branches:', branches);
    recommendations.push(...branches);

    console.log('[AI Features Content] Total recommendations generated:', recommendations.length);
    return recommendations;
  }

  /**
   * 查找相关工具
   */
  private findRelevantTools(topic: string, level: string): Recommendation[] {
    const allTools = toolRegistry.getByCategory(topic);
    console.log('[AI Features Content] findRelevantTools:', { topic, level, allTools });

    const filtered = allTools
      .filter(tool => this.isSuitableForLevel(tool, level))
      .slice(0, 3);

    return filtered.map(tool => ({
      id: `tool_${tool.id}`,
      type: 'tool' as const,
      title: tool.name,
      description: tool.description,
      icon: tool.icon,
      score: this.calculateRelevance(tool, topic),
      metadata: {
        category: tool.category,
        tags: tool.tags,
        difficulty: tool.difficulty,
      },
      action: {
        type: 'function',
        payload: tool.action,
      },
    }));
  }

  /**
   * 查找相关资源
   */
  private findRelevantResources(topic: string, interests: string[]): Recommendation[] {
    const allResources = contentIndex.search(topic);
    console.log('[AI Features Content] findRelevantResources:', { topic, interests, allResources });

    const filtered = allResources
      .filter(resource =>
        interests.length === 0 ||
        resource.tags.some(tag => interests.includes(tag))
      )
      .slice(0, 3);

    return filtered.map(resource => ({
      id: `resource_${resource.id}`,
      type: 'resource' as const,
      title: resource.title,
      description: resource.description,
      url: resource.url,
      icon: resource.icon || '📚',
      score: resource.relevance,
      metadata: {
        category: resource.category,
        tags: resource.tags,
        difficulty: resource.difficulty,
        estimatedTime: resource.duration,
        popularity: resource.views,
      },
      action: {
        type: 'link',
        payload: resource.url,
      },
    }));
  }

  /**
   * 查找探索分支
   */
  private findExplorationBranches(topic: any): Recommendation[] {
    const relatedTopics = this.getRelatedTopics(topic.name);

    return relatedTopics.slice(0, 2).map(related => ({
      id: `branch_${related.id}`,
      type: 'branch' as const,
      title: related.displayName,
      description: related.description,
      icon: '🔍',
      score: related.similarity,
      metadata: {
        category: related.category,
        tags: related.tags,
        difficulty: related.difficulty,
      },
      action: {
        type: 'conversation',
        payload: {
          prompt: `我想了解${related.displayName}`,
          context: related.introContext,
        },
      },
    }));
  }

  /**
   * 判断工具是否适合用户水平
   */
  private isSuitableForLevel(tool: any, level: string): boolean {
    const levels = ['beginner', 'intermediate', 'advanced'];
    const toolLevelIndex = levels.indexOf(tool.difficulty);
    const userLevelIndex = levels.indexOf(level);

    return Math.abs(toolLevelIndex - userLevelIndex) <= 1;
  }

  /**
   * 计算相关度分数
   */
  private calculateRelevance(item: { tags: string[] }, topic: string): number {
    const topicLower = topic.toLowerCase();
    const exactMatch = item.tags.some(tag =>
      tag.toLowerCase() === topicLower
    );

    if (exactMatch) return 0.9;

    const partialMatch = item.tags.some(tag =>
      tag.toLowerCase().includes(topicLower) ||
      topicLower.includes(tag.toLowerCase())
    );

    return partialMatch ? 0.7 : 0.5;
  }

  /**
   * 获取相关话题
   */
  private getRelatedTopics(topic: string): any[] {
    return [
      {
        id: '1',
        displayName: `${topic}进阶`,
        description: `深入学习${topic}的高级特性`,
        category: topic,
        tags: [topic, 'advanced'],
        difficulty: 'intermediate',
        similarity: 0.8,
        introContext: `关于${topic}的深入探讨`,
      },
      {
        id: '2',
        displayName: `${topic}实战项目`,
        description: `通过实践项目巩固${topic}知识`,
        category: topic,
        tags: [topic, 'practice'],
        difficulty: 'intermediate',
        similarity: 0.75,
        introContext: `让我们来做一些${topic}的实际项目`,
      },
    ];
  }
}
