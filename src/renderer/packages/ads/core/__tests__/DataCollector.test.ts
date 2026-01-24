/**
 * AI Ad Network - DataCollector 单元测试
 */

import { describe, expect, it, beforeEach } from 'vitest';
import { DataCollector } from '../DataCollector';
import type { AdConfig } from '../../config/adConfigSchema';
import type { AdTriggerContext } from '../types';

// 创建测试配置
function createTestConfig(overrides: Partial<AdConfig> = {}): AdConfig {
  return {
    enabled: true,
    api: {
      baseUrl: 'https://api.test.com',
      apiKey: 'test-key',
      timeout: 5000,
      useMock: true,
    },
    dataCollection: {
      includeQuery: true,
      includeResponse: true,
      includeFullContext: false,
      includeMemory: false,
      includeProfile: false,
      contextWindow: 10,
      enableAnonymization: true,
    },
    formats: {
      actionCard: {
        enabled: true,
        variant: 'horizontal',
        placement: 'post_response',
        frequency: 3,
        maxPerSession: 5,
        showRating: true,
        showPrice: true,
      },
      suffix: {
        enabled: true,
        variant: 'block',
        placement: 'block',
        frequency: 5,
        maxPerSession: 3,
        showDivider: true,
      },
      followup: {
        enabled: false,
        variant: 'bubble',
        placement: 'inline_questions',
        frequency: 5,
        maxPerSession: 3,
        mixPosition: 2,
      },
      source: {
        enabled: false,
        variant: 'card',
        frequency: 5,
        maxPerSession: 3,
        mixPosition: 1,
        showSponsoredLabel: true,
      },
      static: {
        enabled: false,
        placement: 'sidebar',
        width: 300,
        height: 250,
        refreshInterval: 0,
        dismissible: true,
      },
      leadGen: {
        enabled: false,
        placement: 'post_response',
        frequency: 10,
        maxPerSession: 1,
        fields: [],
      },
    },
    privacy: {
      enabled: true,
      requireConsent: true,
      dataRetentionDays: 0,
      allowedDataTypes: ['query', 'response', 'context', 'memory', 'profile'],
    },
    debug: false,
  };
}

// 创建测试上下文
function createTestContext(overrides: Partial<AdTriggerContext> = {}): AdTriggerContext {
  return {
    currentMessage: {
      query: 'What is machine learning?',
      response: 'Machine learning is a subset of artificial intelligence...',
      timestamp: Date.now(),
      model: 'gpt-4',
      provider: 'openai',
      isStreaming: false,
    },
    conversationContext: {
      sessionId: 'session-123',
      messageCount: 5,
      messages: [
        { role: 'user', content: 'Hello', timestamp: Date.now() - 10000 },
        { role: 'assistant', content: 'Hi there!', timestamp: Date.now() - 9000 },
        { role: 'user', content: 'How are you?', timestamp: Date.now() - 8000 },
        { role: 'assistant', content: 'I am doing well!', timestamp: Date.now() - 7000 },
        { role: 'user', content: 'What is AI?', timestamp: Date.now() - 6000 },
      ],
      topic: 'technology',
    },
    userData: {
      memory: {
        shortTerm: {
          preferredLanguage: 'en',
          recentTopic: 'technology',
        },
        longTerm: {
          interests: ['programming', 'ai', 'science'],
        },
      },
      profile: {
        interests: ['technology', 'programming', 'ai'],
        demographics: {
          ageRange: '25-34',
          language: 'en',
          timezone: 'America/New_York',
        },
        behaviorPattern: {
          preferredTopics: ['technical', 'educational'],
          interactionStyle: 'detailed',
        },
      },
      preferences: {
        language: 'en',
        theme: 'dark',
        customSettings: {},
      },
    },
    ...overrides,
  };
}

describe('DataCollector', () => {
  let collector: DataCollector;
  let config: AdConfig;

  beforeEach(() => {
    config = createTestConfig();
    collector = new DataCollector(config);
  });

  describe('初始化', () => {
    it('应该正确初始化', () => {
      expect(collector).toBeDefined();
    });
  });

  describe('collect - 基础数据收集', () => {
    it('应该收集query和response', () => {
      const context = createTestContext();
      const result = collector.collect(context);

      expect(result.requestData.query).toBe('What is machine learning?');
      expect(result.requestData.response).toBe('Machine learning is a subset of artificial intelligence...');
    });

    it('应该包含sessionInfo', () => {
      const context = createTestContext();
      const result = collector.collect(context);

      expect(result.requestData.sessionInfo).toBeDefined();
      expect(result.requestData.sessionInfo.model).toBe('gpt-4');
      expect(result.requestData.sessionInfo.provider).toBe('openai');
    });

    it('应该返回正确的摘要信息', () => {
      const context = createTestContext();
      const result = collector.collect(context);

      expect(result.summary.hasQuery).toBe(true);
      expect(result.summary.hasResponse).toBe(true);
    });
  });

  describe('collect - 上下文数据收集', () => {
    it('当includeFullContext为false时不应收集上下文', () => {
      const context = createTestContext();
      const result = collector.collect(context);

      expect(result.requestData.context).toBeUndefined();
      expect(result.summary.hasContext).toBe(false);
    });

    it('当includeFullContext为true时应该收集上下文', () => {
      config.dataCollection.includeFullContext = true;
      collector = new DataCollector(config);

      const context = createTestContext();
      const result = collector.collect(context);

      expect(result.requestData.context).toBeDefined();
      expect(result.requestData.context?.messages).toBeDefined();
      expect(result.summary.hasContext).toBe(true);
    });

    it('应该应用上下文窗口限制', () => {
      config.dataCollection.includeFullContext = true;
      config.dataCollection.contextWindow = 2;
      collector = new DataCollector(config);

      const context = createTestContext();
      const result = collector.collect(context);

      // 应该只返回最后2条消息
      expect(result.requestData.context?.messages.length).toBe(2);
    });
  });

  describe('collect - 用户记忆收集', () => {
    it('当includeMemory为false时不应收集记忆', () => {
      const context = createTestContext();
      const result = collector.collect(context);

      expect(result.requestData.userMemory).toBeUndefined();
      expect(result.summary.hasMemory).toBe(false);
    });

    it('当includeMemory为true时应该收集记忆', () => {
      config.dataCollection.includeMemory = true;
      collector = new DataCollector(config);

      const context = createTestContext();
      const result = collector.collect(context);

      expect(result.requestData.userMemory).toBeDefined();
      expect(result.summary.hasMemory).toBe(true);
    });

    it('当隐私配置不允许时应该产生警告', () => {
      config.dataCollection.includeMemory = true;
      config.privacy.allowedDataTypes = ['query', 'response']; // 不包含memory
      collector = new DataCollector(config);

      const context = createTestContext();
      const result = collector.collect(context);

      expect(result.summary.hasMemory).toBe(false);
      expect(result.warnings.some(w => w.includes('Memory'))).toBe(true);
    });
  });

  describe('collect - 用户画像收集', () => {
    it('当includeProfile为false时不应收集画像', () => {
      const context = createTestContext();
      const result = collector.collect(context);

      expect(result.requestData.userProfile).toBeUndefined();
      expect(result.summary.hasProfile).toBe(false);
    });

    it('当includeProfile为true时应该收集画像', () => {
      config.dataCollection.includeProfile = true;
      collector = new DataCollector(config);

      const context = createTestContext();
      const result = collector.collect(context);

      expect(result.requestData.userProfile).toBeDefined();
      expect(result.summary.hasProfile).toBe(true);
    });

    it('应该正确提取兴趣标签', () => {
      config.dataCollection.includeProfile = true;
      collector = new DataCollector(config);

      const context = createTestContext();
      const result = collector.collect(context);

      expect(result.requestData.userProfile?.interests).toEqual(['technology', 'programming', 'ai']);
    });
  });

  describe('collect - 格式选项', () => {
    it('应该支持指定广告格式', () => {
      const context = createTestContext();
      const result = collector.collect(context, {
        formats: ['action_card', 'suffix'],
      });

      expect(result.requestData.adFormats).toEqual(['action_card', 'suffix']);
    });

    it('应该支持指定广告位置', () => {
      const context = createTestContext();
      const result = collector.collect(context, {
        placement: 'inline',
      });

      expect(result.requestData.placement).toBe('inline');
    });
  });

  describe('collect - 数据大小估算', () => {
    it('应该估算数据大小', () => {
      const context = createTestContext();
      const result = collector.collect(context);

      expect(result.summary.dataSize).toBeGreaterThan(0);
    });
  });

  describe('collect - 边缘情况', () => {
    it('应该处理缺少userData的上下文', () => {
      const context = createTestContext({ userData: undefined });
      const result = collector.collect(context);

      expect(result.requestData.query).toBeDefined();
      expect(result.summary.hasMemory).toBe(false);
      expect(result.summary.hasProfile).toBe(false);
    });

    it('应该处理缺少conversationContext的上下文', () => {
      const context = createTestContext({ conversationContext: undefined });
      const result = collector.collect(context);

      expect(result.requestData.query).toBeDefined();
      expect(result.summary.hasContext).toBe(false);
    });

    it('应该处理空字符串的query和response', () => {
      const context = createTestContext({
        currentMessage: {
          query: '',
          response: '',
          timestamp: Date.now(),
          model: 'gpt-4',
          provider: 'openai',
          isStreaming: false,
        },
      });
      const result = collector.collect(context);

      expect(result.requestData.query).toBe('');
      expect(result.requestData.response).toBe('');
    });

    it('应该处理没有messages的上下文', () => {
      config.dataCollection.includeFullContext = true;
      collector = new DataCollector(config);

      const context = createTestContext({
        conversationContext: {
          sessionId: 'session-123',
          messageCount: 0,
          messages: [],
        },
      });
      const result = collector.collect(context);

      expect(result.requestData.context?.messages).toEqual([]);
    });
  });

  describe('updateConfig', () => {
    it('应该更新配置', () => {
      const newConfig = createTestConfig({
        debug: true,
      });

      collector.updateConfig(newConfig);
      // 不抛出错误即为成功
      expect(collector).toBeDefined();
    });
  });

  describe('记忆处理', () => {
    it('应该从记忆中提取话题', () => {
      config.dataCollection.includeMemory = true;
      collector = new DataCollector(config);

      const context = createTestContext();
      const result = collector.collect(context);

      expect(result.requestData.userMemory?.topics).toBeDefined();
      expect(Array.isArray(result.requestData.userMemory?.topics)).toBe(true);
    });

    it('应该从记忆中提取实体', () => {
      config.dataCollection.includeMemory = true;
      collector = new DataCollector(config);

      const context = createTestContext();
      const result = collector.collect(context);

      expect(result.requestData.userMemory?.entities).toBeDefined();
      expect(typeof result.requestData.userMemory?.entities).toBe('object');
    });
  });
});
