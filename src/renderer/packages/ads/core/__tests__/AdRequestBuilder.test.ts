/**
 * AI Ad Network - AdRequestBuilder 单元测试
 */

import { describe, expect, it, beforeEach } from 'vitest';
import { AdRequestBuilder } from '../AdRequestBuilder';
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
      allowedDataTypes: ['query', 'response'],
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
    ...overrides,
  };
}

describe('AdRequestBuilder', () => {
  let builder: AdRequestBuilder;
  let config: AdConfig;

  beforeEach(() => {
    config = createTestConfig();
    builder = new AdRequestBuilder(config);
  });

  describe('初始化', () => {
    it('应该正确初始化', () => {
      expect(builder).toBeDefined();
    });
  });

  describe('build', () => {
    it('应该构建完整的请求数据', () => {
      const context = createTestContext();
      const result = builder.build(context);

      expect(result.requestData).toBeDefined();
      expect(result.collectionResult).toBeDefined();
      expect(result.warnings).toBeDefined();
      expect(Array.isArray(result.warnings)).toBe(true);
    });

    it('应该包含sessionInfo', () => {
      const context = createTestContext();
      const result = builder.build(context);

      expect(result.requestData.sessionInfo).toBeDefined();
      expect(result.requestData.sessionInfo.model).toBe('gpt-4');
      expect(result.requestData.sessionInfo.provider).toBe('openai');
      expect(result.requestData.sessionInfo.timestamp).toBeDefined();
    });

    it('应该包含query和response', () => {
      const context = createTestContext();
      const result = builder.build(context);

      expect(result.requestData.query).toBe('What is machine learning?');
      expect(result.requestData.response).toBe('Machine learning is a subset of artificial intelligence...');
    });

    it('应该包含adFormats', () => {
      const context = createTestContext();
      const result = builder.build(context);

      expect(result.requestData.adFormats).toBeDefined();
      expect(Array.isArray(result.requestData.adFormats)).toBe(true);
      expect(result.requestData.adFormats.length).toBeGreaterThan(0);
    });

    it('应该包含placement', () => {
      const context = createTestContext();
      const result = builder.build(context);

      expect(result.requestData.placement).toBeDefined();
    });

    it('应该支持指定广告格式', () => {
      const context = createTestContext();
      const result = builder.build(context, {
        formats: ['action_card'],
      });

      expect(result.requestData.adFormats).toEqual(['action_card']);
    });

    it('应该支持指定广告位置', () => {
      const context = createTestContext();
      const result = builder.build(context, {
        placement: 'inline',
      });

      expect(result.requestData.placement).toBe('inline');
    });
  });

  describe('buildSimple', () => {
    it('应该从简单的query和response构建请求', () => {
      const result = builder.buildSimple('Hello', 'Hi there!');

      expect(result.query).toBe('Hello');
      expect(result.response).toBe('Hi there!');
      expect(result.sessionInfo).toBeDefined();
    });

    it('应该包含sessionInfo', () => {
      const result = builder.buildSimple('Test', 'Response');

      expect(result.sessionInfo).toBeDefined();
      expect(result.sessionInfo.model).toBe('unknown');
      expect(result.sessionInfo.provider).toBe('unknown');
    });

    it('应该支持指定格式和位置', () => {
      const result = builder.buildSimple('Test', 'Response', {
        formats: ['suffix'],
        placement: 'inline',
      });

      expect(result.adFormats).toEqual(['suffix']);
      expect(result.placement).toBe('inline');
    });
  });

  describe('getActiveFormats', () => {
    it('应该返回所有启用的格式', () => {
      const formats = builder.getActiveFormats();

      expect(formats).toContain('action_card');
      expect(formats).toContain('suffix');
      expect(formats).not.toContain('followup');
    });

    it('当没有格式启用时应该返回空数组', () => {
      const noFormatsConfig = createTestConfig({
        formats: {
          actionCard: { ...config.formats.actionCard, enabled: false },
          suffix: { ...config.formats.suffix, enabled: false },
          followup: { ...config.formats.followup, enabled: false },
          source: { ...config.formats.source, enabled: false },
          static: { ...config.formats.static, enabled: false },
          leadGen: { ...config.formats.leadGen, enabled: false },
        },
      });
      const noFormatsBuilder = new AdRequestBuilder(noFormatsConfig);

      const formats = noFormatsBuilder.getActiveFormats();
      expect(formats).toEqual([]);
    });
  });

  describe('determinePlacement', () => {
    it('应该默认返回post_response', () => {
      const context = createTestContext();
      const placement = builder.determinePlacement(context);

      expect(placement).toBe('post_response');
    });

    it('当有对话上下文时应该考虑inline', () => {
      const context = createTestContext({
        conversationContext: {
          sessionId: 'session-123',
          messageCount: 5,
          messages: [
            { role: 'user', content: 'Hello', timestamp: Date.now() },
            { role: 'assistant', content: 'Hi', timestamp: Date.now() },
          ],
        },
      });
      const placement = builder.determinePlacement(context);

      expect(placement).toBe('inline');
    });
  });

  describe('validateRequest', () => {
    it('应该验证有效的请求数据', () => {
      const context = createTestContext();
      const buildResult = builder.build(context);
      const validationResult = builder.validateRequest(buildResult.requestData);

      expect(validationResult.valid).toBe(true);
      expect(validationResult.errors).toEqual([]);
    });

    it('应该检测没有广告格式的情况', () => {
      const context = createTestContext();
      const buildResult = builder.build(context);
      buildResult.requestData.adFormats = [];

      const validationResult = builder.validateRequest(buildResult.requestData);

      expect(validationResult.valid).toBe(false);
      expect(validationResult.errors.length).toBeGreaterThan(0);
    });

    it('应该检测没有内容数据的情况', () => {
      const context = createTestContext();
      const buildResult = builder.build(context);
      buildResult.requestData.query = undefined;
      buildResult.requestData.response = undefined;
      buildResult.requestData.context = undefined;

      const validationResult = builder.validateRequest(buildResult.requestData);

      expect(validationResult.valid).toBe(false);
      expect(validationResult.errors.some(e => e.includes('At least one'))).toBe(true);
    });

    it('应该检测缺少sessionInfo的情况', () => {
      const invalidRequest = {
        adFormats: ['action_card'],
        placement: 'post_response' as const,
        sessionInfo: undefined as any,
      };

      const validationResult = builder.validateRequest(invalidRequest);

      expect(validationResult.valid).toBe(false);
      expect(validationResult.errors.some(e => e.includes('Session info'))).toBe(true);
    });
  });

  describe('updateConfig', () => {
    it('应该更新配置', () => {
      const newConfig = createTestConfig({
        debug: true,
      });

      builder.updateConfig(newConfig);
      // 不抛出错误即为成功
      expect(builder).toBeDefined();
    });
  });

  describe('边缘情况', () => {
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
      const result = builder.build(context);

      expect(result.requestData.query).toBe('');
      expect(result.requestData.response).toBe('');
    });

    it('应该处理缺少上下文的情况', () => {
      const context = createTestContext({
        conversationContext: undefined,
        userData: undefined,
      });
      const result = builder.build(context);

      expect(result.requestData).toBeDefined();
    });
  });
});
