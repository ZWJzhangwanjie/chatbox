import {
  ActionIcon,
  Alert,
  Badge,
  Box,
  Button,
  Card,
  Divider,
  Flex,
  Group,
  JSONInput,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  Tabs,
  Text,
  Textarea,
  TextInput,
  Title,
} from '@mantine/core'
import { useForm } from '@mantine/form'
import { IconCheck, IconPlus, IconRefresh, IconTrash, IconX } from '@tabler/icons-react'
import { createFileRoute } from '@tanstack/react-router'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { v4 as uuidv4 } from 'uuid'
import { useProviders } from '@/hooks/useProviders'
import { useModelPersonalization, useModelPersonalizationEdit } from '@/hooks/useModelPersonalization'
import { ResponseStyle } from 'src/shared/types/personalization'
import { getModelPersonalizationKey } from 'src/shared/types/personalization'
import NiceModal from '@ebay/nice-modal-react'
import LazySlider from '@/components/LazySlider'

export const Route = createFileRoute('/settings/model-personalization')({
  component: RouteComponent,
})

export function RouteComponent() {
  const { t } = useTranslation()
  const { providers } = useProviders()
  const { personalizedModels, deletePersonalization } = useModelPersonalization()

  // 当前选择的模型
  const [selectedProvider, setSelectedProvider] = useState<string>('')
  const [selectedModelId, setSelectedModelId] = useState<string>('')

  // 获取当前选择的模型配置
  const { config, updateConfig, removeConfig, applyStyle, hasConfig } = useModelPersonalizationEdit(
    selectedProvider,
    selectedModelId
  )

  // 构建模型选项列表
  const modelOptions = useMemo(() => {
    const options: Array<{ value: string; label: string; group: string }> = []

    for (const [providerId, provider] of Object.entries(providers)) {
      const models = provider.defaultSettings?.models || []
      for (const model of models) {
        if (model.type === 'chat' || !model.type) {
          options.push({
            value: `${providerId}:${model.modelId}`,
            label: model.nickname || model.modelId,
            group: provider.name,
          })
        }
      }
    }

    return options
  }, [providers])

  // 处理模型选择
  const handleModelChange = useCallback((value: string) => {
    const [provider, modelId] = value.split(':')
    setSelectedProvider(provider)
    setSelectedModelId(modelId)
  }, [])

  // 当前选择的值
  const currentValue = useMemo(() => {
    if (!selectedProvider || !selectedModelId) return ''
    return `${selectedProvider}:${selectedModelId}`
  }, [selectedProvider, selectedModelId])

  // 应用预设风格
  const handleApplyStyle = useCallback(
    (style: ResponseStyle) => {
      applyStyle(style)
    },
    [applyStyle]
  )

  // 删除配置
  const handleDeleteConfig = useCallback(() => {
    if (confirm(t('Are you sure you want to delete this personalization?'))) {
      removeConfig()
    }
  }, [removeConfig, t])

  return (
    <Stack p="md" gap="xl">
      <Flex justify="space-between" align="center">
        <Title order={5}>{t('Model Personalization')}</Title>
        <Button size="xs" variant="light" onClick={() => window.location.reload()}>
          <IconRefresh size={14} style={{ marginRight: 4 }} />
          {t('Refresh')}
        </Button>
      </Flex>

      {/* 模型选择器 */}
      <Stack gap="sm">
        <Text fw={500}>{t('Select Model to Personalize')}</Text>
        <Select
          comboboxProps={{ withinPortal: true }}
          placeholder={t('Select a model...')}
          data={modelOptions}
          value={currentValue || null}
          onChange={(val) => val && handleModelChange(val)}
          searchable
          clearable
          limit={100}
          styles={{
            label: { fontWeight: 400 },
          }}
        />
      </Stack>

      {/* 已配置的模型列表 */}
      {personalizedModels.length > 0 && (
        <Stack gap="sm">
          <Text fw={500}>{t('Personalized Models')} ({personalizedModels.length})</Text>
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="sm">
            {personalizedModels.map(({ key, provider, modelId, config: cfg }) => {
              const isSelected = key === currentValue
              return (
                <Card
                  key={key}
                  p="sm"
                  withBorder
                  shadow="none"
                  style={{
                    cursor: 'pointer',
                    borderColor: isSelected ? 'var(--mantine-color-blue-5-filled)' : undefined,
                  }}
                  onClick={() => handleModelChange(key)}
                >
                  <Group justify="space-between" wrap="nowrap">
                    <Stack gap={0} style={{ flex: 1 }}>
                      <Text size="sm" fw={500} lineClamp={1}>
                        {modelId}
                      </Text>
                      <Text size="xs" c="chatbox-tertiary">
                        {provider}
                      </Text>
                      {cfg.responseStyle && (
                        <Badge size="xs" variant="light" color="blue">
                          {cfg.responseStyle}
                        </Badge>
                      )}
                    </Stack>
                    <ActionIcon
                      size="sm"
                      color="red"
                      variant="subtle"
                      onClick={(e) => {
                        e.stopPropagation()
                        if (confirm(t('Delete this personalization?'))) {
                          deletePersonalization({ provider, modelId })
                        }
                      }}
                    >
                      <IconX size={14} />
                    </ActionIcon>
                  </Group>
                </Card>
              )
            })}
          </SimpleGrid>
        </Stack>
      )}

      {/* 编辑区域 */}
      {selectedProvider && selectedModelId && (
        <>
          <Divider />
          <PersonalizationEditor
            provider={selectedProvider}
            modelId={selectedModelId}
            config={config}
            updateConfig={updateConfig}
            hasConfig={hasConfig}
            onApplyStyle={handleApplyStyle}
            onDelete={handleDeleteConfig}
          />
        </>
      )}

      {/* 提示信息 */}
      {!selectedProvider && (
        <Alert variant="light" color="blue">
          <Text size="sm">{t('Select a model above to configure its personalization settings.')}</Text>
        </Alert>
      )}
    </Stack>
  )
}

// 个性化配置编辑器组件
interface PersonalizationEditorProps {
  provider: string
  modelId: string
  config?: any
  updateConfig: (updates: any) => void
  hasConfig: boolean
  onApplyStyle: (style: ResponseStyle) => void
  onDelete: () => void
}

function PersonalizationEditor({
  provider,
  modelId,
  config,
  updateConfig,
  hasConfig,
  onApplyStyle,
  onDelete,
}: PersonalizationEditorProps) {
  const { t } = useTranslation()

  const form = useForm({
    initialValues: {
      systemPrompt: config?.systemPrompt || '',
      temperature: config?.temperature ?? 0.7,
      maxTokens: config?.maxTokens || undefined,
      topP: config?.topP || undefined,
      responseStyle: config?.responseStyle || '',
      customInstructions: config?.customInstructions || [],
    },
  })

  // 同步 config 到 form
  useEffect(() => {
    if (config) {
      form.setValues({
        systemPrompt: config.systemPrompt || '',
        temperature: config.temperature ?? 0.7,
        maxTokens: config.maxTokens || undefined,
        topP: config.topP || undefined,
        responseStyle: config.responseStyle || '',
        customInstructions: config.customInstructions || [],
      })
    }
  }, [config, form])

  // 保存配置
  const handleSave = useCallback(() => {
    const values = form.getValues()
    updateConfig({
      systemPrompt: values.systemPrompt || undefined,
      temperature: values.temperature,
      maxTokens: values.maxTokens,
      topP: values.topP,
      responseStyle: values.responseStyle || undefined,
      customInstructions: values.customInstructions,
    })
  }, [form, updateConfig])

  return (
    <Stack gap="lg">
      {/* 标题栏 */}
      <Group justify="space-between">
        <Title order={6}>
          {provider} / {modelId}
        </Title>
        {hasConfig && (
          <Button size="xs" color="red" variant="light" onClick={onDelete} leftSection={<IconTrash size={14} />}>
            {t('Delete')}
          </Button>
        )}
      </Group>

      {/* Tab 导航 */}
      <Tabs defaultValue="params">
        <Tabs.List>
          <Tabs.Tab value="params" leftSection={<IconRefresh size={14} />}>
            {t('Parameters')}
          </Tabs.Tab>
          <Tabs.Tab value="style" leftSection={<IconCheck size={14} />}>
            {t('Style Presets')}
          </Tabs.Tab>
          <Tabs.Tab value="instructions" leftSection={<IconPlus size={14} />}>
            {t('Custom Instructions')}
          </Tabs.Tab>
        </Tabs.List>

        {/* 参数设置 Tab */}
        <Tabs.Panel value="params">
          <Stack gap="md">
            {/* 系统提示词 */}
            <Stack gap="xs">
              <Text fw={500}>{t('System Prompt')}</Text>
              <Textarea
                placeholder={t('Custom system prompt for this model...')}
                minRows={3}
                {...form.getInputProps('systemPrompt')}
                onBlur={handleSave}
              />
            </Stack>

            {/* 温度参数 */}
            <Stack gap="xs">
              <Group justify="space-between">
                <Text fw={500}>{t('Temperature')}</Text>
                <Text size="sm" c="chatbox-tertiary">
                  {form.values.temperature.toFixed(2)}
                </Text>
              </Group>
              <LazySlider
                step={0.1}
                min={0}
                max={2}
                marks={[
                  { value: 0, label: '0' },
                  { value: 0.7, label: '0.7' },
                  { value: 1, label: '1' },
                  { value: 1.5, label: '1.5' },
                  { value: 2, label: '2' },
                ]}
                {...form.getInputProps('temperature')}
                onChangeEnd={handleSave}
              />
            </Stack>

            {/* 最大 tokens */}
            <Stack gap="xs">
              <Text fw={500}>{t('Max Tokens')}</Text>
              <TextInput
                type="number"
                placeholder="Auto"
                {...form.getInputProps('maxTokens')}
                onBlur={handleSave}
              />
            </Stack>

            {/* Top P */}
            <Stack gap="xs">
              <Text fw={500}>{t('Top P')}</Text>
              <LazySlider
                step={0.05}
                min={0}
                max={1}
                marks={[
                  { value: 0, label: '0' },
                  { value: 0.5, label: '0.5' },
                  { value: 1, label: '1' },
                ]}
                {...form.getInputProps('topP')}
                onChangeEnd={handleSave}
              />
            </Stack>
          </Stack>
        </Tabs.Panel>

        {/* 风格预设 Tab */}
        <Tabs.Panel value="style">
          <Stack gap="md">
            <Text size="sm" c="chatbox-tertiary">
              {t('Select a preset style to quickly configure the model parameters.')}
            </Text>

            <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
              {/* 精确模式 */}
              <Card
                p="md"
                withBorder
                shadow="sm"
                style={{
                  cursor: 'pointer',
                  borderColor: form.values.responseStyle === 'precise'
                    ? 'var(--mantine-color-blue-5-filled)'
                    : undefined,
                }}
                onClick={() => {
                  form.setFieldValue('responseStyle', 'precise')
                  form.setFieldValue('temperature', 0.2)
                  handleSave()
                  onApplyStyle('precise')
                }}
              >
                <Stack gap="sm">
                  <Text fw={600}>{t('Precise')}</Text>
                  <Text size="xs" c="chatbox-tertiary">
                    {t('Accurate, concise, fact-based responses')}
                  </Text>
                  <Text size="xs">Temperature: 0.2</Text>
                </Stack>
              </Card>

              {/* 平衡模式 */}
              <Card
                p="md"
                withBorder
                shadow="sm"
                style={{
                  cursor: 'pointer',
                  borderColor: form.values.responseStyle === 'balanced'
                    ? 'var(--mantine-color-blue-5-filled)'
                    : undefined,
                }}
                onClick={() => {
                  form.setFieldValue('responseStyle', 'balanced')
                  form.setFieldValue('temperature', 0.7)
                  handleSave()
                  onApplyStyle('balanced')
                }}
              >
                <Stack gap="sm">
                  <Text fw={600}>{t('Balanced')}</Text>
                  <Text size="xs" c="chatbox-tertiary">
                    {t('Balance between accuracy and creativity')}
                  </Text>
                  <Text size="xs">Temperature: 0.7</Text>
                </Stack>
              </Card>

              {/* 创意模式 */}
              <Card
                p="md"
                withBorder
                shadow="sm"
                style={{
                  cursor: 'pointer',
                  borderColor: form.values.responseStyle === 'creative'
                    ? 'var(--mantine-color-blue-5-filled)'
                    : undefined,
                }}
                onClick={() => {
                  form.setFieldValue('responseStyle', 'creative')
                  form.setFieldValue('temperature', 1.2)
                  handleSave()
                  onApplyStyle('creative')
                }}
              >
                <Stack gap="sm">
                  <Text fw={600}>{t('Creative')}</Text>
                  <Text size="xs" c="chatbox-tertiary">
                    {t('Encourage diverse and creative solutions')}
                  </Text>
                  <Text size="xs">Temperature: 1.2</Text>
                </Stack>
              </Card>
            </SimpleGrid>
          </Stack>
        </Tabs.Panel>

        {/* 自定义指令 Tab */}
        <Tabs.Panel value="instructions">
          <CustomInstructionsList
            instructions={form.values.customInstructions}
            onChange={(instructions) => {
              form.setFieldValue('customInstructions', instructions)
              handleSave()
            }}
          />
        </Tabs.Panel>
      </Tabs>
    </Stack>
  )
}

// 自定义指令列表组件
interface CustomInstructionsListProps {
  instructions: Array<{ id: string; title: string; content: string; enabled: boolean }>
  onChange: (instructions: any[]) => void
}

function CustomInstructionsList({ instructions, onChange }: CustomInstructionsListProps) {
  const { t } = useTranslation()
  const [editingId, setEditingId] = useState<string | null>(null)

  const handleAdd = useCallback(() => {
    const newInstruction = {
      id: uuidv4(),
      title: t('New Instruction'),
      content: '',
      enabled: true,
    }
    onChange([...instructions, newInstruction])
    setEditingId(newInstruction.id)
  }, [instructions, onChange, t])

  const handleUpdate = useCallback(
    (id: string, updates: any) => {
      onChange(instructions.map((inst) => (inst.id === id ? { ...inst, ...updates } : inst)))
    },
    [instructions, onChange]
  )

  const handleDelete = useCallback(
    (id: string) => {
      onChange(instructions.filter((inst) => inst.id !== id))
    },
    [instructions, onChange]
  )

  const handleToggleEnabled = useCallback(
    (id: string) => {
      onChange(
        instructions.map((inst) => (inst.id === id ? { ...inst, enabled: !inst.enabled } : inst))
      )
    },
    [instructions, onChange]
  )

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Text fw={500}>{t('Custom Instructions')}</Text>
        <Button size="xs" onClick={handleAdd} leftSection={<IconPlus size={14} />}>
          {t('Add Instruction')}
        </Button>
      </Group>

      <Stack gap="sm">
        {instructions.length === 0 ? (
          <Text size="sm" c="chatbox-tertiary">
            {t('No custom instructions yet. Add one to get started.')}
          </Text>
        ) : (
          instructions.map((instruction) => (
            <Card key={instruction.id} p="sm" withBorder>
              {editingId === instruction.id ? (
                <Stack gap="sm">
                  <TextInput
                    size="sm"
                    placeholder={t('Title')}
                    value={instruction.title}
                    onChange={(e) => handleUpdate(instruction.id, { title: e.target.value })}
                  />
                  <Textarea
                    size="sm"
                    placeholder={t('Instruction content')}
                    minRows={2}
                    value={instruction.content}
                    onChange={(e) => handleUpdate(instruction.id, { content: e.target.value })}
                  />
                  <Group justify="flex-end" gap="xs">
                    <Button
                      size="xs"
                      variant="default"
                      onClick={() => setEditingId(null)}
                    >
                      {t('Cancel')}
                    </Button>
                    <Button size="xs" onClick={() => setEditingId(null)}>
                      {t('Save')}
                    </Button>
                  </Group>
                </Stack>
              ) : (
                <Group justify="space-between" wrap="nowrap">
                  <Stack gap={0} style={{ flex: 1 }}>
                    <Group gap="xs" align="center">
                      <Switch
                        size="xs"
                        checked={instruction.enabled}
                        onChange={() => handleToggleEnabled(instruction.id)}
                      />
                      <Text size="sm" fw={500} td={instruction.enabled ? undefined : 'line-through'}>
                        {instruction.title}
                      </Text>
                    </Group>
                    <Text size="xs" c="chatbox-tertiary" lineClamp={2}>
                      {instruction.content}
                    </Text>
                  </Stack>
                  <Group gap="xs">
                    <ActionIcon
                      size="sm"
                      variant="subtle"
                      onClick={() => setEditingId(instruction.id)}
                    >
                      <IconRefresh size={14} />
                    </ActionIcon>
                    <ActionIcon
                      size="sm"
                      color="red"
                      variant="subtle"
                      onClick={() => handleDelete(instruction.id)}
                    >
                      <IconTrash size={14} />
                    </ActionIcon>
                  </Group>
                </Group>
              )}
            </Card>
          ))
        )}
      </Stack>

      <Alert variant="light" color="blue">
        <Text size="sm">
          {t('Custom instructions are added to the system prompt and applied before each message.')}
        </Text>
      </Alert>
    </Stack>
  )
}
