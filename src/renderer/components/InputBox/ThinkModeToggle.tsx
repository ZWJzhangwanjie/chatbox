import { ActionIcon, Tooltip, Stack, Flex } from '@mantine/core'
import { ScalableIcon } from '../ScalableIcon'
import { useTranslation } from 'react-i18next'
import { IconBrain } from '@tabler/icons-react'
import { useAIFeaturesStore } from '@/stores/aiFeaturesStore'
import { Keys } from '../Shortcut'
import { useSettingsStore } from '@/stores/settingsStore'
import * as dom from '../../hooks/dom'

interface ThinkModeToggleProps {
  active?: boolean
  onClick?: () => void
  isMobile?: boolean
}

export default function ThinkModeToggle({ active, onClick, isMobile }: ThinkModeToggleProps) {
  const { t } = useTranslation()
  const shortcuts = useSettingsStore((state) => state.shortcuts)
  const { thinkModeEnabled, toggleThinkMode } = useAIFeaturesStore()

  const isActive = active ?? thinkModeEnabled

  const handleClick = () => {
    if (onClick) {
      onClick()
    } else {
      toggleThinkMode()
    }

    dom.focusMessageInput()
  }

  if (isMobile) {
    return (
      <ActionIcon
        size="input-sm"
        variant={isActive ? 'filled' : 'subtle'}
        color={isActive ? 'chatbox-accent' : 'chatbox-secondary'}
        onClick={handleClick}
      >
        <ScalableIcon icon={IconBrain} size={20} />
      </ActionIcon>
    )
  }

  return (
    <Tooltip
      label={
        <Stack align="center" gap="xxs" pb="xxs">
          <div className="whitespace-nowrap">{t('Think Mode')}</div>
          <div className="text-xs text-chatbox-tertiary">
            {isActive ? t('Enabled') : t('Disabled')}
          </div>
        </Stack>
      }
      withArrow
      position="top"
    >
      <ActionIcon
        size={24}
        variant={isActive ? 'light' : 'subtle'}
        color={isActive ? 'chatbox-accent' : 'chatbox-secondary'}
        onClick={handleClick}
        className={isActive ? 'think-mode-toggle-active' : ''}
      >
        <ScalableIcon icon={IconBrain} size={22} strokeWidth={isActive ? 2.5 : 1.8} />
      </ActionIcon>
    </Tooltip>
  )
}
