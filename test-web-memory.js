// Web 模式记忆测试脚本
// 复制到浏览器控制台运行

(async function() {
  console.log('===== Web 模式记忆测试 =====')

  try {
    // 直接调用 memoryStore 来测试存储
    const { default: localforage } = await import('localforage')

    // 创建 memory 专用的 localforage 实例
    const memoryStore = localforage.createInstance({
      name: 'chatbox_memory',
      storeName: 'memories'
    })

    console.log('1. 清空旧数据...')
    await memoryStore.clear()

    console.log('2. 添加测试记忆...')
    const testMemory = {
      id: 'test-1',
      userId: 'default',
      type: 'explicit_preference',
      source: 'test',
      content: '用户偏好: 喝咖啡',
      summary: '喜欢喝咖啡',
      importance: 0.7,
      confidence: 0.8,
      priority: 2,
      category: 'preference',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      lastAccessedAt: Date.now(),
      accessCount: 0,
      tags: ['preference'],
    }

    await memoryStore.setItem(testMemory.id, testMemory)
    console.log('   ✅ 记忆已添加:', testMemory.content)

    console.log('3. 读取记忆...')
    const retrieved = await memoryStore.getItem('test-1')
    console.log('   ✅ 读取成功:', retrieved.content)

    console.log('4. 遍历所有记忆...')
    const allMemories = []
    await memoryStore.iterate((memory) => {
      allMemories.push(memory)
    })
    console.log('   ✅ 总共', allMemories.length, '条记忆')

    console.log('✅ IndexedDB 存储测试成功！')

    // 清理测试数据
    await memoryStore.removeItem('test-1')
    console.log('✅ 测试数据已清理')

  } catch (error) {
    console.error('❌ 测试失败:', error)
    console.error('   错误详情:', error.message)
    console.error('   错误堆栈:', error.stack)
  }
})()
