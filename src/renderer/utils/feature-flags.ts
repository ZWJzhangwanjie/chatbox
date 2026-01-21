import platform from '@/platform'

export const featureFlags = {
  mcp: true,  // 启用 MCP (Web 端仅支持 HTTP/SSE 传输)
  knowledgeBase: platform.type === 'desktop',
}
