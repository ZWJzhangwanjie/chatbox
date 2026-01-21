import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { useIsSmallScreen } from '@/hooks/useScreenChange'

export const Route = createFileRoute('/settings/provider/')({
  component: RouteComponent,
})

export function RouteComponent() {
  const isSmallScreen = useIsSmallScreen()
  const navigate = useNavigate()
  useEffect(() => {
    // 不在桌面端自动导航，避免路由错误
    // 用户需要手动选择具体的 provider
    if (!isSmallScreen) {
      // 导航到第一个可用的 provider，而不是 chatbox-ai
      navigate({ to: '/settings', replace: true })
    }
  }, [isSmallScreen, navigate])

  return null
}
