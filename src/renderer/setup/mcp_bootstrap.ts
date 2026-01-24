import { getBuiltinServerConfig } from '@/packages/mcp/builtin'
import { mcpController } from '@/packages/mcp/controller'
import platform from '@/platform'
import { NODE_ENV } from '@/variables'

function monitorServerStatus() {
  setInterval(() => {
    // Monitor server status
  }, 10000)
}

platform
  .getSettings()
  .then(({ mcp, licenseKey }) => {
    const servers = [
      ...(mcp.enabledBuiltinServers || []).map((id) => getBuiltinServerConfig(id, licenseKey)).filter((s) => !!s),
      ...(mcp.servers || []), // user defined servers
    ]
    mcpController.bootstrap(servers)
    if (NODE_ENV === 'development') {
      monitorServerStatus()
    }
  })
  .catch((err) => {
    console.error('mcp bootstrap error', err)
  })
