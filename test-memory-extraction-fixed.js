// 测试记忆提取功能 - 修正版
// 复制到浏览器控制台运行

(async function() {
  console.log('===== 测试记忆提取 =====')

  // 首先检查 electronAPI 是否存在
  console.log('1. 检查 electronAPI:', typeof window.electronAPI)
  if (!window.electronAPI) {
    console.error('❌ electronAPI 不存在！请确保在桌面应用中运行此脚本')
    return
  }
  console.log('   electronAPI.invoke:', typeof window.electronAPI.invoke)

  try {
    // 模拟一个会话消息
    const testMessages = [
      { role: 'user', type: 'text', content: '我是一名程序员', timestamp: Date.now() },
      { role: 'assistant', type: 'text', content: '你好！', timestamp: Date.now() },
      { role: 'user', type: 'text', content: '我喜欢喝咖啡', timestamp: Date.now() },
      { role: 'assistant', type: 'text', content: '咖啡很棒！', timestamp: Date.now() },
      { role: 'user', type: 'text', content: '我擅长 TypeScript', timestamp: Date.now() }
    ]

    console.log('2. 调用记忆提取...')
    console.log('   消息数量:', testMessages.length)

    const result = await window.electronAPI.invoke('memory:extractFromSession', 'test-session', testMessages, {})

    console.log('3. 提取结果:', result)
    console.log('   - 记忆数量:', result.memories.length)
    console.log('   - 置信度:', result.confidence)
    console.log('   - 说明:', result.reasoning)

    if (result.memories.length > 0) {
      console.log('✅ 成功！记忆内容:')
      result.memories.forEach((m, i) => {
        console.log(`   [${i + 1}] ${m.content} (type: ${m.type})`)
      })

      // 查询所有记忆
      console.log('4. 查询数据库中的所有记忆...')
      const allMemories = await window.electronAPI.invoke('memory:getAll', 'default')
      console.log('   数据库中总共有', allMemories.length, '条记忆')
    } else {
      console.log('⚠️ 没有提取到记忆')
      console.log('   可能原因:')
      console.log('   - 规则模式不匹配')
      console.log('   - LLM 提取失败')
      console.log('   - 消息格式不正确')
    }

  } catch (error) {
    console.error('❌ 错误:', error)
    console.error('   错误消息:', error.message)
    console.error('   错误堆栈:', error.stack)
  }
})()
