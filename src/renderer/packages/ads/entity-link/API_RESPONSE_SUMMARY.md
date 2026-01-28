# Entity Link API 响应处理总结

## 你提供的 API 响应分析

### slot-entity_link 的当前响应

```json
{
  "slotId": "slot-entity_link",
  "status": "filled",
  "ads": [
    {
      "original": {
        "id": "entity_link_n1A_J_k0J0Cao7Sw2Vudw",
        "type": "entity_link",
        "score": 0.95
      },
      "adapted": {
        "title": "Content Enhancement",
        "body": "4 entities linked with affiliate URLs",  // ← 摘要描述
        "ctaText": "Get Started",
        "styling": {}
      },
      "tracking": {
        "impressionUrl": "/track/impression",
        "clickUrl": "/track/entity-link",
        "viewToken": "vt_xxx"
      }
    }
  ]
}
```

### 问题诊断

**❌ 当前响应缺少关键字段：**

```json
// 缺少这些字段：
{
  "entities": [
    {
      "text": "蓝牙耳机",
      "type": "product",
      "startPosition": 10,
      "endPosition": 14,
      "confidence": 0.95,
      "affiliateUrl": "https://..."
    }
  ],
  "replacements": [...]
}
```

**✅ 代码已做的兼容性处理：**

1. 支持 `slot-entity_link` 和 `entity_link` 两种 slotId
2. 检测到缺失数据时输出警告日志
3. 优雅降级：返回空实体列表而不是报错

## 页面处理流程

### 1. 数据接收 (AdController)

```
API Response → AdController.fetchAds()
             ↓
         解析 slots 数组
             ↓
         convertAdaptedContentToAdContent()
             ↓
         entity_link 进入 default 分支
             ↓
         直接返回原始 adapted 数据
```

### 2. 数据提取 (useEntityLink Hook)

```
useEntityLink(adData)
    ↓
extractEntityLinkData()
    ↓
查找 slot-entity_link ✅ 找到
    ↓
检查 content.entities ❌ 不存在
    ↓
检查 content.body ✅ "4 entities linked..."
    ↓
输出警告：API 返回摘要格式
    ↓
返回 null（没有实体数据）
```

### 3. 页面渲染 (Message 组件)

```
Message.tsx
    ↓
useEntityLink(adData)
    ↓
enhancements = null（没有实体数据）
    ↓
EntityLinkMarkdown
    ↓
没有 enhancements → 使用普通 Markdown
    ↓
结果：文本正常显示，没有实体链接
```

## 当前行为

| 状态 | 描述 |
|------|------|
| 页面崩溃 | ❌ 不会 |
| 控制台错误 | ⚠️ 有警告日志 |
| 文本显示 | ✅ 正常显示 |
| 实体链接 | ❌ 不会生效（因为缺少数据）|

## 控制台日志

当启用调试模式时，会看到：

```
[Entity Link] Raw slot data: {
  slotId: "slot-entity_link",
  status: "filled",
  hasAds: true,
  adCount: 1
}

[Entity Link] Raw ad data: {
  id: "entity_link_xxx",
  type: "entity_link",
  contentKeys: ["title", "body", "ctaText", "styling"],
  content: { title: "...", body: "..." },
  hasEntities: false  // ← 关键：缺少 entities
}

[Entity Link] API returned summary format instead of entity data. Please check API response format: {
  slotId: "slot-entity_link",
  adContent: { title, body, ctaText, styling },
  adId: "entity_link_xxx"
}
```

## 解决方案

### 方案 A：后端返回完整实体数据（推荐）

**API 应该返回：**

```json
{
  "slotId": "slot-entity_link",
  "ads": [{
    "adapted": {
      "title": "Content Enhancement",
      "body": "4 entities linked",
      "entities": [
        {
          "text": "蓝牙耳机",
          "type": "product",
          "startPosition": 5,
          "endPosition": 9,
          "confidence": 0.95,
          "category": "electronics",
          "affiliateUrl": "https://example.com/ble-headphones",
          "trackingId": "entity_001"
        },
        {
          "text": "Sony WH-1000XM5",
          "type": "product",
          "startPosition": 20,
          "endPosition": 34,
          "confidence": 0.90,
          "affiliateUrl": "https://example.com/sony-wh",
          "trackingId": "entity_002"
        }
      ],
      "replacements": [
        {
          "originalText": "蓝牙耳机",
          "affiliateUrl": "https://example.com/ble-headphones"
        }
      ],
      "maxLinks": 3,
      "badgeStyle": "subtle",
      "overlapStrategy": "longest"
    }
  }]
}
```

### 方案 B：前端从其他位置提取数据

如果后端把实体数据放在其他位置（如 `original.entities`），需要修改提取逻辑：

```typescript
// 尝试多个位置
const entities =
  content.entities ||
  content.content?.entities ||
  ad.content?.entities

if (entities && entities.length > 0) {
  return {
    entities: entities,
    replacements: content.replacements || content.content?.replacements || [],
    ...
  }
}
```

### 方案 C：前端根据关键词生成实体（临时方案）

如果后端暂时不返回实体数据，可以根据关键词生成模拟实体：

```typescript
// 从 intent.keywords 提取关键词
const keywords = intent.keywords || []
// 根据 response 文本匹配关键词位置
// 生成模拟实体数据
```

## 开发调试

### 启用调试模式

在控制台运行：

```javascript
// 1. 启用 entity_link 和调试模式
showAdConfig()
resetAdConfigToDefaults()

// 2. 在设置中启用 Entity Link

// 3. 发送包含产品关键词的消息
// 例如："推荐一些蓝牙耳机"

// 4. 查看控制台日志
// 应该能看到原始的 API 响应数据
```

### 查看原始响应

在 Message 组件中添加日志：

```typescript
// 在 useEntityLink 调用后
console.log('[Debug] Entity Link data:', {
  hasEnhancements: !!enhancements,
  entityCount: entityCount,
  rawSlots: adData?.slots?.find(s => s.slotId.includes('entity_link'))
})
```

## 已完成的修复

✅ **修复 1：slotId 匹配**
- 之前：只查找 `entity_link`
- 现在：支持 `slot-entity_link` 和 `entity_link`

✅ **修复 2：错误处理**
- 添加了详细的警告日志
- 优雅降级，不会导致页面崩溃

✅ **修复 3：调试支持**
- 启用调试模式时会打印原始数据
- 帮助诊断 API 响应格式问题

✅ **修复 4：兼容性处理**
- 支持摘要格式（从 body 解析实体数量）
- 避免因缺少字段而报错

✅ **修复 5：实体数据提取位置（关键修复）**
- 之前：只从 `adapted` 字段提取实体数据
- 现在：按优先级检查多个位置：
  1. `original.entity_link_content.entities`（实际 API 结构）
  2. `adapted.entities`（标准格式）
  3. `adapted.entityLinkContent.entities`（可能的嵌套格式）

## 后续步骤

1. **与后端确认** entity_link 的正确数据格式
2. **更新 API 文档** 明确实体数据的结构
3. **测试完整流程** 使用包含实体的响应进行测试
4. **添加单元测试** 覆盖各种 API 响应格式

## 文件清单

| 文件 | 修改内容 |
|------|----------|
| `useEntityLink.tsx` | slotId 匹配、调试日志、错误处理 |
| `DATA_FLOW_ANALYSIS.md` | 完整数据流分析文档 |
| `API_RESPONSE_SUMMARY.md` | 本文件 |
