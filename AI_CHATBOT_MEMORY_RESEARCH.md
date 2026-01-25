# AI 聊天产品用户个性化设置与记忆功能调研报告

**调研日期**: 2026-01-20
**调研范围**: ChatGPT、Claude 及其他主流 AI 聊天产品

---

## 目录

1. [概述](#1-概述)
2. [ChatGPT 的个性化与记忆实现](#2-chatgpt-的个性化与记忆实现)
3. [Claude 的个性化与记忆实现](#3-claude-的个性化与记忆实现)
4. [技术实现架构对比](#4-技术实现架构对比)
5. [向量数据库选型](#5-向量数据库选型)
6. [用户画像与嵌入技术](#6-用户画像与嵌入技术)
7. [实现建议与最佳实践](#7-实现建议与最佳实践)
8. [参考资源](#8-参考资源)

---

## 1. 概述

### 1.1 调研背景

AI 聊天产品的**用户个性化设置**和**记忆功能**已成为提升用户体验的关键能力。本报告调研了当前主流产品的实现方式，为 Chatbox 项目提供参考。

### 1.2 核心能力维度

| 能力维度 | 说明 |
|---------|------|
| **短期记忆** | 当前会话中的上下文记忆 |
| **长期记忆** | 跨会话的持久化用户信息 |
| **个性化设置** | 用户可配置的偏好设置 |
| **自动学习** | 从对话中自动提取和记忆信息 |
| **隐私控制** | 用户对记忆数据的可见性和控制权 |

---

## 2. ChatGPT 的个性化与记忆实现

### 2.1 功能概述

ChatGPT 的记忆系统经历了多次迭代升级：

| 时间 | 重大更新 |
|------|---------|
| 2024年2月13日 | 初始 Memory 功能上线 |
| 2025年4月10日 | 可引用所有历史聊天记录进行个性化响应 |

### 2.2 双层记忆架构

```
┌─────────────────────────────────────────────────────────────┐
│                    ChatGPT Memory System                     │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         Layer 1: Explicit "Saved Memories"           │  │
│  │  用户明确批准和手动添加的信息                          │  │
│  │  - 用户在设置中直接添加                                │  │
│  │  - 用户批准 ChatGPT 建议的记忆                         │  │
│  │  - 高优先级，直接可见                                  │  │
│  └──────────────────────────────────────────────────────┘  │
│                           ↓                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         Layer 2: Implicit Insights                   │  │
│  │  从最近对话中自动学习的信息                            │  │
│  │  - 自动提取偏好和行为模式                             │  │
│  │  - 所有历史聊天的语义检索                             │  │
│  │  - 个性化响应的基础                                   │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### 2.3 设置界面路径

```
Settings → Personalization → Memory
Username → Settings → Personalization → Manage
```

### 2.4 用户控制能力

| 控制项 | 功能说明 |
|-------|---------|
| **开关控制** | 可为新对话开启/关闭记忆功能 |
| **查看记忆** | 查看所有已存储的记忆内容 |
| **删除记忆** | 单独删除特定记忆项 |
| **临时对话** | 不影响记忆的对话模式 |
| **直接编辑** | 在个性化设置中直接更新记忆 |
| **自定义指令** | 设置 ChatGPT 的行为风格 |

### 2.5 技术实现要点

根据逆向工程分析，ChatGPT 使用以下技术：

1. **Bio Tool**: 专门用于保存记忆的工具调用
2. **语义检索**: 对所有历史聊天进行嵌入和检索
3. **记忆摘要**: 压缩和总结关键信息
4. **相关性评分**: 选择与当前对话最相关的记忆

### 2.6 隐私与透明度

- 完全控制记忆内容
- 可禁用记忆功能
- 透明的记忆可见性
- 临时对话不影响记忆

---

## 3. Claude 的个性化与记忆实现

### 3.1 功能概述

Claude 的记忆功能于 2025 年 9 月向 Team 和 Enterprise 用户推出，采用不同的设计理念。

### 3.2 核心特点

| 特点 | 说明 |
|-----|------|
| **即时个性化** | 零等待时间的个性化响应 |
| **详细用户画像** | 通过记忆组件构建详细档案 |
| **设置可见性** | 用户可在设置中查看 Claude 记住的内容 |
| **实时更新** | 通过对话更新记忆摘要 |
| **隐私模式** | 提供 Incognito 模式管理隐私 |

### 3.3 与 ChatGPT 的对比

| 维度 | ChatGPT | Claude |
|-----|---------|--------|
| **设计理念** | 双层记忆（显式+隐式） | 即时个性化 + 详细画像 |
| **更新方式** | 自动学习 + 手动添加 | 对话中实时更新 |
| **可见性** | 设置中查看 | 设置中查看和编辑 |
| **隐私控制** | 开关 + 临时对话 | Incognito 模式 |

### 3.4 Claude Memory 哲学

根据分析，Claude 的记忆系统强调：
- **透明性**: 用户始终知道 AI 记住了什么
- **控制性**: 用户可以修改记忆内容
- **协作性**: 支持团队级别的记忆共享

---

## 4. 技术实现架构对比

### 4.1 通用架构模式

```
┌─────────────────────────────────────────────────────────────────┐
│                    AI Chatbot Memory Architecture                │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────────┐      ┌─────────────────┐                  │
│  │   User Input    │─────►│  Conversation   │                  │
│  │                 │      │    Manager      │                  │
│  └─────────────────┘      └────────┬────────┘                  │
│                                     │                            │
│                                     ▼                            │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                  Memory Extraction Layer                 │   │
│  │  - 关键信息提取 (NER, 关系抽取)                           │   │
│  │  - 偏好识别                                              │   │
│  │  - 行为模式分析                                          │   │
│  └─────────────────────────────┬───────────────────────────┘   │
│                                 │                               │
│            ┌────────────────────┼────────────────────┐          │
│            ▼                    ▼                     ▼          │
│  ┌───────────────┐    ┌───────────────┐    ┌───────────────┐  │
│  │  Short-term   │    │   Long-term   │    │  User Profile │  │
│  │   Memory      │    │   Memory      │    │   Store       │  │
│  │  (会话级)     │    │  (持久化)     │    │  (结构化)     │  │
│  └───────┬───────┘    └───────┬───────┘    └───────┬───────┘  │
│          │                    │                     │           │
│          ▼                    ▼                     ▼           │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              Vector Database / Embedding Store          │   │
│  │  - 语义搜索                                            │   │
│  │  - 相似度匹配                                          │   │
│  │  - 上下文检索                                          │   │
│  └─────────────────────────────┬───────────────────────────┘   │
│                                 │                               │
│                                 ▼                               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │           Memory Retrieval & Selection Layer            │   │
│  │  - 相关性评分                                          │   │
│  │  - Token 预算管理                                      │   │
│  │  - 记忆优先级排序                                      │   │
│  └─────────────────────────────┬───────────────────────────┘   │
│                                 │                               │
│                                 ▼                               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │           Prompt Construction + LLM API                 │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 主流实现方式

#### 方式一：基于向量数据库的语义记忆

```
用户对话 → Embedding 模型 → 向量存储
    ↓
语义检索 (相似度匹配)
    ↓
相关记忆注入 Prompt
```

**优势**:
- 语义精确匹配
- 可扩展性强
- 支持模糊查询

**挑战**:
- 需要向量数据库
- Embedding 质量依赖
- 计算成本较高

#### 方式二：基于规则的结构化存储

```
用户对话 → 信息提取器 → 结构化字段
    ↓
键值对存储 (Redis/SQL)
    ↓
规则匹配检索
```

**优势**:
- 实现简单
- 查询快速
- 可控性强

**挑战**:
- 需要预定义字段
- 不支持语义查询
- 扩展性受限

#### 方式三：混合架构

```
                      ┌─────────────┐
                      │ User Input  │
                      └──────┬──────┘
                             │
         ┌───────────────────┴───────────────────┐
         │                                       │
         ▼                                       ▼
┌─────────────────┐                   ┌─────────────────┐
│  Structured     │                   │  Unstructured   │
│  Memory Store   │                   │  Vector Store   │
│  (用户偏好等)    │                   │  (对话历史等)    │
└────────┬────────┘                   └────────┬────────┘
         │                                     │
         └──────────────────┬──────────────────┘
                            │
                            ▼
                   ┌─────────────────┐
                   │  Memory Fusion  │
                   │  & Ranking      │
                   └────────┬────────┘
                            │
                            ▼
                   ┌─────────────────┐
                   │  Prompt Builder │
                   └─────────────────┘
```

---

## 5. 向量数据库选型

### 5.1 主流向量数据库对比

| 数据库 | 优势 | 劣势 | 适用场景 |
|-------|------|------|---------|
| **Pinecone** | - 完全托管服务<br>- 易于集成<br>- 性能优秀 | - 成本较高<br>- 不开源 | 中小型项目、快速原型 |
| **Weaviate** | - 开源<br>- 内置向量化<br>- GraphQL API | - 自托管复杂度 | 自建基础设施、数据隐私要求高 |
| **Qdrant** | - 高性能<br>- Rust 编写<br>- 易部署 | - 生态较新 | 高性能要求场景 |
| **Milvus** | - 功能丰富<br>- 可扩展性强 | - 部署复杂 | 大规模企业应用 |
| **ChromaDB** | - 轻量简单<br>- 易集成 | - 性能有限 | 小型项目、本地开发 |

### 5.2 Redis 作为向量数据库

根据 [Redis 的 ChatGPT Memory 项目](https://redis.io/blog/chatgpt-memory-project/)：

**特点**:
- 每个会话缓存历史交互
- 自适应 Prompt 创建机制
- 利用 Redis Stack 的向量搜索能力

**适用场景**:
- 已有 Redis 基础设施
- 需要快速原型验证
- 对延迟敏感的应用

### 5.3 选型建议

| 场景 | 推荐方案 |
|-----|---------|
| **快速原型验证** | ChromaDB / Redis |
| **生产环境 (托管)** | Pinecone |
| **生产环境 (自建)** | Weaviate / Qdrant |
| **大规模企业应用** | Milvus |
| **本地优先/隐私** | MeMemo (浏览器端) |

---

## 6. 用户画像与嵌入技术

### 6.1 用户画像构建方式

#### 静态画像 (Explicit Profile)

用户直接设置的偏好：
- 基本信息：姓名、职业、兴趣
- 对话偏好：语言风格、响应长度
- 功能偏好：主题、快捷键

#### 动态画像 (Implicit Profile)

从对话中学习的特征：
- 话题偏好
- 表达风格
- 专业领域
- 决策模式

### 6.2 个人化嵌入技术

根据研究，存在以下方法：

#### Personal Word Embeddings

**核心思想**: 为每个用户训练专属的词向量表示

```
通用词向量: "programmer" → [0.2, 0.5, -0.1, ...]
用户A的词向量: "programmer" → [0.8, 0.3, 0.4, ...] (基于用户数据调整)
```

**优势**:
- 更精准的语义理解
- 个性化语义空间

**挑战**:
- 训练成本高
- 数据需求大

#### 增量用户嵌入

**核心思想**: 动态更新用户表示

```
初始嵌入 + 新交互 → 增量更新 → 新的用户嵌入
```

**优势**:
- 实时更新
- 适应性强

### 6.3 语义检索实现

```typescript
// 伪代码示例
async function retrieveRelevantMemories(
  userId: string,
  currentQuery: string,
  topK: number = 5
): Promise<Memory[]> {
  // 1. 对当前查询进行嵌入
  const queryEmbedding = await embed(currentQuery);

  // 2. 在向量数据库中搜索
  const results = await vectorDB.search({
    namespace: `user_${userId}`,
    vector: queryEmbedding,
    topK,
    filter: { type: 'memory' }
  });

  // 3. 结合结构化记忆
  const structuredMemories = await getStructuredProfile(userId);

  // 4. 融合和排序
  return mergeAndRank(results, structuredMemories);
}
```

---

## 7. 实现建议与最佳实践

### 7.1 为 Chatbox 项目的实现建议

#### 阶段一：基础记忆功能 (MVP)

```
┌─────────────────────────────────────────────────────────┐
│                   Phase 1: Basic Memory                 │
├─────────────────────────────────────────────────────────┤
│  1. 结构化用户偏好存储                                   │
│     - 用户设置 (主题、语言等)                            │
│     - API 配置和密钥                                     │
│     - 常用模型选择                                       │
│                                                          │
│  2. 会话历史持久化                                       │
│     - 现有 Session 存储                                  │
│     - 跨会话消息搜索                                     │
│                                                          │
│  3. 简单的关键词记忆                                     │
│     - 用户明确标记的信息                                 │
│     - 基于规则的提取                                     │
└─────────────────────────────────────────────────────────┘
```

**技术选型**:
- 存储：现有的 electron-store + SQLite
- 搜索：简单的关键词匹配

#### 阶段二：语义记忆检索

```
┌─────────────────────────────────────────────────────────┐
│                Phase 2: Semantic Memory                 │
├─────────────────────────────────────────────────────────┤
│  1. 对话历史向量化                                       │
│     - 消息级嵌入存储                                     │
│     - 会话级摘要嵌入                                     │
│                                                          │
│  2. 语义检索能力                                         │
│     - 相似度搜索                                         │
│     - 上下文相关记忆检索                                 │
│                                                          │
│  3. 自动信息提取                                         │
│     - NER 提取实体                                       │
│     - 偏好识别                                           │
└─────────────────────────────────────────────────────────┘
```

**技术选型**:
- 向量数据库：ChromaDB (轻量本地) / Pinecone (云端)
- Embedding：OpenAI / Local models
- 提取：LLM 辅助

#### 阶段三：智能记忆管理

```
┌─────────────────────────────────────────────────────────┐
│              Phase 3: Intelligent Memory                │
├─────────────────────────────────────────────────────────┤
│  1. 记忆重要性评分                                       │
│     - 自动识别重要信息                                   │
│     - 记忆遗忘机制                                       │
│                                                          │
│  2. 记忆冲突解决                                         │
│     - 时间衰减                                           │
│     - 信息更新                                           │
│                                                          │
│  3. 用户控制界面                                         │
│     - 记忆查看和管理                                     │
│     - 隐私设置                                           │
└─────────────────────────────────────────────────────────┘
```

### 7.2 数据结构建议

#### 用户记忆存储

```typescript
interface UserMemory {
  id: string;
  userId: string;
  type: 'preference' | 'fact' | 'pattern' | 'relationship';
  source: 'explicit' | 'implicit';
  content: string;
  embedding?: number[];
  importance: number; // 0-1
  createdAt: number;
  updatedAt: number;
  lastAccessedAt: number;
  accessCount: number;
  confidence: number; // AI 提取的置信度
}
```

#### 会话上下文存储

```typescript
interface SessionContext {
  sessionId: string;
  userId: string;
  summary: string; // 会话摘要
  summaryEmbedding: number[];
  keyTopics: string[];
  keyEntities: Entity[];
  sentiment?: 'positive' | 'neutral' | 'negative';
  timestamp: number;
}
```

### 7.3 最佳实践

#### 1. 记忆注入策略

```typescript
// 伪代码：智能记忆注入
function buildPromptWithMemories(
  query: string,
  memories: Memory[],
  tokenBudget: number
): string {
  // 1. 按相关性和重要性排序
  const sortedMemories = memories.sort((a, b) => {
    return (b.importance * b.relevance) - (a.importance * a.relevance);
  });

  // 2. 在 Token 预算内选择记忆
  const selectedMemories = [];
  let usedTokens = 0;
  for (const memory of sortedMemories) {
    const tokens = estimateTokens(memory.content);
    if (usedTokens + tokens <= tokenBudget) {
      selectedMemories.push(memory);
      usedTokens += tokens;
    }
  }

  // 3. 构建系统提示
  return `
    You are Chatbox, a helpful AI assistant.

    Relevant information about the user:
    ${selectedMemories.map(m => `- ${m.content}`).join('\n')}

    User query: ${query}
  `;
}
```

#### 2. 隐私保护原则

- **透明性**: 用户始终能看到记住的内容
- **可控性**: 用户可以删除任何记忆
- **选择性**: 提供不记录记忆的对话模式
- **加密**: 敏感信息加密存储

#### 3. 性能优化

```typescript
// 1. 缓存常用记忆
const memoryCache = new LRUCache<Memory>({
  max: 1000,
  ttl: 1000 * 60 * 60 // 1 hour
});

// 2. 批量嵌入
async function embedMemories(memories: string[]): Promise<number[][]> {
  return await embeddingModel.embedBatch(memories);
}

// 3. 异步更新
async function updateMemoryInBackground(memory: Memory) {
  await queue.add(() => vectorDB.upsert(memory));
}
```

---

## 8. 参考资源

### 官方文档

1. [OpenAI - Memory and new controls for ChatGPT](https://openai.com/index/memory-and-new-controls-for-chatgpt/)
2. [Claude - Bringing memory to teams](https://claude.com/blog/memory)
3. [Pinecone - Chatbots with Pinecone](https://www.pinecone.io/learn/chatbots-with-pinecone/)

### 技术分析

4. [How ChatGPT Memory Works | 屈定's Blog](https://mrdear.cn/posts/llm_how_chatgpt_memory_works.html)
5. [Building ChatGPT-Like Memory](https://medium.com/agentman/building-chatgpt-like-memory-openais-new-feature-and-how-to-create-your-own-3e8e3594b670)
6. [Reverse Engineering ChatGPT Memory](https://agentman.ai/blog/reverse-ngineering-latest-ChatGPT-memory-feature-and-building-your-own)
7. [Comparing Claude and ChatGPT memory](https://simonwillison.net/2025/Sep/12/claude-memory/)

### 学术研究

8. [Memoria: A Scalable Agentic Memory Framework](https://arxiv.org/html/2512.12686v1)
9. [Personalizing chatbot communication with associative memory](https://acl-bg.org/proceedings/2025/RANLPStud%202025/pdf/2025.ranlpstud-1.8.pdf)
10. [MeMemo: On-device Retrieval Augmentation](https://arxiv.org/html/2407.01972v1)

### 实现教程

11. [Redis - ChatGPT Memory Project](https://redis.io/blog/chatgpt-memory-project/)
12. [Building Smarter Chatbots with Vector Databases](https://medium.com/codex/building-smarter-chatbots-rag-and-memory-with-vector-databases-1b41c947dc2f)
13. [Implement Long-Term Memory with mem0](https://medium.com/microsoftazure/implement-long-term-memory-in-your-ai-agents-with-mem0-azure-ai-foundry-and-ai-search-56efd8683c03)

### 工具与框架

14. [Memobase - Scalable User Memory](https://www.memobase.io/blog/beyond-rag-memobase)
15. [Awesome Personalized RAG Agent](https://github.com/Applied-Machine-Learning-Lab/Awesome-Personalized-RAG-Agent)
16. [Vector Database Comparison 2025](https://antalyze.ai/blog/vector-database-comparison-2025-milvus-pinecone-weaviate/)

### 社区讨论

17. [OpenAI Community - Personalized Memory](https://community.openai.com/t/personalized-memory-and-long-term-relationship-with-ai-customization-and-continuous-evolution/1111715)
18. [Reddit - How does ChatGPT implement memory](https://www.reddit.com/r/MLQuestions/comments/1f4k4cp/how_does_chatgpt_implement_memory_feature/)

---

## 总结

### 关键洞察

1. **双层记忆是主流**: ChatGPT 的显式+隐式双层架构被证明有效
2. **语义检索是核心**: 向量数据库 + Embedding 是实现长期记忆的基础
3. **用户控制至关重要**: 透明度和可控性是用户信任的基础
4. **混合架构最实用**: 结构化存储 + 向量检索的混合方案是最佳实践

### 对 Chatbox 的建议

1. **短期目标**: 基于现有存储实现基础记忆功能
2. **中期目标**: 引入向量数据库实现语义检索
3. **长期目标**: 构建智能记忆管理系统

### 技术选型建议

- **向量数据库**: ChromaDB (本地) 或 Pinecone (云端)
- **Embedding**: OpenAI API 或本地模型
- **存储**: 现有 electron-store + SQLite 扩展
- **提取**: LLM 辅助信息提取

---

*报告生成时间: 2026-01-20*
