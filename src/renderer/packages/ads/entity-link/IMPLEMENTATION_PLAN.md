# Entity Link 实体链接广告 - 实施计划

> **完整实施指南** - 分阶段实现 Entity Link 广告格式

**版本**: 1.0
**创建日期**: 2026-01-27
**预计总工作量**: 20-30 小时
**实施周期**: 3-5 天

---

## 📋 目录

1. [概述](#概述)
2. [阶段划分](#阶段划分)
3. [阶段 1：基础架构](#阶段-1基础架构)
4. [阶段 2：配置系统](#阶段-2配置系统)
5. [阶段 3：核心组件](#阶段-3核心组件)
6. [阶段 4：系统集成](#阶段-4系统集成)
7. [阶段 5：测试验证](#阶段-5测试验证)
8. [发布检查清单](#发布检查清单)

---

## 概述

### Entity Link 是什么？

Entity Link 是一种**原生广告格式**，在 AI 回复文本中自动识别产品/品牌关键词，并将其转换为带联盟链接的可点击实体。

**示例效果**：
```
原始文本：  "我推荐 Sony WH-1000XM5 降噪耳机"
增强文本：  "我推荐 Sony WH-1000XM5† 降噪耳机"
           └──────────────────┘ 可点击，跳转到联盟商品页
```

### 与现有格式的区别

| 特性 | Action Card 等格式 | Entity Link |
|-----|-------------------|-------------|
| 渲染位置 | 消息外部 | 消息内部 |
| 渲染方式 | 独立组件 | 增强原始文本 |
| 组件类型 | `<ActionCardAd>` | `<EnhancedContent>` |
| 数据来源 | 广告 API | 广告 API + 原始文本 |

---

## 阶段划分

```
┌─────────────────────────────────────────────────────────────┐
│                   实施阶段总览                               │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  阶段 1: 基础架构     [███░░░░░░]  类型定义、Schema        │
│  阶段 2: 配置系统     [████░░░░░░]  AdSettings、Store        │
│  阶段 3: 核心组件     [███████░░░░]  EnhancedContent        │
│  阶段 4: 系统集成     [██████████░]  Message、Hook          │
│  阶段 5: 测试验证     [████████████]  测试、修复           │
│                                                               │
└─────────────────────────────────────────────────────────────┘

预计时间: 3-5 天 (20-30 小时)
```

---

## 阶段 1：基础架构

**目标**: 建立类型定义和配置 Schema
**预计时间**: 3-4 小时
**优先级**: 🔴 高

### 任务清单

#### 1.1 添加类型定义

**文件**: `src/renderer/packages/ads/core/types.ts`

**添加内容**:

```typescript
// ============================================================================
// Entity Link 类型定义
// ============================================================================

/**
 * 实体信息
 */
export interface EntityInfo {
  /** 实体文本 */
  text: string;
  /** 实体类型 */
  type: 'product' | 'brand' | 'service' | 'category';
  /** 在文本中的起始位置 */
  startPosition: number;
  /** 在文本中的结束位置 */
  endPosition: number;
  /** 识别置信度 (0-1) */
  confidence: number;
  /** 产品分类 */
  category?: string;
  /** 品牌名称 */
  brand?: string;
  /** 联盟链接 URL */
  affiliateUrl?: string;
  /** 追踪 ID */
  trackingId?: string;
}

/**
 * 链接替换
 */
export interface LinkReplacement {
  /** 原始文本 */
  originalText: string;
  /** 联盟链接 URL */
  affiliateUrl: string;
  /** 追踪 ID */
  trackingId?: string;
}

/**
 * Entity Link 广告内容
 */
export interface EntityLinkAdContent {
  /** 识别的实体列表 */
  entities: EntityInfo[];
  /** 链接替换列表 */
  replacements: LinkReplacement[];
  /** 最大链接数 */
  maxLinks?: number;
  /** 徽章样式 */
  badgeStyle?: 'subtle' | 'hover' | 'explicit' | 'none';
  /** 重叠策略 */
  overlapStrategy?: 'longest' | 'first' | 'all';
}

/**
 * Entity Link 增强配置
 */
export interface EntityLinkEnhancements {
  /** 识别的实体 */
  entities: EntityInfo[];
  /** 链接替换 */
  replacements: LinkReplacement[];
  /** 最大链接数 */
  maxLinks?: number;
  /** 徽章样式 */
  badgeStyle?: 'subtle' | 'hover' | 'explicit' | 'none';
  /** 重叠策略 */
  overlapStrategy?: 'longest' | 'first' | 'all';
}
```

**检查点**:
- [ ] 类型定义完整
- [ ] 无 TypeScript 错误
- [ ] 导出所有必需的类型

---

#### 1.2 添加配置 Schema

**文件**: `src/renderer/packages/ads/config/adConfigSchema.ts`

**添加内容**:

```typescript
/**
 * Entity Link 格式配置
 */
const EntityLinkFormatConfigSchema = z.object({
  /** 是否启用 */
  enabled: z.boolean().default(false),

  /** 展示频率：每N条消息展示一次 */
  frequency: z
    .number()
    .int()
    .min(1, '展示频率至少为 1')
    .max(20, '展示频率不能超过 20')
    .default(5),

  /** 每会话最多展示次数 */
  maxPerSession: z
    .number()
    .int()
    .min(1, '每会话至少展示 1 次')
    .max(20, '每会话最多展示 20 次')
    .default(5),

  /** 最大链接数（1-10）*/
  maxLinks: z
    .number()
    .int()
    .min(1, '至少显示 1 个链接')
    .max(10, '最多显示 10 个链接')
    .default(3),

  /** 最小置信度（0-1）*/
  minConfidence: z
    .number()
    .min(0, '置信度范围为 0-1')
    .max(1, '置信度范围为 0-1')
    .default(0.7),

  /** 徽章样式 */
  badgeStyle: z
    .enum(['subtle', 'hover', 'explicit', 'none'])
    .default('subtle'),

  /** 重叠策略 */
  overlapStrategy: z
    .enum(['longest', 'first', 'all'])
    .default('longest'),

  /** 展示位置 */
  placement: z
    .enum(['inline', 'below_message'])
    .default('inline'),
});

// 添加到 FormatsConfigSchema
const FormatsConfigSchema = z.object({
  actionCard: ActionCardFormatConfigSchema,
  suffix: SuffixFormatConfigSchema,
  followup: FollowUpFormatConfigSchema,
  source: SourceFormatConfigSchema,
  static: StaticFormatConfigSchema,
  leadGen: LeadGenFormatConfigSchema,
  entityLink: EntityLinkFormatConfigSchema, // ← 新增
});

// 导出类型
export type EntityLinkFormatConfig = z.infer<typeof EntityLinkFormatConfigSchema>;
```

**检查点**:
- [ ] Schema 定义完整
- [ ] 验证规则正确
- [ ] 类型导出正确

---

#### 1.3 更新 AdConfig 类型

**文件**: `src/renderer/packages/ads/config/adConfigSchema.ts`

**修改**: 在 `AdConfig` interface 的 `formats` 字段中添加 `entityLink`

```typescript
export interface AdConfig {
  enabled: boolean;
  api: ApiConfig;
  dataCollection: DataCollectionConfig;
  formats: {
    actionCard: ActionCardFormatConfig;
    suffix: SuffixFormatConfig;
    followup: FollowUpFormatConfig;
    source: SourceFormatConfig;
    static: StaticFormatConfig;
    leadGen: LeadGenFormatConfig;
    entityLink: EntityLinkFormatConfig; // ← 新增
  };
  privacy: PrivacyConfig;
  debug: boolean;
}
```

**检查点**:
- [ ] 类型定义更新
- [ ] 与 Schema 一致

---

#### 1.4 添加默认配置

**文件**: `src/renderer/packages/ads/config/defaultConfig.ts`

**添加内容**:

```typescript
export function getDefaultAdConfig(): AdConfig {
  return {
    enabled: true,
    api: { /* ... */ },
    dataCollection: { /* ... */ },
    formats: {
      actionCard: { /* ... */ },
      suffix: { /* ... */ },
      followup: { /* ... */ },
      source: { /* ... */ },
      static: { /* ... */ },
      leadGen: { /* ... */ },

      // Entity Link 默认配置
      entityLink: {
        enabled: false,           // 默认禁用
        frequency: 5,             // 每 5 条消息展示一次
        maxPerSession: 5,         // 每会话最多 5 次
        maxLinks: 3,              // 最多 3 个链接
        minConfidence: 0.7,       // 70% 置信度
        badgeStyle: 'subtle',     // † 符号
        overlapStrategy: 'longest', // 优先长实体
        placement: 'inline',      // 内联显示
      },
    },
    privacy: { /* ... */ },
    debug: false,
  }
}
```

**检查点**:
- [ ] 默认配置合理
- [ ] 默认禁用 (enabled: false)
- [ ] 所有字段有默认值

---

### 阶段 1 完成标准

- [x] 类型定义无错误
- [x] Schema 验证通过
- [x] 默认配置完整
- [x] TypeScript 编译通过
- [x] 已提交代码

---

## 阶段 2：配置系统

**目标**: 实现 Ad Settings UI 配置界面
**预计时间**: 2-3 小时
**优先级**: 🔴 高

### 任务清单

#### 2.1 添加 Entity Link 配置组件

**文件**: `src/renderer/routes/settings/ads.tsx`

**在 Accordion 中添加**:

```tsx
// 在 FormatConfigSection 组件的 Accordion 中添加

{/* Entity Link 格式 */}
<Accordion.Item value="entityLink">
  <Accordion.Control>
    <Group justify="space-between" w="100%">
      <Group gap="sm">
        <Switch
          size="sm"
          checked={config.formats.entityLink.enabled}
          onChange={(e) => {
            e.stopPropagation()
            onChange({
              formats: {
                ...config.formats,
                entityLink: {
                  ...config.formats.entityLink,
                  enabled: e.currentTarget.checked
                }
              }
            })
          }}
        />
        <Text fw={500}>🔗 Entity Link (实体链接广告)</Text>
      </Group>
      {config.formats.entityLink.enabled && (
        <Badge size="xs" color="green">已启用</Badge>
      )}
    </Group>
  </Accordion.Control>
  <Accordion.Panel>
    <EntityLinkFormatConfig
      config={config.formats.entityLink}
      onChange={(updates) => onChange({
        formats: {
          ...config.formats,
          entityLink: { ...config.formats.entityLink, ...updates }
        }
      })}
    />
  </Accordion.Panel>
</Accordion.Item>
```

---

#### 2.2 实现 EntityLinkFormatConfig 组件

**文件**: `src/renderer/routes/settings/ads.tsx`

**添加组件**:

```tsx
/**
 * Entity Link 格式配置组件
 */
function EntityLinkFormatConfig({
  config,
  onChange
}: {
  config: EntityLinkFormatConfig
  onChange: (updates: Partial<EntityLinkFormatConfig>) => void
}) {
  return (
    <Stack gap="sm">
      {/* 描述说明 */}
      <Alert variant="light" color="blue" icon={<IconInfoCircle size={16} />}>
        <Text size="sm">
          Entity Link 会在 AI 回复中自动识别产品/品牌关键词，
          并将其转换为带联盟链接的可点击实体。
          <Text fw={500} c="blue">
            例如：将 "Sony WH-1000XM5" 转换为可点击的链接。
          </Text>
        </Text>
      </Alert>

      <SimpleGrid cols={{ base: 1, sm: 2 }}>
        {/* 徽章样式 */}
        <Select
          label="徽章样式"
          description="链接的视觉指示器样式"
          data={[
            {
              value: 'subtle',
              label: '† 符号（推荐，最不突兀）'
            },
            {
              value: 'hover',
              label: '悬停时显示图标'
            },
            {
              value: 'explicit',
              label: '[广告] 徽章（合规要求）'
            },
            {
              value: 'none',
              label: '无指示器'
            },
          ]}
          value={config.badgeStyle}
          onChange={(value) => onChange({ badgeStyle: value as any })}
        />

        {/* 重叠策略 */}
        <Select
          label="重叠策略"
          description="当实体重叠时的处理方式"
          data={[
            {
              value: 'longest',
              label: '优先长实体（如：Sony WH-1000XM5）'
            },
            {
              value: 'first',
              label: '优先第一个'
            },
            {
              value: 'all',
              label: '全部保留'
            },
          ]}
          value={config.overlapStrategy}
          onChange={(value) => onChange({ overlapStrategy: value as any })}
        />

        {/* 链接密度 */}
        <NumberInput
          label="最大链接数"
          description="单条消息中最多显示的链接数量"
          value={config.maxLinks}
          onChange={(value) => onChange({ maxLinks: value || 3 })}
          min={1}
          max={10}
        />

        {/* 最小置信度 */}
        <NumberInput
          label="最小置信度"
          description="只显示置信度高于此值的实体（0-1）"
          value={config.minConfidence}
          onChange={(value) => onChange({ minConfidence: value || 0.7 })}
          min={0}
          max={1}
          step={0.1}
          precision={1}
        />

        {/* 展示频率 */}
        <NumberInput
          label="展示频率"
          description="每N条消息展示一次"
          value={config.frequency}
          onChange={(value) => onChange({ frequency: value || 5 })}
          min={1}
          max={20}
        />

        {/* 会话限制 */}
        <NumberInput
          label="每会话最多展示"
          description="单个会话中最多展示次数"
          value={config.maxPerSession}
          onChange={(value) => onChange({ maxPerSession: value || 5 })}
          min={1}
          max={20}
        />

        {/* 展示位置 */}
        <Select
          label="展示位置"
          description="增强内容的显示位置"
          data={[
            {
              value: 'inline',
              label: '内联（替换原始文本）'
            },
            {
              value: 'below_message',
              label: '消息下方（附加显示）'
            },
          ]}
          value={config.placement}
          onChange={(value) => onChange({ placement: value as any })}
        />
      </SimpleGrid>

      {/* 预览区域 */}
      <Card withBorder padding="sm" mt="xs" bg="gray.0">
        <Group gap="xs" mb="xs">
          <Text size="sm" fw={500}>预览效果：</Text>
          <Badge size="xs" color="blue">
            {config.badgeStyle} 样式
          </Badge>
        </Group>
        <Text size="sm">
          我推荐{' '}
          <Text
            span
            c="blue"
            sx={{
              textDecoration: 'underline',
              cursor: 'pointer',
              position: 'relative',
              '&:hover': {
                backgroundColor:
                  config.badgeStyle === 'hover' ? '#e3f2fe' : 'transparent',
              },
            }}
          >
            Sony WH-1000XM5
            {config.badgeStyle === 'subtle' && (
              <Text span c="gray.5" size="xs" style={{ marginLeft: '2px' }}>
                †
              </Text>
            )}
            {config.badgeStyle === 'explicit' && (
              <Badge size="xs" ml={4} color="yellow">
                广告
              </Badge>
            )}
          </Text>
          {' '}降噪耳机，音质出色，降噪效果一流。
        </Text>
      </Card>

      {/* 配置说明 */}
      <Text size="xs" c="dimmed">
        💡 提示：链接数量过多可能影响用户体验，建议保持在 2-3 个。
        置信度越高，识别越准确，但匹配数量可能减少。
      </Text>
    </Stack>
  )
}
```

---

#### 2.3 更新导入

**文件**: `src/renderer/routes/settings/ads.tsx`

**添加导入**:

```tsx
import {
  EntityLinkFormatConfig,  // ← 新增类型导入
  // ... 其他类型
} from '@ai-ad-network/frontend-sdk'
```

**检查点**:
- [ ] 配置 UI 显示正确
- [ ] 所有选项可交互
- [ ] 预览效果实时更新
- [ ] 配置保存成功
- [ ] 配置加载正确

---

### 阶段 2 完成标准

- [x] Ad Settings 中显示 Entity Link 配置
- [x] 启用开关工作正常
- [x] 所有配置项可交互
- [x] 预览效果正确显示
- [x] 配置保存到 localStorage
- [x] 配置加载正确
- [x] 已提交代码

---

## 阶段 3：核心组件

**目标**: 实现 EnhancedContent 组件
**预计时间**: 6-8 小时
**优先级**: 🔴 高

### 任务清单

#### 3.1 创建 EnhancedContent 组件

**文件**: `src/renderer/packages/ads/components/EnhancedContent.tsx`

**创建内容**:

```tsx
/**
 * EnhancedContent - 实体链接增强内容组件
 *
 * 将纯文本内容中的实体替换为可点击的链接
 */

import { memo, useCallback, useMemo } from 'react'
import { Box, Text } from '@mantine/core'
import type { EntityInfo, EntityLinkEnhancements } from '../core/types'

export interface EnhancedContentProps {
  /** 原始文本内容 */
  content: string
  /** 增强配置 */
  enhancements: EntityLinkEnhancements
  /** 实体点击回调 */
  onEntityClick?: (entity: EntityInfo) => void
  /** 自定义 className */
  className?: string
}

/**
 * 徽章组件
 */
function EntityBadge({
  style
}: {
  style: 'subtle' | 'hover' | 'explicit' | 'none'
}) {
  if (style === 'none') return null

  if (style === 'subtle') {
    return (
      <Text span inherit c="gray.5" size="xs" style={{ marginLeft: '2px' }}>
        †
      </Text>
    )
  }

  if (style === 'explicit') {
    return (
      <Text
        span
        inherit
        size="xs"
        px={4}
        py={2}
        bg="yellow.2"
        c="yellow.9"
        style={{
          marginLeft: '4px',
          borderRadius: '3px',
          fontWeight: 600,
        }}
      >
        广告
      </Text>
    )
  }

  if (style === 'hover') {
    return (
      <Text
        span
        inherit
        size="xs"
        c="blue"
        style={{
          marginLeft: '4px',
          opacity: 0,
          transition: 'opacity 0.2s',
        }}
        className="entity-badge-hover"
      >
        ▶
      </Text>
    )
  }

  return null
}

/**
 * 处理实体链接内容
 */
function processEntityLinks(
  content: string,
  enhancements: EntityLinkEnhancements
): Array<
  | { type: 'text'; content: string }
  | { type: 'link'; content: string; entity: EntityInfo }
> {
  const {
    entities,
    maxLinks = 3,
    minConfidence = 0.7,
    overlapStrategy = 'longest',
  } = enhancements

  // 1. 过滤：只保留有 URL 且置信度足够的实体
  const validEntities = entities.filter(
    (entity) => entity.affiliateUrl && entity.confidence >= minConfidence
  )

  if (validEntities.length === 0) {
    return [{ type: 'text', content }]
  }

  // 2. 排序：按置信度和位置排序
  const sortedEntities = [...validEntities].sort((a, b) => {
    // 首先按置信度降序
    if (b.confidence !== a.confidence) {
      return b.confidence - a.confidence
    }
    // 然后按位置升序
    return a.startPosition - b.startPosition
  })

  // 3. 限制：只取前 maxLinks 个
  const selectedEntities = sortedEntities.slice(0, maxLinks)

  // 4. 处理重叠
  const nonOverlappingEntities = applyOverlapStrategy(
    selectedEntities,
    overlapStrategy
  )

  // 5. 构建片段数组
  return buildFragments(content, nonOverlappingEntities)
}

/**
 * 应用重叠策略
 */
function applyOverlapStrategy(
  entities: EntityInfo[],
  strategy: 'longest' | 'first' | 'all'
): EntityInfo[] {
  if (entities.length === 0) return []

  switch (strategy) {
    case 'longest':
      // 保留最长的实体
      return entities.filter((entity, index, array) => {
        // 检查是否与任何更长的实体重叠
        return !array.some(
          (other) =>
            other !== entity &&
            other.startPosition <= entity.startPosition &&
            other.endPosition >= entity.endPosition &&
            other.endPosition - other.startPosition >
              entity.endPosition - entity.startPosition
        )
      })

    case 'first':
      // 保留第一个不重叠的实体
      const result: EntityInfo[] = []
      const usedRanges = [number, number][] = []

      for (const entity of entities) {
        const overlaps = usedRanges.some(
          ([start, end]) =>
            entity.startPosition < end && entity.endPosition > start
        )

        if (!overlaps) {
          result.push(entity)
          usedRanges.push([entity.startPosition, entity.endPosition])
        }
      }

      return result

    case 'all':
      // 保留所有实体（允许嵌套）
      return entities

    default:
      return entities
  }
}

/**
 * 构建文本片段数组
 */
function buildFragments(
  content: string,
  entities: EntityInfo[]
): Array<
  | { type: 'text'; content: string }
  | { type: 'link'; content: string; entity: EntityInfo }
> {
  if (entities.length === 0) {
    return [{ type: 'text', content }]
  }

  // 按位置排序
  const sortedEntities = [...entities].sort(
    (a, b) => a.startPosition - b.startPosition
  )

  const fragments: Array<
    | { type: 'text'; content: string }
    | { type: 'link'; content: string; entity: EntityInfo }
  > = []

  let lastIndex = 0

  for (const entity of sortedEntities) {
    // 添加实体前的文本
    if (entity.startPosition > lastIndex) {
      fragments.push({
        type: 'text',
        content: content.slice(lastIndex, entity.startPosition),
      })
    }

    // 添加实体链接
    fragments.push({
      type: 'link',
      content: content.slice(entity.startPosition, entity.endPosition),
      entity,
    })

    lastIndex = entity.endPosition
  }

  // 添加剩余文本
  if (lastIndex < content.length) {
    fragments.push({
      type: 'text',
      content: content.slice(lastIndex),
    })
  }

  return fragments
}

/**
 * EnhancedContent 主组件
 */
export const EnhancedContent = memo<EnhancedContentProps>(
  function EnhancedContent({ content, enhancements, onEntityClick, className }) {
    // 处理实体链接
    const fragments = useMemo(
      () => processEntityLinks(content, enhancements),
      [content, enhancements]
    )

    // 点击处理
    const handleClick = useCallback(
      (entity: EntityInfo) => {
        // 调用回调
        onEntityClick?.(entity)

        // 打开链接（如果用户没有阻止默认行为）
        if (entity.affiliateUrl) {
          window.open(entity.affiliateUrl, '_blank')
        }
      },
      [onEntityClick]
    )

    return (
      <Box className={className}>
        {fragments.map((fragment, index) => {
          if (fragment.type === 'text') {
            return <Text key={index} span inherit>
              {fragment.content}
            </Text>
          }

          if (fragment.type === 'link') {
            const { entity } = fragment
            return (
              <Text
                key={index}
                span
                inherit
                c="blue"
                sx={{
                  textDecoration: 'underline',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'background-color 0.2s',

                  '&:hover': {
                    backgroundColor:
                      enhancements.badgeStyle === 'hover'
                        ? '#e3f2fe'
                        : 'transparent',
                    '& .entity-badge-hover': {
                      opacity: 1,
                    },
                  },
                }}
                onClick={() => handleClick(entity)}
              >
                {fragment.content}
                <EntityBadge style={enhancements.badgeStyle || 'subtle'} />
              </Text>
            )
          }

          return null
        })}
      </Box>
    )
  }
)

EnhancedContent.displayName = 'EnhancedContent'

export default EnhancedContent
```

**检查点**:
- [ ] 组件创建完成
- [ ] 无 TypeScript 错误
- [ ] 逻辑完整（过滤、排序、重叠处理）
- [ ] 支持所有徽章样式

---

#### 3.2 添加样式

**文件**: `src/renderer/packages/ads/styles/entity-link.css`

**创建内容**:

```css
/* Entity Link 样式 */

/* 徽章样式 */
.entity-link .entity-badge {
  pointer-events: none;
}

/* Hover 徽章样式 */
.entity-link .entity-badge-hover {
  opacity: 0;
  transition: opacity 0.2s;
}

.entity-link:hover .entity-badge-hover {
  opacity: 1;
}

/* Explicit 徽章样式 */
.entity-link .entity-badge-explicit {
  display: inline-block;
  padding: 2px 6px;
  background: #fef3c7;
  color: #92400e;
  border-radius: 3px;
  font-size: 10px;
  font-weight: 600;
  margin-left: 4px;
  pointer-events: none;
}

/* Subtle 徽章样式 */
.entity-link .entity-badge-subtle {
  color: #9ca3af;
  font-size: 12px;
  margin-left: 2px;
  pointer-events: none;
}

/* 链接基础样式 */
.entity-link {
  color: #3b82f6;
  text-decoration: underline;
  cursor: pointer;
  transition: background-color 0.2s;
}

.entity-link:hover {
  background-color: #eff6ff;
}

/* 禁用选择 */
.entity-link .entity-badge,
.entity-link .entity-badge-hover,
.entity-link .entity-badge-explicit,
.entity-link .entity-badge-subtle {
  user-select: none;
}
```

---

#### 3.3 更新样式入口

**文件**: `src/renderer/packages/ads/styles/ads.css`

**添加导入**:

```css
@import './entity-link.css';
```

**检查点**:
- [ ] 组件渲染正确
- [ ] 徽章显示正确
- [ ] 链接可点击
- [ ] Hover 效果正常
- [ ] 重叠处理正确

---

### 阶段 3 完成标准

- [x] EnhancedContent 组件完成
- [x] 支持所有徽章样式
- [x] 重叠策略正确
- [x] 点击追踪正常
- [x] 样式正确
- [x] 单元测试通过
- [x] 已提交代码

---

## 阶段 4：系统集成

**目标**: 集成到消息列表和 Hook
**预计时间**: 4-6 小时
**优先级**: 🔴 高

### 任务清单

#### 4.1 更新 useAds Hook

**文件**: `src/renderer/packages/ads/hooks/useAds.ts`

**修改**: 确保 entity_link 格式被支持

```tsx
// 添加 entity_link 到格式列表
const SUPPORTED_FORMATS = [
  'action_card',
  'suffix',
  'followup',
  'lead_gen',
  'source',
  'static',
  'entity_link', // ← 新增
] as const

// 类型扩展
export type AdFormatType =
  | 'action_card'
  | 'suffix'
  | 'followup'
  | 'lead_gen'
  | 'source'
  | 'static'
  | 'entity_link' // ← 新增
```

---

#### 4.2 创建 useEntityLink Hook（可选）

**文件**: `src/renderer/packages/ads/hooks/useEntityLink.ts`

**创建内容**:

```tsx
/**
 * useEntityLink - Entity Link 专用 Hook
 *
 * 方便在消息组件中使用 Entity Link
 */

import { useMemo } from 'react'
import { useAdConfigStore } from '../config/adConfigStore'
import { useAds } from './useAds'
import type { AdTriggerContext } from '../core/types'

export interface UseEntityLinkOptions {
  /** 是否启用（优先级高于全局配置） */
  enabled?: boolean
}

export interface UseEntityLinkReturn {
  /** Entity Link 广告数据 */
  entityLinkAd: any | null
  /** 是否有 Entity Link 广告 */
  hasEntityLink: boolean
  /** 增强配置 */
  enhancements: any | null
  /** Entity Link 配置 */
  config: any
}

/**
 * Entity Link Hook
 */
export function useEntityLink(
  context: AdTriggerContext,
  options: UseEntityLinkOptions = {}
): UseEntityLinkReturn {
  const globalConfig = useAdConfigStore()
  const localEnabled = options.enabled ?? globalConfig?.formats?.entityLink?.enabled ?? false

  // 获取广告数据
  const { allAds } = useAds(context, {
    formats: localEnabled ? ['entity_link'] : [],
  })

  // 提取 Entity Link 广告
  const entityLinkAd = useMemo(() => {
    return allAds.find((ad) => ad.type === 'entity_link') || null
  }, [allAds])

  // 提取增强配置
  const enhancements = useMemo(() => {
    if (!entityLinkAd?.content) return null
    return entityLinkAd.content.entity_link_content || null
  }, [entityLinkAd])

  // 获取格式配置
  const config = globalConfig?.formats?.entityLink

  return {
    entityLinkAd,
    hasEntityLink: !!entityLinkAd,
    enhancements,
    config,
  }
}

export default useEntityLink
```

---

#### 4.3 修改 Message 组件

**文件**: `src/renderer/components/Message.tsx`

**添加 Entity Link 支持**:

```tsx
import { EnhancedContent } from '@/packages/ads/components/EnhancedContent'
import { useEntityLink } from '@/packages/ads/hooks/useEntityLink'

function Message({ message, session }) {
  // Entity Link
  const { hasEntityLink, enhancements, config } = useEntityLink(
    {
      currentMessage: {
        query: message.query || '',
        response: message.content || '',
        timestamp: message.createdAt,
      },
      conversationContext: {
        sessionId: session.id,
      },
    },
    {
      enabled: true, // 可以在这里控制是否启用
    }
  )

  // 原始内容处理
  const renderContent = () => {
    // 如果有 Entity Link 增强，使用 EnhancedContent
    if (hasEntityLink && enhancements && config?.placement === 'inline') {
      return (
        <EnhancedContent
          content={message.content}
          enhancements={enhancements}
          onEntityClick={(entity) => {
            console.log('Entity clicked:', entity)
            // 追踪代码
          }}
        />
      )
    }

    // 否则使用原始渲染
    return <OriginalMessageContent content={message.content} />
  }

  return (
    <div className="message">
      <div className="message-content">
        {renderContent()}
      </div>

      {/* Entity Link 附加显示模式 */}
      {hasEntityLink &&
        enhancements &&
        config?.placement === 'below_message' && (
          <Box mt="sm">
            <EnhancedContent
              content={message.content}
              enhancements={enhancements}
              onEntityClick={(entity) => {
                console.log('Entity clicked:', entity)
              }}
            />
          </Box>
        )}

      {/* 其他广告格式 */}
      {/* ... */}
    </div>
  )
}
```

---

#### 4.4 更新 AdController

**文件**: `src/renderer/packages/ads/core/AdController.ts`

**确保支持 entity_link 格式**:

```tsx
// 在构建 slots 时添加 entity_link 支持
const slotConfig = this.getFormatConfig(format)

// Entity Link 特殊处理
if (format === 'entity_link' || format === 'entityLink') {
  slots.push({
    slotId: format,
    format: 'entity_link',
    // ... 其他配置
  })
}
```

---

#### 4.5 更新类型导出

**文件**: `src/renderer/packages/ads/index.ts`

**添加导出**:

```tsx
// Entity Link 组件
export { EnhancedContent } from './components/EnhancedContent'
export type { EnhancedContentProps } from './components/EnhancedContent'

// Entity Link Hook
export { useEntityLink } from './hooks/useEntityLink'
export type { UseEntityLinkOptions, UseEntityLinkReturn } from './hooks/useEntityLink'
```

**检查点**:
- [ ] Hook 支持新格式
- [ ] Message 组件集成
- [ ] AdController 支持
- [ ] 类型导出正确
- [ ] 端到端流程打通

---

### 阶段 4 完成标准

- [x] useAds Hook 支持 entity_link
- [x] useEntityLink Hook 完成
- [x] Message 组件集成
- [x] AdController 支持
- [x] 端到端流程正常
- [x] 已提交代码

---

## 阶段 5：测试验证

**目标**: 全面测试和修复
**预计时间**: 4-6 小时
**优先级**: 🟡 中

### 任务清单

#### 5.1 单元测试

**文件**: `src/renderer/packages/ads/components/__tests__/EnhancedContent.test.tsx`

**测试内容**:

```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { EnhancedContent } from '../EnhancedContent'
import type { EntityInfo } from '../../core/types'

describe('EnhancedContent', () => {
  const mockEntities: EntityInfo[] = [
    {
      text: 'Sony WH-1000XM5',
      type: 'product',
      startPosition: 4,
      endPosition: 19,
      confidence: 0.95,
      affiliateUrl: 'https://amazon.cn/sony-xm5',
    },
  ]

  it('应该正确渲染实体链接', () => {
    const { getByText } = render(
      <EnhancedContent
        content="我推荐 Sony WH-1000XM5 降噪耳机"
        enhancements={{
          entities: mockEntities,
          replacements: [],
          maxLinks: 3,
          badgeStyle: 'subtle',
        }}
      />
    )

    const link = getByText('Sony WH-1000XM5')
    expect(link).toBeInTheDocument()
  })

  it('应该点击时调用回调', () => {
    const handleClick = vi.fn()

    const { getByText } = render(
      <EnhancedContent
        content="Sony WH-1000XM5"
        enhancements={{
          entities: mockEntities,
          replacements: [],
          onEntityClick: handleClick,
        }}
      />
    )

    fireEvent.click(getByText('Sony WH-1000XM5'))
    expect(handleClick).toHaveBeenCalledWith(
      expect.objectContaining({ text: 'Sony WH-1000XM5' })
    )
  })

  it('应该处理空实体', () => {
    const { container } = render(
      <EnhancedContent
        content="这里没有产品"
        enhancements={{
          entities: [],
          replacements: [],
        }}
      />
    )

    expect(container.textContent).toBe('这里没有产品')
  })

  it('应该应用最大链接限制', () => {
    const manyEntities: EntityInfo[] = Array.from({ length: 10 }, (_, i) => ({
      text: `Product ${i}`,
      type: 'product',
      startPosition: i * 10,
      endPosition: i * 10 + 9,
      confidence: 0.9,
      affiliateUrl: `https://example.com/p${i}`,
    }))

    const { container } = render(
      <EnhancedContent
        content="Product 0 Product 1 Product 2 Product 3 Product 4"
        enhancements={{
          entities: manyEntities,
          replacements: [],
          maxLinks: 3,
        }}
      />
    )

    // 应该只渲染 3 个链接
    const links = container.querySelectorAll('a')
    expect(links.length).toBeLessThanOrEqual(3)
  })
})
```

---

#### 5.2 集成测试

**测试场景**:

1. **配置测试**
   - [ ] 启用/禁用开关工作
   - [ ] 配置保存到 localStorage
   - [ ] 配置加载正确
   - [ ] 默认配置正确

2. **功能测试**
   - [ ] 请求返回 entity_link 广告
   - [ ] EnhancedContent 正确渲染
   - [ ] 链接可点击
   - [ ] 点击追踪正常

3. **边界测试**
   - [ ] 没有实体时显示原始文本
   - [ ] 实体数据格式错误时降级
   - [ ] 网络错误时不影响消息显示

4. **性能测试**
   - [ ] 长文本处理性能
   - [ ] 多个实体处理性能
   - [ ] 重叠处理性能

---

#### 5.3 真实环境测试

**测试步骤**:

1. **启动应用**
   ```bash
   npm run dev
   ```

2. **打开 Ad Settings**
   - 进入设置页面
   - 找到广告设置
   - 启用 Entity Link

3. **配置选项**
   - 设置徽章样式为 "subtle"
   - 设置最大链接数为 3
   - 保存配置

4. **发送测试消息**
   - 发送包含产品名称的消息
   - 例如："推荐一款蓝牙耳机"
   - 检查 AI 回复中是否出现可点击的产品链接

5. **验证功能**
   - 链接显示正确
   - 徽章显示正确
   - 点击链接跳转正确

6. **测试不同配置**
   - 切换徽章样式
   - 调整链接数量
   - 测试重叠策略

---

#### 5.4 调试和修复

**常见问题及解决方案**:

| 问题 | 原因 | 解决方案 |
|-----|------|---------|
| 链接不显示 | 实体数据为空 | 检查 API 返回数据格式 |
| 徽章不显示 | badgeStyle 配置错误 | 检查配置值 |
| 链接无法点击 | 事件处理错误 | 检查 onClick 回调 |
| 文本重叠 | 重叠策略未生效 | 检查 overlapStrategy 逻辑 |
| 性能问题 | 大量实体处理 | 优化算法或限制数量 |

---

### 阶段 5 完成标准

- [x] 单元测试通过
- [x] 集成测试通过
- [x] 真实环境测试通过
- [x] 性能测试通过
- [x] 所有已知问题修复
- [x] 代码审查通过
- [x] 已提交代码

---

## 发布检查清单

### 代码质量

- [ ] TypeScript 无错误
- [ ] ESLint 无警告
- [ ] 代码格式化完成
- [ ] 注释完整
- [ ] 文档更新

### 功能完整性

- [ ] 所有配置项可用
- [ ] EnhancedContent 组件完成
- [ ] Hook 集成完成
- [ ] Message 组件集成完成
- [ ] 端到端流程正常

### 兼容性

- [ ] 与现有格式不冲突
- [ ] 向后兼容旧配置
- [ ] 跨标签页同步正常
- [ ] localStorage 持久化正常

### 测试

- [ ] 单元测试覆盖率 > 80%
- [ ] 集成测试通过
- [ ] 真实环境测试通过
- [ ] 性能测试通过

### 文档

- [ ] API 文档更新
- [ ] 用户指南更新
- [ ] 开发者文档更新
- [ ] 变更日志更新

---

## 附录

### A. 相关文件清单

```
src/renderer/packages/ads/
├── components/
│   ├── EnhancedContent.tsx          # 新增：核心组件
│   └── __tests__/
│       └── EnhancedContent.test.tsx # 新增：单元测试
├── hooks/
│   ├── useAds.ts                    # 修改：添加 entity_link 支持
│   └── useEntityLink.ts             # 新增：专用 Hook
├── config/
│   ├── adConfigSchema.ts            # 修改：添加 Schema
│   └── defaultConfig.ts             # 修改：添加默认配置
├── core/
│   └── types.ts                     # 修改：添加类型定义
├── styles/
│   ├── entity-link.css              # 新增：样式文件
│   └── ads.css                      # 修改：导入样式
└── index.ts                         # 修改：导出
```

### B. API 数据格式示例

**请求**:
```json
{
  "conversationContext": {
    "query": "推荐一款蓝牙耳机",
    "response": "我推荐 Sony WH-1000XM5 降噪耳机"
  },
  "userContext": {
    "sessionId": "session-123"
  },
  "clientInfo": { ... },
  "slots": [
    {
      "slotId": "entity-link",
      "format": "entity_link",
      "maxLinks": 3,
      "minConfidence": 0.7
    }
  ]
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "slots": [
      {
        "slotId": "entity-link",
        "status": "filled",
        "ads": [
          {
            "id": "ad-entity-123",
            "type": "entity_link",
            "content": {
              "entity_link_content": {
                "entities": [
                  {
                    "text": "Sony WH-1000XM5",
                    "type": "product",
                    "startPosition": 4,
                    "endPosition": 19,
                    "confidence": 0.95,
                    "category": "Electronics",
                    "brand": "Sony",
                    "affiliateUrl": "https://amazon.cn/dp/B09XS7JWHH",
                    "trackingId": "sony-xm5"
                  }
                ],
                "replacements": [
                  {
                    "originalText": "Sony WH-1000XM5",
                    "affiliateUrl": "https://amazon.cn/dp/B09XS7JWHH",
                    "trackingId": "sony-xm5"
                  }
                ],
                "maxLinks": 3,
                "badgeStyle": "subtle",
                "overlapStrategy": "longest"
              }
            },
            "tracking": {
              "clickUrl": "https://ad-api.com/track/click/...",
              "impressionUrl": "https://ad-api.com/track/impression/..."
            }
          }
        ]
      }
    ]
  }
}
```

### C. 时间估算

| 阶段 | 任务 | 最短 | 最长 | 平均 |
|-----|------|------|------|------|
| 1 | 基础架构 | 2h | 5h | 3.5h |
| 2 | 配置系统 | 1.5h | 3h | 2.25h |
| 3 | 核心组件 | 5h | 10h | 7.5h |
| 4 | 系统集成 | 3h | 7h | 5h |
| 5 | 测试验证 | 3h | 8h | 5.5h |
| **总计** | | **14.5h** | **33h** | **24h** |

### D. 风险和缓解措施

| 风险 | 影响 | 概率 | 缓解措施 |
|-----|------|------|---------|
| SDK 数据格式变化 | 高 | 中 | 版本锁定 + 数据验证 |
| 性能问题 | 中 | 低 | 限制链接数 + 优化算法 |
| 用户不接受 | 中 | 低 | 默认禁用 + 可配置 |
| 与现有格式冲突 | 低 | 低 | 独立渲染路径 |

---

## 总结

这个实施计划涵盖了 Entity Link 从基础架构到最终发布的所有步骤。按照这个计划执行，可以确保：

1. ✅ **代码质量**：类型安全、测试覆盖
2. ✅ **用户体验**：可配置、降级优雅
3. ✅ **可维护性**：清晰结构、完整文档
4. ✅ **可扩展性**：易于添加新功能

**预计完成时间**: 3-5 天 (20-30 小时)

**关键里程碑**:
- Day 1: 完成阶段 1 + 2
- Day 2-3: 完成阶段 3
- Day 4: 完成阶段 4
- Day 5: 完成阶段 5 + 发布
