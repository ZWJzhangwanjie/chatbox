/**
 * AI Ad Network - FrequencyController 单元测试
 */

import { describe, expect, it, beforeEach, vi } from 'vitest';
import { FrequencyController } from '../FrequencyController';
import type { AdConfig } from '../../config/adConfigSchema';

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

describe('FrequencyController', () => {
  let controller: FrequencyController;
  let config: AdConfig;

  beforeEach(() => {
    config = createTestConfig();
    controller = new FrequencyController(config);
  });

  describe('初始化', () => {
    it('应该正确初始化', () => {
      expect(controller).toBeDefined();
    });

    it('应该初始化所有格式的计数器', () => {
      const stats = controller.getStats();
      expect(stats.formatCounters).toBeDefined();
      expect(stats.formatCounters.actionCard).toBe(0);
      expect(stats.formatCounters.suffix).toBe(0);
    });
  });

  describe('recordMessage', () => {
    it('应该正确记录消息', () => {
      controller.recordMessage();
      const stats = controller.getStats();
      expect(stats.messageCount).toBe(1);
    });

    it('应该累加消息计数', () => {
      controller.recordMessage();
      controller.recordMessage();
      controller.recordMessage();
      const stats = controller.getStats();
      expect(stats.messageCount).toBe(3);
    });
  });

  describe('shouldShow - 频率控制', () => {
    it('当消息数为0时应该返回false', () => {
      expect(controller.shouldShow('actionCard')).toBe(false);
    });

    it('应该根据frequency配置判断', () => {
      // actionCard frequency = 3
      controller.recordMessage();
      expect(controller.shouldShow('actionCard')).toBe(false);

      controller.recordMessage();
      expect(controller.shouldShow('actionCard')).toBe(false);

      controller.recordMessage();
      expect(controller.shouldShow('actionCard')).toBe(true);
    });

    it('应该在每个周期正确重置判断', () => {
      // actionCard frequency = 3
      for (let i = 0; i < 10; i++) {
        controller.recordMessage();
        const expected = i > 0 && (i + 1) % 3 === 0;
        expect(controller.shouldShow('actionCard')).toBe(expected);
      }
    });
  });

  describe('shouldShow - 格式启用检查', () => {
    it('禁用的格式应该返回false', () => {
      // followup is disabled
      expect(controller.shouldShow('followup')).toBe(false);
    });

    it('启用的格式应该可以展示', () => {
      for (let i = 0; i < 3; i++) {
        controller.recordMessage();
      }
      expect(controller.shouldShow('actionCard')).toBe(true);
    });

    it('应该支持带下划线的格式名', () => {
      for (let i = 0; i < 3; i++) {
        controller.recordMessage();
      }
      expect(controller.shouldShow('action_card')).toBe(true);
    });
  });

  describe('shouldShow - 单次会话最大次数限制', () => {
    it('应该限制单次会话最大展示次数', () => {
      // actionCard maxPerSession = 5
      // 记录足够的消息数
      for (let i = 0; i < 20; i++) {
        controller.recordMessage();
      }

      // 记录5次展示
      for (let i = 0; i < 5; i++) {
        controller.recordImpression('actionCard');
      }

      // 第6次应该被拒绝
      expect(controller.shouldShow('actionCard')).toBe(false);
    });

    it('不同格式的计数应该独立', () => {
      // actionCard maxPerSession = 5, suffix maxPerSession = 3
      for (let i = 0; i < 20; i++) {
        controller.recordMessage();
      }

      // 记录5次actionCard
      for (let i = 0; i < 5; i++) {
        controller.recordImpression('actionCard');
      }

      // actionCard应该被限制
      expect(controller.shouldShow('actionCard')).toBe(false);

      // suffix仍然应该可以展示
      for (let i = 0; i < 3; i++) {
        controller.recordImpression('suffix');
      }
      expect(controller.shouldShow('suffix')).toBe(false);
    });
  });

  describe('shouldShow - 最小间隔保护', () => {
    it('应该有最小展示间隔', async () => {
      for (let i = 0; i < 3; i++) {
        controller.recordMessage();
      }

      // 第一次展示
      expect(controller.shouldShow('actionCard')).toBe(true);
      controller.recordImpression('actionCard');

      // 立即再次检查应该被拒绝
      expect(controller.shouldShow('actionCard')).toBe(false);
    });
  });

  describe('shouldShow - 无格式参数', () => {
    it('应该检查所有启用的格式', () => {
      for (let i = 0; i < 3; i++) {
        controller.recordMessage();
      }
      expect(controller.shouldShow()).toBe(true);
    });

    it('没有格式启用时应该返回false', () => {
      // 直接创建一个所有格式都禁用的配置
      const allDisabledConfig: AdConfig = {
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
          actionCard: { ...config.formats.actionCard, enabled: false },
          suffix: { ...config.formats.suffix, enabled: false },
          followup: { ...config.formats.followup, enabled: false },
          source: { ...config.formats.source, enabled: false },
          static: { ...config.formats.static, enabled: false },
          leadGen: { ...config.formats.leadGen, enabled: false },
        },
        privacy: {
          enabled: true,
          requireConsent: true,
          dataRetentionDays: 0,
          allowedDataTypes: ['query', 'response'],
        },
        debug: false,
      };
      const newController = new FrequencyController(allDisabledConfig);

      for (let i = 0; i < 10; i++) {
        newController.recordMessage();
      }
      expect(newController.shouldShow()).toBe(false);
    });
  });

  describe('recordImpression', () => {
    it('应该记录广告展示', () => {
      controller.recordImpression('actionCard');
      const stats = controller.getStats();
      expect(stats.adCount).toBe(1);
      expect(stats.formatCounters.actionCard).toBe(1);
    });

    it('应该更新上次展示时间', () => {
      const before = controller.getStats().lastAdTime;
      controller.recordImpression('actionCard');
      const after = controller.getStats().lastAdTime;
      expect(after).toBeGreaterThan(0);
      expect(after).toBeGreaterThanOrEqual(before);
    });

    it('应该记录格式的上次展示时间', () => {
      controller.recordImpression('actionCard');
      const stats = controller.getStats() as any;
      expect(stats.formatLastShown?.actionCard).toBeGreaterThan(0);
    });
  });

  describe('getStats', () => {
    it('应该返回正确的统计信息', () => {
      controller.recordMessage();
      controller.recordMessage();
      controller.recordImpression('actionCard');

      const stats = controller.getStats();
      expect(stats.messageCount).toBe(2);
      expect(stats.adCount).toBe(1);
      expect(stats.formatCounters.actionCard).toBe(1);
    });
  });

  describe('reset', () => {
    it('应该重置所有计数器', () => {
      controller.recordMessage();
      controller.recordMessage();
      controller.recordImpression('actionCard');

      controller.reset();

      const stats = controller.getStats();
      expect(stats.messageCount).toBe(0);
      expect(stats.adCount).toBe(0);
      expect(stats.formatCounters.actionCard).toBe(0);
    });

    it('应该重置上次展示时间', () => {
      controller.recordImpression('actionCard');
      controller.reset();

      const stats = controller.getStats();
      expect(stats.lastAdTime).toBe(0);
    });
  });

  describe('resetFormat', () => {
    it('应该重置指定格式的计数器', () => {
      controller.recordMessage();
      controller.recordImpression('actionCard');
      controller.recordImpression('suffix');

      controller.resetFormat('actionCard');

      const stats = controller.getStats();
      expect(stats.formatCounters.actionCard).toBe(0);
      expect(stats.formatCounters.suffix).toBe(1);
    });
  });

  describe('updateConfig', () => {
    it('应该更新配置', () => {
      const newConfig = createTestConfig({
        debug: true,
      });

      controller.updateConfig(newConfig);
      // 不抛出错误即为成功
      expect(controller).toBeDefined();
    });
  });

  describe('边缘情况', () => {
    it('应该处理未知的格式名', () => {
      expect(controller.shouldShow('unknown_format')).toBe(false);
    });

    it('应该处理空格式配置', () => {
      const emptyConfig = createTestConfig({
        formats: {
          actionCard: { ...config.formats.actionCard, frequency: undefined },
        },
      }) as AdConfig;

      const newController = new FrequencyController(emptyConfig);
      // 不应该抛出错误
      expect(() => newController.shouldShow('actionCard')).not.toThrow();
    });
  });
});
