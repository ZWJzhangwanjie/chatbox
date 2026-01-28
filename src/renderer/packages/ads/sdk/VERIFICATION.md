# SDK ClientInfo 集成验证指南

## 快速验证

### 方法 1: 浏览器 Console 验证

打开浏览器 DevTools Console，运行以下代码：

```javascript
// 1. 导入适配器
(async function() {
  const { getSdkClientInfo, getSdkUserId, getSdkClientInfoStatus } = await import('/src/renderer/packages/ads/sdk/clientInfoAdapter.ts');

  console.log('=== SDK ClientInfo 集成验证 ===\n');

  // 2. 检查 SDK 状态
  const status = getSdkClientInfoStatus();
  console.log('1. SDK 状态:', status);

  // 3. 获取完整 ClientInfo
  const clientInfo = await getSdkClientInfo();
  console.log('2. ClientInfo:', clientInfo);

  // 4. 获取用户 ID
  const userId = await getSdkUserId();
  console.log('3. User ID:', userId);

  console.log('\n=== 验证完成 ===');
})();
```

### 预期输出

```
=== SDK ClientInfo 集成验证 ===

[ClientInfoAdapter] SDK ClientInfo API available
[ClientInfoAdapter] Collected via getClientInfo()

1. SDK 状态: {
  loaded: true,
  available: true,
  error: null,
  hasCache: true
}

2. ClientInfo: {
  device: {
    ua: "Mozilla/5.0...",
    os: "macOS",
    osv: "14.5",
    devicetype: 3,
    model: "Mac",
    language: "zh-CN"
  },
  user: {
    id: "uuid-xxx-xxx-xxx",
    language: "zh-CN"
  },
  app: {
    bundle: "localhost",
    name: "Chat Application",
    ver: "1.0.0",
    publisher: { domain: "localhost" }
  },
  geo: {
    country: "CN",
    language: "zh"
  }
}

3. User ID: uuid-xxx-xxx-xxx

=== 验证完成 ===
```

---

## 广告请求验证

### 方法 2: Network 面板验证

1. 打开 DevTools → Network 面板
2. 发送一条消息触发广告请求
3. 找到 `/api/v1/ads/request` 请求
4. 查看 Payload 或 Request 标签
5. 确认包含 `clientInfo` 字段

### 预期请求体

```json
{
  "conversationContext": {
    "query": "推荐一款蓝牙耳机",
    "response": "根据您的需求..."
  },
  "userContext": {
    "sessionId": "session-123",
    "demographics": {
      "country": "CN",
      "language": "zh"
    }
  },
  "clientInfo": {
    "device": {
      "ua": "Mozilla/5.0...",
      "os": "macOS",
      "osv": "14.5",
      "devicetype": 3,
      "language": "zh-CN"
    },
    "user": {
      "id": "uuid-xxx-xxx",
      "language": "zh-CN"
    },
    "app": {
      "bundle": "localhost",
      "name": "Chat Application",
      "ver": "1.0.0",
      "publisher": { "domain": "localhost" }
    },
    "geo": {
      "country": "CN",
      "language": "zh"
    }
  },
  "slots": [...]
}
```

---

## 配置选项

### 启用/禁用 SDK ClientInfo

在广告配置中设置：

```typescript
const config = {
  api: {
    baseUrl: '/api/v1',
    apiKey: 'ak_your_key',
    useSdkClientInfo: true,  // 启用 SDK ClientInfo（默认）
    // useSdkClientInfo: false, // 禁用 SDK ClientInfo
  },
};
```

---

## 故障排查

### 问题 1: Console 显示 SDK 未加载

```
[ClientInfoAdapter] Failed to load SDK: ...
```

**解决方案**:
1. 确认 SDK 已安装：`npm list @ai-ad-network/frontend-sdk`
2. 检查版本是否 >= 1.0.7
3. 重启开发服务器

### 问题 2: ClientInfo 为 null

**解决方案**:
1. 检查浏览器 Console 是否有错误
2. 确认 SDK 版本支持 ClientInfo API
3. 尝试清除缓存：`clearSdkClientInfoCache()`

### 问题 3: Network 请求中没有 clientInfo

**解决方案**:
1. 检查配置：`config.api.useSdkClientInfo !== false`
2. 确认 debug 模式：`config.debug = true`
3. 查看 Console 日志：`[AdController] SDK ClientInfo collected`

---

## 调试命令

在 Console 中运行以下命令进行调试：

```javascript
// 导入调试工具
import('/src/renderer/packages/ads/sdk/clientInfoAdapter.ts').then(m => {
  // 检查 SDK 状态
  console.log('Status:', m.getSdkClientInfoStatus());

  // 清除缓存
  m.clearSdkClientInfoCache();

  // 重新获取
  m.getSdkClientInfo(true).then(info => {
    console.log('Fresh ClientInfo:', info);
  });
});
```

---

## 集成检查清单

- [ ] SDK 已安装 (`@ai-ad-network/frontend-sdk@^1.0.7`)
- [ ] Console 显示 SDK 已加载
- [ ] `getSdkClientInfo()` 返回有效数据
- [ ] `getSdkUserId()` 返回有效的 UUID
- [ ] Network 请求包含 `clientInfo` 字段
- [ ] `clientInfo.device` 包含 OS、设备类型等信息
- [ ] `clientInfo.user` 包含唯一用户 ID
- [ ] `clientInfo.app` 包含应用名称和版本
- [ ] `clientInfo.geo` 包含国家代码（如果可用）
