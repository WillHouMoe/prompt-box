# PromptBox

个人 Prompt 工具箱：保存、分类、搜索常用 Prompt，使用时填写变量、预览并一键复制最终文本。

纯静态单页应用。数据全部保存在浏览器 `localStorage`，无后端、无账号、无云同步。

在线地址：https://willhoumoe.github.io/prompt-box/

---

## Features

- **Prompt 管理**：新建、编辑、删除、复制（Duplicate）
- **变量**：正文中用 `{{variable_name}}` 声明变量，自动识别并生成表单；同名变量只生成一个输入框，填充后同步替换所有出现位置
- **Preview**：实时渲染最终 Prompt，复制的是替换后的文本而非模板
- **搜索**：标题、内容、分类、标签的实时全文搜索
- **组织**：一级分类、多标签、Chat / Agent 类型、收藏、最近使用
- **Import / Export**：导出 `promptbox-backup.json`，可导入恢复
- **Markdown**：内容与 Preview 支持基础 Markdown 渲染
- **快捷键**：`⌘K` 命令面板、`N` 新建、`Esc` 关闭
- **AI 助手（DeepSeek，Beta）**：见下文

---

## Tech Stack

| 用途 | 依赖 |
| --- | --- |
| UI | React 18 + TypeScript 5 |
| 构建 | Vite 5 |
| 样式 | Tailwind CSS v4 |
| 图标 | lucide-react |
| Markdown | marked + DOMPurify |
| 测试 | Vitest + Testing Library |
| AI（可选） | DeepSeek API（OpenAI 兼容，Beta） |
| 部署 | GitHub Actions → GitHub Pages |

---

## Development

```bash
npm install
npm run dev
```

开发服务器默认运行在 `http://localhost:5173`。

---

## Build

```bash
npm run build
```

产物位于 `dist/`。本地构建 base 为 `/`；部署到子路径时由 `VITE_BASE` 注入，例如 `VITE_BASE=/my-path/ npm run build`。GitHub Pages 的 workflow 会自动注入仓库子路径。

---

## Test

```bash
npm test
```

覆盖变量解析、搜索、导入导出、diff 合并等纯函数，`src/storage/` 数据层的 CRUD 与持久化，以及「使用 → 填写变量 → Preview → 复制」等关键 UI 流程。

---

## Deployment

push 到 `main` 触发 `.github/workflows/deploy.yml`：

```text
checkout → setup Node 22 → npm ci → npm test → npm run build
→ actions/upload-pages-artifact → actions/deploy-pages
```

仓库需在 **Settings → Pages → Source** 选择 **GitHub Actions**（只需配置一次）。

---

## Data Storage

| key | 内容 |
| --- | --- |
| `promptbox.data.v1` | `{ prompts, categories }` |
| `promptbox.settings.v2` | AI 助手配置（API Key、模型、接口地址、深度思考）；会自动读取旧的 `v1` |

首次打开会写入少量示例 Prompt，可随时删除。导出 / 导入用于跨浏览器备份与恢复。数据访问集中在 `src/storage/`，UI 通过 `PromptStoreProvider`（React Context）读写。

---

## AI 助手（DeepSeek，Beta）

### 配置

在「设置」或编辑弹窗的 AI 面板中填入 DeepSeek API Key。请求由浏览器直接发往 `api.deepseek.com`，不经过第三方服务器，Key 仅保存在 `localStorage`。接口地址可改为其他 OpenAI 兼容端点。未填写 Key 时其余功能不受影响。

### 模型

| 模型 | 说明 |
| --- | --- |
| `deepseek-flash`（默认） | 低延迟，适合起草 |
| `deepseek-v4-pro` | 复杂 Prompt 更稳定 |

旧的 `deepseek-chat`(V3) / `deepseek-reasoner`(R1) 已下线，旧配置会自动迁移。深度思考默认开启（thinking 模式，`reasoning_effort: high`），可在设置中关闭。

### 请求格式

每次请求携带固定系统提示词（`src/lib/deepseek.ts` 的 `buildSystemPrompt`），约定：

- 变量写成 `{{variable_name}}`（小写英文 / 下划线），同名变量保持一致
- 标题 ≤10 字，标签 ≤5 个，分类只能取自现有分类，`target` 只能为 `chat` / `agent`
- 正文结构：角色与目标 → 编号要求 → 输出格式
- 附带当前编辑中的标题、正文、标签、分类、类型

请求使用 JSON Output（`response_format: { type: "json_object" }`）：

```json
{
  "reply": "1-2 句说明",
  "draft": {
    "title": "英语作文润色",
    "content": "请帮我修改下面的英语作文。\n\n要求：\n1. 保留原意\n2. 修正语法错误\n\n作文：\n{{essay}}",
    "tags": ["英语", "写作"],
    "category": "学习",
    "target": "chat"
  }
}
```

返回值经 `normalizeDraft` 校验：缺失 `content` 视为无草稿，`target` 非法则丢弃，标签去重并截断到 5 个。模型未返回合法 JSON 时降级为纯文本回答。

### 差分模式

正文 ≥600 字时默认使用 `edits` 模式，只返回改动片段：

```json
{
  "reply": "说明文字",
  "edits": [
    { "find": "原文片段", "replace": "替换后的片段" },
    { "find": "", "replace": "追加到末尾的内容" }
  ]
}
```

界面以红删 / 绿增渲染改动，并显示应用与跳过的处数。面板底部可在「差分 / 全文」之间切换。合并逻辑见 `src/lib/diffEdits.ts`。

### 合并规则

| 情况 | 行为 |
| --- | --- |
| 定位 | 精确匹配 → 忽略空行与缩进差异 → 折叠 Markdown 记号与全半角标点后模糊匹配 |
| 模糊命中 | 界面提示标点 / 空行 / Markdown 记号与原文有出入 |
| 相似度 | 以最长行作锚点，再用字符 bigram 的 Dice 相似度选块，阈值 0.72 |
| `find` 出现多次 | 判为 `ambiguous`，跳过 |
| 范围重叠 | 后者判为 `overlap`，跳过 |
| `find` 不在原文中 | 判为 `not-found`，跳过 |
| `find` 为空字符串 | 追加到正文末尾 |
| `replace` 为空字符串 | 删除该段 |
| 应用顺序 | 在原文上定位，再按位置从后往前应用 |
| 全部失败 | 不修改正文 |
| 重试 | 提供「重试未匹配的 N 处」，仅重发定位失败的 `find` |

### 错误处理

| 状态码 | 提示 |
| --- | --- |
| 401 | API Key 无效 |
| 402 | 余额不足 |
| 429 | 请求过于频繁 |
| 400 / 422 | 参数问题 |
| 500 / 503 | 服务端问题 |

`finish_reason: length` 表示输出被截断，此时不允许写入表单，仅提供复制与重新生成；被截断的 JSON 由容错扫描器提取已生成字段。请求不设置 `max_tokens`，使用接口默认值。

---

## Project Structure

```text
src/
  components/      # UI 组件（卡片、弹窗、侧栏、标签筛选浮层、命令面板等）
    ui/            # 基础 UI 原语（Button、Input、Modal…）
  pages/           # 页面（Library 首页）
  hooks/           # 自定义 Hooks（快捷键、Toast、剪贴板）
  lib/             # 纯函数（变量解析、搜索、导入导出、Markdown、瀑布流分列、diff 合并）
  storage/         # 数据访问层（localStorage CRUD + 示例数据）
  store/           # React 状态（Context Provider）
  types/           # TypeScript 类型
  test/            # 测试 setup
```

---

## License

MIT
