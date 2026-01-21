import {
  Divider,
  Flex,
  NumberInput,
  Select,
  Stack,
  Switch,
  Text,
  Title,
  Tooltip,
} from '@mantine/core'
import { IconInfoCircle } from '@tabler/icons-react'
import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { useAIFeaturesStore } from '@/stores/aiFeaturesStore'

export const Route = createFileRoute('/settings/ai-features')({
  component: RouteComponent,
})

export function RouteComponent() {
  const { t } = useTranslation()
  const {
    // Follow-up settings
    followUpEnabled,
    followUpConfig,
    toggleFollowUp,
    updateFollowUpConfig,
    // Recommendation settings
    recommendationEnabled,
    recommendationConfig,
    toggleRecommendation,
    updateRecommendationConfig,
    // Think mode settings
    thinkModeEnabled,
    thinkModeConfig,
    toggleThinkMode,
    updateThinkModeConfig,
  } = useAIFeaturesStore()

  return (
    <Stack p="md" gap="xl">
      <Title order={5}>{t('AI Features Settings')}</Title>

      {/* Smart Follow-up */}
      <Stack gap="md">
        <Flex justify="space-between" align="center">
          <Stack gap={0}>
            <Text fw={500}>{t('Smart Follow-up')}</Text>
            <Text c="dimmed" size="sm">
              {t('Automatically suggest follow-up questions after AI responses')}
            </Text>
          </Stack>
          <Switch checked={followUpEnabled} onChange={toggleFollowUp} />
        </Flex>

        {followUpEnabled && (
          <Stack pl="md" gap="sm">
            <NumberInput
              label={t('Max Suggestions')}
              description={t('Maximum number of follow-up suggestions to display')}
              min={2}
              max={6}
              value={followUpConfig.maxSuggestions}
              onChange={(val) => updateFollowUpConfig({ maxSuggestions: val || 4 })}
            />

            <Flex align="center" gap="sm">
              <Text size="sm">{t('Min Confidence')}:</Text>
              <Text size="sm" c="dimmed">
                {followUpConfig.minConfidence}
              </Text>
            </Flex>
          </Stack>
        )}
      </Stack>

      <Divider />

      {/* Active Recommendations */}
      <Stack gap="md">
        <Flex justify="space-between" align="center">
          <Stack gap={0}>
            <Text fw={500}>{t('Active Recommendations')}</Text>
            <Text c="dimmed" size="sm">
              {t('Recommend relevant resources, tools, and exploration directions during conversation')}
            </Text>
          </Stack>
          <Switch checked={recommendationEnabled} onChange={toggleRecommendation} />
        </Flex>

        {recommendationEnabled && (
          <Stack pl="md" gap="sm">
            <NumberInput
              label={t('Refresh Interval')}
              description={t('Number of messages before checking for new recommendations')}
              min={2}
              max={10}
              value={recommendationConfig.refreshInterval}
              onChange={(val) => updateRecommendationConfig({ refreshInterval: val || 3 })}
            />
          </Stack>
        )}
      </Stack>

      <Divider />

      {/* Think Mode */}
      <Stack gap="md">
        <Flex justify="space-between" align="center">
          <Stack gap={0}>
            <Flex align="center" gap="xs">
              <Text fw={500}>{t('Think Mode')}</Text>
              <Tooltip label={t('AI will show its thought process before answering, improving reliability and explainability')}>
                <IconInfoCircle size={16} style={{ color: 'var(--mantine-color-dimmed)' }} />
              </Tooltip>
            </Flex>
            <Text c="dimmed" size="sm">
              {t('Enable Chain of Thought reasoning for more reliable answers')}
            </Text>
          </Stack>
          <Switch checked={thinkModeEnabled} onChange={toggleThinkMode} />
        </Flex>

        {thinkModeEnabled && (
          <Stack pl="md" gap="sm">
            <Select
              label={t('Strategy')}
              description={t('Choose the reasoning strategy')}
              data={[
                { value: 'cot', label: t('Chain of Thought (CoT)') },
                { value: 'self_consistency', label: t('Self Consistency') },
              ]}
              value={thinkModeConfig.strategy}
              onChange={(val) =>
                val && updateThinkModeConfig({ strategy: val as 'cot' | 'self_consistency' })
              }
            />

            <NumberInput
              label={t('Max Steps')}
              description={t('Maximum number of reasoning steps')}
              min={3}
              max={7}
              value={thinkModeConfig.maxSteps}
              onChange={(val) => updateThinkModeConfig({ maxSteps: val || 5 })}
            />

            <Switch
              label={t('Default Collapsed')}
              description={t('Collapse the thought process by default')}
              checked={thinkModeConfig.defaultCollapsed}
              onChange={(e) => updateThinkModeConfig({ defaultCollapsed: e.currentTarget.checked })}
            />
          </Stack>
        )}
      </Stack>
    </Stack>
  )
}
