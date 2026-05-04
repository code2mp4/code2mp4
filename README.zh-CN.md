# Open Video

> **AI 驱动的视频制作 — 当设计智能体遇见动效图形。**

Open Video 融合了 [Open Design][od] 的 AI Agent 编排能力与 [HyperFrames][hf] 的 HTML-to-MP4 渲染引擎。描述你想要的视频——产品发布、社媒短片、品牌片头——AI Agent 会编写 HyperFrames 合成文件，渲染为 MP4，并将结果流式传输回你的浏览器。**每一层都可替换、可定制（BYOK）。**

<p align="center">
  <a href="LICENSE"><img alt="License" src="https://img.shields.io/badge/license-Apache%202.0-blue.svg?style=flat-square" /></a>
  <a href="#agents"><img alt="Agents" src="https://img.shields.io/badge/agents-6%20CLIs%20自动检测-black?style=flat-square" /></a>
  <a href="#motion-systems"><img alt="Motion systems" src="https://img.shields.io/badge/动效系统-5%20套-orange?style=flat-square" /></a>
  <a href="#video-skills"><img alt="Skills" src="https://img.shields.io/badge/技能-6%20个-teal?style=flat-square" /></a>
  <a href="#快速开始"><img alt="Quickstart" src="https://img.shields.io/badge/快速开始-3%20条命令-green?style=flat-square" /></a>
</p>

<p align="center"><a href="README.md">English</a> · <b>简体中文</b></p>

---

## 为什么做这个

今天的 AI 视频生成分为两极：写实文本生成视频（Kling、Veo、Sora）给你一个无法编辑的黑箱输出，手工时间线编辑器（After Effects、DaVinci）给你控制权但要求专业能力。没有一个开源工具能让你通过文本描述，让 AI Agent 来编排、动画化并渲染一个视频——同时保持源码完全可见和可编辑。

**Open Video 填补了这个空白。** 它融合了两个经过验证的开源范式：

- **[Open Design][od]** 教会我们如何将任何编程 Agent CLI 转变为设计引擎：通过 Prompt 编排、交互式追问表单、技能驱动的工作流和基于文件系统的项目模型。
- **[HyperFrames][hf]** 教会我们视频可以当作单个 HTML 文件来创作——用 `data-*` 属性控制时间轴，用 GSAP 做动画，通过 Puppeteer + FFmpeg 帧精确渲染。

你输入"做一个 15 秒的产品发布视频"，Agent 先追问（视频类型？时长？能量级？音频需求？），然后脚手架搭建 HyperFrames 合成文件，编写动画，执行 lint + validate + inspect 检查，调度渲染，最终将 MP4 流式返回浏览器。整个合成文件——HTML、CSS、GSAP 时间轴——都是你的，可任意编辑。

---

## 快速开始

### 前置条件

- **Node.js** ≥ 22
- **pnpm** ≥ 10
- **一个 AI Agent CLI**（任选其一）：
  ```bash
  npm i -g @anthropic-ai/claude-code   # Claude Code（推荐）
  npm i -g opencode                     # OpenCode
  npm i -g @google/gemini-cli          # Gemini CLI
  ```
- **HyperFrames**（渲染必需）：`npm i -g hyperframes`
- **FFmpeg**（视频编码）：`brew install ffmpeg`（macOS）或 `apt install ffmpeg`（Linux）

### 三条命令启动

```bash
git clone https://github.com/openvideo-ai/openvideo.git
cd open-video
pnpm install && pnpm dev
```

打开 `http://localhost:7456`，从侧边栏选择视频类型，描述你的需求，发送。

---

## 核心特性

| | 你得到什么 |
|---|---|
| **Agent 自动检测** | Claude Code · OpenCode · Codex CLI · Gemini CLI · Cursor Agent · Qwen Code — 自动扫描 PATH，一键切换 |
| **动效设计系统** | 5 套精选方向（编辑风 · 科技风 · 温暖风 · 电影风 · 实验风）——每套包含确定性的调色板、字体栈、缓动签名、转场规则和反烂片检查清单 |
| **视频技能** | 6 个可组合工作流（产品发布 · 社媒短片 · 教程 · 品牌片头 · 字幕短片 · 音频响应） |
| **Prompt 编排** | 6 层堆叠：视频追问（7 题表单）→ 专家身份 → MOTION.md → SKILL.md → 项目元数据 → HF 合约（底部锁定） |
| **渲染管线** | Agent 编写 HF HTML → `od media generate` → daemon → `npx hyperframes render` → SSE 进度 → MP4 |
| **双模式预览** | `<hyperframes-player>` web component（GSAP 定位、时间轴拖动）+ `<video>` 标签播放 MP4 |
| **文件工作区** | 自动轮询的文件浏览器，支持下载/预览，点文件过滤，类型图标 |
| **持久化** | SQLite（项目·对话·消息，级联删除），文件系统为真实数据源 |
| **多轮对话** | 对话标签、消息历史、Agent 工具调用展示 |
| **CLI** | `od` Agent 调度器（media generate/wait/health）+ `ov-dev` 生命周期（start/stop/status） |
| **CI** | GitHub Actions：push 自动 typecheck + build + test |
| **测试** | 49 个单元测试（prompts、agents、db、motion-systems、skills、projects） |
| **许可证** | Apache 2.0 |

---

## 致谢

Open Video 能够存在，是因为以下项目的开创性工作：

### Open Design
**[nexu-io/open-design](https://github.com/nexu-io/open-design)** — Claude Design 的开源替代方案。Open Design 开创了 Open Video 继承的架构：**Prompt 编排**（discovery → identity → design system → skill → metadata 的分层组合模式）、**Agent 自动检测**（PATH 扫描 13 个编程 Agent CLI）、**交互式追问表单**（XML 块在前端解析为实时表单）、**`agents.ts` 模式**、**`runs.ts` SSE 管理器**以及**skill + design-system 加载器模式**。我们的 `video-discovery.ts` 是 `discovery.ts` 的概念适配，`composeVideoSystemPrompt` 镜像了 `composeSystemPrompt`。没有 Open Design 的 daemon-first、BYOK 架构，就不会有 Open Video。

### HyperFrames  
**[heygen-com/hyperframes](https://github.com/heygen-com/hyperframes)** — HTML-first 视频合成和渲染。HyperFrames 是让 Open Video 成为可能的渲染引擎：视频可以当作单个 HTML 文件来创作，用 `data-*` 属性控制时间轴，通过 Puppeteer + FFmpeg 帧精确渲染。我们使用 HF 的 CLI 命令、`<hyperframes-player>` web component、`visual-styles.md` 模式（启发了 `MOTION.md` 格式）以及 `registry.json` 区块生态。

### GSAP
**[GreenSock/GSAP](https://gsap.com)** — 驱动每个 HF 合成文件的动画引擎。Open Video 中所有视频运镜都通过 GSAP 时间轴运行。

### 其他启发
- **[alchaincyf/huashu-design](https://github.com/alchaincyf/huashu-design)** — 设计哲学（Junior-Designer 工作流、反 AI 烂片检查清单、5 维自我批评）
- **[op7418/guizang-ppt-skill](https://github.com/op7418/guizang-ppt-skill)** — 幻灯片技能架构
- **[VoltAgent/awesome-design-md](https://github.com/VoltAgent/awesome-design-md)** — DESIGN.md 模式（我们的 MOTION.md 格式的模板）

---

## 许可证

Apache 2.0 © 2026 Open Video contributors。详见 [LICENSE](LICENSE)。

[od]: https://github.com/nexu-io/open-design
[hf]: https://github.com/heygen-com/hyperframes
