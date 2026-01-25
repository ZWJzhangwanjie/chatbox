# Chatbox 项目说明报告

## 1. 项目概述

**Chatbox** 是一个开源的 AI 对话桌面客户端，支持多种大语言模型（LLM），采用 GPLv3 许可证开源发布。

### 基本信息

| 项目信息 | 内容 |
|---------|-----|
| 产品名称 | Chatbox (Community Edition) |
| 应用 ID | xyz.chatboxapp.app |
| 版本 | 0.0.1 |
| 许可证 | GPLv3 |
| 作者 | bennhuang (tohuangbin@gmail.com) |
| 仓库地址 | https://github.com/chatboxai/chatbox |

### 支持平台

- **桌面端**: Windows (x64/arm64)、macOS (Intel/Apple Silicon)、Linux (x64/arm64)
- **移动端**: iOS、Android
- **Web 端**: 现代浏览器

---

## 2. 核心能力

### 2.1 多模型支持

支持的 AI 模型提供商包括：

- **OpenAI** (ChatGPT, GPT-4o)
- **Azure OpenAI**
- **Anthropic Claude**
- **Google Gemini Pro**
- **Ollama** (本地模型如 llama2, Mistral, Mixtral, codellama, vicuna, yi, solar)
- **ChatGLM-6B**
- **DeepSeek**
- **Groq**
- **Perplexity**
- **xAI (Grok)**
- **Mistral AI**
- **OpenRouter**
- **自定义提供商** (兼容 OpenAI API 的服务)

### 2.2 主要功能特性

| 功能类别 | 具体能力 |
|---------|---------|
| **数据管理** | 本地数据存储、隐私保护、数据永不丢失 |
| **安装部署** | 无需复杂部署、下载即用、提供安装包 |
| **对话功能** | 流式回复、消息引用、Prompt 库 |
| **消息格式** | Markdown、LaTeX、代码高亮、Mermaid 图表 |
| **界面体验** | 人性化 UI、暗色主题、快捷键支持 |
| **协作功能** | 团队协作、API 资源共享 |
| **多语言** | 英文、简中、繁中、日语、韩语、法语、德语、俄语、西班牙语 |
| **其他** | Dall-E-3 图像生成、全局快捷键、自动启动、自动更新 |

### 2.3 高级功能

- **知识库** (Knowledge Base): 支持嵌入和重排序模型
- **MCP (Model Context Protocol)** 服务器支持
- **文件解析**: 支持多种文档格式
- **Web 搜索扩展**
- **自动生成会话标题**
- **Token 计数和统计**
- **首字延迟监控**

---

## 3. 技术架构

### 3.1 技术栈

#### 核心框架
- **Electron**: v26.6.10 - 桌面应用框架
- **React**: v18.2.0 - UI 框架
- **TypeScript**: v5.8.3 - 类型系统
- **Node.js**: >=20.0.0 <23.0.0

#### UI 组件库
- **Mantine**: v7.17.7 - 核心组件库
- **Mantine Form**: 表单管理
- **Mantine Modals**: 模态框管理
- **Mantine Spotlight**: 搜索和命令面板
- **Emotion**: CSS-in-JS 样式方案
- **TailwindCSS**: v3.4.0 - 实用工具优先的 CSS 框架

#### 状态管理
- **Jotai**: v2.1.0 - 原子化状态管理
- **Zustand**: v5.0.6 - 轻量级状态管理
- **TanStack Query**: v5.74.4 - 服务端状态管理
- **TanStack Router**: v1.114.23 - 路由管理

#### AI SDK 集成
- **Vercel AI SDK**: v5.0.101 - 统一 AI 模型接口
- **Anthropic AI SDK**: v2.0.47
- **Google AI SDK**: v2.0.43
- **OpenAI SDK**: v2.0.72
- **Azure AI SDK**: v2.0.74
- **Mistral AI SDK**: v2.0.24
- **Perplexity AI SDK**: v2.0.20
- **MCP SDK**: v1.15.1

#### 功能增强
- **i18next**: v22.4.13 - 国际化
- **react-markdown**: v9.0.0 - Markdown 渲染
- **highlight.js**: v11.7.0 - 代码高亮
- **react-virtuoso**: v4.10.4 - 虚拟滚动
- **react-dropzone**: v14.2.3 - 文件拖拽
- **Mermaid**: v11.4.0 - 流程图渲染
- **Katex**: 数学公式渲染

#### 开发工具
- **Webpack**: v5.85.0 - 模块打包
- **Vitest**: v3.2.4 - 单元测试
- **Biome**: v2.0.0 - 代码格式化和检查
- **Husky**: v9.0.11 - Git 钩子
- **Electron Builder**: v24.2.1 - 应用打包

#### 移动端支持
- **Capacitor**: v6.1.1 - 跨平台移动应用
- **Capacitor SQLite**: 本地数据库

### 3.2 架构模式

项目采用 Electron 多进程架构：

```
┌─────────────────────────────────────────────────────────┐
│                      Electron App                        │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌──────────────────┐      ┌──────────────────┐        │
│  │   Main Process   │◄────►│  Renderer Process │        │
│  │  (Node.js 运行时) │ IPC  │   (React UI)      │        │
│  └──────────────────┘      └──────────────────┘        │
│           ▲                         ▲                    │
│           │                         │                    │
│  ┌────────┴────────┐      ┌─────────┴─────────┐        │
│  │  - 窗口管理      │      │  - 用户界面        │        │
│  │  - 系统托盘      │      │  - 状态管理        │        │
│  │  - 快捷键        │      │  - 路由导航        │        │
│  │  - 文件解析      │      │  - 业务逻辑        │        │
│  │  - 知识库        │      │  - AI 对话         │        │
│  │  - MCP 服务器    │      │                   │        │
│  │  - 自动更新      │      │                   │        │
│  │  - 代理设置      │      │                   │        │
│  └──────────────────┘      └──────────────────┘        │
│                                                           │
│  ┌──────────────────┐      ┌──────────────────┐        │
│  │  Preload Script  │      │   Mobile/Web      │        │
│  │  (安全桥接层)     │      │   可选部署目标    │        │
│  └──────────────────┘      └──────────────────┘        │
└─────────────────────────────────────────────────────────┘
```

---

## 4. 代码结构

### 4.1 目录结构

```
chatbox/
├── .erb/                    # Electron React Boilerplate 配置
│   └── configs/             # Webpack 配置文件
├── assets/                  # 静态资源 (图标、entitlements 等)
├── doc/                     # 项目文档
├── icons/                   # 应用图标
├── release/                 # 构建输出目录
├── script/                  # 构建和翻译脚本
├── src/                     # 源代码目录
│   ├── main/                # Electron 主进程代码
│   │   ├── adapters/        # AI 模型适配器
│   │   ├── knowledge-base/  # 知识库功能
│   │   ├── mcp/             # MCP 服务器实现
│   │   ├── main.ts          # 主进程入口
│   │   ├── menu.ts          # 应用菜单
│   │   ├── store-node.ts    # 本地存储
│   │   ├── window_state.ts  # 窗口状态管理
│   │   └── ...
│   ├── renderer/            # React 渲染进程代码
│   │   ├── adapters/        # 渲染层 AI 适配器
│   │   ├── components/      # UI 组件 (60+ 组件)
│   │   ├── dev/             # 开发工具
│   │   ├── hooks/           # React Hooks
│   │   ├── i18n/            # 国际化资源
│   │   ├── modals/          # 模态框组件
│   │   ├── packages/        # 功能模块包
│   │   ├── pages/           # 页面组件
│   │   ├── routes/          # 路由配置
│   │   ├── setup/           # 应用初始化
│   │   ├── stores/          # 状态管理
│   │   ├── utils/           # 工具函数
│   │   ├── index.tsx        # 渲染进程入口
│   │   └── router.tsx       # 路由配置
│   └── shared/              # 主进程和渲染进程共享代码
│       ├── models/          # AI 模型定义 (30+ 模型文件)
│       ├── types/           # TypeScript 类型定义
│       ├── utils/           # 共享工具函数
│       ├── defaults.ts      # 默认配置
│       └── types.ts         # 核心类型定义
├── team-sharing/            # 团队共享功能
├── test/                    # 测试文件
├── .erb/configs/            # Webpack 配置
├── biome.json               # Biome 配置
├── electron-builder.yml     # Electron Builder 配置
├── package.json             # 项目依赖和脚本
├── tailwind.config.js       # TailwindCSS 配置
└── tsconfig.json            # TypeScript 配置
```

### 4.2 核心模块说明

#### 主进程 (src/main/)

| 模块 | 功能描述 |
|-----|---------|
| `main.ts` | 主进程入口，管理应用生命周期、窗口、托盘、快捷键、Deep Link |
| `store-node.ts` | 基于 electron-store 的本地数据持久化 |
| `window_state.ts` | 窗口状态保存和恢复 (参考 VSCode 实现) |
| `knowledge-base/` | 知识库功能实现 (基于 @mastra/rag) |
| `mcp/` | Model Context Protocol 服务器支持 |
| `file-parser.ts` | 本地文件解析 (PDF、Word、图片等) |
| `menu.ts` | 应用菜单构建 |
| `autoLauncher.ts` | 开机自启动管理 |
| `proxy.ts` | 代理设置管理 |

#### 渲染进程 (src/renderer/)

| 模块 | 功能描述 |
|-----|---------|
| `routes/` | 页面路由定义 (使用 TanStack Router) |
| `stores/` | 状态管理 (Jotai atoms + Zustand stores) |
| `components/` | UI 组件库 |
| `hooks/` | 自定义 React Hooks |
| `modals/` | 模态框管理 (基于 @ebay/nice-modal-react) |
| `packages/` | 功能模块包 |
| `setup/` | 应用初始化 (Sentry、i18n 等) |

#### 共享模块 (src/shared/)

| 模块 | 功能描述 |
|-----|---------|
| `models/` | AI 模型适配器 (30+ 个模型实现) |
| `types/` | TypeScript 类型定义 |
| `defaults.ts` | 应用默认配置 |
| `utils/` | 工具函数 |

---

## 5. 启动和部署方式

### 5.1 环境要求

- **Node.js**: v20.x – v22.x
- **npm**: >=10.0.0 (不支持 pnpm)

### 5.2 开发模式启动

#### 桌面应用开发

```bash
# 1. 克隆仓库
git clone https://github.com/chatboxai/chatbox.git
cd chatbox

# 2. 安装依赖
npm install

# 3. 启动开发服务器
npm run dev
```

#### Web 应用开发

```bash
# 启动 Web 版本开发
npm run dev:web
```

#### 主进程调试模式

```bash
# 启动带 Inspector 的开发模式
npm run dev:debug
# 然后在 Chrome 中打开 chrome://inspect 连接到 5858 端口
```

### 5.3 构建和打包

#### 构建当前平台安装包

```bash
# 构建 + 打包当前平台
npm run package

# 仅构建不打包
npm run build
```

#### 构建所有平台安装包

```bash
# 构建 + 打包所有平台 (Windows + macOS + Linux)
npm run package:all
```

#### Web 版本构建

```bash
# 构建 Web 版本
npm run build:web

# 预览 Web 版本
npm run serve:web
```

### 5.4 移动端部署

```bash
# iOS 同步和打开
npm run mobile:ios

# Android 同步和打开
npm run mobile:android

# 生成移动端资源
npm run mobile:assets
```

### 5.5 发布脚本

```bash
# 发布 Web 版本
npm run release:web

# 发布 macOS 版本
npm run release:mac

# 发布 Linux 版本
npm run release:linux

# 发布 Windows 版本
npm run release:win
```

### 5.6 代码质量检查

```bash
# 运行测试
npm test

# 运行测试 UI
npm run test:ui

# 监听模式测试
npm run test:watch

# 测试覆盖率
npm run test:coverage

# 代码检查
npm run lint

# 自动修复
npm run lint:fix

# TypeScript 类型检查
npm run check

# Biome 检查
npm run check:biome
```

### 5.7 构建产物

| 平台 | 构建产物位置 | 格式 |
|-----|------------|-----|
| Windows | `release/build/` | `.exe` (NSIS 安装程序) |
| macOS | `release/build/` | `.dmg` (磁盘镜像) |
| Linux | `release/build/` | `.AppImage`, `.deb` |
| Web | `release/app/dist/renderer/` | 静态文件 |

---

## 6. 配置说明

### 6.1 应用配置 (electron-builder.yml)

```yaml
productName: Chatbox
appId: xyz.chatboxapp.app
asar: true  # 启用 asar 打包
```

**macOS 配置**:
- 支持 arm64 和 x64 架构
- hardenedRuntime: 安全强化
- 系统托盘支持
- Deep Link 支持 (`chatbox://` 协议)

**Windows 配置**:
- NSIS 安装程序
- 支持自定义安装路径
- 代码签名支持

**Linux 配置**:
- AppImage 和 deb 格式
- 支持 x64 和 arm64

### 6.2 TypeScript 配置

```json
{
  "compilerOptions": {
    "target": "es2021",
    "module": "commonjs",
    "jsx": "react-jsx",
    "strict": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/renderer/*"]
    }
  }
}
```

### 6.3 Biome 配置

```json
{
  "formatter": {
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 120
  },
  "linter": {
    "rules": {
      "recommended": true
    }
  }
}
```

### 6.4 TailwindCSS 配置

使用 CSS 变量实现主题系统：
- `--chatbox-tint-*`: 主题颜色变量
- `--chatbox-background-*`: 背景颜色变量
- `--chatbox-border-*`: 边框颜色变量
- `--chatbox-spacing-*`: 间距变量
- `--chatbox-radius-*`: 圆角变量

---

## 7. 数据存储

### 7.1 存储位置

| 平台 | 配置文件位置 |
|-----|------------|
| Windows | `%APPDATA%/chatbox-app/` |
| macOS | `~/Library/Application Support/chatbox-app/` |
| Linux | `~/.config/chatbox-app/` |

### 7.2 存储类型

1. **配置存储** (electron-store):
   - 应用设置
   - 用户配置
   - API 密钥 (加密存储)

2. **Blob 存储**:
   - 大文件内容
   - 知识库数据

3. **会话数据**:
   - 聊天会话
   - 消息历史
   - Copilot 配置

---

## 8. 主题系统

### 8.1 主题类型

- **Light**: 浅色主题
- **Dark**: 深色主题
- **System**: 跟随系统主题

### 8.2 主题实现

基于 CSS 变量的动态主题系统，支持：
- 实时主题切换
- 跨窗口主题同步
- 系统主题自动跟随

---

## 9. 国际化

### 9.1 支持语言

英语、简体中文、繁体中文、日语、韩语、法语、德语、俄语、西班牙语

### 9.2 翻译管理

```bash
# 提取翻译字符串
npm run translate
```

翻译文件位置: `src/renderer/i18n/`

---

## 10. 错误处理

项目实现了多层错误处理机制：

### 10.1 React Error Boundary

- 捕获组件渲染错误
- 自动报告到 Sentry
- 显示友好错误 UI

### 10.2 全局错误处理器

- Window 错误捕获
- 未处理的 Promise 拒绝
- Console 错误监控

### 10.3 测试工具

开发模式下可通过 `window.errorTestingUtils` 测试错误处理。

---

## 11. 快捷键

| 快捷键 | 功能 |
|-------|------|
| Alt+` | 快速切换窗口显示/隐藏 |
| Mod+I | 聚焦输入框 |
| Mod+E | 切换 Web 浏览模式 |
| Mod+N | 新建聊天 |
| Mod+Shift+N | 新建图片会话 |
| Mod+Tab | 切换到下一个会话 |
| Mod+Shift+Tab | 切换到上一个会话 |
| Mod+R | 刷新上下文 |
| Mod+K | 打开搜索对话框 |
| Enter | 发送消息 |
| Ctrl+Enter | 发送但不生成回复 |

> 注: Mod = Windows 下是 Ctrl，macOS 下是 Command

---

## 12. MCP (Model Context Protocol) 支持

Chatbox 支持 MCP 服务器，允许扩展 AI 模型能力：

### 12.1 内置服务器

- 文件系统访问
- Web 搜索
- 其他系统级功能

### 12.2 自定义服务器

用户可以配置自定义 MCP 服务器来扩展功能。

---

## 13. 知识库功能

### 13.1 支持的操作

- 文档嵌入 (Embedding)
- 语义搜索
- 结果重排序 (Rerank)

### 13.2 支持的模型

- **嵌入模型**: 用户可配置
- **重排序模型**: 用户可配置

### 13.3 平台支持

支持所有平台，但 Windows ARM32 (libsql 不支持) 除外。

---

## 14. 项目特点总结

### 14.1 优点

1. **完整的桌面应用体验**: 窗口管理、系统托盘、全局快捷键
2. **跨平台支持**: Windows、macOS、Linux、移动端、Web
3. **丰富的 AI 模型支持**: 30+ 个 AI 提供商适配器
4. **强大的状态管理**: Jotai + Zustand + TanStack Query
5. **现代 UI 框架**: Mantine + Emotion + TailwindCSS
6. **完善的错误处理**: 多层错误边界 + Sentry 集成
7. **国际化支持**: 9 种语言
8. **可扩展性**: MCP 服务器、知识库、自定义模型
9. **开发者友好**: TypeScript、Biome、Vitest、详细的文档

### 14.2 技术亮点

- 统一的 AI SDK 抽象层
- 基于 Vercel AI SDK 的流式响应
- React Server Components 友好的架构
- 窗口状态持久化 (参考 VSCode)
- 安全的密钥存储
- Deep Link 协议支持
- 虚拟滚动优化长列表性能

---

## 15. 快速开始指南

```bash
# 1. 克隆项目
git clone https://github.com/chatboxai/chatbox.git
cd chatbox

# 2. 安装依赖
npm install

# 3. 启动开发
npm run dev

# 4. 构建生产版本
npm run build

# 5. 打包应用
npm run package
```

---

## 16. 参考资源

- **项目仓库**: https://github.com/chatboxai/chatbox
- **官方网站**: https://chatboxai.app
- **文档**: `doc/` 目录
- **问题反馈**: GitHub Issues
- **邮箱**: hi@chatboxai.com

---

*报告生成时间: 2026-01-19*
