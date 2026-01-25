// 测试记忆功能的浏览器控制台脚本
// 直接复制到浏览器开发者工具的 Console 中运行

(async function() {
  console.log('===== 开始测试记忆功能 =====')

  // 1. 检查全局对象
  console.log('1. 检查 window.electronAPI:', !!window.electronAPI)

  // 2. 获取设置（通过 IPC）
  try {
    const settings = await window.electronAPI.ipc.invoke('getSettings')
    console.log('2. 设置信息:', {
      memoryEnabled: settings.memoryEnabled,
      memorySettings: settings.memorySettings
    })

    // 3. 尝试手动添加记忆
    console.log('3. 尝试手动添加记忆...')
    const addResult = await window.electronAPI.ipc.invoke('memory:add', {
      userId: 'default',
      type: 'explicit_preference',
      source: 'manual',
      content: '测试记忆：我喜欢编程',
      importance: 0.8,
      confidence: 0.9,
      priority: 3,
      category: '测试',
    })
    console.log('   添加结果:', addResult)

    // 4. 查询所有记忆
    console.log('4. 查询所有记忆...')
    const memories = await window.electronAPI.ipc.invoke('memory:getAll', 'default')
    console.log('   记忆数量:', memories.length)
    console.log('   记忆列表:', memories)

    console.log('===== 测试完成 =====')
  } catch (error) {
    console.error('测试失败:', error)
  }
})()
