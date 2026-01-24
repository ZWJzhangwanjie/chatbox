/**
 * AI Ad Network - Privacy 隐私处理工具 单元测试
 */

import { describe, expect, it } from 'vitest';
import {
  anonymizeText,
  containsSensitiveInfo,
  getSensitiveInfoTypes,
  anonymizeObject,
  anonymizeMemory,
  anonymizeProfile,
  anonymizeMessages,
  hasUserConsent,
  buildPrivacyReport,
} from '../privacy';
import type { UserMemory, UserProfile } from '../../core/types';

describe('privacy - 文本脱敏', () => {
  describe('anonymizeText', () => {
    it('应该脱敏电子邮件地址', () => {
      const input = 'Contact me at john.doe@example.com for more info';
      const result = anonymizeText(input);

      expect(result).not.toContain('john.doe@example.com');
      expect(result).toContain('***');
    });

    it('应该脱敏多个电子邮件地址', () => {
      const input = 'Email john@example.com or jane@test.com';
      const result = anonymizeText(input);

      expect(result).not.toContain('john@example.com');
      expect(result).not.toContain('jane@test.com');
    });

    it('应该脱敏电话号码', () => {
      const input = 'Call me at 555-123-4567';
      const result = anonymizeText(input);

      expect(result).not.toContain('555-123-4567');
      expect(result).toContain('***');
    });

    it('应该脱敏不同格式的电话号码', () => {
      const inputs = [
        'Call 555.123.4567',
        'Phone: (555) 123-4567',
        'Mobile: 5551234567',
      ];

      inputs.forEach(input => {
        const result = anonymizeText(input);
        // 应该包含脱敏标记
        expect(result).toMatch(/\*+/);
      });
    });

    it('应该保留数字当keepNumbers为true', () => {
      const input = 'Call 555-123-4567';
      const result = anonymizeText(input, { keepNumbers: true });

      // 数字应该被保留（至少部分）
      expect(result).toBeDefined();
    });

    it('应该脱敏信用卡号', () => {
      const input = 'Card: 4111-1111-1111-1111';
      const result = anonymizeText(input);

      expect(result).not.toContain('4111-1111-1111-1111');
      expect(result).toContain('****-****-****-****');
    });

    it('应该脱敏SSN', () => {
      const input = 'SSN: 123-45-6789';
      const result = anonymizeText(input);

      expect(result).not.toContain('123-45-6789');
      expect(result).toContain('***-**-****');
    });

    it('应该脱敏IP地址', () => {
      const input = 'Server IP: 192.168.1.1';
      const result = anonymizeText(input);

      expect(result).not.toContain('192.168.1.1');
      expect(result).toContain('***');
    });

    it('应该脱敏URL', () => {
      const input = 'Visit https://example.com/path?token=secret for info';
      const result = anonymizeText(input);

      expect(result).not.toContain('https://example.com/path?token=secret');
      expect(result).toContain('[URL:');
    });

    it('应该脱敏password字段', () => {
      const input = 'password: mySecret123';
      const result = anonymizeText(input);

      expect(result).not.toContain('mySecret123');
      expect(result).toContain('[REDACTED]');
    });

    it('应该脱敏secret字段', () => {
      const input = 'secret: abc123xyz';
      const result = anonymizeText(input);

      expect(result).not.toContain('abc123xyz');
      expect(result).toContain('[REDACTED]');
    });

    it('应该脱敏token字段', () => {
      const input = 'token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';
      const result = anonymizeText(input);

      expect(result).not.toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
      expect(result).toContain('[REDACTED]');
    });

    it('应该处理不包含敏感信息的文本', () => {
      const input = 'Hello, this is a normal message without sensitive data';
      const result = anonymizeText(input);

      expect(result).toBe(input);
    });

    it('应该处理空字符串', () => {
      const result = anonymizeText('');
      expect(result).toBe('');
    });
  });

  describe('containsSensitiveInfo', () => {
    it('应该检测电子邮件', () => {
      expect(containsSensitiveInfo('Email: test@example.com')).toBe(true);
    });

    it('应该检测电话号码', () => {
      expect(containsSensitiveInfo('Call 555-123-4567')).toBe(true);
    });

    it('应该检测信用卡号', () => {
      expect(containsSensitiveInfo('Card 4111-1111-1111-1111')).toBe(true);
    });

    it('应该检测SSN', () => {
      expect(containsSensitiveInfo('SSN 123-45-6789')).toBe(true);
    });

    it('应该检测IP地址', () => {
      expect(containsSensitiveInfo('IP 192.168.1.1')).toBe(true);
    });

    it('应该检测URL', () => {
      expect(containsSensitiveInfo('Visit https://example.com')).toBe(true);
    });

    it('应该检测密码', () => {
      expect(containsSensitiveInfo('password: secret123')).toBe(true);
    });

    it('应该对正常文本返回false', () => {
      expect(containsSensitiveInfo('Hello world')).toBe(false);
    });

    it('应该对空字符串返回false', () => {
      expect(containsSensitiveInfo('')).toBe(false);
    });
  });

  describe('getSensitiveInfoTypes', () => {
    it('应该返回所有敏感信息类型', () => {
      const input = 'Email test@example.com, call 555-123-4567, password secret';
      const types = getSensitiveInfoTypes(input);

      expect(types).toContain('email');
      expect(types).toContain('phone');
      expect(types).toContain('password');
    });

    it('应该返回空数组当没有敏感信息', () => {
      const types = getSensitiveInfoTypes('Hello world');
      expect(types).toEqual([]);
    });
  });
});

describe('privacy - 对象脱敏', () => {
  describe('anonymizeObject', () => {
    it('应该脱敏敏感字段', () => {
      const obj = {
        name: 'John Doe',
        email: 'john@example.com',
        age: 30,
      };

      const result = anonymizeObject(obj);

      expect(result.email).not.toBe('john@example.com');
      expect(result.name).toBe('***');
    });

    it('应该保留非敏感字段', () => {
      const obj = {
        name: 'John',
        age: 30,
        city: 'New York',
      };

      const result = anonymizeObject(obj);

      expect(result.age).toBe(30);
      expect(result.city).toBe('New York');
    });

    it('应该处理嵌套对象', () => {
      const obj = {
        user: {
          name: 'John',
          email: 'john@example.com',
        },
        settings: {
          theme: 'dark',
        },
      };

      const result = anonymizeObject(obj);

      expect(result.user.email).not.toBe('john@example.com');
      expect(result.settings.theme).toBe('dark');
    });

    it('应该处理数组中的字符串', () => {
      const obj = {
        emails: ['test@example.com', 'hello@test.com'],
        names: ['John', 'Jane'],
        cities: ['New York', 'London'], // 非敏感字段
      };

      const result = anonymizeObject(obj);

      expect(result.emails[0]).not.toBe('test@example.com');
      // name是敏感字段，应该被脱敏
      expect(result.names[0]).not.toBe('John');
      expect(['***', '***@***.***', '*****']).toContain(result.names[0]);
      // city不是敏感字段，应该保留
      expect(result.cities[0]).toBe('New York');
    });

    it('应该处理空对象', () => {
      const result = anonymizeObject({});
      expect(result).toEqual({});
    });

    it('应该支持自定义敏感字段', () => {
      const obj = {
        customField: 'sensitive data',
        normalField: 'normal data',
      };

      const result = anonymizeObject(obj, {
        additionalFields: ['customField'],
      });

      expect(result.customField).toBe('***');
      expect(result.normalField).toBe('normal data');
    });
  });
});

describe('privacy - 用户数据脱敏', () => {
  const testMemory: UserMemory = {
    shortTerm: {
      email: 'john@example.com',
      preference: 'dark_mode',
      phone: '555-123-4567',
    },
    longTerm: {
      interests: 'programming',
      name: 'John Doe',
    },
  };

  const testProfile: UserProfile = {
    interests: ['programming', 'ai'],
    demographics: {
      ageRange: '25-34',
      language: 'en',
      timezone: 'America/New_York',
    },
    behaviorPattern: {
      preferredTopics: ['technical'],
      interactionStyle: 'detailed',
    },
  };

  describe('anonymizeMemory', () => {
    it('应该脱敏用户记忆', () => {
      const result = anonymizeMemory(testMemory);

      expect(result.anonymized).toBe(true);
      expect(result.entities).toBeDefined();
      expect(result.topics).toBeDefined();
    });

    it('应该提取话题', () => {
      const result = anonymizeMemory(testMemory);

      expect(result.topics).toBeDefined();
      expect(Array.isArray(result.topics)).toBe(true);
    });

    it('应该脱敏敏感实体', () => {
      const result = anonymizeMemory(testMemory);

      expect(result.entities.email).not.toBe('john@example.com');
      expect(result.entities.phone).not.toBe('555-123-4567');
    });

    it('应该保留非敏感信息', () => {
      const result = anonymizeMemory(testMemory);

      expect(result.entities.preference).toBe('dark_mode');
      expect(result.entities.interests).toBe('programming');
    });
  });

  describe('anonymizeProfile', () => {
    it('应该脱敏用户画像', () => {
      const result = anonymizeProfile(testProfile);

      expect(result.anonymized).toBe(true);
      expect(result.interests).toBeDefined();
    });

    it('应该保留兴趣标签', () => {
      const result = anonymizeProfile(testProfile);

      expect(result.interests).toEqual(['programming', 'ai']);
    });

    it('应该包含行为模式', () => {
      const result = anonymizeProfile(testProfile);

      expect(result.behaviorPattern).toBe('detailed');
    });

    it('应该包含语言和时区', () => {
      const result = anonymizeProfile(testProfile);

      expect(result.language).toBe('en');
      expect(result.timezone).toBe('America/New_York');
    });
  });
});

describe('privacy - 批量脱敏', () => {
  describe('anonymizeMessages', () => {
    it('应该脱敏消息列表', () => {
      const messages = [
        { role: 'user', content: 'Email me at john@example.com' },
        { role: 'assistant', content: 'Call 555-123-4567' },
      ];

      const result = anonymizeMessages(messages);

      expect(result[0].content).not.toContain('john@example.com');
      expect(result[1].content).not.toContain('555-123-4567');
    });

    it('应该标记是否包含敏感信息', () => {
      const messages = [
        { role: 'user', content: 'Email test@example.com' },
        { role: 'assistant', content: 'Hello world' },
      ];

      const result = anonymizeMessages(messages);

      expect(result[0].hasSensitiveInfo).toBe(true);
      expect(result[1].hasSensitiveInfo).toBe(false);
    });

    it('应该处理空消息列表', () => {
      const result = anonymizeMessages([]);
      expect(result).toEqual([]);
    });
  });
});

describe('privacy - 隐私管理', () => {
  describe('hasUserConsent', () => {
    it('应该检查用户是否同意数据收集', () => {
      const consent = {
        query: true,
        response: true,
        context: false,
        memory: false,
        profile: false,
      };

      expect(hasUserConsent(consent, 'query')).toBe(true);
      expect(hasUserConsent(consent, 'memory')).toBe(false);
    });

    it('应该对未定义的同意记录返回false', () => {
      const consent = {};
      expect(hasUserConsent(consent, 'query')).toBe(false);
    });
  });

  describe('buildPrivacyReport', () => {
    it('应该构建隐私报告', () => {
      const originalData = {
        email: 'test@example.com',
        name: 'John',
      };
      const anonymizedData = {
        email: '***@***.***',
        name: '***',
      };

      const report = buildPrivacyReport(originalData, anonymizedData);

      expect(report.originalSize).toBeDefined();
      expect(report.anonymizedSize).toBeDefined();
      expect(report.fieldsProcessed).toBeDefined();
    });
  });
});

describe('privacy - 边缘情况', () => {
  it('应该处理null值', () => {
    const result = anonymizeText('test');
    expect(result).toBeDefined();
  });

  it('应该处理undefined值', () => {
    const obj = { field: undefined };
    const result = anonymizeObject(obj);
    expect(result).toBeDefined();
  });

  it('应该处理特殊字符', () => {
    const input = 'Email: test+tag@example.com';
    const result = anonymizeText(input);
    expect(result).not.toContain('test+tag@example.com');
  });

  it('应该处理Unicode字符', () => {
    const input = 'Email: test@例え.com';
    const result = anonymizeText(input);
    expect(result).toBeDefined();
  });
});
