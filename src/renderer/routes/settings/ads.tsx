/**
 * AI Ad Network - 广告设置页面
 *
 * 工程师C - UI与集成专家
 *
 * 功能：
 * - 全局广告开关
 * - API配置
 * - 数据收集配置
 * - 6种广告格式独立配置
 * - 调试模式
 */

import {
  Accordion,
  Alert,
  Badge,
  Box,
  Button,
  Card,
  Checkbox,
  Divider,
  Flex,
  Group,
  Input,
  NumberInput,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  Tabs,
  Text,
  TextInput,
  Title,
  Tooltip,
} from '@mantine/core'
import {
  IconCheck,
  IconInfoCircle,
  IconRefresh,
  IconSettings,
  IconAlertCircle,
  IconX,
  IconLink,
} from '@tabler/icons-react'
import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

// 导入广告配置相关的类型和hooks
import {
  type AdConfig,
  useAdConfigStore,
  getDefaultAdConfig,
} from '@/packages/ads'
// 导入调试面板
import { DebugPanel } from '@/packages/ads/components'

export const Route = createFileRoute('/settings/ads')({
  component: RouteComponent,
})

export function RouteComponent() {
  const { t } = useTranslation()

  // Get the entire config state from store
  const storeConfig = useAdConfigStore()
  const updateConfig = useAdConfigStore((state) => state.updateConfig)
  const resetConfig = useAdConfigStore((state) => state.resetConfig)

  // 本地状态（用于表单，保存时才更新到store）
  // Use default config as fallback to handle initial store state
  const defaultConfig = getDefaultAdConfig()

  // Use a ref to track if we've done the initial sync
  const [localConfig, setLocalConfig] = useState<AdConfig>(() => storeConfig || defaultConfig)
  const [hasChanges, setHasChanges] = useState(false)
  const initialSyncDoneRef = useRef(false)

  // Sync local config with store config initially and after hydration
  // Only sync if no local changes have been made
  useEffect(() => {
    if (!initialSyncDoneRef.current || !hasChanges) {
      setLocalConfig(storeConfig)
      initialSyncDoneRef.current = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeConfig])

  // 保存配置
  const handleSave = () => {
    updateConfig(localConfig)
    setHasChanges(false)
    toast.success('广告配置已保存')
  }

  // 重置配置
  const handleReset = () => {
    setLocalConfig(defaultConfig)
    updateConfig(defaultConfig)
    setHasChanges(false)
  }

  // 恢复原始配置
  const handleDiscard = () => {
    setLocalConfig(storeConfig)
    setHasChanges(false)
  }

  return (
    <Box p="md" maw={900} mx="auto">
      <Stack gap="lg">
        {/* 页面标题 */}
        <Flex justify="space-between" align="center">
          <Title order={3}>{t('Ad Settings')}</Title>
          {hasChanges && (
            <Group gap="xs">
              <Button
                size="xs"
                variant="light"
                color="red"
                leftSection={<IconX size={14} />}
                onClick={handleDiscard}
              >
                取消
              </Button>
              <Button
                size="xs"
                variant="light"
                color="blue"
                leftSection={<IconRefresh size={14} />}
                onClick={handleReset}
              >
                重置
              </Button>
              <Button
                size="xs"
                color="chatbox-brand"
                leftSection={<IconCheck size={14} />}
                onClick={handleSave}
              >
                保存
              </Button>
            </Group>
          )}
        </Flex>

        {/* 警告提示 */}
        {!localConfig.enabled && (
          <Alert variant="light" color="yellow" icon={<IconAlertCircle size={16} />}>
            <Text size="sm">广告功能当前已禁用。启用开关后广告将开始展示。</Text>
          </Alert>
        )}

        {/* 配置选项卡 */}
        <Tabs defaultValue="basic">
          <Tabs.List>
            <Tabs.Tab value="basic">基本设置</Tabs.Tab>
            <Tabs.Tab value="data">数据收集</Tabs.Tab>
            <Tabs.Tab value="formats">广告格式</Tabs.Tab>
            <Tabs.Tab value="debug">调试</Tabs.Tab>
          </Tabs.List>

          {/* ===== 基本设置 ===== */}
          <Tabs.Panel value="basic">
            <Stack gap="md" mt="md">
              <BasicSettingsSection
                config={localConfig}
                onChange={(updates) => {
                  setLocalConfig({ ...localConfig, ...updates })
                  setHasChanges(true)
                }}
              />
            </Stack>
          </Tabs.Panel>

          {/* ===== 数据收集配置 ===== */}
          <Tabs.Panel value="data">
            <Stack gap="md" mt="md">
              <DataCollectionSection
                config={localConfig}
                onChange={(updates) => {
                  setLocalConfig({ ...localConfig, ...updates })
                  setHasChanges(true)
                }}
              />
            </Stack>
          </Tabs.Panel>

          {/* ===== 广告格式配置 ===== */}
          <Tabs.Panel value="formats">
            <Stack gap="md" mt="md">
              <FormatConfigSection
                config={localConfig}
                onChange={(updates) => {
                  setLocalConfig({ ...localConfig, ...updates })
                  setHasChanges(true)
                }}
              />
            </Stack>
          </Tabs.Panel>

          {/* ===== 调试设置 ===== */}
          <Tabs.Panel value="debug">
            <Stack gap="md" mt="md">
              <DebugSection
                config={localConfig}
                onChange={(updates) => {
                  setLocalConfig({ ...localConfig, ...updates })
                  setHasChanges(true)
                }}
              />

              {/* AI Ad Network - 调试面板 */}
              {localConfig.debug && (
                <DebugPanel visible={true} />
              )}
            </Stack>
          </Tabs.Panel>
        </Tabs>
      </Stack>
    </Box>
  )
}

// ============================================================================
// 基本设置区域组件
// ============================================================================

interface BasicSettingsSectionProps {
  config: AdConfig
  onChange: (updates: Partial<AdConfig>) => void
}

function BasicSettingsSection({ config, onChange }: BasicSettingsSectionProps) {
  return (
    <Stack gap="md">
      {/* 全局开关 */}
      <Card withBorder padding="md">
        <Stack gap="sm">
          <Group justify="space-between" align="center">
            <Title order={5}>启用广告系统</Title>
            <Switch
              checked={config.enabled}
              onChange={(e) => onChange({ enabled: e.currentTarget.checked })}
              size="md"
            />
          </Group>
          <Text size="xs" c="dimmed">
            关闭后将不会展示任何广告
          </Text>
        </Stack>
      </Card>

      {/* API配置 */}
      <Card withBorder padding="md">
        <Stack gap="sm">
          <Title order={5} mb="xs">API 配置</Title>

          <TextInput
            label="API Base URL"
            placeholder="https://api.ad-network.com/v1"
            value={config.api.baseUrl}
            onChange={(e) => onChange({ api: { ...config.api, baseUrl: e.currentTarget.value } })}
            description="广告API的基础URL"
            required
          />

          <TextInput
            label="API Key"
            placeholder="ak_your_tenant_your_key"
            value={config.api.apiKey}
            onChange={(e) => onChange({ api: { ...config.api, apiKey: e.currentTarget.value } })}
            description="从广告网络管理后台获取的API密钥"
            type="password"
            required
          />

          <NumberInput
            label="请求超时 (毫秒)"
            value={config.api.timeout}
            onChange={(value) => onChange({ api: { ...config.api, timeout: value || 5000 } })}
            min={1000}
            max={30000}
            step={1000}
            description="广告请求的超时时间"
          />

          <Switch
            label="使用 Mock 模式"
            checked={config.api.useMock}
            onChange={(e) => onChange({ api: { ...config.api, useMock: e.currentTarget.checked } })}
            description="开启后将使用模拟数据，不进行真实API请求（开发调试用）"
          />
        </Stack>
      </Card>
    </Stack>
  )
}

// ============================================================================
// 数据收集配置区域组件
// ============================================================================

interface DataCollectionSectionProps {
  config: AdConfig
  onChange: (updates: Partial<AdConfig>) => void
}

function DataCollectionSection({ config, onChange }: DataCollectionSectionProps) {
  return (
    <Stack gap="md">
      <Alert variant="light" color="blue" icon={<IconInfoCircle size={16} />}>
        <Text size="sm">
          配置发送给广告API的数据内容。请注意用户隐私保护，建议仅在获得用户同意后收集高级数据。
        </Text>
      </Alert>

      <Card withBorder padding="md">
        <Stack gap="sm">
          <Title order={5} mb="xs">基础数据</Title>

          <Checkbox
            label="包含用户输入 (Query)"
            checked={config.dataCollection.includeQuery}
            onChange={(e) => onChange({
              dataCollection: { ...config.dataCollection, includeQuery: e.currentTarget.checked }
            })}
            description="发送用户的提问文本给广告API"
          />

          <Checkbox
            label="包含 AI 响应 (Response)"
            checked={config.dataCollection.includeResponse}
            onChange={(e) => onChange({
              dataCollection: { ...config.dataCollection, includeResponse: e.currentTarget.checked }
            })}
            description="发送AI的回答文本给广告API"
          />
        </Stack>
      </Card>

      <Card withBorder padding="md">
        <Stack gap="sm">
          <Title order={5} mb="xs">高级数据</Title>

          <Checkbox
            label="包含完整对话上下文"
            checked={config.dataCollection.includeFullContext}
            onChange={(e) => onChange({
              dataCollection: { ...config.dataCollection, includeFullContext: e.currentTarget.checked }
            })}
            description="发送最近N轮的对话历史（需要用户同意）"
          />

          {config.dataCollection.includeFullContext && (
            <NumberInput
              label="上下文窗口大小（轮数）"
              value={config.dataCollection.contextWindow}
              onChange={(value) => onChange({
                dataCollection: { ...config.dataCollection, contextWindow: value || 10 }
              })}
              min={1}
              max={50}
              description="包含最近几轮对话"
              ml="lg"
            />
          )}

          <Checkbox
            label="包含用户记忆 (Memory)"
            checked={config.dataCollection.includeMemory}
            onChange={(e) => onChange({
              dataCollection: { ...config.dataCollection, includeMemory: e.currentTarget.checked }
            })}
            description="发送用户的短期和长期记忆数据（需要用户同意）"
          />

          <Checkbox
            label="包含用户画像 (Profile)"
            checked={config.dataCollection.includeProfile}
            onChange={(e) => onChange({
              dataCollection: { ...config.dataCollection, includeProfile: e.currentTarget.checked }
            })}
            description="发送用户的兴趣偏好和行为模式（需要用户同意）"
          />

          <Divider my="xs" />

          <Checkbox
            label="启用数据脱敏"
            checked={config.dataCollection.enableAnonymization}
            onChange={(e) => onChange({
              dataCollection: { ...config.dataCollection, enableAnonymization: e.currentTarget.checked }
            })}
            description="在发送数据前自动移除敏感信息（如邮箱、电话等）"
          />
        </Stack>
      </Card>

      {/* 隐私配置 */}
      <Card withBorder padding="md">
        <Stack gap="sm">
          <Title order={5} mb="xs">隐私保护</Title>

          <Switch
            label="启用隐私保护"
            checked={config.privacy.enabled}
            onChange={(e) => onChange({ privacy: { ...config.privacy, enabled: e.currentTarget.checked } })}
            description="启用额外的隐私保护措施"
          />

          <Checkbox
            label="需要用户同意"
            checked={config.privacy.requireConsent}
            onChange={(e) => onChange({ privacy: { ...config.privacy, requireConsent: e.currentTarget.checked } })}
            description="收集高级数据前需要用户明确同意"
          />

          <NumberInput
            label="数据保留期限（天，0表示不保留）"
            value={config.privacy.dataRetentionDays}
            onChange={(value) => onChange({ privacy: { ...config.privacy, dataRetentionDays: value || 0 } })}
            min={0}
            max={365}
            description="本地缓存数据的保留时间"
          />
        </Stack>
      </Card>
    </Stack>
  )
}

// ============================================================================
// 广告格式配置区域组件
// ============================================================================

interface FormatConfigSectionProps {
  config: AdConfig
  onChange: (updates: Partial<AdConfig>) => void
}

function FormatConfigSection({ config, onChange }: FormatConfigSectionProps) {
  return (
    <Stack gap="md">
      <Alert variant="light" color="blue" icon={<IconInfoCircle size={16} />}>
        <Text size="sm">
          配置各种广告格式的展示方式、频率和样式。每种格式都可以独立启用或禁用。
        </Text>
      </Alert>

      <Accordion variant="contained" defaultValue={[]} chevronPosition="left">
        {/* Action Card 格式 */}
        <Accordion.Item value="actionCard">
          <Accordion.Control>
            <Group justify="space-between" w="100%">
              <Group gap="sm">
                <Switch
                  size="sm"
                  checked={config.formats.actionCard.enabled}
                  onChange={(e) => {
                    e.stopPropagation()
                    onChange({
                      formats: {
                        ...config.formats,
                        actionCard: { ...config.formats.actionCard, enabled: e.currentTarget.checked }
                      }
                    })
                  }}
                />
                <Text fw={500}>🃏 Action Card (卡片广告)</Text>
              </Group>
              {config.formats.actionCard.enabled && (
                <Badge size="xs" color="green">已启用</Badge>
              )}
            </Group>
          </Accordion.Control>
          <Accordion.Panel>
            <ActionCardFormatConfig
              config={config.formats.actionCard}
              onChange={(updates) => onChange({
                formats: { ...config.formats, actionCard: { ...config.formats.actionCard, ...updates } }
              })}
            />
          </Accordion.Panel>
        </Accordion.Item>

        {/* Suffix 格式 */}
        <Accordion.Item value="suffix">
          <Accordion.Control>
            <Group justify="space-between" w="100%">
              <Group gap="sm">
                <Switch
                  size="sm"
                  checked={config.formats.suffix.enabled}
                  onChange={(e) => {
                    e.stopPropagation()
                    onChange({
                      formats: {
                        ...config.formats,
                        suffix: { ...config.formats.suffix, enabled: e.currentTarget.checked }
                      }
                    })
                  }}
                />
                <Text fw={500}>📝 Suffix (后缀广告)</Text>
              </Group>
              {config.formats.suffix.enabled && (
                <Badge size="xs" color="green">已启用</Badge>
              )}
            </Group>
          </Accordion.Control>
          <Accordion.Panel>
            <SuffixFormatConfig
              config={config.formats.suffix}
              onChange={(updates) => onChange({
                formats: { ...config.formats, suffix: { ...config.formats.suffix, ...updates } }
              })}
            />
          </Accordion.Panel>
        </Accordion.Item>

        {/* Follow Up 格式 */}
        <Accordion.Item value="followup">
          <Accordion.Control>
            <Group justify="space-between" w="100%">
              <Group gap="sm">
                <Switch
                  size="sm"
                  checked={config.formats.followup.enabled}
                  onChange={(e) => {
                    e.stopPropagation()
                    onChange({
                      formats: {
                        ...config.formats,
                        followup: { ...config.formats.followup, enabled: e.currentTarget.checked }
                      }
                    })
                  }}
                />
                <Text fw={500}>💬 Follow Up (跟进问题)</Text>
              </Group>
              {config.formats.followup.enabled && (
                <Badge size="xs" color="green">已启用</Badge>
              )}
            </Group>
          </Accordion.Control>
          <Accordion.Panel>
            <FollowUpFormatConfig
              config={config.formats.followup}
              onChange={(updates) => onChange({
                formats: { ...config.formats, followup: { ...config.formats.followup, ...updates } }
              })}
            />
          </Accordion.Panel>
        </Accordion.Item>

        {/* Sponsored Source 格式 */}
        <Accordion.Item value="source">
          <Accordion.Control>
            <Group justify="space-between" w="100%">
              <Group gap="sm">
                <Switch
                  size="sm"
                  checked={config.formats.source.enabled}
                  onChange={(e) => {
                    e.stopPropagation()
                    onChange({
                      formats: {
                        ...config.formats,
                        source: { ...config.formats.source, enabled: e.currentTarget.checked }
                      }
                    })
                  }}
                />
                <Text fw={500}>🔗 Sponsored Source (赞助来源)</Text>
              </Group>
              {config.formats.source.enabled && (
                <Badge size="xs" color="green">已启用</Badge>
              )}
            </Group>
          </Accordion.Control>
          <Accordion.Panel>
            <SourceFormatConfig
              config={config.formats.source}
              onChange={(updates) => onChange({
                formats: { ...config.formats, source: { ...config.formats.source, ...updates } }
              })}
            />
          </Accordion.Panel>
        </Accordion.Item>

        {/* Static 格式 */}
        <Accordion.Item value="static">
          <Accordion.Control>
            <Group justify="space-between" w="100%">
              <Group gap="sm">
                <Switch
                  size="sm"
                  checked={config.formats.static.enabled}
                  onChange={(e) => {
                    e.stopPropagation()
                    onChange({
                      formats: {
                        ...config.formats,
                        static: { ...config.formats.static, enabled: e.currentTarget.checked }
                      }
                    })
                  }}
                />
                <Text fw={500}>🖼️ Static (静态横幅)</Text>
              </Group>
              {config.formats.static.enabled && (
                <Badge size="xs" color="green">已启用</Badge>
              )}
            </Group>
          </Accordion.Control>
          <Accordion.Panel>
            <StaticFormatConfig
              config={config.formats.static}
              onChange={(updates) => onChange({
                formats: { ...config.formats, static: { ...config.formats.static, ...updates } }
              })}
            />
          </Accordion.Panel>
        </Accordion.Item>

        {/* Lead Gen 格式 */}
        <Accordion.Item value="leadGen">
          <Accordion.Control>
            <Group justify="space-between" w="100%">
              <Group gap="sm">
                <Switch
                  size="sm"
                  checked={config.formats.leadGen.enabled}
                  onChange={(e) => {
                    e.stopPropagation()
                    onChange({
                      formats: {
                        ...config.formats,
                        leadGen: { ...config.formats.leadGen, enabled: e.currentTarget.checked }
                      }
                    })
                  }}
                />
                <Text fw={500}>📋 Lead Gen (线索收集)</Text>
              </Group>
              {config.formats.leadGen.enabled && (
                <Badge size="xs" color="green">已启用</Badge>
              )}
            </Group>
          </Accordion.Control>
          <Accordion.Panel>
            <LeadGenFormatConfig
              config={config.formats.leadGen}
              onChange={(updates) => onChange({
                formats: { ...config.formats, leadGen: { ...config.formats.leadGen, ...updates } }
              })}
            />
          </Accordion.Panel>
        </Accordion.Item>

        {/* Entity Link 格式 */}
        <Accordion.Item value="entityLink">
          <Accordion.Control>
            <Group justify="space-between" w="100%">
              <Group gap="sm">
                <Switch
                  size="sm"
                  checked={config.formats.entityLink?.enabled ?? false}
                  onChange={(e) => {
                    e.stopPropagation()
                    onChange({
                      formats: {
                        ...config.formats,
                        entityLink: { ...(config.formats.entityLink || { badgeStyle: 'subtle', overlapStrategy: 'longest', maxLinks: 3, minConfidence: 0.7, placement: 'inline', frequency: 5, maxPerSession: 5 }), enabled: e.currentTarget.checked }
                      }
                    })
                  }}
                />
                <Text fw={500}>🔗 Entity Link (实体链接广告)</Text>
              </Group>
              {(config.formats.entityLink?.enabled ?? false) && (
                <Badge size="xs" color="green">已启用</Badge>
              )}
            </Group>
          </Accordion.Control>
          <Accordion.Panel>
            <EntityLinkFormatConfig
              config={config.formats.entityLink ?? { enabled: false, badgeStyle: 'subtle', overlapStrategy: 'longest', maxLinks: 3, minConfidence: 0.7, placement: 'inline', frequency: 5, maxPerSession: 5 }}
              onChange={(updates) => onChange({
                formats: { ...config.formats, entityLink: { ...(config.formats.entityLink || { badgeStyle: 'subtle', overlapStrategy: 'longest', maxLinks: 3, minConfidence: 0.7, placement: 'inline', frequency: 5, maxPerSession: 5 }), ...updates } }
              })}
            />
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>
    </Stack>
  )
}

// ============================================================================
// 各广告格式配置组件
// ============================================================================

function ActionCardFormatConfig({ config, onChange }: { config: any; onChange: (updates: any) => void }) {
  return (
    <SimpleGrid cols={{ base: 1, sm: 2 }}>
      <Select
        label="视觉变体"
        data={[
          { value: 'horizontal', label: '水平布局' },
          { value: 'vertical', label: '垂直布局' },
          { value: 'compact', label: '紧凑布局' },
        ]}
        value={config.variant}
        onChange={(value) => onChange({ variant: value })}
      />

      <NumberInput
        label="展示频率"
        description="每N条消息展示一次"
        value={config.frequency}
        onChange={(value) => onChange({ frequency: value || 3 })}
        min={1}
        max={20}
      />

      <NumberInput
        label="每会话最多展示"
        value={config.maxPerSession}
        onChange={(value) => onChange({ maxPerSession: value || 5 })}
        min={1}
        max={20}
      />

      <Checkbox
        label="显示评分"
        checked={config.showRating}
        onChange={(e) => onChange({ showRating: e.currentTarget.checked })}
      />

      <Checkbox
        label="显示价格"
        checked={config.showPrice}
        onChange={(e) => onChange({ showPrice: e.currentTarget.checked })}
      />
    </SimpleGrid>
  )
}

function SuffixFormatConfig({ config, onChange }: { config: any; onChange: (updates: any) => void }) {
  return (
    <SimpleGrid cols={{ base: 1, sm: 2 }}>
      <Select
        label="视觉变体"
        data={[
          { value: 'block', label: '区块' },
          { value: 'inline', label: '内联' },
          { value: 'minimal', label: '极简' },
        ]}
        value={config.variant}
        onChange={(value) => onChange({ variant: value })}
      />

      <NumberInput
        label="展示频率"
        description="每N条消息展示一次"
        value={config.frequency}
        onChange={(value) => onChange({ frequency: value || 5 })}
        min={1}
        max={20}
      />

      <NumberInput
        label="每会话最多展示"
        value={config.maxPerSession}
        onChange={(value) => onChange({ maxPerSession: value || 3 })}
        min={1}
        max={10}
      />

      <Checkbox
        label="显示分隔线"
        checked={config.showDivider}
        onChange={(e) => onChange({ showDivider: e.currentTarget.checked })}
      />
    </SimpleGrid>
  )
}

function FollowUpFormatConfig({ config, onChange }: { config: any; onChange: (updates: any) => void }) {
  return (
    <SimpleGrid cols={{ base: 1, sm: 2 }}>
      <Select
        label="视觉变体"
        data={[
          { value: 'bubble', label: '气泡' },
          { value: 'pill', label: '药丸' },
          { value: 'underline', label: '下划线' },
        ]}
        value={config.variant}
        onChange={(value) => onChange({ variant: value })}
      />

      <NumberInput
        label="混合位置"
        description="在建议问题中的位置（-1为随机）"
        value={config.mixPosition}
        onChange={(value) => onChange({ mixPosition: value || 2 })}
        min={-1}
        max={10}
      />

      <NumberInput
        label="展示频率"
        description="每N条消息展示一次"
        value={config.frequency}
        onChange={(value) => onChange({ frequency: value || 5 })}
        min={1}
        max={20}
      />

      <NumberInput
        label="每会话最多展示"
        value={config.maxPerSession}
        onChange={(value) => onChange({ maxPerSession: value || 3 })}
        min={1}
        max={10}
      />
    </SimpleGrid>
  )
}

function SourceFormatConfig({ config, onChange }: { config: any; onChange: (updates: any) => void }) {
  return (
    <SimpleGrid cols={{ base: 1, sm: 2 }}>
      <Select
        label="视觉变体"
        data={[
          { value: 'card', label: '卡片' },
          { value: 'minimal', label: '极简' },
          { value: 'list_item', label: '列表项' },
        ]}
        value={config.variant}
        onChange={(value) => onChange({ variant: value })}
      />

      <NumberInput
        label="混合位置"
        description="在来源列表中的位置"
        value={config.mixPosition}
        onChange={(value) => onChange({ mixPosition: value || 1 })}
        min={0}
        max={10}
      />

      <NumberInput
        label="展示频率"
        description="每N条消息展示一次"
        value={config.frequency}
        onChange={(value) => onChange({ frequency: value || 5 })}
        min={1}
        max={20}
      />

      <Checkbox
        label="显示赞助标签"
        checked={config.showSponsoredLabel}
        onChange={(e) => onChange({ showSponsoredLabel: e.currentTarget.checked })}
      />
    </SimpleGrid>
  )
}

function StaticFormatConfig({ config, onChange }: { config: any; onChange: (updates: any) => void }) {
  return (
    <SimpleGrid cols={{ base: 1, sm: 2 }}>
      <Select
        label="展示位置"
        data={[
          { value: 'sidebar', label: '侧边栏' },
          { value: 'header', label: '顶部' },
          { value: 'footer', label: '底部' },
        ]}
        value={config.placement}
        onChange={(value) => onChange({ placement: value })}
      />

      <NumberInput
        label="宽度（像素）"
        value={config.width}
        onChange={(value) => onChange({ width: value || 300 })}
        min={100}
        max={1920}
      />

      <NumberInput
        label="高度（像素）"
        value={config.height}
        onChange={(value) => onChange({ height: value || 250 })}
        min={50}
        max={1080}
      />

      <NumberInput
        label="刷新间隔（秒，0为不刷新）"
        value={config.refreshInterval}
        onChange={(value) => onChange({ refreshInterval: value || 0 })}
        min={0}
        max={3600}
      />

      <Checkbox
        label="允许关闭"
        checked={config.dismissible}
        onChange={(e) => onChange({ dismissible: e.currentTarget.checked })}
      />
    </SimpleGrid>
  )
}

function LeadGenFormatConfig({ config, onChange }: { config: any; onChange: (updates: any) => void }) {
  return (
    <Stack gap="sm">
      <NumberInput
        label="展示频率"
        description="每N条消息展示一次"
        value={config.frequency}
        onChange={(value) => onChange({ frequency: value || 10 })}
        min={1}
        max={50}
      />

      <NumberInput
        label="每会话最多展示"
        value={config.maxPerSession}
        onChange={(value) => onChange({ maxPerSession: value || 1 })}
        min={1}
        max={5}
      />

      <Text size="sm" fw={500}>收集字段配置</Text>
      <Stack gap="xs">
        {config.fields.map((field: any, index: number) => (
          <Group key={index} gap="xs">
            <Select
              style={{ flex: 1 }}
              data={[
                { value: 'email', label: '邮箱' },
                { value: 'name', label: '姓名' },
                { value: 'phone', label: '电话' },
                { value: 'company', label: '公司' },
                { value: 'website', label: '网站' },
                { value: 'message', label: '留言' },
              ]}
              value={field.type}
              onChange={(value) => {
                const newFields = [...config.fields]
                newFields[index] = { ...field, type: value || 'email' }
                onChange({ fields: newFields })
              }}
            />

            <Checkbox
              label="必填"
              checked={field.required}
              onChange={(e) => {
                const newFields = [...config.fields]
                newFields[index] = { ...field, required: e.currentTarget.checked }
                onChange({ fields: newFields })
              }}
            />
          </Group>
        ))}
      </Stack>
    </Stack>
  )
}

function EntityLinkFormatConfig({ config, onChange }: { config: any; onChange: (updates: any) => void }) {
  return (
    <Stack gap="md">
      <Alert variant="light" color="blue" icon={<IconLink size={16} />}>
        <Stack gap="xs">
          <Text size="sm" fw={500}>实体链接广告 (Entity Link)</Text>
          <Text size="xs" c="dimmed">
            在 AI 响应内容中识别产品、品牌等实体，自动添加联盟营销链接。此格式会直接修改消息内容的显示方式。
          </Text>
        </Stack>
      </Alert>

      <SimpleGrid cols={{ base: 1, sm: 2 }}>
        <Select
          label="徽章样式"
          description="链接徽章的显示方式"
          data={[
            { value: 'subtle', label: '微弱 (†)' },
            { value: 'hover', label: '悬停显示' },
            { value: 'explicit', label: '明确标记' },
            { value: 'none', label: '无标记' },
          ]}
          value={config.badgeStyle}
          onChange={(value) => onChange({ badgeStyle: value || 'subtle' })}
        />

        <Select
          label="重叠策略"
          description="多个实体重叠时的处理方式"
          data={[
            { value: 'longest', label: '优先长实体' },
            { value: 'first', label: '优先第一个' },
            { value: 'all', label: '全部标记' },
          ]}
          value={config.overlapStrategy}
          onChange={(value) => onChange({ overlapStrategy: value || 'longest' })}
        />

        <NumberInput
          label="最大链接数"
          description="单次响应最多添加的链接数"
          value={config.maxLinks}
          onChange={(value) => onChange({ maxLinks: value || 3 })}
          min={1}
          max={10}
        />

        <NumberInput
          label="最小置信度"
          description="实体识别的最小置信度阈值 (0-1)"
          value={config.minConfidence}
          onChange={(value) => onChange({ minConfidence: value || 0.7 })}
          min={0}
          max={1}
          step={0.05}
          decimalScale={2}
        />

        <Select
          label="展示位置"
          description="链接的展示方式"
          data={[
            { value: 'inline', label: '内联替换（替换原始文本）' },
            { value: 'below_message', label: '消息下方（列出所有实体）' },
          ]}
          value={config.placement}
          onChange={(value) => onChange({ placement: value || 'inline' })}
        />

        <NumberInput
          label="展示频率"
          description="每N条消息展示一次"
          value={config.frequency}
          onChange={(value) => onChange({ frequency: value || 5 })}
          min={1}
          max={20}
        />

        <NumberInput
          label="每会话最多展示"
          value={config.maxPerSession}
          onChange={(value) => onChange({ maxPerSession: value || 5 })}
          min={1}
          max={20}
        />
      </SimpleGrid>

      <Card withBorder padding="sm" bg="gray.0">
        <Stack gap="xs">
          <Text size="xs" fw={500} c="dimmed">样式预览</Text>
          <div style={{ padding: '8px', background: 'white', borderRadius: '4px' }}>
            {config.badgeStyle === 'subtle' && (
              <Text size="sm">
                你可以试试 <span style={{ borderBottom: '1px dotted #228be6', cursor: 'pointer' }}>iPhone 15 Pro</span>，它的性能很不错。
              </Text>
            )}
            {config.badgeStyle === 'hover' && (
              <Text size="sm">
                你可以试试 <span style={{ position: 'relative' }}>iPhone 15 Pro<span style={{
                  position: 'absolute',
                  top: '-20px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: '#228be6',
                  color: 'white',
                  padding: '2px 6px',
                  borderRadius: '3px',
                  fontSize: '10px',
                  opacity: 0,
                  transition: 'opacity 0.2s'
                }}>广告</span></span>，它的性能很不错。
              </Text>
            )}
            {config.badgeStyle === 'explicit' && (
              <Text size="sm">
                你可以试试 <span style={{
                  background: '#fff3cd',
                  padding: '2px 4px',
                  borderRadius: '3px',
                  border: '1px solid #ffc107'
                }}>[广告] iPhone 15 Pro</span>，它的性能很不错。
              </Text>
            )}
            {config.badgeStyle === 'none' && (
              <Text size="sm">
                你可以试试 <span style={{ color: '#228be6', textDecoration: 'underline' }}>iPhone 15 Pro</span>，它的性能很不错。
              </Text>
            )}
          </div>
        </Stack>
      </Card>

      <Alert variant="light" color="gray" icon={<IconInfoCircle size={14} />}>
        <Stack gap="xs">
          <Text size="xs" fw={500}>配置建议</Text>
          <Text size="xs" c="dimmed">
            • <b>链接密度：</b>建议每100字不超过2个链接，避免影响阅读体验
          </Text>
          <Text size="xs" c="dimmed">
            • <b>置信度设置：</b>较高的置信度(0.8+)可减少误识别，但可能漏掉部分实体
          </Text>
          <Text size="xs" c="dimmed">
            • <b>徽章样式：</b>subtle 模式干扰最小，explicit 模式透明度最高
          </Text>
        </Stack>
      </Alert>
    </Stack>
  )
}

// ============================================================================
// 调试设置区域组件
// ============================================================================

interface DebugSectionProps {
  config: AdConfig
  onChange: (updates: Partial<AdConfig>) => void
}

function DebugSection({ config, onChange }: DebugSectionProps) {
  return (
    <Stack gap="md">
      <Alert variant="light" color="orange" icon={<IconAlertCircle size={16} />}>
        <Text size="sm">
          调试模式仅用于开发和测试。生产环境请关闭这些选项。
        </Text>
      </Alert>

      <Card withBorder padding="md">
        <Stack gap="sm">
          <Title order={5} mb="xs">调试选项</Title>

          <Switch
            label="启用调试模式"
            checked={config.debug}
            onChange={(e) => onChange({ debug: e.currentTarget.checked })}
            description="开启后在控制台输出详细日志"
          />

          <Switch
            label="强制显示广告"
            description="跳过频率控制，强制展示广告（仅调试用）"
          />

          <Switch
            label="启用性能追踪"
            checked={config.advanced?.enablePerformanceTracking}
            onChange={(e) => onChange({
              advanced: { ...config.advanced, enablePerformanceTracking: e.currentTarget.checked }
            })}
            description="追踪广告加载性能指标"
          />
        </Stack>
      </Card>

      <Card withBorder padding="md">
        <Stack gap="sm">
          <Title order={5} mb="xs">高级配置</Title>

          <NumberInput
            label="请求重试次数"
            value={config.advanced?.maxRetries || 2}
            onChange={(value) => onChange({
              advanced: { ...config.advanced, maxRetries: value || 2 }
            })}
            min={0}
            max={5}
          />

          <NumberInput
            label="缓存时间（秒）"
            value={config.advanced?.cacheTime || 300}
            onChange={(value) => onChange({
              advanced: { ...config.advanced, cacheTime: value || 300 }
            })}
            min={0}
            max={3600}
          />
        </Stack>
      </Card>
    </Stack>
  )
}
