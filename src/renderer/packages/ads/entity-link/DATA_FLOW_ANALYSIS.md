# Entity Link 数据流分析

根据提供的 API 响应，分析 `slot-entity_link` 的处理流程。

## API 响应示例

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
        "body": "4 entities linked with affiliate URLs",
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

## 完整数据流

### 1. API 响应到达 AdController

**文件**: `src/renderer/packages/ads/core/AdController.ts`

**处理流程**:
```typescript
// 行 793-806
for (const slot of slots) {
  if (slot.status === 'filled' && slot.ads) {
    for (const apiAd of slot.ads) {
      const original = apiAd.original || {};
      const adapted = apiAd.adapted || {};

      // 转换内容
      let content = this.convertAdaptedContentToAdContent(
        original.type,  // "entity_link"
        adapted,        // { title, body, ctaText, styling }
        tracking
      );

      // 根据配置过滤
      content = this.filterAdContentByConfig(original.type, content);
    }
  }
}
```

**问题**: `convertAdaptedContentToAdContent` 方法没有处理 `entity_link` 类型：
```typescript
// 行 1045-1117
private convertAdaptedContentToAdContent(type: string, adapted: any, tracking?: any): any {
  const content: any = {};

  switch (type) {
    case 'action_card': ...
    case 'suffix': ...
    case 'followup': ...
    case 'source': ...
    case 'static': ...
    case 'lead_gen': ...
    default:
      return adapted;  // entity_link 进入这里，直接返回原始数据
  }
}
```

**结果**: `content = adapted = { title, body, ctaText, styling }`

### 2. 构建返回数据

**文件**: `src/renderer/packages/ads/core/AdController.ts`

```typescript
// 行 820-838
allAds.push({
  id: original.id || '',
  type: original.type as any,  // "entity_link"
  score: original.score || 0,
  source: 'external',
  content: content,  // { title, body, ctaText, styling }
  tracking: { ... },
  metadata: { ... },
});
```

### 3. 传递到 useAds Hook

**文件**: `src/renderer/packages/ads/hooks/useAds.ts`

```typescript
// 返回结果
return {
  ads: allAds,  // 包含 entity_link 的 Ad 对象
  slots: slots,  // 原始 slot 数据
  getAdsBySlot: (slotId: string) => Ad[],
  getSlot: (slotId: string) => SlotResponse | undefined,
};
```

### 4. MessageList 传递 adData

**文件**: `src/renderer/components/MessageList.tsx`

```typescript
// 行 167-172
const adData = useMemo(() => ({
  ads: allAds,
  slots,  // ← 包含 slot-entity_link 的数据
  getAdsBySlot: (slotId: string) => getAdsBySlotRef.current(slotId),
  getSlot: (slotId: string) => getSlotRef.current(slotId),
}), [allAds, slots]);
```

### 5. Message 组件使用 useEntityLink

**文件**: `src/renderer/components/Message.tsx`

```typescript
// 行 114-115
const { enhancements: entityLinkEnhancements, isEnabled: isEntityLinkEnabled }
  = useEntityLink(adData);
```

### 6. useEntityLink Hook 提取数据

**文件**: `src/renderer/packages/ads/entity-link/useEntityLink.tsx`

```typescript
// 行 46-49 (已修复)
const entityLinkSlot = adData.slots.find((slot) =>
  slot.slotId === 'slot-entity_link' || slot.slotId === 'entity_link'
)
```

```typescript
// 行 55-80 (✅ 已修复)
const ad = entityLinkSlot.ads[0]
const original = ad.original as any
const adapted = ad.content as any

// ✅ 优先级 1：从 original.entity_link_content 提取（实际 API 结构）
if (original?.entity_link_content?.entities) {
  return {
    entities: original.entity_link_content.entities,
    replacements: original.entity_link_content.replacements || [],
    ...
  }
}

// ✅ 优先级 2：从 adapted.entities 提取（标准格式）
if (adapted?.entities) {
  return {
    entities: adapted.entities,
    ...
  }
}

// ✅ 优先级 3：从 adapted.entityLinkContent 提取（可能的嵌套格式）
if (adapted?.entityLinkContent?.entities) {
  return {
    entities: adapted.entityLinkContent.entities,
    ...
  }
}
```

**修复**:
- ✅ 现在优先从 `original.entity_link_content` 提取实体数据
- ✅ 支持多种可能的数据位置
- ✅ 添加了详细的调试日志

## 当前 API 响应的问题

### 问题 1：缺少实体数据

API 返回的 `adapted` 是摘要格式，不是实际的实体数据：

```json
// 当前返回（摘要格式）
{
  "adapted": {
    "title": "Content Enhancement",
    "body": "4 entities linked with affiliate URLs"  // ← 只是描述
  }
}

// 期望的格式（实体数据）
{
  "adapted": {
    "title": "Content Enhancement",
    "body": "4 entities linked with affiliate URLs",
    "entities": [  // ← 实际的实体数组
      {
        "text": "蓝牙耳机",
        "type": "product",
        "startPosition": 10,
        "endPosition": 14,
        "confidence": 0.95,
        "affiliateUrl": "https://example.com/headphones"
      }
    ],
    "replacements": [
      {
        "originalText": "蓝牙耳机",
        "affiliateUrl": "https://example.com/headphones"
      }
    ]
  }
}
```

### 问题 2：数据位置不确定

实体数据可能在：
1. `adapted.entities` - 标准位置（但当前不存在）
2. `adapted.content` - 嵌套内容
3. `original.entities` - 原始数据位置

## 修复建议

### ✅ 短期修复：已完成

1. ✅ 支持 `slot-entity_link` 和 `entity_link` 两种 slotId
2. ✅ 添加警告日志，提示缺少实体数据
3. ✅ 兼容摘要格式（从 body 解析实体数量）
4. ✅ **从 `original.entity_link_content` 提取实体数据**（关键修复）

### 长期修复：API 数据结构

需要与后端确认 entity_link 的正确数据格式：

**选项 A：标准格式**
```json
{
  "adapted": {
    "entities": [...],
    "replacements": [...],
    "maxLinks": 3,
    "badgeStyle": "subtle",
    "overlapStrategy": "longest"
  }
}
```

**选项 B：嵌套在 content 中**
```json
{
  "adapted": {
    "content": {
      "entities": [...],
      "replacements": [...]
    }
  }
}
```

**选项 C：使用原始数据**
```json
{
  "original": {
    "entities": [...],
    "replacements": [...]
  }
}
```

## 调试辅助

添加了详细的日志输出，当 API 返回数据不符合预期时会显示：

```javascript
console.warn('[Entity Link] API response missing entity data:', {
  slotId: 'slot-entity_link',
  hasTitle: true,
  hasBody: true,
  hasEntities: false,  // ← 关键信息
  contentKeys: ['title', 'body', 'ctaText', 'styling'],
  adId: 'entity_link_n1A_J_k0J0Cao7Sw2Vudw'
})
```

## 下一步行动

1. **与后端确认** entity_link 的正确数据格式
2. **添加数据转换** 如果后端返回格式不同
3. **扩展 AdController** 在 `convertAdaptedContentToAdContent` 中添加 entity_link 的处理
4. **测试真实 API** 使用包含实体数据的响应进行测试

## 当前状态

| 检查项 | 状态 |
|--------|------|
| slotId 查找 | ✅ 已修复 |
| 实体数据提取 | ✅ 已修复（从 original.entity_link_content 提取） |
| 错误处理 | ✅ 已添加 |
| 兼容性处理 | ✅ 已添加 |
| 日志输出 | ✅ 已添加 |
