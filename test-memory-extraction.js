// 测试记忆提取功能
// 复制到浏览器控制台运行

(async function() {
  console.log('===== 测试记忆提取 =====')

  try {
    // 1. 模拟一个会话消息
    const testMessages = [
      {
        role: 'user',
        type: 'text',
        content: '我是一名程序员',
        timestamp: Date.now()
      },
      {
        role: 'assistant',
        type: 'text',
        content: '你好！很高兴认识你。',
        timestamp: Date.now()
      },
      {
        role: 'user',
        type: 'text',
        content: '我喜欢喝咖啡',
        timestamp: Date.now()
      },
      {
        role: 'assistant',
        type: 'text',
        content: '咖啡很棒！',
        timestamp: Date.now()
      },
      {
        role: 'user',
        type: 'text',
        content: '我擅长 TypeScript',
        timestamp: Date.now()
      }
    ]

    console.log('2. 调用记忆提取...')
    const result = await window.electronAPI.ipc.invoke('memory:extractFromSession', 'test-session', testMessages, {})

    console.log('3. 提取结果:', result)
    console.log('   - 记忆数量:', result.memories.length)
    console.log('   - 置信度:', result.confidence)
    console.log('   - 说明:', result.reasoning)

    if (result.memories.length > 0) {
      console.log('✅ 成功！记忆内容:', result.memories)

      // 查询所有记忆
      const allMemories = await window.electronAPI.ipc.invoke('memory:getAll', 'default')
      console.log('4. 数据库中的所有记忆:', allMemories.length, '条')
    } else {
      console.log('⚠️ 没有提取到记忆')
    }

  } catch (error) {
    console.error('❌ 测试失败:', error)
  }
})()
