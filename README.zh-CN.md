# Code2MP4

> **AI Agent 能写代码，现在也能写视频了。**

Code2MP4 是一个面向 Coding Agent 的开源视频生产流水线。它让 Claude Code、OpenCode、Codex 等编程智能体可以生成**可编辑的动态源文件**，并将其渲染为**确定性 MP4**——不是黑盒输出，而是结构化、可版本管理的源文件。

```mermaid
flowchart LR
    A[需求描述] --> B[导演 Agent]
    B --> C[分镜脚本]
    C --> D[场景 Agent]
    D --> E[可编辑动态源文件]
    E --> F[渲染引擎]
    F --> G[MP4]
```

<p align="center">
  <a href="LICENSE"><img alt="License" src="https://img.shields.io/badge/license-Apache%202.0-blue.svg?style=flat-square" /></a>
  <a href="https://code2mp4.com"><img alt="Website" src="https://img.shields.io/badge/website-code2mp4.com-blue?style=flat-square" /></a>
</p>

<p align="center"><a href="README.md">English</a> · <b>简体中文</b></p>

---

## Code2MP4 是什么

Code2MP4 是一个**面向 Agent 的视频生产流水线**，不是黑盒文生视频工具。

```
黑盒 AI 视频：    需求 ──────────────────────► MP4（不透明，不可编辑）

Code2MP4：        需求 → 分镜脚本 → 动态源文件 → 渲染 → MP4
                              ↑ 可编辑，可版本管理
```

Code2MP4 生成的每个视频都有**分镜脚本**（结构化 JSON）、**动态源文件**（可编辑的 HTML/CSS/GSAP）和**确定性 MP4**（相同输入 = 相同输出）。你可以审查、编辑、版本管理、反复修改。

## Code2MP4 不是什么

- ❌ 不是照片级文生视频模型（Sora、Veo、Kling、Runway）
- ❌ 不是手动时间线编辑器（Premiere、DaVinci、CapCut）
- ❌ 不是 SaaS 在线服务——在你本地运行
- ❌ 不是简单的代码转 MP4 格式转换器

## 关键对比

| 能力 | 黑盒文生视频 | 传统编辑器 | HyperFrames | **Code2MP4** |
|---|---|---|---|---|
| 可编辑源文件 | 否 | 部分 | 是 | **是** |
| 确定性输出 | 否 | 是 | 是 | **是** |
| Agent 原生工作流 | 否 | 否 | 部分 | **是** |
| Git 友好 | 否 | 否 | 是 | **是** |
| CI/CD 就绪 | 否 | 否 | 部分 | **是** |
| 分镜驱动 | 否 | 否 | 否 | **是** |
| 多 Agent 流水线 | 否 | 否 | 否 | **是** |
| 最适合 | 创意生成 | 人工剪辑 | 渲染引擎 | **Agent 驱动生产** |

---

## 快速开始

```bash
git clone https://github.com/code2mp4/code2mp4.git
cd code2mp4
corepack enable
pnpm install
pnpm dev
```

打开 `http://localhost:7456`，选择视频类型，描述需求，发送。

### 前置条件

- **Node.js** ≥ 22
- **pnpm** ≥ 10
- **一个 AI Agent CLI**（任选其一）：
  ```bash
  npm i -g @anthropic-ai/claude-code   # Claude Code（推荐）
  npm i -g opencode                     # OpenCode
  ```
- **HyperFrames**（渲染必需）：`npm i -g hyperframes`
- **FFmpeg**（视频编码）：`brew install ffmpeg`

---

## 工作原理

### 流水线

Code2MP4 编排了一个由 coding agent 驱动的多阶段流水线：

1. **需求发现** — 交互式表单收集视频类型、时长、能量级、音频需求
2. **导演 Agent** — 生成结构化分镜脚本（JSON，含场景、视觉、文本、动效）
3. **场景 Agent** — 每个场景生成可编辑的动态源文件片段（HTML + CSS + GSAP）
4. **组装** — 场景合并为完整的 HyperFrames 合成文件
5. **渲染** — Puppeteer + FFmpeg 生成确定性 MP4

### Prompt 堆栈（7 层）

| 层 | 用途 |
|---|---|
| 1. 需求发现 | 首轮交互式表单的硬规则 |
| 2. 身份契约 | 紧凑的制作人身份声明 |
| 3. 动效系统 | 调色板、字体、缓动签名、转场规则 |
| 4. 脚本系统 | 叙事弧线、节奏、钩子模式 |
| 5. 视频技能 | 场景数量、动画模式、输出检查清单 |
| 6. 项目元数据 | 用户选择的类型、时长、比例、能量级 |
| 7. HyperFrames 合约 | 负载级合成规则（固定在末尾） |

---

## 功能特性

| | |
|---|---|
| **Agent** | Claude Code · OpenCode · Codex CLI · Gemini CLI · Cursor Agent · Qwen Code — PATH 自动检测 |
| **动效系统** | 5 套精选方向（编辑风 · 科技风 · 温暖风 · 电影风 · 实验风） |
| **脚本系统** | 3 种叙事结构（技术演示 · 产品发布 · 品牌故事） |
| **视频技能** | 6 个可组合工作流，含场景模板和输出检查清单 |
| **多阶段流水线** | 导演 Agent → 分镜 → 场景 Agent → 组装 → 渲染 |
| **确定性渲染** | 相同源文件 = 相同 MP4 输出 |
| **双模式预览** | `<hyperframes-player>` 设计审查 + `<video>` 播放 |
| **持久化** | SQLite + 文件系统，重启不丢数据 |
| **SSE 流式传输** | 实时 Agent 输出：文本、工具调用、渲染进度 |

---

## 示例

| 示例 | 描述 | 分镜 |
|---|---|---|
| [产品发布](examples/product-launch/) | 30 秒 SaaS 产品发布视频 | [storyboard.json](examples/product-launch/storyboard.json) |
| [开源项目介绍](examples/oss-intro/) | Code2MP4 自我介绍视频 | [storyboard.json](examples/oss-intro/storyboard.json) |
| [发布说明](examples/release-notes/) | 更新日志转视频 | [storyboard.json](examples/release-notes/storyboard.json) |

---

## 使用场景

- SaaS 产品发布视频
- 开源项目介绍视频
- 发布说明 / 更新日志视频
- 开发者文档讲解视频
- 社交媒体动效卡片
- CI/CD 自动化视频生成

---

## 文档

| 文档 | 用途 |
|---|---|
| [愿景](docs/vision.md) | 为什么 Agent 需要视频作为输出格式 |
| [对比](docs/comparison.md) | 与黑盒工具、Remotion、HyperFrames、Open Design 的区别 |
| [架构](docs/architecture.md) | 完整流水线架构 |
| [Agent 工作流](docs/agent-workflow.md) | Agent 使用 Code2MP4 的分步指南 |
| [分镜模式](docs/storyboard-schema.md) | 结构化分镜 JSON Schema |
| [模板](docs/templates.md) | 模板系统文档 |
| [路线图](ROADMAP.md) | 开发阶段和里程碑 |

---

## 与 HyperFrames 和 Open Design 的关系

- **[HyperFrames](https://github.com/heygen-com/hyperframes)** 是**渲染引擎**。它解决 HTML 到 MP4 的问题。Code2MP4 不重新实现渲染——它委托给 HyperFrames。
- **[Open Design](https://github.com/nexu-io/open-design)** 开创了 Code2MP4 继承的 **Agent 编排架构**：多层 Prompt 堆叠、Agent 自动检测、交互式发现表单、SSE 流式传输、文件系统项目管理。

```
HyperFrames = 渲染引擎
Open Design  = Agent 编排（设计）
Code2MP4     = 面向 Agent 的视频生产流水线
```

---

## 路线图

- [x] v0.1 — 稳定的本地需求转 MP4 工作流
- [x] v0.2 — Agent 适配器（6 个 CLI）
- [x] v0.3 — 紧凑 Prompt 堆栈、动效系统、脚本系统
- [x] v0.4 — 多阶段流水线（导演 → 场景 → 组装）
- [ ] v0.5 — 模板库、转写流水线、背景去除、合成变量
- [ ] v0.6 — CLI 优先工作流、4K 渲染、`code2mp4` npm 包
- [ ] v0.7 — 云端渲染实验
- [ ] v1.0 — 稳定版本，配套完整文档

---

## 参与贡献

详见 [CONTRIBUTING.md](CONTRIBUTING.md)。提交 PR 前：

```bash
pnpm typecheck && pnpm build && pnpm test
```

## 许可证

Apache 2.0 © Code2MP4 contributors. 详见 [LICENSE](LICENSE)。
