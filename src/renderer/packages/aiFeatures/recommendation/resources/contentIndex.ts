/**
 * 主动推荐系统 - 内容索引
 */

import type { ContentItem } from '../types';

class ContentIndex {
  private items: ContentItem[] = [];

  constructor() {
    this.initializeItems();
  }

  private initializeItems() {
    this.items = [
      // Python相关资源
      {
        id: 'py-docs-1',
        title: 'Python官方文档',
        description: '权威的Python语言参考和教程',
        url: 'https://docs.python.org/',
        category: 'python',
        tags: ['python', '文档', '官方'],
        difficulty: 'intermediate',
        duration: '30分钟',
        views: 50000,
        relevance: 0.95,
        icon: '📖',
      },
      {
        id: 'py-docs-2',
        title: 'Real Python教程',
        description: '实用的Python教程和最佳实践',
        url: 'https://realpython.com/',
        category: 'python',
        tags: ['python', '教程', '实践'],
        difficulty: 'beginner',
        duration: '20分钟',
        views: 30000,
        relevance: 0.9,
        icon: '🐍',
      },
      {
        id: 'py-docs-3',
        title: 'Python for Beginners',
        description: 'Python初学者指南',
        url: 'https://www.python.org/about/gettingstarted/',
        category: 'python',
        tags: ['python', '入门', '新手'],
        difficulty: 'beginner',
        duration: '15分钟',
        views: 45000,
        relevance: 0.88,
      },
      {
        id: 'py-docs-4',
        title: 'LeetCode Python题解',
        description: '算法练习和Python解题技巧',
        url: 'https://leetcode.com/',
        category: 'python',
        tags: ['python', '算法', '练习'],
        difficulty: 'intermediate',
        duration: '45分钟',
        views: 25000,
        relevance: 0.82,
      },

      // JavaScript相关资源
      {
        id: 'js-docs-1',
        title: 'JavaScript MDN文档',
        description: '完整的JavaScript语言参考',
        url: 'https://developer.mozilla.org/zh-CN/docs/Web/JavaScript',
        category: 'javascript',
        tags: ['javascript', '文档', 'mdn'],
        difficulty: 'intermediate',
        duration: '25分钟',
        views: 40000,
        relevance: 0.93,
        icon: '📜',
      },
      {
        id: 'js-docs-2',
        title: 'JavaScript.info',
        description: '现代JavaScript教程',
        url: 'https://javascript.info/',
        category: 'javascript',
        tags: ['javascript', '教程', '现代'],
        difficulty: 'beginner',
        duration: '30分钟',
        views: 35000,
        relevance: 0.9,
      },

      // Web开发相关资源
      {
        id: 'web-docs-1',
        title: 'MDN Web开发教程',
        description: '完整的Web开发指南',
        url: 'https://developer.mozilla.org/zh-CN/docs/Learn',
        category: 'web',
        tags: ['web', 'html', 'css', '教程'],
        difficulty: 'beginner',
        duration: '40分钟',
        views: 60000,
        relevance: 0.95,
        icon: '🌐',
      },
      {
        id: 'web-docs-2',
        title: 'CSS-Tricks',
        description: 'CSS技巧和最佳实践',
        url: 'https://css-tricks.com/',
        category: 'web',
        tags: ['web', 'css', '技巧'],
        difficulty: 'intermediate',
        duration: '15分钟',
        views: 28000,
        relevance: 0.85,
      },

      // 数据分析相关资源
      {
        id: 'data-docs-1',
        title: 'Pandas官方文档',
        description: 'Python数据分析库完整指南',
        url: 'https://pandas.pydata.org/docs/',
        category: '数据分析',
        tags: ['python', 'pandas', '数据分析'],
        difficulty: 'intermediate',
        duration: '35分钟',
        views: 32000,
        relevance: 0.92,
        icon: '🐼',
      },
      {
        id: 'data-docs-2',
        title: 'Kaggle Learn',
        description: '免费的数据科学微课程',
        url: 'https://www.kaggle.com/learn',
        category: '数据分析',
        tags: ['数据科学', '机器学习', '课程'],
        difficulty: 'beginner',
        duration: '1小时',
        views: 20000,
        relevance: 0.88,
      },
    ];
  }

  search(query: string): ContentItem[] {
    const queryLower = query.toLowerCase();

    return this.items
      .filter(item =>
        item.title.toLowerCase().includes(queryLower) ||
        item.description.toLowerCase().includes(queryLower) ||
        item.tags.some(tag => tag.toLowerCase().includes(queryLower)) ||
        item.category.toLowerCase().includes(queryLower)
      )
      .map(item => ({
        ...item,
        relevance: this.calculateRelevance(item, query),
      }))
      .sort((a, b) => b.relevance - a.relevance);
  }

  private calculateRelevance(item: ContentItem, query: string): number {
    const queryLower = query.toLowerCase();
    let score = 0;

    // 标题匹配
    if (item.title.toLowerCase().includes(queryLower)) {
      score += 0.5;
    }

    // 描述匹配
    if (item.description.toLowerCase().includes(queryLower)) {
      score += 0.3;
    }

    // 标签匹配
    const tagMatches = item.tags.filter(tag =>
      tag.toLowerCase().includes(queryLower)
    ).length;
    score += tagMatches * 0.1;

    // 类别匹配
    if (item.category.toLowerCase().includes(queryLower)) {
      score += 0.2;
    }

    return Math.min(score, 1);
  }

  getAllItems(): ContentItem[] {
    return this.items;
  }
}

export const contentIndex = new ContentIndex();
