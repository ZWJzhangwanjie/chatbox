/**
 * AI Ad Network - 调试面板组件
 *
 * 工程师C - UI与集成专家
 *
 * 调试面板功能：
 * - 显示请求日志
 * - Mock 数据生成器
 * - 广告预览
 * - 频率统计信息
 * - 性能追踪
 */

import {
  Accordion,
  Alert,
  Badge,
  Box,
  Button,
  Card,
  Code,
  Divider,
  Flex,
  Group,
  Paper,
  ScrollArea,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Tabs,
  Text,
  TextInput,
  Title,
  Tooltip,
} from '@mantine/core'
import {
  IconAlertCircle,
  IconBug,
  IconRefresh,
  IconSend,
  IconTrash,
  IconEye,
  IconDatabase,
  IconChartBar,
} from '@tabler/icons-react'
import { memo, useState, useCallback } from 'react'
import { useAdTrigger } from '../hooks/useAdTrigger'
import { useAdConfig, useAdConfigStore, useIsDebugMode } from '../hooks/useAdConfig'
import type { AdTriggerContext } from '../core/types'

// ============================================================================
// 类型定义
// ============================================================================

interface DebugPanelProps {
  /** 是否可见 */
  visible?: boolean
  /** 自定义类名 */
  className?: string
  /** 最大日志条数 */
  maxLogEntries?: number
}

// ============================================================================
// 请求日志类型
// ============================================================================

interface LogEntry {
  id: string
  timestamp: number
  type: 'request' | 'response' | 'error' | 'impression' | 'click'
  data: unknown
}

// ============================================================================
// Mock 数据生成器
// ============================================================================

/**
 * Mock 广告数据生成器
 */
export const mockAdData = {
  actionCard: [
    {
      id: 'mock-action-1',
      type: 'action_card',
      content: {
        title: 'Chatbox Pro - 限时优惠',
        body: '升级到 Pro 版本，解锁所有高级功能',
        image: 'https://via.placeholder.com/300x160',
        price: '$9.99/月',
        rating: 4.8,
        cta_text: '立即升级',
        cta_url: 'https://example.com/upgrade',
      },
    },
  ],
  suffix: [
    {
      id: 'mock-suffix-1',
      type: 'suffix',
      content: {
        suffix_content: {
          text: '顺便说一句，你可以使用键盘快捷键来提高效率！',
        },
      },
    },
  ],
  followup: [
    {
      id: 'mock-followup-1',
      type: 'followup',
      content: {
        followup_content: {
          question: '想了解更多关于 Chatbox 的功能吗？',
        },
      },
    },
  ],
  source: [
    {
      id: 'mock-source-1',
      type: 'source',
      content: {
        source_content: {
          title: '赞助内容：AI 助手最佳实践',
          url: 'https://example.com/best-practices',
        },
      },
    },
  ],
  static: [
    {
      id: 'mock-static-1',
      type: 'static',
      content: {
        image: 'https://via.placeholder.com/300x250',
        alt: 'Advertisement',
      },
    },
  ],
  lead_gen: [
    {
      id: 'mock-lead-1',
      type: 'lead_gen',
      content: {
        title: '订阅我们的新闻简报',
        body: '获取最新的 AI 技术资讯',
        cta_text: '提交',
        lead_gen_fields: [
          { type: 'email', placeholder: 'your@email.com', required: true },
          { type: 'name', placeholder: 'Your name', required: false },
        ],
      },
    },
  ],
}

// ============================================================================
// 调试面板主组件
// ============================================================================

export const DebugPanel = memo<DebugPanelProps>(
  ({ visible = true, className, maxLogEntries = 50 }) => {
    const isDebugMode = useIsDebugMode()
    const config = useAdConfig()
    const { shouldTrigger, fetchAds, getFrequencyStats } = useAdTrigger()

    // 本地状态
    const [logs, setLogs] = useState<LogEntry[]>([])
    const [testQuery, setTestQuery] = useState('如何使用 Chatbox？')
    const [testResponse, setTestResponse] = useState('Chatbox 是一个功能强大的 AI 助手...')
    const [selectedFormat, setSelectedFormat] = useState<string>('action_card')
    const [previewData, setPreviewData] = useState<unknown[]>(mockAdData.actionCard)
    const [frequencyStats, setFrequencyStats] = useState(getFrequencyStats())

    // 添加日志
    const addLog = useCallback((type: LogEntry['type'], data: unknown) => {
      const newLog: LogEntry = {
        id: Date.now().toString() + Math.random(),
        timestamp: Date.now(),
        type,
        data,
      }

      setLogs((prev) => {
        const updated = [newLog, ...prev]
        return updated.slice(0, maxLogEntries)
      })
    }, [maxLogEntries])

    // 清空日志
    const clearLogs = useCallback(() => {
      setLogs([])
    }, [])

    // 测试广告触发
    const testTrigger = useCallback(async () => {
      const context: AdTriggerContext = {
        query: testQuery,
        response: testResponse,
        sessionId: 'debug-session',
        isStreaming: false,
      }

      addLog('request', { context })

      try {
        // 检查是否应该触发
        const check = shouldTrigger(context)
        addLog('response', { check })

        if (check.shouldTrigger) {
          // 获取广告
          const result = await fetchAds(context, {
            formats: [selectedFormat],
            skipFrequencyCheck: true,
          })

          addLog('response', {
            ads: result.ads,
            isMock: result.isMock,
            duration: result.duration,
          })

          if (result.error) {
            addLog('error', { error: result.error.message })
          }
        }
      } catch (error) {
        addLog('error', { error: error instanceof Error ? error.message : String(error) })
      }

      // 更新频率统计
      setFrequencyStats(getFrequencyStats())
    }, [testQuery, testResponse, selectedFormat, shouldTrigger, fetchAds, getFrequencyStats, addLog])

    // 更新预览数据
    const updatePreview = useCallback(() => {
      setPreviewData(mockAdData[selectedFormat as keyof typeof mockAdData] || [])
    }, [selectedFormat])

    // 格式化时间戳
    const formatTimestamp = (timestamp: number) => {
      return new Date(timestamp).toLocaleTimeString()
    }

    // 格式化 JSON
    const formatJson = (data: unknown) => {
      return JSON.stringify(data, null, 2)
    }

    // 如果不在调试模式，不显示
    if (!isDebugMode) {
      return null
    }

    return (
      <Box className={`ad-debug-panel ${className || ''}`} display={visible ? 'block' : 'none'}>
        <Paper p="md" withBorder shadow="sm">
          <Group justify="space-between" mb="md">
            <Group gap="xs">
              <IconBug size={20} />
              <Title order={4}>广告调试面板</Title>
              <Badge color="orange" variant="light">调试模式</Badge>
            </Group>
            <Group gap="xs">
              <Button
                size="xs"
                variant="light"
                leftSection={<IconRefresh size={14} />}
                onClick={() => setFrequencyStats(getFrequencyStats())}
              >
                刷新统计
              </Button>
            </Group>
          </Group>

          <Tabs defaultValue="test">
            <Tabs.List>
              <Tabs.Tab value="test" leftSection={<IconSend size={14} />}>测试</Tabs.Tab>
              <Tabs.Tab value="preview" leftSection={<IconEye size={14} />}>预览</Tabs.Tab>
              <Tabs.Tab value="logs" leftSection={<IconDatabase size={14} />}>日志</Tabs.Tab>
              <Tabs.Tab value="stats" leftSection={<IconChartBar size={14} />}>统计</Tabs.Tab>
            </Tabs.List>

            {/* ===== 测试面板 ===== */}
            <Tabs.Panel value="test">
              <Stack gap="md" mt="md">
                <Card withBorder padding="sm">
                  <Stack gap="sm">
                    <Title order={6}>模拟用户输入</Title>
                    <TextInput
                      label="用户查询 (Query)"
                      placeholder="用户输入的内容..."
                      value={testQuery}
                      onChange={(e) => setTestQuery(e.currentTarget.value)}
                    />
                    <TextInput
                      label="AI 响应 (Response)"
                      placeholder="AI 回复的内容..."
                      value={testResponse}
                      onChange={(e) => setTestResponse(e.currentTarget.value)}
                    />

                    <Divider label="广告格式设置" labelPosition="center" />

                    <Select
                      label="选择要测试的广告格式"
                      data={[
                        { value: 'action_card', label: 'Action Card (卡片广告)' },
                        { value: 'suffix', label: 'Suffix (后缀广告)' },
                        { value: 'followup', label: 'Follow Up (跟进问题)' },
                        { value: 'source', label: 'Sponsored Source (赞助来源)' },
                        { value: 'static', label: 'Static (静态横幅)' },
                        { value: 'lead_gen', label: 'Lead Gen (线索收集)' },
                      ]}
                      value={selectedFormat}
                      onChange={(value) => setSelectedFormat(value || 'action_card')}
                    />

                    <Button
                      fullWidth
                      leftSection={<IconSend size={14} />}
                      onClick={testTrigger}
                    >
                      测试广告触发
                    </Button>
                  </Stack>
                </Card>

                {/* 当前配置预览 */}
                <Card withBorder padding="sm">
                  <Title order={6} mb="xs">当前配置</Title>
                  <SimpleGrid cols={2} spacing="xs">
                    <Group gap="xs">
                      <Text size="xs" c="dimmed">广告系统:</Text>
                      <Badge size="xs" color={config.enabled ? 'green' : 'gray'}>
                        {config.enabled ? '启用' : '禁用'}
                      </Badge>
                    </Group>
                    <Group gap="xs">
                      <Text size="xs" c="dimmed">Mock 模式:</Text>
                      <Badge size="xs" color={config.api.useMock ? 'blue' : 'gray'}>
                        {config.api.useMock ? '启用' : '禁用'}
                      </Badge>
                    </Group>
                  </SimpleGrid>
                </Card>
              </Stack>
            </Tabs.Panel>

            {/* ===== 预览面板 ===== */}
            <Tabs.Panel value="preview">
              <Stack gap="md" mt="md">
                <Group justify="space-between">
                  <Text size="sm" fw={500}>广告预览</Text>
                  <Button size="xs" variant="light" onClick={updatePreview}>
                    刷新预览
                  </Button>
                </Group>

                <ScrollArea h={400}>
                  <Stack gap="sm">
                    {previewData.map((ad, index) => (
                      <Card key={index} withBorder padding="sm" shadow="xs">
                        <Group justify="space-between" mb="xs">
                          <Text size="xs" fw={500} c="dimmed">
                            {formatJson(ad).split('\n').slice(0, 3).join('\n')}
                          </Text>
                          <Badge size="xs">{(ad as any).type}</Badge>
                        </Group>
                        <Code block>{formatJson(ad)}</Code>
                      </Card>
                    ))}
                  </Stack>
                </ScrollArea>
              </Stack>
            </Tabs.Panel>

            {/* ===== 日志面板 ===== */}
            <Tabs.Panel value="logs">
              <Stack gap="md" mt="md">
                <Group justify="space-between">
                  <Text size="sm" fw={500}>请求日志 ({logs.length})</Text>
                  <Button
                    size="xs"
                    variant="light"
                    color="red"
                    leftSection={<IconTrash size={14} />}
                    onClick={clearLogs}
                  >
                    清空日志
                  </Button>
                </Group>

                <ScrollArea h={400}>
                  <Stack gap="xs">
                    {logs.length === 0 ? (
                      <Alert variant="light" color="gray" icon={<IconAlertCircle size={16} />}>
                        <Text size="sm">暂无日志</Text>
                      </Alert>
                    ) : (
                      logs.map((log) => (
                        <Card
                          key={log.id}
                          padding="xs"
                          withBorder
                          style={{
                            borderLeft: `3px solid ${
                              log.type === 'error' ? 'var(--mantine-color-red-filled)' :
                              log.type === 'request' ? 'var(--mantine-color-blue-filled)' :
                              'var(--mantine-color-green-filled)'
                            }`
                          }}
                        >
                          <Group gap="xs" mb="xs">
                            <Badge size="xs" color={
                              log.type === 'error' ? 'red' :
                              log.type === 'request' ? 'blue' :
                              log.type === 'response' ? 'green' :
                              'gray'
                            }>
                              {log.type}
                            </Badge>
                            <Text size="xs" c="dimmed">
                              {formatTimestamp(log.timestamp)}
                            </Text>
                          </Group>
                          <Code block style={{ whiteSpace: 'pre-wrap', fontSize: '11px' }}>
                            {formatJson(log.data)}
                          </Code>
                        </Card>
                      ))
                    )}
                  </Stack>
                </ScrollArea>
              </Stack>
            </Tabs.Panel>

            {/* ===== 统计面板 ===== */}
            <Tabs.Panel value="stats">
              <Stack gap="md" mt="md">
                <Card withBorder padding="sm">
                  <Title order={6} mb="sm">会话统计</Title>
                  <SimpleGrid cols={2} spacing="md">
                    <Box>
                      <Text size="xs" c="dimmed">消息数</Text>
                      <Text size="lg" fw={700}>{frequencyStats.messageCount}</Text>
                    </Box>
                    <Box>
                      <Text size="xs" c="dimmed">广告展示数</Text>
                      <Text size="lg" fw={700} c="chatbox-brand">{frequencyStats.adCount}</Text>
                    </Box>
                    <Box>
                      <Text size="xs" c="dimmed">展示率</Text>
                      <Text size="lg" fw={700}>
                        {frequencyStats.messageCount > 0
                          ? `${((frequencyStats.adCount / frequencyStats.messageCount) * 100).toFixed(1)}%`
                          : '0%'}
                      </Text>
                    </Box>
                    <Box>
                      <Text size="xs" c="dimmed">上次展示</Text>
                      <Text size="lg" fw={700}>
                        {frequencyStats.lastAdTime
                          ? `${Math.floor((Date.now() - frequencyStats.lastAdTime) / 1000)}s 前`
                          : '从未'}
                      </Text>
                    </Box>
                  </SimpleGrid>
                </Card>

                <Card withBorder padding="sm">
                  <Title order={6} mb="sm">格式统计</Title>
                  <Table>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>格式</Table.Th>
                        <Table.Th>展示次数</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {Object.entries(frequencyStats.formatCounters).map(([format, count]) => (
                        <Table.Tr key={format}>
                          <Table.Td>
                            <Badge size="sm">{format}</Badge>
                          </Table.Td>
                          <Table.Td>{count as number}</Table.Td>
                        </Table.Tr>
                      ))}
                      {Object.keys(frequencyStats.formatCounters).length === 0 && (
                        <Table.Tr>
                          <Table.Td colSpan={2}>
                            <Text size="sm" c="dimmed" ta="center">暂无数据</Text>
                          </Table.Td>
                        </Table.Tr>
                      )}
                    </Table.Tbody>
                  </Table>
                </Card>
              </Stack>
            </Tabs.Panel>
          </Tabs>
        </Paper>
      </Box>
    )
  }
)

DebugPanel.displayName = 'DebugPanel'

// ============================================================================
// 导出
// ============================================================================

export default DebugPanel
