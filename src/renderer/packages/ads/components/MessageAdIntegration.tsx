/**
 * AI Ad Network - Message 组件广告集成
 *
 * 工程师C - UI与集成专家
 *
 * 此文件包含在 Message 组件中展示广告的逻辑：
 * - Suffix 广告：在助手消息末尾显示
 * - SponsoredSource 广告：在来源列表中混合显示
 */

import { Box, Stack } from '@mantine/core'
import { memo, useMemo } from 'react'
import { useIsAdEnabled, useIsFormatEnabled } from '../hooks/useAdConfig'
import { useMemoryForAds } from '../hooks/useMemoryForAds'
import { SuffixSlot, SponsoredSourceSlot } from './AdSlot'
import type { Message } from '../../../../shared/types'
import type { AdTriggerContext } from '../core/types'
import { getMessageText } from '../../../../shared/utils/message'

// ============================================================================
// 类型定义
// ============================================================================

interface MessageAdIntegrationProps {
  /** 消息对象 */
  msg: Message
  /** 会话ID */
  sessionId: string
  /** 用户查询文本（可选，用于构建广告上下文） */
  userQuery?: string
  /** 所有格式的广告数据（来自统一的 useAds hook） */
  allAds?: Ad[]
}

// ============================================================================
// Suffix 广告组件
// ============================================================================

/**
 * MessageSuffixAd
 *
 * 在助手消息末尾显示的 Suffix 广告
 * 只在以下条件下显示：
 * 1. 广告系统已启用
 * 2. Suffix 格式已启用
 * 3. 消息已完成生成（generating = false）
 * 4. 消息来自助手（role = 'assistant'）
 * 5. 消息有实际内容
 */
export const MessageSuffixAd = memo<MessageAdIntegrationProps>(({ msg, sessionId, userQuery = '', allAds }) => {
  const isAdEnabled = useIsAdEnabled()
  const isSuffixEnabled = useIsFormatEnabled('suffix')
  const { userData } = useMemoryForAds()

  // 调试日志：检查配置状态
  console.log('[🔍 MessageSuffixAd CHECK]', {
    msgRole: msg.role,
    msgGenerating: msg.generating,
    hasText: !!msg.text,
    hasContentParts: (msg.contentParts?.length || 0) > 0,
    userQuery: userQuery?.substring(0, 50),
    isAdEnabled,
    isSuffixEnabled,
    hasAllAds: !!allAds,
    suffixAdsCount: allAds ? allAds.filter(ad => ad.type === 'suffix').length : 0,
  })

  // 使用 getMessageText 提取消息内容（从 contentParts 或 text 字段）
  const responseText = getMessageText(msg)

  // 构建广告上下文（必须在条件判断之前，遵循 Hooks 规则）
  const adContext = useMemo<AdTriggerContext>(() => ({
    currentMessage: {
      query: userQuery,  // 用户的问题
      response: responseText,  // 助手的回复（使用 getMessageText 提取）
      timestamp: msg.createdAt || Date.now(),
      model: msg.model || 'unknown',
      provider: msg.model?.split('/')?.[0] || 'chatbox',
      isStreaming: msg.generating || false,
    },
    conversationContext: {
      sessionId: sessionId,
      messageCount: 1,
      // 单个消息的上下文，至少包含当前消息
      messages: [
        userQuery ? { role: 'user', content: userQuery } : { role: 'assistant', content: responseText },
      ],
    },
    userData: userData || undefined,  // 添加用户记忆数据
  }), [msg, sessionId, userQuery, responseText, userData])

  // 判断是否应该显示广告
  const shouldShow = useMemo(() => {
    const result = (
      isAdEnabled &&
      isSuffixEnabled &&
      msg.role === 'assistant' &&
      !msg.generating &&
      (msg.contentParts?.length > 0 || msg.text)
    )
    console.log('[✅ MessageSuffixAd shouldShow]', {
      result,
      checks: {
        isAdEnabled,
        isSuffixEnabled,
        isAssistant: msg.role === 'assistant',
        notGenerating: !msg.generating,
        hasContent: (msg.contentParts?.length || 0) > 0 || msg.text,
      },
    })
    return result
  }, [isAdEnabled, isSuffixEnabled, msg.role, msg.generating, msg.contentParts, msg.text])

  if (!shouldShow) {
    return null
  }

  console.log('[🎨 MessageSuffixAd RENDERING SuffixSlot]')

  return (
    <Box mt="md">
      <SuffixSlot
        format="suffix"
        placement="after_response"
        showDebug={true}  // 启用调试以查看更多信息
        context={adContext}
        allAds={allAds}  // 传递 allAds，SuffixSlot 会自动过滤
      />
    </Box>
  )
})

MessageSuffixAd.displayName = 'MessageSuffixAd'

// ============================================================================
// SponsoredSource 广告组件
// ============================================================================

/**
 * MessageSponsoredSourceAd
 *
 * 在来源列表中混合显示的赞助来源广告
 * 只在以下条件下显示：
 * 1. 广告系统已启用
 * 2. SponsoredSource 格式已启用
 * 3. 有正常的来源列表
 */
export const MessageSponsoredSourceAd = memo<MessageAdIntegrationProps & {
  /** 原始来源数量 */
  sourceCount: number
  /** 广告插入位置 */
  adPosition?: number
}>(({ msg, sessionId, sourceCount, adPosition = 1 }) => {
  const isAdEnabled = useIsAdEnabled()
  const isSourceEnabled = useIsFormatEnabled('source')

  // 判断是否应该显示广告
  const shouldShow = useMemo(() => {
    return (
      isAdEnabled &&
      isSourceEnabled &&
      sourceCount > 0 &&
      msg.role === 'assistant' &&
      !msg.generating
    )
  }, [isAdEnabled, isSourceEnabled, sourceCount, msg.role, msg.generating])

  if (!shouldShow) {
    return null
  }

  return (
    <Box>
      <SponsoredSourceSlot
        format="source"
        placement="inline"
        showDebug={false}
      />
    </Box>
  )
})

MessageSponsoredSourceAd.displayName = 'MessageSponsoredSourceAd'

// ============================================================================
// 广告位置计算辅助函数
// ============================================================================

/**
 * 计算广告在来源列表中的插入位置
 * 根据配置中的 mixPosition 和当前来源数量决定
 */
export function calculateAdInsertPosition(
  sourceCount: number,
  configuredPosition: number
): number | null {
  if (sourceCount === 0) {
    return null
  }

  // 如果配置为 -1，表示随机位置
  if (configuredPosition === -1) {
    return Math.floor(Math.random() * sourceCount)
  }

  // 确保位置在有效范围内
  return Math.min(configuredPosition, sourceCount)
}

// ============================================================================
// 导出
// ============================================================================

export default {
  MessageSuffixAd,
  MessageSponsoredSourceAd,
  calculateAdInsertPosition,
}
