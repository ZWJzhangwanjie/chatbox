import NiceModal, { useModal } from '@ebay/nice-modal-react'
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Center,
  Divider,
  Flex,
  Group,
  Paper,
  Stack,
  Text,
  Tooltip,
} from '@mantine/core'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  IconArchive,
  IconArchiveFilled,
  IconEdit,
  IconPin,
  IconPinFilled,
  IconTrash,
} from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Modal } from '@/components/Overlay'
import platform from '@/platform'
import { useMantineTheme } from '@mantine/core'
import type { Memory } from 'src/shared/types'

const MemoryDetail = NiceModal.create<{ memory: Memory }>(({ memory }) => {
  const modal = useModal()
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const theme = useMantineTheme()

  // 切换置顶
  const togglePinMutation = useMutation({
    mutationFn: async () => {
      await platform.toggleMemoryPin(memory.id)
    },
    onSuccess: () => {
      toast.success(memory.pinned ? '已取消置顶' : '已置顶')
      queryClient.invalidateQueries({ queryKey: ['allMemories'] })
      queryClient.invalidateQueries({ queryKey: ['memorySummary'] })
      queryClient.invalidateQueries({ queryKey: ['memoryStats'] })
      modal.hide()
    },
  })

  // 切换归档
  const toggleArchiveMutation = useMutation({
    mutationFn: async () => {
      await platform.toggleMemoryArchive(memory.id)
    },
    onSuccess: () => {
      toast.success(memory.archived ? '记忆已取消归档' : '记忆已归档')
      queryClient.invalidateQueries({ queryKey: ['allMemories'] })
      queryClient.invalidateQueries({ queryKey: ['memorySummary'] })
      queryClient.invalidateQueries({ queryKey: ['memoryStats'] })
      modal.hide()
    },
  })

  // 删除记忆
  const deleteMutation = useMutation({
    mutationFn: async () => {
      await platform.deleteMemory(memory.id)
    },
    onSuccess: () => {
      toast.success('记忆已删除')
      queryClient.invalidateQueries({ queryKey: ['allMemories'] })
      queryClient.invalidateQueries({ queryKey: ['memorySummary'] })
      queryClient.invalidateQueries({ queryKey: ['memoryStats'] })
      modal.hide()
    },
  })

  const handleDelete = () => {
    if (confirm('确定要删除这条记忆吗？此操作不可撤销。')) {
      deleteMutation.mutate()
    }
  }

  const handleEdit = () => {
    modal.hide()
    NiceModal.show('memory-edit', { memory })
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getMemoryTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      explicit_preference: '偏好',
      explicit_fact: '事实',
      implicit_pattern: '模式',
      implicit_interest: '兴趣',
      implicit_context: '上下文',
    }
    return labels[type] || type
  }

  const getMemoryTypeColor = (type: string): string => {
    const colors: Record<string, string> = {
      explicit_preference: theme.colors.blue[5],
      explicit_fact: theme.colors.green[5],
      implicit_pattern: theme.colors.orange[5],
      implicit_interest: theme.colors.pink[5],
      implicit_context: theme.colors.gray[5],
    }
    return colors[type] || theme.colors.gray[5]
  }

  const getPriorityLabel = (priority: string): string => {
    const labels: Record<string, string> = {
      low: '低',
      medium: '中',
      high: '高',
      critical: '重要',
    }
    return labels[priority] || priority
  }

  const getPriorityColor = (priority: string): string => {
    const colors: Record<string, string> = {
      low: 'gray',
      medium: 'blue',
      high: 'orange',
      critical: 'red',
    }
    return colors[priority] || 'gray'
  }

  return (
    <Modal
      opened={modal.visible}
      onClose={() => modal.hide()}
      title={
        <Group gap="sm">
          <Text size="lg" fw={600}>
            记忆详情
          </Text>
          <Badge color={getMemoryTypeColor(memory.type)}>{getMemoryTypeLabel(memory.type)}</Badge>
          {memory.pinned && <IconPinFilled size={16} color={theme.colors.yellow[5]} />}
          {memory.archived && <IconArchiveFilled size={16} color={theme.colors.gray[5]} />}
        </Group>
      }
      size="lg"
    >
      <Stack gap="md">
        {/* 内容区域 */}
        <Paper withBorder p="md" style={{ borderLeft: `4px solid ${getMemoryTypeColor(memory.type)}` }}>
          <Stack gap="sm">
            <Text size="sm" c="dimmed">
              内容
            </Text>
            <Text size="md" style={{ lineHeight: 1.6 }}>
              {memory.content}
            </Text>
            {memory.summary && memory.summary !== memory.content && (
              <>
                <Divider />
                <Text size="sm" c="dimmed">
                  摘要
                </Text>
                <Text size="sm" style={{ lineHeight: 1.5 }}>
                  {memory.summary}
                </Text>
              </>
            )}
          </Stack>
        </Paper>

        {/* 元数据 */}
        <Stack gap="sm">
          <Text size="sm" fw={500} c="dimmed">
            元数据
          </Text>

          <SimpleGrid
            cols={{
              base: 1,
              xs: 2,
            }}
            gap="xs"
          >
            <Group>
              <Text size="sm" c="dimmed" miw={80}>
                重要性:
              </Text>
              <Text size="sm">{Math.round((memory.importance || 0) * 100)}%</Text>
            </Group>

            <Group>
              <Text size="sm" c="dimmed" miw={80}>
                置信度:
              </Text>
              <Text size="sm">{Math.round((memory.confidence || 0) * 100)}%</Text>
            </Group>

            <Group>
              <Text size="sm" c="dimmed" miw={80}>
                优先级:
              </Text>
              <Badge color={getPriorityColor(memory.priority)} size="sm">
                {getPriorityLabel(memory.priority)}
              </Badge>
            </Group>

            <Group>
              <Text size="sm" c="dimmed" miw={80}>
                来源:
              </Text>
              <Text size="sm">{memory.source === 'explicit' ? '手动添加' : 'AI 提取'}</Text>
            </Group>

            <Group>
              <Text size="sm" c="dimmed" miw={80}>
                创建时间:
              </Text>
              <Text size="sm">{formatDate(memory.createdAt)}</Text>
            </Group>

            <Group>
              <Text size="sm" c="dimmed" miw={80}>
                最后访问:
              </Text>
              <Text size="sm">{formatDate(memory.lastAccessedAt)}</Text>
            </Group>

            <Group>
              <Text size="sm" c="dimmed" miw={80}>
                访问次数:
              </Text>
              <Text size="sm">{memory.accessCount || 0} 次</Text>
            </Group>

            {memory.category && (
              <Group>
                <Text size="sm" c="dimmed" miw={80}>
                  分类:
                </Text>
                <Text size="sm">{memory.category}</Text>
              </Group>
            )}
          </SimpleGrid>
        </Stack>

        {/* 关联信息 */}
        {(memory.relatedSessionId || memory.relatedModelId || (memory.tags && memory.tags.length > 0)) && (
          <>
            <Divider />
            <Stack gap="sm">
              <Text size="sm" fw={500} c="dimmed">
                关联信息
              </Text>

              {memory.relatedSessionId && (
                <Group>
                  <Text size="sm" c="dimmed" miw={80}>
                    来源会话:
                  </Text>
                  <Text size="sm" truncate maw={200}>
                    {memory.relatedSessionId}
                  </Text>
                </Group>
              )}

              {memory.relatedModelId && (
                <Group>
                  <Text size="sm" c="dimmed" miw={80}>
                    相关模型:
                  </Text>
                  <Text size="sm">{memory.relatedModelId}</Text>
                </Group>
              )}

              {memory.tags && memory.tags.length > 0 && (
                <Group>
                  <Text size="sm" c="dimmed" miw={80}>
                    标签:
                  </Text>
                  <Group gap="xs">
                    {memory.tags.map((tag, index) => (
                      <Badge key={index} variant="light" size="sm">
                        {tag}
                      </Badge>
                    ))}
                  </Group>
                </Group>
              )}
            </Stack>
          </>
        )}

        {/* 有效期 */}
        {memory.expiresAt && (
          <>
            <Divider />
            <Group>
              <Text size="sm" c="dimmed" miw={80}>
                有效期至:
              </Text>
              <Text size="sm">{formatDate(memory.expiresAt)}</Text>
            </Group>
          </>
        )}

        {/* 操作按钮 */}
        <Divider />
        <Group justify="flex-end" gap="xs">
          {!memory.archived && (
            <Tooltip label={memory.pinned ? '取消置顶' : '置顶'}>
              <ActionIcon
                variant="light"
                color={memory.pinned ? 'yellow' : 'gray'}
                size="lg"
                onClick={() => togglePinMutation.mutate()}
                loading={togglePinMutation.isPending}
              >
                {memory.pinned ? <IconPinFilled size={20} /> : <IconPin size={20} />}
              </ActionIcon>
            </Tooltip>
          )}

          <Tooltip label={memory.archived ? '取消归档' : '归档'}>
            <ActionIcon
              variant="light"
              size="lg"
              onClick={() => toggleArchiveMutation.mutate()}
              loading={toggleArchiveMutation.isPending}
            >
              {memory.archived ? <IconArchiveFilled size={20} /> : <IconArchive size={20} />}
            </ActionIcon>
          </Tooltip>

          <Button leftSection={<IconEdit size={16} />} variant="light" onClick={handleEdit}>
            编辑
          </Button>

          <Button
            leftSection={<IconTrash size={16} />}
            color="red"
            variant="light"
            onClick={handleDelete}
            loading={deleteMutation.isPending}
          >
            删除
          </Button>
        </Group>
      </Stack>
    </Modal>
  )
})

export default MemoryDetail

// 添加 SimpleGrid 的导入
import { SimpleGrid } from '@mantine/core'
