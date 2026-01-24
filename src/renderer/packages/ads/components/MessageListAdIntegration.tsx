/**
 * AI Ad Network - MessageList 组件广告集成
 *
 * 工程师C - UI与集成专家
 *
 * 此文件包含在 MessageList 组件中展示广告的逻辑：
 * - ActionCard 广告：在消息间插入卡片广告
 * - 根据频率控制自动决定插入位置
 */

import { Box, Stack } from '@mantine/core'
import { memo, useMemo } from 'react'
import { useAdTrigger } from '../hooks/useAdTrigger'
import { useIsFormatEnabled, useIsAdEnabled, useAdConfig } from '../hooks/useAdConfig'
import { useMemoryForAds } from '../hooks/useMemoryForAds'
import { ActionCardSlot } from './AdSlot'
import type { Message } from '../../../shared/types'
import type { AdTriggerContext } from '../core/types'
import { getMessageText } from '../../../../shared/utils/message'

// ============================================================================
// 类型定义
// ============================================================================

interface MessageListAdIntegrationProps {
  /** 消息列表 */
  messages: Message[]
  /** 会话ID */
  sessionId: string
  /** 当前消息索引 */
  messageIndex: number
  /** 所有格式的广告数据（来自统一的 useAds hook） */
  allAds?: import('../core/types').Ad[]
  /** 子节点（消息内容） */
  children: React.ReactNode
}

// ============================================================================
// ActionCard 广告组件（插入在消息间）
// ============================================================================

/**
 * MessageListActionCardAd
 *
 * 在消息列表中插入的 ActionCard 广告
 * 根据频率控制自动决定是否显示
 */
export const MessageListActionCardAd = memo<MessageListAdIntegrationProps>(
  ({ messages, sessionId, messageIndex, allAds, children }) => {
    // 所有 Hooks 必须在组件顶层调用，顺序必须一致
    const isAdEnabled = useIsAdEnabled()
    const isActionCardEnabled = useIsFormatEnabled('actionCard')
    const config = useAdConfig()  // 必须在这里调用，不能在后面的渲染中调用
    const { shouldTrigger } = useAdTrigger()
    const { userData } = useMemoryForAds()

    // 构建触发上下文（用于向后兼容，当没有 allAds 时使用）
    const triggerContext = useMemo<AdTriggerContext>(() => {
      const currentMessage = messages[messageIndex]

      // 找到当前消息之前的用户消息
      let userQuery = ''
      for (let i = messageIndex - 1; i >= 0; i--) {
        const msg = messages[i]
        if (msg?.role === 'user') {
          userQuery = getMessageText(msg) || ''
          break
        }
      }

      const responseText = currentMessage?.role === 'assistant'
        ? getMessageText(currentMessage) || ''
        : ''

      // 构建对话历史消息数组（用于高级数据收集）
      // 取最近的消息（最多由配置的 contextWindow 决定）
      const recentMessages = messages.slice(0, messageIndex + 1).map(msg => ({
        role: msg.role,
        content: getMessageText(msg) || '',
      }))

      return {
        currentMessage: {
          query: userQuery,
          response: responseText,
          timestamp: currentMessage?.createdAt || Date.now(),
          model: currentMessage?.model || 'unknown',
          provider: currentMessage?.model?.split('/')?.[0] || 'chatbox',
          isStreaming: currentMessage?.generating || false,
        },
        conversationContext: {
          sessionId: sessionId,
          messageCount: messages.length,
          messages: recentMessages,  // 添加对话历史
        },
        userData: userData || undefined,  // 添加用户记忆数据
      }
    }, [messages, messageIndex, sessionId, userData])

    // 从 allAds 中过滤出 action_card 格式的广告
    // 支持多种格式名称的映射（API 返回的命名可能不同）
    const actionCardAds = allAds ? allAds.filter(ad => ad.type === 'action_card' || ad.type === 'actionCard') : []

    // 渲染追踪日志
    console.log('[=====MSG_LIST_AD_RENDER=====]', {
      messageIndex,
      messageRole: messages[messageIndex]?.role,
      isGenerating: messages[messageIndex]?.generating,
      isAdEnabled,
      isActionCardEnabled,
      totalAds: allAds?.length || 0,
      actionCardAdsCount: actionCardAds.length,
    })

    // 判断是否应该触发广告
    const shouldShow = useMemo(() => {
      console.log('[🎯 Checking shouldShow]', {
        messageIndex,
        role: messages[messageIndex]?.role,
        isAdEnabled,
        isActionCardEnabled,
      })

      if (!isAdEnabled || !isActionCardEnabled) {
        console.log('[❌ shouldShow = false]', 'Ads or ActionCard disabled')
        return false
      }

      // 只在助手消息后显示
      const currentMessage = messages[messageIndex]
      if (!currentMessage || currentMessage.role !== 'assistant') {
        console.log('[❌ shouldShow = false]', 'Not assistant message or no message')
        return false
      }

      // 不在正在生成的消息后显示
      if (currentMessage.generating) {
        console.log('[❌ shouldShow = false]', 'Message is still generating')
        return false
      }

      // 先检查是否有 action_card 格式的广告数据
      // 支持多种格式名称的映射（API 返回的命名可能不同）
      const hasActionCardAd = allAds && allAds.some(ad => ad.type === 'action_card' || ad.type === 'actionCard')
      if (!hasActionCardAd) {
        console.log('[❌ shouldShow = false]', 'No action_card ads in allAds')
        return false
      }

      // 有广告数据，再用频率控制器判断是否应该展示
      console.log('[✅ Has action_card ads, checking frequency control...]')
      const check = shouldTrigger(triggerContext)
      console.log('[🎯 shouldTrigger result]:', check)
      return check.shouldTrigger
    }, [isAdEnabled, isActionCardEnabled, messages, messageIndex, allAds, shouldTrigger, triggerContext])

    console.log('[=====MSG_LIST_AD_SHOULD_SHOW=====]', { messageIndex, shouldShow, actionCardAdsCount: actionCardAds.length })

    // 渲染
    return (
      <>
        {children}
        {shouldShow && (
          <Box mb="md" mt="md" className="message-list-ad-container">
            <ActionCardSlot
              format="action_card"
              placement="between_messages"
              showDebug={config.debug}
              allAds={allAds}  // 传递 allAds，ActionCardSlot 会自动过滤
            />
          </Box>
        )}
      </>
    )
  }
)

MessageListActionCardAd.displayName = 'MessageListActionCardAd'

// ============================================================================
// 广告插入位置计算辅助函数
// ============================================================================

/**
 * 计算在消息列表中应该插入广告的位置
 * 根据配置的频率（每N条消息）返回应该插入广告的索引数组
 *
 * @param messageCount - 消息总数
 * @param frequency - 频率（每N条消息插入一次）
 * @param maxPerSession - 每会话最多插入次数
 * @returns 应该插入广告的消息索引数组
 *
 * @example
 * const positions = calculateAdInsertPositions(20, 5, 3);
 * // 返回 [4, 9, 14] - 在第5、10、15条消息后插入广告
 */
export function calculateAdInsertPositions(
  messageCount: number,
  frequency: number,
  maxPerSession: number
): number[] {
  const positions: number[] = []

  // 从第1条消息开始计数
  for (let i = 1; i <= messageCount; i++) {
    // 检查是否到达频率
    if (i % frequency === 0) {
      // 检查是否超过最大次数
      if (positions.length < maxPerSession) {
        positions.push(i)
      } else {
        break
      }
    }
  }

  return positions
}

/**
 * 检查指定位置是否应该插入广告
 *
 * @param messageIndex - 消息索引
 * @param insertPositions - 计算得出的插入位置数组
 * @returns 是否应该在此位置插入广告
 */
export function shouldInsertAdAtPosition(
  messageIndex: number,
  insertPositions: number[]
): boolean {
  return insertPositions.includes(messageIndex)
}

// ============================================================================
// 带 ActionCard 广告的消息列表包装器
// ============================================================================

interface MessageListWithAdsProps {
  messages: Message[]
  sessionId: string
  renderMessage: (msg: Message, index: number) => React.ReactNode
}

/**
 * MessageListWithAds
 *
 * 自动在适当位置插入广告的消息列表组件
 * 使用方法与普通列表类似，但会自动处理广告插入
 */
export const MessageListWithAds = memo<MessageListWithAdsProps>(
  ({ messages, sessionId, renderMessage }) => {
    return (
      <Stack gap="sm">
        {messages.map((msg, index) => (
          <MessageListActionCardAd
            key={msg.id}
            messages={messages}
            sessionId={sessionId}
            messageIndex={index}
          >
            {renderMessage(msg, index)}
          </MessageListActionCardAd>
        ))}
      </Stack>
    )
  }
)

MessageListWithAds.displayName = 'MessageListWithAds'

// ============================================================================
// 导出
// ============================================================================

export default {
  MessageListActionCardAd,
  calculateAdInsertPositions,
  shouldInsertAdAtPosition,
  MessageListWithAds,
}
