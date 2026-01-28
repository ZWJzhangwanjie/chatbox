/**
 * AI Ad Network - Entity Link Demo Component
 *
 * 演示 Entity Link 功能的组件
 */

import { useState } from 'react'
import { EnhancedContent } from './EnhancedContent'
import type { EntityLinkEnhancements } from '../core/types'
import { Card, Stack, Text, Select, Button, Group, Badge } from '@mantine/core'

// 演示数据
const DEMO_TEXTS = [
  'The iPhone 15 Pro Max is one of the best smartphones available. It features a powerful A17 Pro chip and excellent camera system.',
  'I recommend using Notion for productivity and ChatGPT for AI assistance. Both tools work great together.',
  'Sony WH-1000XM5 and Samsung Galaxy Buds are both excellent noise-canceling headphones.',
]

const DEMO_ENHANCEMENTS: EntityLinkEnhancements = {
  entities: [
    {
      text: 'iPhone 15 Pro Max',
      type: 'product',
      startPosition: 4,
      endPosition: 20,
      confidence: 0.95,
      category: 'smartphones',
      brand: 'Apple',
      affiliateUrl: 'https://example.com/iphone-15-pro-max',
      trackingId: 'demo_iphone',
    },
    {
      text: 'Notion',
      type: 'product',
      startPosition: 18,
      endPosition: 24,
      confidence: 0.92,
      category: 'productivity',
      affiliateUrl: 'https://example.com/notion',
      trackingId: 'demo_notion',
    },
    {
      text: 'ChatGPT',
      type: 'product',
      startPosition: 41,
      endPosition: 48,
      confidence: 0.90,
      category: 'ai',
      affiliateUrl: 'https://example.com/chatgpt',
      trackingId: 'demo_chatgpt',
    },
  ],
  replacements: [],
  maxLinks: 3,
  minConfidence: 0.85,
  badgeStyle: 'subtle',
  overlapStrategy: 'longest',
}

export function EntityLinkDemo() {
  const [selectedTextIndex, setSelectedTextIndex] = useState(0)
  const [badgeStyle, setBadgeStyle] = useState<'subtle' | 'hover' | 'explicit' | 'none'>('subtle')
  const [overlapStrategy, setOverlapStrategy] = useState<'longest' | 'first' | 'all'>('longest')
  const [maxLinks, setMaxLinks] = useState(3)

  const currentText = DEMO_TEXTS[selectedTextIndex]
  const enhancements: EntityLinkEnhancements = {
    ...DEMO_ENHANCEMENTS,
    badgeStyle,
    overlapStrategy,
    maxLinks,
  }

  return (
    <Stack gap="md" p="xl">
      <Text size="xl" fw={500}>
        Entity Link Demo
      </Text>

      <Card withBorder padding="md" shadow="sm">
        <Stack gap="sm">
          <Group gap="sm">
            <Badge color="blue">Badge Style: {badgeStyle}</Badge>
            <Badge color="green">Overlap: {overlapStrategy}</Badge>
            <Badge color="orange">Max Links: {maxLinks}</Badge>
          </Group>

          <Text size="sm" c="dimmed">
            Original Text:
          </Text>
          <Text size="sm" style={{ fontFamily: 'monospace', background: '#f5f5f5', padding: '8px' }}>
            {currentText}
          </Text>

          <Text size="sm" c="dimmed">
            Enhanced Output:
          </Text>
          <div style={{
            border: '1px solid #e0e0e0',
            borderRadius: '4px',
            padding: '12px',
            background: '#fafafa'
          }}>
            <EnhancedContent
              content={currentText}
              enhancements={enhancements}
              enabled={true}
              onEntityClick={(entity, url) => {
                console.log('[Demo] Entity clicked:', entity, url)
                alert(`Clicked entity: ${entity}\nURL: ${url}`)
              }}
            />
          </div>
        </Stack>
      </Card>

      <Card withBorder padding="md">
        <Stack gap="sm">
          <Text size="sm" fw={500}>Controls</Text>

          <Select
            label="Select Demo Text"
            data={[
              { value: '0', label: 'iPhone Demo' },
              { value: '1', label: 'Notion & ChatGPT Demo' },
              { value: '2', label: 'Sony & Samsung Demo' },
            ]}
            value={selectedTextIndex.toString()}
            onChange={(value) => setSelectedTextIndex(parseInt(value || '0'))}
          />

          <Select
            label="Badge Style"
            data={[
              { value: 'subtle', label: 'Subtle (dotted underline)' },
              { value: 'hover', label: 'Hover (show on hover)' },
              { value: 'explicit', label: 'Explicit (ad badge)' },
              { value: 'none', label: 'None (plain link)' },
            ]}
            value={badgeStyle}
            onChange={(value) => setBadgeStyle(value as any)}
          />

          <Select
            label="Overlap Strategy"
            data={[
              { value: 'longest', label: 'Longest (prioritize long entities)' },
              { value: 'first', label: 'First (prioritize first found)' },
              { value: 'all', label: 'All (allow overlaps)' },
            ]}
            value={overlapStrategy}
            onChange={(value) => setOverlapStrategy(value as any)}
          />

          <Group gap="sm">
            <Button
              size="xs"
              variant={maxLinks === 1 ? 'filled' : 'light'}
              onClick={() => setMaxLinks(1)}
            >
              1 Link
            </Button>
            <Button
              size="xs"
              variant={maxLinks === 3 ? 'filled' : 'light'}
              onClick={() => setMaxLinks(3)}
            >
              3 Links
            </Button>
            <Button
              size="xs"
              variant={maxLinks === 5 ? 'filled' : 'light'}
              onClick={() => setMaxLinks(5)}
            >
              5 Links
            </Button>
          </Group>
        </Stack>
      </Card>

      <Card withBorder padding="md" bg="gray.0">
        <Stack gap="xs">
          <Text size="sm" fw={500}>How it works:</Text>
          <Text size="xs">
            1. Select a demo text from the dropdown
          </Text>
          <Text size="xs">
            2. Choose badge style to change visual appearance
          </Text>
          <Text size="xs">
            3. Adjust overlap strategy for entity conflicts
          </Text>
          <Text size="xs">
            4. Click on any entity link to see the click handler
          </Text>
        </Stack>
      </Card>
    </Stack>
  )
}

export default EntityLinkDemo
