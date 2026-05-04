# Open Video — Lessons Learned

调试经验记录，供未来开发和 AI Agent 参考。每条记录包含：**症状 → 根因 → 修复**。

---

## 1. 视频渲染为竖屏而非横屏

**症状**: `npx hyperframes render` 输出 1080×1920（竖屏），内容偏移到屏幕外
**根因**: `<html>` 标签有 `data-composition-id` 但没有 `data-width/height`。HyperFrames Producer 选取 DOM 中第一个 `data-composition-id` 元素读取尺寸，默认值为 1080×1920（竖屏）
**修复**: 从 `<html>` 移除 `data-composition-id`，仅保留在 `#stage` div 上（它同时有 `data-width="1920" data-height="1080"`）
**HyperFrames 源码位置**: `packages/producer/src/services/htmlCompiler.ts:1021-1022`
```ts
const width  = rootEl?.getAttribute("data-width")  || "1080";  // 默认竖屏！
const height = rootEl?.getAttribute("data-height") || "1920";
```
**排查方法**: 查看编译器日志 `Compiled composition metadata` 中的 width/height 值

---

## 2. 浏览器打开 HF HTML 黑屏

**症状**: 浏览器直接打开 `index.html` 完全黑屏
**根因**: GSAP timeline 使用 `{ paused: true }`，不会自动播放。HyperFrames player/compiler 负责控制播放
**修复**: 在浏览器控制台执行 `window.__timelines["main"].play()` 预览；生产环境用 `hyperframes render` 渲染
**排查方法**: 打开 DevTools → Console → 检查 `window.__timelines` 是否存在

---

## 3. Agent shell 命令被 Claude Code 沙箱拦截

**症状**: `npx hyperframes init/lint/render` 返回 `requires approval` 或 `sandbox blocked`
**根因**: Claude Code 的 `--permission-mode acceptEdits` 只自动批准文件编辑，不批准 shell 命令
**修复**: Prompt 改为让 Agent 直接用 Write 工具写 HTML；渲染用 daemon dispatch (`node "$OD_BIN" media generate`)
**排查方法**: 查看 Agent SSE 事件流中的 `tool_result` — `is_error: true` 表示权限被拒

---

## 4. CI 中 `@open-video/contracts` 模块找不到

**症状**: GitHub Actions CI `pnpm typecheck` 报 `Cannot find module '@open-video/contracts'`
**根因**: workspace 依赖 `@open-video/web` → `@open-video/contracts` 需要 `dist/` 目录。`pnpm typecheck` 在 `pnpm build` 之前运行，contracts 尚未编译
**修复**: CI 中在 typecheck 之前先 `pnpm --filter @open-video/contracts build`
**排查方法**: 本地可复现（`pnpm typecheck` 在 `pnpm build` 之前运行）则 CI 必然失败

---

## 5. CI 中 pnpm 版本冲突

**症状**: `pnpm/action-setup@v4` 报 `Multiple versions of pnpm specified`
**根因**: `ci.yml` 中 `version: 10` 与 `package.json` 中 `packageManager: pnpm@10.33.2` 冲突
**修复**: 删除 CI 中的 `version: 10`，让 action 自动从 `packageManager` 字段读取
**排查方法**: GitHub Actions 日志中搜索 `Multiple versions`

---

## 6. `video-skills` 目录名 ≠ Skill ID

**症状**: `readVideoSkill(skillsDir, 'product-launch-video')` 返回 null
**根因**: 目录名是 `product-launch`（短名），但 `SKILL.md` 的 YAML frontmatter 中 `name: product-launch-video`（长名）。`readVideoSkill` 按目录名查找
**修复**: 查找 Skill 时使用目录名（`product-launch`），不是 frontmatter 中的 name
**排查方法**: `ls video-skills/` 查看实际目录名

---

## 7. GitHub SSH 443 端口连接被关闭

**症状**: `ssh -T git@github.com` 返回 `Connection closed by 20.205.243.x port 443`
**根因**: 网络环境（防火墙/VPN）间歇性阻断 `ssh.github.com:443`
**修复**: 备用方案 — 用 `gh auth login` 认证后通过 HTTPS 推送（`git push` 自动走 gh credential helper）
**排查方法**: `ssh -vT git@github.com-openvideo-ai` 查看是否在 kex 阶段被关闭

---

## 通用调试技巧

1. **定位 HyperFrames 编译器行为**: 查看 `npx hyperframes render` 输出中的 `Compiled composition metadata` 行
2. **定位 Agent 行为**: 查看 `POST /api/runs/:id/events` SSE 流中的 `tool_use`/`tool_result` 事件
3. **定位 CI 失败**: `gh run view <id> --log` 查看完整日志
4. **定位前端问题**: 浏览器 DevTools → Network 标签查看 API 请求/响应
5. **验证 SSH 配置**: `ssh -T git@github.com-<alias>` 测试连接
