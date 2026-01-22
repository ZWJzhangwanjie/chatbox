import { Box, Text, Title } from '@mantine/core'
import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

export const Route = createFileRoute('/settings/provider/')({
  component: RouteComponent,
})

export function RouteComponent() {
  const { t } = useTranslation()

  return (
    <Box p="md" display="flex" style={{ justifyContent: 'center', alignItems: 'center', height: '100%' }}>
      <Text c="dimmed" size="lg">
        {t('Please select a provider from the list')}
      </Text>
    </Box>
  )
}
