import { createHashHistory, createRouter } from '@tanstack/react-router'
import platform from './platform'
import { routeTree } from './routeTree.gen'
import { Center, Text, Title } from '@mantine/core'

// Create a new router instance
export const router = createRouter({
  routeTree,
  defaultNotFoundComponent: () => {
    return (
      <Center style={{ height: '100vh', flexDirection: 'column', gap: 'md' }}>
        <Title order={3}>404</Title>
        <Text size="lg" c="dimmed">
          页面未找到
        </Text>
      </Center>
    )
  },
  defaultPreload: 'intent',
  history: platform.type === 'web' ? undefined : createHashHistory(),
})

// Register the router instance for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
