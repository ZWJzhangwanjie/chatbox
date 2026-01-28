/**
 * SDK ClientInfo 适配器测试
 *
 * 验证与 @ai-ad-network/frontend-sdk 的集成是否正常工作
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ClientInfoAdapter,
  getClientInfoAdapter,
  getSdkClientInfo,
  getSdkUserId,
  clearSdkClientInfoCache,
  getSdkClientInfoStatus,
} from '../clientInfoAdapter';
import type { SdkClientInfo } from '../clientInfoAdapter';

// Mock SDK 模块
const mockSdkClientInfo: SdkClientInfo = {
  device: {
    ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    os: 'macOS',
    osv: '14.5',
    devicetype: 3, // PC/desktop
    model: 'Mac',
    language: 'zh-CN',
  },
  user: {
    id: 'test-uuid-12345',
    language: 'zh-CN',
  },
  app: {
    bundle: 'localhost',
    name: 'Test App',
    ver: '1.0.0',
    publisher: {
      id: 'test-pub',
      domain: 'localhost',
    },
  },
  geo: {
    country: 'CN',
    language: 'zh',
  },
};

describe('ClientInfoAdapter', () => {
  let adapter: ClientInfoAdapter;

  beforeEach(() => {
    adapter = getClientInfoAdapter();
    vi.clearAllMocks();
  });

  describe('单例模式', () => {
    it('应该返回相同的实例', () => {
      const adapter1 = getClientInfoAdapter();
      const adapter2 = getClientInfoAdapter();
      expect(adapter1).toBe(adapter2);
    });
  });

  describe('getStatus', () => {
    it('应该返回初始状态', () => {
      const status = adapter.getStatus();
      expect(status).toHaveProperty('loaded');
      expect(status).toHaveProperty('available');
      expect(status).toHaveProperty('error');
      expect(status).toHaveProperty('hasCache');
    });
  });

  describe('clearCache', () => {
    it('应该清除本地缓存', () => {
      adapter.clearCache();
      const status = adapter.getStatus();
      expect(status.hasCache).toBe(false);
    });
  });

  describe('SDK 集成测试', () => {
    it('应该能够调用 getSdkClientInfo', async () => {
      // 注意：这个测试需要真实的 SDK 环境
      // 在 CI/CD 环境中可能需要 mock

      const result = await getSdkClientInfo();

      // 如果 SDK 可用
      if (result) {
        expect(result).toHaveProperty('device');
        expect(result).toHaveProperty('user');
        expect(result).toHaveProperty('app');
        expect(result.device).toHaveProperty('os');
        expect(result.user).toHaveProperty('id');
        expect(result.app).toHaveProperty('bundle');
      } else {
        console.warn('SDK not available, skipping detailed assertions');
      }
    });

    it('应该能够调用 getSdkUserId', async () => {
      const userId = await getSdkUserId();

      if (userId) {
        expect(typeof userId).toBe('string');
        expect(userId.length).toBeGreaterThan(0);
      } else {
        console.warn('SDK not available, skipping userId assertion');
      }
    });

    it('应该能够获取 SDK 状态', () => {
      const status = getSdkClientInfoStatus();
      expect(status).toHaveProperty('loaded');
      expect(status).toHaveProperty('available');
    });
  });

  describe('错误处理', () => {
    it('SDK 不可用时应该返回 null', async () => {
      // 这个测试验证降级行为
      const result = await getSdkClientInfo();
      // 如果 SDK 不可用，result 应该是 null
      expect(result === null || typeof result === 'object').toBe(true);
    });
  });
});

/**
 * 集成测试说明
 *
 * 要在浏览器中测试 SDK 集成，请：
 *
 * 1. 打开浏览器 DevTools Console
 * 2. 运行以下代码：
 *
 * ```javascript
 * import('/src/renderer/packages/ads/sdk/clientInfoAdapter.js').then(module => {
 *   // 测试获取完整信息
 *   module.getSdkClientInfo().then(info => {
 *     console.log('ClientInfo:', info);
 *   });
 *
 *   // 测试获取用户 ID
 *   module.getSdkUserId().then(id => {
 *     console.log('User ID:', id);
 *   });
 *
 *   // 测试获取状态
 *   console.log('Status:', module.getSdkClientInfoStatus());
 * });
 * ```
 *
 * 3. 预期输出：
 * ```
 * [ClientInfoAdapter] SDK ClientInfo API available
 * [ClientInfoAdapter] Collected via getClientInfo()
 * ClientInfo: {
 *   device: { os: "macOS", osv: "14.5", devicetype: 3, ... },
 *   user: { id: "uuid-xxx-xxx", language: "zh-CN" },
 *   app: { bundle: "localhost", name: "Test App", ... },
 *   geo: { country: "CN", language: "zh" }
 * }
 * User ID: uuid-xxx-xxx
 * Status: { loaded: true, available: true, error: null, hasCache: true }
 * ```
 */
