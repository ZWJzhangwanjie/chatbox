/**
 * 主动推荐系统 - 工具注册表
 */

import type { Tool } from '../types';

class ToolRegistry {
  private tools: Map<string, Tool[]> = new Map();

  constructor() {
    this.initializeTools();
  }

  private initializeTools() {
    // Python相关工具
    this.registerCategory('python', [
      {
        id: 'jupyter',
        name: 'Jupyter Notebook',
        description: '交互式Python开发环境，支持实时代码执行和可视化',
        category: 'python',
        tags: ['python', 'ide', 'notebook', '可视化'],
        difficulty: 'beginner',
        icon: '📓',
        action: {
          type: 'open_url',
          handler: 'https://jupyter.org/try',
        },
      },
      {
        id: 'repl',
        name: 'Python在线REPL',
        description: '快速运行Python代码片段的在线环境',
        category: 'python',
        tags: ['python', 'repl', 'online', '快速'],
        difficulty: 'beginner',
        icon: '⚡',
        action: {
          type: 'open_url',
          handler: 'https://www.python.org/shell/',
        },
      },
      {
        id: 'pychecker',
        name: 'Python代码检查器',
        description: '检查代码质量、潜在问题和性能瓶颈',
        category: 'python',
        tags: ['python', 'linter', 'quality'],
        difficulty: 'intermediate',
        icon: '🔍',
        action: {
          type: 'function',
          handler: 'checkPythonCode',
        },
      },
    ]);

    // JavaScript相关工具
    this.registerCategory('javascript', [
      {
        id: 'jsfiddle',
        name: 'JSFiddle',
        description: '在线JavaScript编辑器和调试工具',
        category: 'javascript',
        tags: ['javascript', 'ide', 'online', '调试'],
        difficulty: 'beginner',
        icon: '🎻',
        action: {
          type: 'open_url',
          handler: 'https://jsfiddle.net/',
        },
      },
      {
        id: 'codesandbox',
        name: 'CodeSandbox',
        description: '在线代码编辑器，支持前端框架快速原型开发',
        category: 'javascript',
        tags: ['javascript', 'ide', 'react', 'vue'],
        difficulty: 'beginner',
        icon: '📦',
        action: {
          type: 'open_url',
          handler: 'https://codesandbox.io/',
        },
      },
    ]);

    // Web开发相关工具
    this.registerCategory('web', [
      {
        id: 'caniuse',
        name: 'Can I Use',
        description: '浏览器兼容性查询工具',
        category: 'web',
        tags: ['web', '兼容性', '浏览器', 'css'],
        difficulty: 'intermediate',
        icon: '🌐',
        action: {
          type: 'open_url',
          handler: 'https://caniuse.com/',
        },
      },
      {
        id: 'mdn',
        name: 'MDN Web Docs',
        description: 'Web开发权威文档和参考',
        category: 'web',
        tags: ['web', '文档', 'html', 'css', 'javascript'],
        difficulty: 'beginner',
        icon: '📖',
        action: {
          type: 'open_url',
          handler: 'https://developer.mozilla.org/',
        },
      },
    ]);

    // 数据分析相关工具
    this.registerCategory('数据分析', [
      {
        id: 'colab',
        name: 'Google Colab',
        description: '免费的Jupyter Notebook环境，支持GPU',
        category: '数据分析',
        tags: ['python', 'jupyter', '机器学习', 'gpu'],
        difficulty: 'intermediate',
        icon: '🔬',
        action: {
          type: 'open_url',
          handler: 'https://colab.research.google.com/',
        },
      },
      {
        id: 'kaggle',
        name: 'Kaggle',
        description: '数据科学竞赛平台和数据集资源',
        category: '数据分析',
        tags: ['数据科学', '竞赛', '数据集'],
        difficulty: 'intermediate',
        icon: '🎯',
        action: {
          type: 'open_url',
          handler: 'https://www.kaggle.com/',
        },
      },
    ]);
  }

  registerCategory(category: string, tools: Tool[]) {
    this.tools.set(category.toLowerCase(), tools);
  }

  getByCategory(category: string): Tool[] {
    return this.tools.get(category.toLowerCase()) || [];
  }

  search(query: string): Tool[] {
    const queryLower = query.toLowerCase();
    const allTools = Array.from(this.tools.values()).flat();

    return allTools.filter(tool =>
      tool.name.toLowerCase().includes(queryLower) ||
      tool.description.toLowerCase().includes(queryLower) ||
      tool.tags.some(tag => tag.toLowerCase().includes(queryLower))
    );
  }

  getAllTools(): Tool[] {
    return Array.from(this.tools.values()).flat();
  }
}

export const toolRegistry = new ToolRegistry();
