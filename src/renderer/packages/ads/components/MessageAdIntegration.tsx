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
import { useIsAdEnabled, useIsFormatEnabled, useAdConfig } from '../hooks/useAdConfig'
import { useMemoryForAds } from '../hooks/useMemoryForAds'
import { SuffixSlot, SponsoredSourceSlot } from './AdSlot'
import type { Message } from '../../../../shared/types'
import type { AdTriggerContext } from '../core/types'
import { getMessageText } from '../../../../shared/utils/message'

// ============================================================================
// 导出类型（供 Message.tsx 使用）
// ============================================================================

export interface AdIntegrationData {
  ads?: import('../core/types').Ad[]
  slots?: import('../core/types').SlotResponse[]
  getAdsBySlot?: (slotId: string) => import('../core/types').Ad[]
  getSlot?: (slotId: string) => import('../core/types').SlotResponse | undefined
}

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
  /** 广告集成数据（包含 slots 和便捷方法） */
  adData?: AdIntegrationData
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
export const MessageSuffixAd = memo<MessageAdIntegrationProps>(({ msg, sessionId, userQuery = '', adData }) => {
  // 所有 Hooks 必须在组件顶层调用，顺序必须一致
  const isAdEnabled = useIsAdEnabled()
  const isSuffixEnabled = useIsFormatEnabled('suffix')
  const config = useAdConfig()  // 必须在这里调用，不能在后面的渲染中调用
  const { userData } = useMemoryForAds()

  // 从 adData 中解构出便捷方法（用于 slot-based 访问）
  const getAdsBySlot = adData?.getAdsBySlot
  const getSlot = adData?.getSlot

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
    return (
      isAdEnabled &&
      isSuffixEnabled &&
      msg.role === 'assistant' &&
      !msg.generating &&
      (msg.contentParts?.length > 0 || msg.text)
    )
  }, [isAdEnabled, isSuffixEnabled, msg.role, msg.generating, msg.contentParts, msg.text])

  if (!shouldShow) {
    return null
  }

  return (
    <Box mt="md">
      <SuffixSlot
        format="suffix"
        placement="after_response"
        showDebug={config.debug}
        context={adContext}
        slotId="slot-suffix"
        getAdsBySlot={getAdsBySlot}
        getSlot={getSlot}
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
}>(({ msg, sessionId, sourceCount, adPosition = 1, adData }) => {
  // 从 adData 中解构出便捷方法（用于 slot-based 访问）
  const getAdsBySlot = adData?.getAdsBySlot
  const getSlot = adData?.getSlot
  const isAdEnabled = useIsAdEnabled()
  const isSourceEnabled = useIsFormatEnabled('source')
  const config = useAdConfig()

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
        showDebug={config.debug}
        slotId="slot-source"
        getAdsBySlot={getAdsBySlot}
        getSlot={getSlot}
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
