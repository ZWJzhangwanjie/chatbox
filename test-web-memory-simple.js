// Web 模式记忆测试 - 简化版
// 复制到浏览器控制台运行

console.log('===== Web 模式记忆测试 =====')

// 直接测试 indexedDB
(async function() {
  try {
    // 打开 IndexedDB
    const request = indexedDB.open('chatbox_memory', 1)

    request.onerror = () => console.error('❌ 无法打开 IndexedDB')
    request.onsuccess = async () => {
      const db = request.result

      // 获取 object store
      const transaction = db.transaction('memories', 'readwrite')
      const store = transaction.objectStore('memories')

      // 添加测试记忆
      console.log('1. 添加测试记忆...')
      const testMemory = {
        id: 'test-' + Date.now(),
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

      store.add(testMemory)

      transaction.oncomplete = async () => {
        console.log('   ✅ 记忆已添加')

        // 读取记忆
        console.log('2. 读取所有记忆...')
        const readTransaction = db.transaction('memories', 'readonly')
        const readStore = readTransaction.objectStore('memories')
        const getAllRequest = readStore.getAll()

        getAllRequest.onsuccess = () => {
          const memories = getAllRequest.result
          console.log('   ✅ 总共', memories.length, '条记忆:')
          memories.forEach((m, i) => {
            console.log(`      [${i + 1}] ${m.content}`)
          })
        }
      }

      transaction.onerror = () => console.error('❌ 事务失败')
    }

    // 创建 object store（如果不存在）
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains('memories')) {
        db.createObjectStore('memories', { keyPath: 'id' })
        console.log('✅ 创建 memories store')
      }
    }

  } catch (error) {
    console.error('❌ 测试失败:', error)
  }
})()
