import NiceModal from '@ebay/nice-modal-react'
import { ActionIcon, Box, Flex, Title, Tooltip } from '@mantine/core'
import { IconLayoutSidebarLeftExpand, IconMenu2, IconPencil } from '@tabler/icons-react'
import clsx from 'clsx'
import { useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { scheduleGenerateNameAndThreadName, scheduleGenerateThreadName } from '@/stores/sessionActions'
import { useUIStore } from '@/stores/uiStore'
import type { Session } from '../../shared/types'
import useNeedRoomForWinControls from '../hooks/useNeedRoomForWinControls'
import { useIsSmallScreen } from '../hooks/useScreenChange'
import * as settingActions from '../stores/settingActions'
import { ScalableIcon } from './ScalableIcon'
import Toolbar from './Toolbar'
import WindowControls from './WindowControls'
// AI Ad Network - 广告集成
import { useIsFormatEnabled, useIsAdEnabled, useFormatConfig } from '../packages/ads/hooks/useAdConfig'
import { useAds } from '../packages/ads/hooks/useAds'
import { StaticSlot } from '../packages/ads/components/AdSlot'
import type { AdTriggerContext } from '../packages/ads/core/types'

// ============================================================================
// Header Static Ad 子组件
// 只有当 placement === 'header' 时才会被渲染，避免不必要的广告请求
// ============================================================================
function HeaderStaticAd({ session }: { session: Session }) {
  const headerAdContext = useMemo<AdTriggerContext>(() => ({
    currentMessage: {
      query: 'header',
      response: 'global',
      timestamp: Date.now(),
      model: 'default',
      provider: 'chatbox',
      isStreaming: false,
    },
    conversationContext: {
      sessionId: session.id,
      messageCount: session.messages.length,
      messages: session.messages.slice(0, 3).map(m => ({ role: m.role, content: m.content })),
    },
  }), [session.id, session.messages])

  // 只请求 static 格式的广告
  const { getAdsBySlot, getSlot } = useAds(headerAdContext, {
    formats: ['static'],
  })

  return (
    <Box data-placement="header">
      <StaticSlot
        format="static"
        placement="header"
        slotId="slot-static-header"
        getAdsBySlot={typeof getAdsBySlot === 'function' ? getAdsBySlot : () => []}
        getSlot={typeof getSlot === 'function' ? getSlot : () => undefined}
      />
    </Box>
  )
}

export default function Header(props: { session: Session }) {
  const { t } = useTranslation()
  const showSidebar = useUIStore((s) => s.showSidebar)
  const setShowSidebar = useUIStore((s) => s.setShowSidebar)

  const isSmallScreen = useIsSmallScreen()
  const { needRoomForMacWindowControls } = useNeedRoomForWinControls()

  const { session: currentSession } = props

  // AI Ad Network - 检查 Static 广告配置
  // ⚠️ 只检查条件，不调用 useAds，避免不必要的请求
  const isAdEnabled = useIsAdEnabled()
  const isStaticAdEnabled = useIsFormatEnabled('static')
  const staticConfig = useFormatConfig('static')

  const shouldShowHeaderAd = isAdEnabled && isStaticAdEnabled && staticConfig.placement === 'header' && !isSmallScreen

  // 会话名称自动生成
  useEffect(() => {
    const autoGenerateTitle = settingActions.getAutoGenerateTitle()
    if (!autoGenerateTitle) {
      return
    }

    // 检查是否有正在生成的消息
    const hasGeneratingMessage = currentSession.messages.some((msg) => msg.generating)

    // 如果有消息正在生成，或者消息数量少于2条，不触发名称生成
    if (hasGeneratingMessage || currentSession.messages.length < 2) {
      return
    }

    // 触发名称生成（在 sessionActions 中进行去重和延迟处理）
    if (currentSession.name === 'Untitled') {
      scheduleGenerateNameAndThreadName(currentSession.id)
    } else if (!currentSession.threadName) {
      scheduleGenerateThreadName(currentSession.id)
    }
  }, [currentSession])

  const editCurrentSession = () => {
    if (!currentSession) {
      return
    }
    NiceModal.show('session-settings', { session: currentSession })
  }

  return (
    <>
      <Flex
        h={54}
        align="center"
        px="sm"
        className={clsx('flex-none title-bar border-0 border-b border-solid border-chatbox-border-primary')}
      >
        {(!showSidebar || isSmallScreen) && (
          <Flex align="center" className={needRoomForMacWindowControls ? 'pl-20' : ''}>
            <ActionIcon
              className="controls"
              variant="subtle"
              size={isSmallScreen ? 24 : 20}
              color={isSmallScreen ? 'chatbox-secondary' : 'chatbox-tertiary'}
              mr="sm"
              onClick={() => setShowSidebar(!showSidebar)}
            >
              {isSmallScreen ? <IconMenu2 /> : <IconLayoutSidebarLeftExpand />}
            </ActionIcon>
          </Flex>
        )}

        <Flex align="center" gap={'xxs'} flex={1} {...(isSmallScreen ? { justify: 'center', pl: 28, pr: 8 } : {})}>
          <Title order={4} fz={!isSmallScreen ? 20 : undefined} lineClamp={1}>
            {currentSession?.name}
          </Title>

          <Tooltip label={t('Customize settings for the current conversation')}>
            <ActionIcon
              className="controls"
              variant="subtle"
              color="chatbox-tertiary"
              size={20}
              onClick={() => {
                editCurrentSession()
              }}
            >
              <ScalableIcon icon={IconPencil} size={20} />
            </ActionIcon>
          </Tooltip>
        </Flex>

        <Toolbar sessionId={currentSession.id} />

        <WindowControls className="-mr-3 ml-2" />
      </Flex>

      {/* AI Ad Network - Static 广告 (在 Header 下方) */}
      {/* 使用子组件，只在需要显示时才渲染，避免不必要的广告请求 */}
      {shouldShowHeaderAd && <HeaderStaticAd session={currentSession} />}
    </>
  )
}
