import { useMutation, useQuery } from '@tanstack/react-query'
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Card,
  Center,
  Checkbox,
  Container,
  Divider,
  Flex,
  Group,
  Input,
  Menu,
  Modal,
  NumberInput,
  Paper,
  Progress,
  RingProgress,
  ScrollArea,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  Tabs,
  Text,
  Textarea,
  TextInput,
  Title,
  Tooltip,
  useMantineTheme,
} from '@mantine/core'
import NiceModal from '@ebay/nice-modal-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  IconBrain,
  IconDots,
  IconRefresh,
  IconSearch,
  IconTrash,
  IconEdit,
  IconFilter,
  IconPin,
  IconPinFilled,
  IconArchive,
  IconArchiveFilled,
  IconX,
  IconCheck,
  IconPlus,
  IconDownload,
  IconUpload,
} from '@tabler/icons-react'
import Page from '@/components/Page'
import { useSettingsStore } from '@/stores/settingsStore'
import platform from '@/platform'
import { toast } from 'sonner'
import { createFileRoute } from '@tanstack/react-router'
import type { Memory } from 'src/shared/types'
import { downloadCSV, exportMemories, exportMemoriesAsCSV, importMemoriesFromFile } from '@/utils/memoryExport'

export const Route = createFileRoute('/settings/memory')({
  component: RouteComponent,
})

export function RouteComponent() {
  const { t } = useTranslation()
  const { setSettings, ...settings } = useSettingsStore((state) => state)
  const theme = useMantineTheme()
  const [activeTab, setActiveTab] = useState<'overview' | 'all'>('overview')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // 获取所有记忆
  const { data: allMemories = [], refetch: refetchMemories } = useQuery({
    queryKey: ['allMemories', activeTab === 'all' ? { filterType } : {}],
    queryFn: async () => {
      // 移除 Web 模式的限制，现在 Web 模式也支持记忆功能
      return await platform.getAllMemories()
    },
    refetchInterval: 30000,
  })

  // 获取记忆统计
  const { data: stats, refetch: refetchStats } = useQuery({
    queryKey: ['memoryStats'],
    queryFn: async () => {
      return await platform.getMemoryStats()
    },
    refetchInterval: 30000,
  })

  // 获取记忆摘要
  const { data: summary, refetch: refetchSummary } = useQuery({
    queryKey: ['memorySummary'],
    queryFn: async () => {
      return await platform.getMemorySummary()
    },
    refetchInterval: 30000,
  })

  // 过滤后的记忆列表
  const filteredMemories = allMemories
    .filter((m) => {
      if (filterType !== 'all' && m.type !== filterType) return false
      if (m.archived && activeTab === 'overview') return false
      if (searchQuery && !m.content.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !m.summary?.toLowerCase().includes(searchQuery.toLowerCase())) return false
      return true
    })
    .sort((a, b) => {
      // 置顶的在前面
      if (a.pinned && !b.pinned) return -1
      if (!a.pinned && b.pinned) return 1
      // 按创建时间倒序
      return b.createdAt - a.createdAt
    })

  // 切换记忆开关
  const toggleMemoryMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      setSettings({ memoryEnabled: enabled })
    },
    onSuccess: (_, enabled) => {
      toast.success(enabled ? '记忆功能已启用' : '记忆功能已关闭')
    },
  })

  // 更新记忆设置
  const updateMemorySettingsMutation = useMutation({
    mutationFn: async (updates: { autoExtract?: boolean; extractOnMessageCount?: number; privacyMode?: boolean }) => {
      setSettings({
        memorySettings: {
          ...settings.memorySettings,
          ...updates,
        },
      })
    },
    onSuccess: () => {
      toast.success('记忆设置已更新')
    },
  })

  // 批量删除记忆
  const deleteSelectedMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await platform.deleteMemoriesBatch(ids)
    },
    onSuccess: (_, ids) => {
      setSelectedIds(new Set())
      refetchMemories()
      refetchStats()
      toast.success(`已删除 ${ids.length} 条记忆`)
    },
  })

  // 清除所有记忆
  const clearAllMemoriesMutation = useMutation({
    mutationFn: async () => {
      const allMemories = await platform.getAllMemories()
      if (allMemories.length > 0) {
        await platform.deleteMemoriesBatch(allMemories.map((m) => m.id))
      }
    },
    onSuccess: () => {
      refetchStats()
      refetchSummary()
      refetchMemories()
      toast.success('所有记忆已清除')
    },
    onError: () => {
      toast.error('清除记忆失败')
    },
  })

  const handleClearAllMemories = () => {
    if (!stats || stats.total === 0) return
    if (confirm(`确定要清除所有 ${stats.total} 条记忆吗？此操作不可撤销。`)) {
      clearAllMemoriesMutation.mutate()
    }
  }

  const isAllSelected = filteredMemories.length > 0 && selectedIds.size === filteredMemories.length

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredMemories.map((m) => m.id)))
    }
  }

  const toggleSelectMemory = (id: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
  }

  // 打开记忆详情
  const handleViewMemory = (memory: Memory) => {
    NiceModal.show('memory-detail', { memory })
  }

  // 创建新记忆
  const handleCreateMemory = () => {
    NiceModal.show('memory-edit', {})
  }

  // 导出记忆
  const handleExportMemories = async (format: 'json' | 'csv' = 'json') => {
    try {
      if (format === 'json') {
        await exportMemories(allMemories)
        toast.success('记忆已导出为 JSON')
      } else {
        const csv = exportMemoriesAsCSV(allMemories)
        downloadCSV(csv)
        toast.success('记忆已导出为 CSV')
      }
    } catch (error) {
      toast.error(`导出失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  // 导入记忆
  const handleImportMemories = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      toast.loading('正在导入记忆...', { id: 'import' })

      const memories = await importMemoriesFromFile(file, (current, total) => {
        toast.loading(`正在导入记忆... ${current}/${total}`, { id: 'import' })
      })

      // 批量添加到数据库
      for (const memory of memories) {
        await platform.addMemory(memory)
      }

      toast.success(`已导入 ${memories.length} 条记忆`, { id: 'import' })

      // 刷新数据
      refetchMemories()
      refetchStats()
      refetchSummary()
    } catch (error) {
      toast.error(`导入失败: ${error instanceof Error ? error.message : '未知错误'}`, { id: 'import' })
    }

    // 重置文件输入
    event.target.value = ''
  }

  return (
    <Page
      title={t('Memory Management')}
      left={
        <ActionIcon variant="subtle" size={28} color="chatbox-secondary" mr="sm" onClick={() => refetchStats()}>
          <IconRefresh size={20} />
        </ActionIcon>
      }
      right={
        platform.type !== 'web' && (
          <Button
            leftSection={<IconPlus size={16} />}
            size="sm"
            onClick={handleCreateMemory}
          >
            添加记忆
          </Button>
        )
      }
    >
      <Container size="lg" py="md">
        <Stack gap="xl">
          {/* 记忆开关 */}
          <Card withBorder p="md">
            <Group justify="space-between">
              <Group>
                <IconBrain size={24} color={theme.colors[theme.primaryColor][4]} />
                <Stack gap={0}>
                  <Text fw={500}>{t('Enable Memory')}</Text>
                  <Text size="sm" c="dimmed">{t('Allow AI to remember information about you across conversations')}</Text>
                </Stack>
              </Group>
              <Switch
                checked={settings.memoryEnabled ?? true}
                onChange={(e) => toggleMemoryMutation.mutate(e.currentTarget.checked)}
              />
            </Group>
          </Card>

          {settings.memoryEnabled && (
            <>
              {/* 标签页 */}
              <Tabs value={activeTab} onChange={(v) => setActiveTab(v as any)}>
                <Tabs.List>
                  <Tabs.Tab value="overview" leftSection={<IconBrain size={16} />}>
                    概览
                  </Tabs.Tab>
                  <Tabs.Tab value="all" leftSection={<IconDots size={16} />}>
                    所有记忆
                  </Tabs.Tab>
                </Tabs.List>

                <Tabs.Panel value="overview">
                  <Stack gap="xl">
                    {/* 记忆统计 */}
                    <Card withBorder p="md">
                      <Stack gap="md">
                        <Group justify="space-between">
                          <Text fw={500}>{t('Memory Statistics')}</Text>
                          <Group gap="xs">
                            <Menu>
                              <Menu.Target>
                                <Button size="xs" variant="light" leftSection={<IconDownload size={14} />} disabled={!stats || stats.total === 0}>
                                  导出
                                </Button>
                              </Menu.Target>
                              <Menu.Dropdown>
                                <Menu.Item
                                  leftSection={<IconDownload size={14} />}
                                  onClick={() => handleExportMemories('json')}
                                >
                                  导出为 JSON
                                </Menu.Item>
                                <Menu.Item
                                  leftSection={<IconDownload size={14} />}
                                  onClick={() => handleExportMemories('csv')}
                                >
                                  导出为 CSV
                                </Menu.Item>
                              </Menu.Dropdown>
                            </Menu>

                            <Button
                              size="xs"
                              variant="light"
                              leftSection={<IconUpload size={14} />}
                              component="label"
                              disabled={platform.type === 'web'}
                            >
                              导入
                              <input type="file" accept=".json" style={{ display: 'none' }} onChange={handleImportMemories} />
                            </Button>

                            <Button
                              size="xs"
                              variant="light"
                              color="red"
                              leftSection={<IconTrash size={14} />}
                              onClick={handleClearAllMemories}
                              disabled={!stats || stats.total === 0}
                            >
                              {t('Clear All Memories')}
                            </Button>
                          </Group>
                        </Group>

                        {stats && stats.total > 0 ? (
                          <SimpleGrid cols={{ base: 2, xs: 4 }} spacing="md">
                            <Stack align="center" gap="xs">
                              <RingProgress size={60} thickness={4} roundCaps label={stats.total} sections={[{ value: 100, color: theme.primaryColor }]} />
                              <Text size="xs" c="dimmed">{t('Total')}</Text>
                            </Stack>

                            <Stack align="center" gap="xs">
                              <Text size="xl" fw={500}>{stats.thisWeek}</Text>
                              <Text size="xs" c="dimmed">本周新增</Text>
                            </Stack>

                            <Stack align="center" gap="xs">
                              <Text size="xl" fw={500}>{stats.thisMonth}</Text>
                              <Text size="xs" c="dimmed">本月新增</Text>
                            </Stack>

                            <Stack align="center" gap="xs">
                              <Text size="xl" fw={500}>{summary?.pinnedCount || 0}</Text>
                              <Text size="xs" c="dimmed">已置顶</Text>
                            </Stack>
                          </SimpleGrid>
                        ) : (
                          <Center py="xl">
                            <Stack align="center" gap="sm">
                              <IconBrain size={48} opacity={0.3} />
                              <Text c="dimmed">{t('Start chatting to build memories')}</Text>
                            </Stack>
                          </Center>
                        )}

                        {/* 记忆分类统计 */}
                        {stats && stats.byCategory && Object.keys(stats.byCategory).length > 0 && (
                          <>
                            <Divider />
                            <SimpleGrid cols={{ base: 1, xs: 3 }} spacing="sm">
                              {Object.entries(stats.byCategory).map(([category, count]) => (
                                <Group key={category} justify="space-between">
                                  <Text size="sm">{getCategoryLabel(category)}</Text>
                                  <Text size="sm" fw={500}>{count}</Text>
                                </Group>
                              ))}
                            </SimpleGrid>
                          </>
                        )}
                      </Stack>
                    </Card>

                    {/* 记忆设置 */}
                    <Card withBorder p="md">
                      <Stack gap="md">
                        <Text fw={500}>{t('Memory Settings')}</Text>

                        <Group>
                          <Switch
                            label={t('Auto Extract')}
                            description={t('Automatically extract memories from conversations')}
                            checked={settings.memorySettings?.autoExtract ?? true}
                            onChange={(e) => updateMemorySettingsMutation.mutate({ autoExtract: e.currentTarget.checked })}
                          />
                        </Group>

                        {settings.memorySettings?.autoExtract && (
                          <Group>
                            <NumberInput
                              label={t('Extract Every')}
                              description="条消息后提取一次（1-10条）"
                              value={settings.memorySettings?.extractOnMessageCount ?? 3}
                              min={1}
                              max={10}
                              step={1}
                              onChange={(value) => updateMemorySettingsMutation.mutate({ extractOnMessageCount: value as number })}
                              style={{ flex: 1, maxWidth: 200 }}
                            />
                          </Group>
                        )}

                        <Divider my="sm" />

                        <Group>
                          <Switch
                            label={t('Privacy Mode')}
                            description={t("Don't store sensitive personal information")}
                            checked={settings.memorySettings?.privacyMode ?? false}
                            onChange={(e) => updateMemorySettingsMutation.mutate({ privacyMode: e.currentTarget.checked })}
                          />
                        </Group>
                      </Stack>
                    </Card>

                    {/* 最近记忆 */}
                    {summary && summary.recentMemories && summary.recentMemories.length > 0 && (
                      <Card withBorder p="md">
                        <Stack gap="md">
                          <Text fw={500}>{t('Recent')} ({summary.recentMemories.length})</Text>
                          <ScrollArea.Autosize mah={400}>
                            <Stack gap="sm">
                              {summary.recentMemories.map((memory) => (
                                <MemoryCard key={memory.id} memory={memory} refetch={refetchMemories} />
                              ))}
                            </Stack>
                          </ScrollArea.Autosize>
                        </Stack>
                      </Card>
                    )}
                  </Stack>
                </Tabs.Panel>

                <Tabs.Panel value="all">
                  <Card withBorder p="md">
                    <Stack gap="md">
                      {/* 搜索和筛选 */}
                      <Group>
                        <TextInput
                          placeholder={t('Search Memories')}
                          leftSection={<IconSearch size={16} />}
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.currentTarget.value)}
                          style={{ flex: 1 }}
                        />
                        <Select
                          data={[
                            { value: 'all', label: '所有类型' },
                            { value: 'explicit_preference', label: '偏好' },
                            { value: 'explicit_fact', label: '事实' },
                            { value: 'implicit_pattern', label: '模式' },
                            { value: 'implicit_interest', label: '兴趣' },
                          ]}
                          value={filterType}
                          onChange={(v) => setFilterType(v)}
                          leftSection={<IconFilter size={16} />}
                        />
                      </Group>

                      {/* 批量操作 */}
                      {selectedIds.size > 0 && (
                        <Group justify="space-between" bg="blue.0" p="xs" style={{ borderRadius: 4 }}>
                          <Text size="sm">已选择 {selectedIds.size} 条记忆</Text>
                          <Group gap="xs">
                            <Button
                              size="xs"
                              variant="light"
                              color="red"
                              leftSection={<IconTrash size={14} />}
                              onClick={() => {
                                if (confirm(`确定要删除选中的 ${selectedIds.size} 条记忆吗？`)) {
                                  deleteSelectedMutation.mutate(Array.from(selectedIds))
                                }
                              }}
                            >
                              删除
                            </Button>
                            <ActionIcon
                              size="md"
                              variant="light"
                              onClick={() => setSelectedIds(new Set())}
                            >
                              <IconX size={16} />
                            </ActionIcon>
                          </Group>
                        </Group>
                      )}

                      {/* 记忆列表 */}
                      {filteredMemories.length > 0 ? (
                        <>
                          <Group justify="space-between">
                            <Checkbox
                              label="全选"
                              checked={isAllSelected}
                              onChange={toggleSelectAll}
                            />
                            <Text size="sm" c="dimmed">
                              共 {filteredMemories.length} 条记忆
                            </Text>
                          </Group>
                          <ScrollArea.Autosize mah={500}>
                            <Stack gap="sm">
                              {filteredMemories.map((memory) => (
                                <MemoryCard
                                  key={memory.id}
                                  memory={memory}
                                  selected={selectedIds.has(memory.id)}
                                  onSelect={() => toggleSelectMemory(memory.id)}
                                  refetch={refetchMemories}
                                />
                              ))}
                            </Stack>
                          </ScrollArea.Autosize>
                        </>
                      ) : (
                        <Center py="xl">
                          <Text c="dimmed">{t('No memories found')}</Text>
                        </Center>
                      )}
                    </Stack>
                  </Card>
                </Tabs.Panel>
              </Tabs>
            </>
          )}
        </Stack>
      </Container>
    </Page>
  )
}

// 记忆卡片组件
function MemoryCard({
  memory,
  selected,
  onSelect,
  refetch,
  showViewDetail = true,
}: {
  memory: Memory
  selected?: boolean
  onSelect?: () => void
  refetch?: () => void
  showViewDetail?: boolean
}) {
  const theme = useMantineTheme()

  const togglePinMutation = useMutation({
    mutationFn: async () => {
      await platform.toggleMemoryPin(memory.id)
    },
    onSuccess: () => {
      toast.success(memory.pinned ? '已取消置顶' : '已置顶')
      refetch?.()
    },
  })

  const toggleArchiveMutation = useMutation({
    mutationFn: async () => {
      await platform.toggleMemoryArchive(memory.id)
    },
    onSuccess: () => {
      toast.success(memory.archived ? '记忆已取消归档' : '记忆已归档')
      refetch?.()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await platform.deleteMemory(memory.id)
    },
    onSuccess: () => {
      toast.success('记忆已删除')
      refetch?.()
    },
  })

  const handleClick = () => {
    if (showViewDetail && !onSelect) {
      NiceModal.show('memory-detail', { memory })
    }
  }

  return (
    <Paper
      p="sm"
      withBorder
      style={{
        borderLeft: `3px solid ${getMemoryTypeColor(memory.type, theme)}`,
        opacity: memory.archived ? 0.6 : 1,
        cursor: showViewDetail || onSelect ? 'pointer' : 'default',
      }}
      onClick={(e) => {
        if (!e.defaultPrevented) {
          handleClick()
          onSelect?.()
        }
      }}
    >
      <Group justify="space-between" wrap="nowrap">
        {onSelect && (
          <Checkbox
            checked={selected}
            onChange={onSelect}
            onClick={(e) => e.stopPropagation()}
            style={{ flex: '0 0 auto' }}
          />
        )}
        <Stack gap={0} style={{ flex: 1, minWidth: 0 }}>
          <Group gap="xs" wrap="nowrap">
            <Text size="xs" c="dimmed">
              {getMemoryTypeLabel(memory.type)}
            </Text>
            {memory.pinned && <IconPinFilled size={14} color={theme.colors.yellow[5]} />}
            {memory.archived && <IconArchiveFilled size={14} color={theme.colors.gray[5]} />}
          </Group>
          <Text size="sm" lineClamp={2}>
            {memory.summary || memory.content}
          </Text>
          <Group gap="xs">
            <Text size="xs" c="dimmed">
              重要性: {Math.round((memory.importance || 0) * 100)}%
            </Text>
            <Text size="xs" c="dimmed">
              置信度: {Math.round((memory.confidence || 0) * 100)}%
            </Text>
          </Group>
        </Stack>

        <Group gap={4}>
          {!memory.archived && (
            <Tooltip label={memory.pinned ? '取消置顶' : '置顶'}>
              <ActionIcon
                size="md"
                variant="subtle"
                color={memory.pinned ? 'yellow' : 'gray'}
                onClick={() => togglePinMutation.mutate()}
              >
                {memory.pinned ? <IconPinFilled size={16} /> : <IconPin size={16} />}
              </ActionIcon>
            </Tooltip>
          )}

          <Tooltip label={memory.archived ? '取消归档' : '归档'}>
            <ActionIcon
              size="md"
              variant="subtle"
              onClick={() => toggleArchiveMutation.mutate()}
            >
              {memory.archived ? <IconArchiveFilled size={16} /> : <IconArchive size={16} />}
            </ActionIcon>
          </Tooltip>

          <Tooltip label="删除">
            <ActionIcon
              size="md"
              variant="subtle"
              color="red"
              onClick={() => {
                if (confirm('确定要删除这条记忆吗？')) {
                  deleteMutation.mutate()
                }
              }}
            >
              <IconTrash size={16} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Group>
    </Paper>
  )
}

// 获取记忆类型标签
function getMemoryTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    explicit_preference: '偏好',
    explicit_fact: '事实',
    implicit_pattern: '模式',
    implicit_interest: '兴趣',
    implicit_context: '上下文',
  }
  return labels[type] || type
}

// 获取记忆类型颜色
function getMemoryTypeColor(type: string, theme: any): string {
  const colors: Record<string, string> = {
    explicit_preference: theme.colors.blue[5],
    explicit_fact: theme.colors.green[5],
    implicit_pattern: theme.colors.orange[5],
    implicit_interest: theme.colors.pink[5],
    implicit_context: theme.colors.gray[5],
  }
  return colors[type] || theme.colors.gray[5]
}

// 获取分类标签
function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    preference: '偏好',
    'personal-info': '个人信息',
    'usage-pattern': '使用习惯',
    'communication-style': '沟通风格',
  }
  return labels[category] || category
}
