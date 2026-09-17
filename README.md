# PromptBox

一个极其简单、快速、面向普通用户的**个人 Prompt 工具箱**。

核心流程：

> **找到 Prompt → 填写变量 → Preview → 复制**

所有数据都保存在你自己的浏览器里，无需账号、无需后端。

---

## Features

- **Prompt 管理**：新建、编辑、删除、复制（Duplicate）
- **变量填充**：使用 `{{variable_name}}` 标记需要填写的内容，自动识别；每个变量都是**可换行的多行输入框**，会随内容自动变高（名字里带 essay / code / 内容 的只是起始更大一些）
- **实时 Preview**：填写变量后即时生成最终 Prompt
- **一键复制**：复制的是替换变量后的最终 Prompt，而不是模板
- **搜索**：标题、内容、分类、标签的实时全文搜索
- **分类**：一级分类，内置「学习 / 编程 / 写作 / 工作 / 生活 / 其他」，也可自定义
- **Chat / Agent 类型**：给 Prompt 打上「网页 Chat」或「本地 Agent」标签，一键区分与筛选
- **Tags**：标签点击即可筛选
- **收藏（常用）**：收藏你最喜欢的 Prompt
- **最近使用**：根据 `last_used_at` 自动排序
- **AI 助手（DeepSeek，Beta）**：新建 / 编辑 Prompt 时可与 DeepSeek 对话，AI 会按 PromptBox 的格式返回**结构化草稿**（标题 / 正文 / 标签 / 分类 / Chat·Agent 类型），可一键「应用到表单」或只填入内容
- **差分式 AI 修改**：编辑长 Prompt（≥600 字）时，AI 只返回改动片段，前端按 diff 合并回原文，不再整篇重写
- **Import / Export**：导出 `promptbox-backup.json`，可导入恢复
- **Markdown**：内容与 Preview 支持基础 Markdown 渲染
- **快捷键**：`⌘K` 打开快速搜索（Command Palette），`N` 新建，`Esc` 关闭
- **瀑布流布局**：桌面双列卡片像小红书一样自然交错，不强行拉伸对齐（`src/lib/masonry.ts` 按卡片高度估算分列）
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
- [DeepSeek API](https://api-docs.deepseek.com/)（可选 AI 助手，OpenAI 兼容接口，Beta）

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
- 结构：`{ prompts, categories }`；设置（DeepSeek API Key / 模型 / 接口地址 / 深度思考）存于 `promptbox.settings.v2`（会自动读取旧的 `v1`）
- 首次打开会自动生成少量 Demo Prompt，可随时删除
- 导出 / 导入可实现跨浏览器备份与恢复

数据访问集中在 `src/storage/`，UI 层通过 `PromptStoreProvider`（React Context）消费，
不会在组件中到处直接 `localStorage.setItem(...)`。

---

## AI 助手（DeepSeek，Beta）

PromptBox 内置一个基于 [DeepSeek](https://platform.deepseek.com/) 的 Prompt 写作助手。
按钮旁标有 **Beta**，说明它还在打磨中，行为可能随版本调整。

### 使用

1. 打开右上角 **⚙️ 设置**，填入你自己的 **DeepSeek API Key**（也可在编辑弹窗的 AI 面板里直接填写）
2. 在 **新建 / 编辑 Prompt** 弹窗右侧，用自然语言描述你想要什么
3. AI 返回后可以：
   - **应用到表单**：把标题、正文、标签、分类、Chat/Agent 类型一起写回（推荐）
   - **只填入内容** / **追加到内容**：只动正文，保留你已有的标题和分类
   - **应用 N 处修改**：差分模式下，AI 只给出改动片段，确认后合并进正文（长 Prompt 默认走这条路）

### 模型

只使用当前在售模型（旧的 `deepseek-chat`(V3) / `deepseek-reasoner`(R1) 已下线，旧配置会自动迁移到默认模型）：

| 模型 | 说明 |
| --- | --- |
| `deepseek-flash`（DeepSeek V4.1 Flash，默认） | 快、便宜，起草 Prompt 够用 |
| `deepseek-v4-pro`（DeepSeek V4 Pro） | 更强，复杂 Prompt 更稳 |

**深度思考**默认开启（对应 DeepSeek 的 thinking 模式，`reasoning_effort: high`）：AI 会先推理再回答，写出的 Prompt 更完整，但会慢一些；在设置里可以关掉换取速度。

### 它是怎么"适配上 PromptBox 格式"的

接入 AI 助手时最容易出问题的不是接口，而是**默认提示词**。PromptBox 在每次请求里都会带上一个固定的系统提示词（见 `src/lib/deepseek.ts` 的 `buildSystemPrompt`），写清楚：

- **产品上下文**：Prompt 会被用户粘贴到网页对话框（Chat）或本地 Agent 里执行
- **内容规则**：需要每次填写的内容必须写成 `{{变量名}}`（英文小写下划线），同一变量名必须一致；正文不要寒暄、不要套代码块
- **结构要求**：先角色与目标，再编号要求，最后输出格式
- **元数据规则**：标题 ≤10 字、标签 ≤5 个、分类只能从当前分类列表里选、`target` 只能是 `chat` / `agent`
- **当前编辑上下文**：把用户正在编辑的标题、正文、标签、分类、类型一起传进去，让 AI 在已有内容上改，而不是从零重写

同时请求使用 **JSON Output 模式**（`response_format: { type: "json_object" }`），并给出期望的 JSON 示例，要求返回：

```json
{
  "reply": "用 1-2 句中文说明做了什么",
  "draft": {
    "title": "英语作文润色",
    "content": "请帮我修改下面的英语作文。\n\n要求：\n1. 保留原意\n2. 修正语法错误\n\n作文：\n{{essay}}",
    "tags": ["英语", "写作"],
    "category": "学习",
    "target": "chat"
  }
}
```

返回值会被**校验和清洗**（`normalizeDraft`）：缺 `content` 就当作没有草稿、`target` 非法就丢弃、标签去重并截断到 5 个，因此 AI 不会把脏数据写进你的 Prompt 库。如果模型没按 JSON 返回，界面会退化成"纯文本回答"，仍然可以一键填入内容。

### 差分模式（编辑长 Prompt 时默认开启）

编辑一份已经很长的 Prompt 时，让 AI **重写整篇**既慢又危险：一次输出几千字，
只要中间被截断，回来的就是一份不完整的正文。所以正文超过 **600 字**时，
AI 面板会自动切到「**差分**」模式，只让 AI 返回**改动片段**，由前端合并回原文：

```json
{
  "reply": "我在第四条里补了「语境自足性」硬性规范。",
  "edits": [
    {
      "find": "如果原文中有体现该义项的句子，必须保留原文例句。",
      "replace": "如果原文中有体现该义项的句子，必须保留原文例句。\n\n原文例句必须长到能单凭这一句就显现义项。"
    },
    { "find": "", "replace": "## 十四、自检\n\n输出前逐条核对以上规范。" }
  ]
}
```

界面上会像 GitHub diff 一样用**红删 / 绿增**渲染每一处改动，并显示
`应用 2 处修改`（有跳过时显示 `应用 2 处（1 处跳过）`）。

面板底部有「**差分 / 全文**」开关，可以随时改回让 AI 返回完整正文。

合并算法在 `src/lib/diffEdits.ts`（纯函数，有 31 个单测）：

| 规则 | 行为 |
| --- | --- |
| 定位（三级） | ① 精确匹配 → ② 忽略空行/缩进差异 → ③ **折叠 Markdown 记号与全半角标点**后的模糊匹配（标点被改写成 `，`→`：`、`*`→`-`、`**` 被去掉也能找回） |
| 近似匹配 | 用第 ③ 级定位成功时，界面上会说明「原文的标点 / 空行 / Markdown 记号与 AI 抄写略有出入，已按最接近的一段合并」，不会悄悄改 |
| 相似度 | 按「最长的一行」当锚点找候选落点，再用字符 bigram 的 Dice 相似度挑最像的一块，阈值 0.72；锚点逐字命中的位置优先于「长得像」的位置 |
| 唯一性 | `find` 在原文里出现多次 → 判定 `ambiguous`，**跳过而不是猜**，界面上标黄提醒 |
| 基准 | 所有改动都先在**原文**上定位，再按位置**从后往前**应用，所以前面的改动不会让后面的定位失效 |
| 重叠 | 两处改动范围相交 → 后者标 `overlap` 跳过 |
| 找不到 | `find` 不在原文里 → 标 `not-found` 跳过，并提示「没能在正文中定位」 |
| 追加 | `find` 为空字符串 → 追加到正文末尾（自动补空行） |
| 删除 | `replace` 为空字符串 → 删除该段 |
| 兜底 | 一处都没应用成功时不改正文，只弹错误提示，绝不把正文改坏 |
| 重试 | 有改动定位不到时，会出现「**重试未匹配的 N 处**」按钮：把这几条 `find` 原样发回给模型，让它只重做这几处，而不是笼统地重新生成一遍 |

因为输出量从「整篇正文」降到「几行改动」，长 Prompt 的响应更快，也基本消除了
被截断的风险。

AI 抄写原文时经常「顺手规范化」（改标点、换列表符号、去掉 `**` 强调），这是最
容易出问题的地方，所以除了上面三级定位，系统提示词里也专门列了硬性规则：`find`
必须逐字复制、标点与 Markdown 记号照抄、一到两行即可、拿不准的地方宁可不改。

### 说明

- API Key 仅保存在**本机浏览器**（`localStorage`），请求由浏览器**直接**发往 `api.deepseek.com`，不经过任何第三方服务器
- DeepSeek 官方接口允许浏览器跨域调用（会回显 `Origin`），因此**不需要任何后端代理**
- 可选的「高级：接口地址」允许改成第三方兼容端点（如自建网关）
- 错误会翻译成人话：`401` Key 无效、`402` 余额不足、`429` 请求过于频繁、`400/422` 参数问题、`500/503` 服务端问题
- **不写死 `max_tokens`**：交给 DeepSeek 的默认值（8K 非思考 / 64K 思考）。写死一个小值会让长 Prompt 被截断成非法 JSON（见下）
- **截断保护**：如果 `finish_reason` 是 `length`（输出被截断），界面会明确提示，并且**不允许直接写入表单**，只提供「复制已生成部分 / 重新生成」；被截断的 JSON 会用容错扫描器把已生成的字段读出来，绝不会把原始 JSON 甩给用户
- **不省略正文**：系统提示词明确禁止「…（其余不变）」这类偷懒写法——编辑长 Prompt 时如果 AI 只回了一半，写进表单就等于毁掉原文
- 点「应用到表单」前会显示正文字数变化（如 `内容 1200 → 1480 字`），方便确认是否要覆盖
- **长 Prompt 用差分模式**：正文 ≥600 字时默认只让 AI 返回改动片段（见上），从根源上避免「整篇重写被截断」
- 不填写 API Key 时，PromptBox 的所有其他功能照常可用

---

## Project Structure

```text
src/
  components/      # UI 组件（卡片、弹窗、侧栏、命令面板等）
    ui/            # 基础 UI 原语（Button、Input、Modal…）
  pages/           # 页面（Library 首页）
  hooks/           # 自定义 Hooks（快捷键、Toast、剪贴板）
  lib/             # 纯函数（变量解析、搜索、导入导出、Markdown、瀑布流分列）
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
