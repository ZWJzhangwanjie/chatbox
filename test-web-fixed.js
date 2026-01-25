// Web 模式记忆测试 - 修正版
// 复制到浏览器控制台运行

(function() {
  const log = console.log.bind(console)

  log('===== Web 模式 IndexedDB 测试 =====')

  try {
    const request = indexedDB.open('chatbox_memory', 1)

    request.onerror = () => {
      console.error('❌ 无法打开 IndexedDB')
    }

    request.onsuccess = async () => {
      const db = request.result
      log('✅ IndexedDB 已打开')

      const tx = db.transaction('memories', 'readwrite')
      const store = tx.objectStore('memories')

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
      log('✅ 添加测试记忆')

      tx.oncomplete = () => {
        const readTx = db.transaction('memories', 'readonly')
        const readStore = readTx.objectStore('memories')
        const getAll = readStore.getAll()

        getAll.onsuccess = () => {
          const memories = getAll.result
          log('✅ 当前共有', memories.length, '条记忆')
          memories.forEach((m, i) => {
            log('  [' + (i+1) + '] ' + m.content)
          })
        }
      }
    }

    request.onupgradeneeded = (event) => {
      const db = event.target.result
      if (!db.objectStoreNames.contains('memories')) {
        db.createObjectStore('memories', { keyPath: 'id' })
        log('✅ 创建 memories store')
      }
    }

  } catch (error) {
    console.error('❌ 错误:', error)
  }
})()
