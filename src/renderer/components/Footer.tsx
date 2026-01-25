/**
 * Footer 组件 - 显示底部 Static 广告
 *
 * 当 static 广告配置的 placement 为 'footer' 时显示
 */

import { Box } from '@mantine/core'
import { useMemo } from 'react'
import type { Session } from '../../shared/types'
// AI Ad Network - 广告集成
import { useIsFormatEnabled, useIsAdEnabled, useFormatConfig } from '../packages/ads/hooks/useAdConfig'
import { useAds } from '../packages/ads/hooks/useAds'
import { StaticSlot } from '../packages/ads/components/AdSlot'
import type { AdTriggerContext } from '../packages/ads/core/types'

interface FooterProps {
  session: Session
}

export default function Footer(props: FooterProps) {
  const { session: currentSession } = props

  // AI Ad Network - 检查 Static 广告是否启用
  // ⚠️ 重要：先检查配置，避免不必要的广告请求
  const isAdEnabled = useIsAdEnabled()
  const isStaticAdEnabled = useIsFormatEnabled('static')
  const staticConfig = useFormatConfig('static')

  // 早期返回：如果不需要显示 footer 广告，不调用 useAds，避免发送请求
  if (!isAdEnabled || !isStaticAdEnabled || staticConfig.placement !== 'footer') {
    return null
  }

  // AI Ad Network - 为 Footer 创建一个简单的 context
  // 只有确认需要显示时才创建 context 和调用 useAds
  const footerAdContext = useMemo<AdTriggerContext>(() => ({
    currentMessage: {
      query: 'footer',
      response: 'global',
      timestamp: Date.now(),
      model: 'default',
      provider: 'chatbox',
      isStreaming: false,
    },
    conversationContext: {
      sessionId: currentSession.id,
      messageCount: currentSession.messages.length,
      messages: currentSession.messages.slice(-3).map(m => ({ role: m.role, content: m.content })),
    },
  }), [currentSession.id, currentSession.messages])

  // 只请求 static 格式的广告
  const { getAdsBySlot, getSlot } = useAds(footerAdContext, {
    formats: ['static'],
  })

  return (
    <Box data-placement="footer" py="xs">
      <StaticSlot
        format="static"
        placement="footer"
        slotId="slot-static-footer"
        getAdsBySlot={typeof getAdsBySlot === 'function' ? getAdsBySlot : () => []}
        getSlot={typeof getSlot === 'function' ? getSlot : () => undefined}
      />
    </Box>
  )
}
