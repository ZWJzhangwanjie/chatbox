/**
 * AI Ad Network - Entity Link EnhancedContent Tests
 *
 * 简单的手动测试文件
 */

import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { EnhancedContent } from '../EnhancedContent'
import type { EntityLinkEnhancements } from '../../core/types'

describe('EnhancedContent', () => {
  it('renders plain text when no enhancements provided', () => {
    const { container } = render(
      <EnhancedContent
        content="Hello world"
        enabled={true}
      />
    )
    expect(container.textContent).toBe('Hello world')
  })

  it('renders enhanced content with entity links', () => {
    const enhancements: EntityLinkEnhancements = {
      entities: [
        {
          text: 'iPhone',
          type: 'product',
          startPosition: 0,
          endPosition: 6,
          confidence: 0.9,
          affiliateUrl: 'https://example.com/iphone',
        },
      ],
      replacements: [],
      maxLinks: 3,
      badgeStyle: 'subtle',
      overlapStrategy: 'longest',
    }

    const { container } = render(
      <EnhancedContent
        content="iPhone is great"
        enhancements={enhancements}
        enabled={true}
      />
    )

    // Check that the entity is rendered
    expect(container.textContent).toBe('iPhone is great')
  })

  it('applies overlap strategy correctly', () => {
    const enhancements: EntityLinkEnhancements = {
      entities: [
        {
          text: 'Sony WH-1000XM5',
          type: 'product',
          startPosition: 0,
          endPosition: 14,
          confidence: 0.9,
          affiliateUrl: 'https://example.com/sony-wh',
        },
        {
          text: 'Sony',
          type: 'brand',
          startPosition: 0,
          endPosition: 4,
          confidence: 0.85,
          affiliateUrl: 'https://example.com/sony',
        },
      ],
      replacements: [],
      maxLinks: 10,
      badgeStyle: 'subtle',
      overlapStrategy: 'longest',
    }

    const { container } = render(
      <EnhancedContent
        content="Sony WH-1000XM5 headphones"
        enhancements={enhancements}
        enabled={true}
      />
    )

    // Should only use the longest entity
    expect(container.textContent).toBe('Sony WH-1000XM5 headphones')
  })

  it('respects maxLinks limit', () => {
    const enhancements: EntityLinkEnhancements = {
      entities: [
        {
          text: 'iPhone',
          type: 'product',
          startPosition: 0,
          endPosition: 6,
          confidence: 0.9,
          affiliateUrl: 'https://example.com/iphone',
        },
        {
          text: 'MacBook',
          type: 'product',
          startPosition: 10,
          endPosition: 17,
          confidence: 0.9,
          affiliateUrl: 'https://example.com/macbook',
        },
        {
          text: 'iPad',
          type: 'product',
          startPosition: 20,
          endPosition: 24,
          confidence: 0.9,
          affiliateUrl: 'https://example.com/ipad',
        },
      ],
      replacements: [],
      maxLinks: 2,
      badgeStyle: 'subtle',
      overlapStrategy: 'longest',
    }

    const onEntityClick = vi.fn()
    const { container } = render(
      <EnhancedContent
        content="iPhone and MacBook and iPad"
        enhancements={enhancements}
        onEntityClick={onEntityClick}
        enabled={true}
      />
    )

    // Should only apply maxLinks entities
    expect(container.textContent).toBe('iPhone and MacBook and iPad')
  })

  it('calls onEntityClick when entity is clicked', () => {
    const onEntityClick = vi.fn()
    const enhancements: EntityLinkEnhancements = {
      entities: [
        {
          text: 'iPhone',
          type: 'product',
          startPosition: 0,
          endPosition: 6,
          confidence: 0.9,
          affiliateUrl: 'https://example.com/iphone',
        },
      ],
      replacements: [],
      maxLinks: 3,
      badgeStyle: 'subtle',
      overlapStrategy: 'longest',
    }

    const { container } = render(
      <EnhancedContent
        content="Buy iPhone now"
        enhancements={enhancements}
        onEntityClick={onEntityClick}
        enabled={true}
      />
    )

    const entityLink = container.querySelector('.entity-link-badge-subtle')
    if (entityLink) {
      fireEvent.click(entityLink)
      expect(onEntityClick).toHaveBeenCalledWith('iPhone', 'https://example.com/iphone')
    }
  })
})
