# PromptBox

一个极其简单、快速、面向普通用户的**个人 Prompt 工具箱**。

核心流程：

> **找到 Prompt → 填写变量 → Preview → 复制**

所有数据都保存在你自己的浏览器里，无需账号、无需后端。

---

## Features

- **Prompt 管理**：新建、编辑、删除、复制（Duplicate）
- **变量填充**：使用 `{{variable_name}}` 标记需要填写的内容，自动识别
- **实时 Preview**：填写变量后即时生成最终 Prompt
- **一键复制**：复制的是替换变量后的最终 Prompt，而不是模板
- **搜索**：标题、内容、分类、标签的实时全文搜索
- **分类**：一级分类，内置「学习 / 编程 / 写作 / 工作 / 生活 / 其他」，也可自定义
- **Chat / Agent 类型**：给 Prompt 打上「网页 Chat」或「本地 Agent」标签，一键区分与筛选
- **Tags**：标签点击即可筛选
- **收藏（常用）**：收藏你最喜欢的 Prompt
- **最近使用**：根据 `last_used_at` 自动排序
- **AI 助手（DeepSeek）**：新建 / 编辑 Prompt 时可与 DeepSeek 对话，让 AI 帮你撰写、优化 Prompt，并可一键填入
- **Import / Export**：导出 `promptbox-backup.json`，可导入恢复
- **Markdown**：内容与 Preview 支持基础 Markdown 渲染
- **快捷键**：`⌘K` 打开快速搜索（Command Palette），`N` 新建，`Esc` 关闭
- **响应式**：手机端无横向溢出，所有核心功能可触屏操作
- **性能**：1000 条 Prompt 依然流畅

---

## Tech Stack

- [React](https://reactjs.org/) + [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vitejs.dev/)
- [Tailwind CSS](https://tailwindcss.com/) v4
- [lucide-react](https://lucide.dev/) 图标
- [marked](https://marked.js.org/) + [DOMPurify](https://github.com/cure53/DOMPurify)（Markdown 渲染）
- [Vitest](https://vitest.dev/) + [Testing Library](https://testing-library.com/)（测试）
- [DeepSeek API](https://platform.deepseek.com/)（可选 AI 助手，OpenAI 兼容接口）

---

## Development

```bash
npm install
npm run dev
```

开发服务器默认运行在 [`http://localhost:5173`](http://localhost:5173)。

---

## Build

```bash
npm run build
```

生成的生产资源位于 `dist/`。

> 本地构建默认 base 为 `/`。部署到 GitHub Pages 子路径时，workflow 会通过环境变量
> `VITE_BASE` 自动注入正确的 base path（如 `/prompt-box/`），无需手动修改。
>
> 如需在其他子路径部署，可手动指定：`VITE_BASE=/my-path/ npm run build`

---

## Test

```bash
npm test
```

覆盖核心纯函数（变量解析、搜索、导入导出）与数据层（CRUD、持久化、收藏、
副本、删除、导入），以及关键 UI 流程（使用 → 填写 → Preview → 复制）。

---

## Deployment

本项目通过 **GitHub Actions** 自动部署到 **GitHub Pages**。

`.github/workflows/deploy.yml` 会在 `main` 分支 push 时：

1. `checkout`
2. `setup Node`
3. `npm ci`（安装依赖）
4. `npm test`（运行测试）
5. `npm run build`（生产构建，并注入页面 base path）
6. `upload Pages artifact`（上传 `dist`）
7. `deploy Pages`（使用官方 `actions/deploy-pages`）

### 启用步骤（通常只需一次）

在仓库 **Settings → Pages** 中，将 **Source** 设为 **GitHub Actions**，
之后每次 push 到 `main` 都会自动构建并发布。

---

## Data Storage

- 数据保存在浏览器的 **`localStorage`** 中，key 为 `promptbox.data.v1`
- 结构：`{ prompts, categories }`；设置（DeepSeek API Key / 模型）存于 `promptbox.settings.v1`
- 首次打开会自动生成少量 Demo Prompt，可随时删除
- 导出 / 导入可实现跨浏览器备份与恢复

数据访问集中在 `src/storage/`，UI 层通过 `PromptStoreProvider`（React Context）消费，
不会在组件中到处直接 `localStorage.setItem(...)`。

---

## AI 助手（DeepSeek，可选）

PromptBox 内置一个基于 [DeepSeek](https://platform.deepseek.com/) 的 Prompt 写作助手：

1. 打开右上角 **⚙️ 设置**，填入你自己的 **DeepSeek API Key**（也可在编辑弹窗的 AI 面板里直接填写）
2. 在 **新建 / 编辑 Prompt** 弹窗右侧，用自然语言描述你想要什么
3. AI 生成后点击 **填入内容** 或 **追加到内容**，即可写回 Prompt

说明：

- API Key 仅保存在**本机浏览器**（`localStorage`），请求由浏览器直接发往 `api.deepseek.com`，不经过任何第三方服务器
- 支持 `deepseek-chat`（V3）与 `deepseek-reasoner`（R1）两个模型
- 如果浏览器对该接口有跨域（CORS）限制，界面会给出明确提示
- 不填写 API Key 时，PromptBox 的所有其他功能照常可用

---

## Project Structure

```text
src/
  components/      # UI 组件（卡片、弹窗、侧栏、命令面板等）
    ui/            # 基础 UI 原语（Button、Input、Modal…）
  pages/           # 页面（Library 首页）
  hooks/           # 自定义 Hooks（快捷键、Toast、剪贴板）
  lib/             # 纯函数（变量解析、搜索、导入导出、Markdown）
  storage/         # 数据访问层（localStorage CRUD + Demo 种子）
  store/           # React 状态（Context Provider）
  types/           # TypeScript 类型
  utils/           # 通用工具
  test/            # 测试 setup
```

所有业务逻辑以**小而清晰**为原则：核心变量解析与数据层均为独立纯函数，
方便测试与复用。

---

## License

MIT
