import NiceModal, { useModal } from '@ebay/nice-modal-react'
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Divider,
  Group,
  NumberInput,
  Select,
  Stack,
  Text,
  Textarea,
  TextInput,
} from '@mantine/core'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Modal } from '@/components/Overlay'
import platform from '@/platform'
import { useMantineTheme } from '@mantine/core'
import type { Memory, MemoryType, MemoryPriority, MemorySource } from 'src/shared/types'

const MemoryEdit = NiceModal.create<{ memory?: Memory }>(({ memory }) => {
  const modal = useModal()
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const theme = useMantineTheme()

  const isNew = !memory

  const [content, setContent] = useState(memory?.content || '')
  const [summary, setSummary] = useState(memory?.summary || '')
  const [type, setType] = useState<MemoryType>(memory?.type || 'explicit_preference')
  const [source, setSource] = useState<MemorySource>(memory?.source || 'explicit')
  const [importance, setImportance] = useState<number>((memory?.importance || 0.5) * 100)
  const [priority, setPriority] = useState<MemoryPriority>(memory?.priority || 'medium')
  const [category, setCategory] = useState(memory?.category || '')
  const [tags, setTags] = useState(memory?.tags?.join(', ') || '')

  useEffect(() => {
    if (memory) {
      setContent(memory.content)
      setSummary(memory.summary || '')
      setType(memory.type)
      setSource(memory.source)
      setImportance((memory.importance || 0.5) * 100)
      setPriority(memory.priority || 'medium')
      setCategory(memory.category || '')
      setTags(memory.tags?.join(', ') || '')
    }
  }, [memory])

  // 更新或创建记忆
  const saveMutation = useMutation({
    mutationFn: async () => {
      const tagArray = tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)

      if (isNew) {
        // 创建新记忆
        return await platform.addMemory({
          userId: 'default',
          type,
          source,
          content,
          summary: summary || undefined,
          importance: importance / 100,
          priority,
          category: category || undefined,
          tags: tagArray.length > 0 ? tagArray : undefined,
        })
      } else {
        // 更新现有记忆
        return await platform.updateMemory(memory.id, {
          content,
          summary: summary || undefined,
          type,
          source,
          importance: importance / 100,
          priority,
          category: category || undefined,
          tags: tagArray.length > 0 ? tagArray : undefined,
        })
      }
    },
    onSuccess: () => {
      toast.success(isNew ? '记忆已创建' : '记忆已更新')
      queryClient.invalidateQueries({ queryKey: ['allMemories'] })
      queryClient.invalidateQueries({ queryKey: ['memorySummary'] })
      queryClient.invalidateQueries({ queryKey: ['memoryStats'] })
      modal.hide()
    },
    onError: (error) => {
      toast.error(`操作失败: ${error.message}`)
    },
  })

  const handleSave = () => {
    if (!content.trim()) {
      toast.error('请输入记忆内容')
      return
    }
    saveMutation.mutate()
  }

  const typeOptions = [
    { value: 'explicit_preference', label: '偏好' },
    { value: 'explicit_fact', label: '事实' },
    { value: 'implicit_pattern', label: '模式' },
    { value: 'implicit_interest', label: '兴趣' },
    { value: 'implicit_context', label: '上下文' },
  ]

  const sourceOptions = [
    { value: 'explicit', label: '手动添加' },
    { value: 'implicit', label: 'AI 提取' },
    { value: 'inferred', label: '推断' },
  ]

  const priorityOptions = [
    { value: 'low', label: '低' },
    { value: 'medium', label: '中' },
    { value: 'high', label: '高' },
    { value: 'critical', label: '重要' },
  ]

  return (
    <Modal
      opened={modal.visible}
      onClose={() => modal.hide()}
      title={isNew ? '创建记忆' : '编辑记忆'}
      size="md"
    >
      <Stack gap="md">
        {/* 记忆类型 */}
        <Stack gap="xs">
          <Text size="sm" fw={500}>
            记忆类型
          </Text>
          <Select
            data={typeOptions}
            value={type}
            onChange={(v) => setType(v as MemoryType)}
            disabled={!isNew}
          />
        </Stack>

        {/* 来源 */}
        <Stack gap="xs">
          <Text size="sm" fw={500}>
            来源
          </Text>
          <Select data={sourceOptions} value={source} onChange={(v) => setSource(v as MemorySource)} />
        </Stack>

        {/* 内容 */}
        <Stack gap="xs">
          <Text size="sm" fw={500}>
            内容 *
          </Text>
          <Textarea
            placeholder="输入记忆的详细内容..."
            value={content}
            onChange={(e) => setContent(e.currentTarget.value)}
            minRows={3}
            maxRows={8}
            autosize
          />
        </Stack>

        {/* 摘要 */}
        <Stack gap="xs">
          <Text size="sm" fw={500}>
            摘要
          </Text>
          <Textarea
            placeholder="简短描述（可选）"
            value={summary}
            onChange={(e) => setSummary(e.currentTarget.value)}
            minRows={1}
            maxRows={3}
            autosize
          />
        </Stack>

        {/* 分类 */}
        <Stack gap="xs">
          <Text size="sm" fw={500}>
            分类
          </Text>
          <TextInput
            placeholder="例如: 个人信息、使用习惯、沟通风格..."
            value={category}
            onChange={(e) => setCategory(e.currentTarget.value)}
          />
        </Stack>

        {/* 标签 */}
        <Stack gap="xs">
          <Text size="sm" fw={500}>
            标签
          </Text>
          <TextInput
            placeholder="用逗号分隔多个标签，如: 工作, 编程, 偏好"
            value={tags}
            onChange={(e) => setTags(e.currentTarget.value)}
          />
          {tags && (
            <Group gap="xs">
              {tags
                .split(',')
                .map((t) => t.trim())
                .filter(Boolean)
                .map((tag, index) => (
                  <Badge key={index} variant="light" size="sm">
                    {tag}
                  </Badge>
                ))}
            </Group>
          )}
        </Stack>

        {/* 重要性 */}
        <Stack gap="xs">
          <Text size="sm" fw={500}>
            重要性: {importance}%
          </Text>
          <NumberInput value={importance} onChange={(v) => setImportance(v as number)} min={0} max={100} />
        </Stack>

        {/* 优先级 */}
        <Stack gap="xs">
          <Text size="sm" fw={500}>
            优先级
          </Text>
          <Select data={priorityOptions} value={priority} onChange={(v) => setPriority(v as MemoryPriority)} />
        </Stack>

        <Divider />

        {/* 操作按钮 */}
        <Group justify="flex-end" gap="xs">
          <Button variant="default" onClick={() => modal.hide()}>
            取消
          </Button>
          <Button onClick={handleSave} loading={saveMutation.isPending}>
            {isNew ? '创建' : '保存'}
          </Button>
        </Group>
      </Stack>
    </Modal>
  )
})

export default MemoryEdit
