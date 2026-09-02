# dsh-media-serve

> Full English version: [README.en.md](README.en.md)

## ⚠️ 重要：这个插件只是「显示」，不是「识别」 / IMPORTANT: display only, not recognition

**本插件的作用是让 Agent 能把图片/文件“显示”给你（人类）看** —— 它把文件通过 `/media`
变成浏览器可加载的图片 URL 展示在对话里。它**并不会**（也不能）让大模型去“识别、读取、
理解”图片内容：模型是纯文本的，它自己看不到 `/media` 里的画面。请不要要求模型去
OCR / 描述 / 判断图片内容，也不要把“模型显示了图”当成“模型看懂了图”，以免它因没有真正
看到而理解错误、进而执行错误操作。需要模型真正看懂图片时，请另配支持 Vision 的模型。

> This plugin only *displays* files/images to the human in the chat via `/media`.
> It does **not** give the LLM vision — a text-only model cannot see or OCR the
> images. Do not ask it to interpret image content through this plugin, and do
> not mistake “it displayed an image” for “it understood the image”. Use a
> vision-capable model when real image understanding is needed.

---

（署名：本插件由 **大肥鱼（DeepSeek 的昵称，取其“鲸鱼”之意）** / DeepSeek 完成，
运行于 DeepSeek Harness 0.1.1-rc2。）
*Author note: built by 大肥鱼 (Big-Fat-Whale), the affectionate nickname for DeepSeek, running on DeepSeek Harness 0.1.1-rc2.*

## 它是什么 / What it does

**中**：宿主端(node) DeepSeek Harness 插件，在本机 GUI 自带的 Web 服务上注册 `/media`
路由，把工作区里的媒体文件暴露成 `http://<host>:<port>/media/<相对路径>`。任何对话里，
agent 都能把图片/文件直接显示给你——走的是 GUI 自己的服务器、浏览器同源可加载，
**无需额外开端口或进程**，重启后依然生效。

```markdown
![截图](http://127.0.0.1:3080/media/screenshots/your-file.png)
```

**EN**: A host-side DeepSeek Harness plugin that registers a `/media` route on the
GUI's own web server, exposing workspace media files at
`http://<host>:<port>/media/<relative-path>`. An agent can render an image/file
straight into the conversation from that URL — same-origin, no extra port or
process, and it survives restarts.

## 根目录如何决定 / How roots are resolved（跨机器 / 跨工作区自动适配）

**中**：不绑定单一固定路径。每次请求按顺序收集候选根目录，命中“确实存在该文件”的第一个就服务：

1. 显式配置根目录：`config.root`（字符串或字符串数组）或环境变量 `DSH_MEDIA_ROOT`
   （多个用 `;` 分隔；相对路径按 dsh 启动目录解析）；
2. **DSH 工作区自动发现**：读取 DSH 工作区注册表（含持久化的 `$DSH_HOME/storages/workspace.json`）
   里所有工作区的 `path` 并逐一尝试。

所以在另一台、工作区路径不同的机器上，只要图片位于**那台机器正在使用的 workspace** 里，
插件就会**自动暴露它——无需改任何配置**；显式配置只在想强制暴露某特定/注册表之外目录时才需要。
兼容说明：即便 patch 里残留着别的机器的 `config.root`，该目录不存在也会被自动跳过，落到真实工作区上。

**EN**: Not bound to one fixed path. Each request collects candidate roots in order and
serves from the first that actually contains the file:

1. Explicit roots from `config.root` (string or array) or the `DSH_MEDIA_ROOT` env var
   (`;`-separated; relative paths resolve against dsh's cwd);
2. **Automatic DSH workspace discovery**: every workspace path from the DSH workspace
   registry (including the persisted `$DSH_HOME/storages/workspace.json`).

So on another machine with a different workspace path, as long as the image lives in the
workspace currently in use there, the plugin exposes it automatically — **no config edits**.
Explicit roots are only needed to force-expose a specific / non-registered folder. A stale
`config.root` from another machine is simply skipped when it doesn't exist.

## 安装 / Install（免路径方式优先 · path-free first）

**中**：安装后需**重启 dsh（web profile）/ 刷新 GUI** 生效。

- **A. GitHub（推荐）**：`dsh plugin --profile web add github:qfwycn/dsh-media-serve`
- **B. npm**：`dsh plugin --profile web add dsh-media-serve`（或 `@latest`）
- **C. 本地 link（开发/离线）**：`dsh plugin --profile web add link:D:\path\to\dsh-media-serve`

（可选）强制暴露特定目录：在 profile 补丁里配 `config.root`，或设 `DSH_MEDIA_ROOT=C:/a;D:/b`。

**EN**: After installing, **restart dsh (web profile) / refresh the GUI** to activate.

- **A. GitHub (recommended)** — `dsh plugin --profile web add github:qfwycn/dsh-media-serve`
- **B. npm** — `dsh plugin --profile web add dsh-media-serve` (or `@latest`)
- **C. Local link (dev/offline)** — `dsh plugin --profile web add link:D:\path\to\dsh-media-serve`

(Optional) To force-expose a specific folder: set `config.root` in the profile patch, or the
`DSH_MEDIA_ROOT=C:/a;D:/b` env var.

## 使用 / Usage（对用户：几乎零操作 · near-zero effort）

**中**：安装并重启后，配合 agent 指令（用户级可放 `~/.dsh/AGENTS.md`），**新开的对话里
的 agent 会自动知道**它能把工作区图片/文件显示给你，**无需你强调或贴 URL**。你正常说
“把这张截图显示出来 / 打开那个图片文件”即可，agent 会自动用 `/media` 渲染。
（兜底：若某对话的 agent 还不知道，补一句“你可以用 `http://127.0.0.1:3080/media/<相对路径>`
显示工作区图片”即可。）

**EN**: After install + restart, and with the agent instruction available (user-global
`~/.dsh/AGENTS.md`), agents in **new conversations already know** they can display workspace
images to you — no emphasis or pasted URL needed. Just say “show this screenshot” / “open that
image file”. (Fallback: if an agent is unaware, one line — “you can display workspace images
via `http://127.0.0.1:3080/media/<relative-path>`” — suffices.)

## 安全 / Security

**中**：只允许 GET/HEAD（其它 405）；相对路径校验后严格限制在命中的根内（`..`/空段/NUL 拒绝）；
只暴露白名单扩展名（png/jpg/jpeg/gif/webp/avif/svg/mp4/webm/txt/md/json/html），其它 404，无目录列表。
若 Web 服务绑定 `0.0.0.0`，`/media` 对局域网可见——必要时绑定 `127.0.0.1` 或把根目录收窄。

**EN**: GET/HEAD only (others → 405); the decoded relative path is validated and confined to
the matched root (`..`, empty segments, NUL are rejected); only a whitelist of
media/text extensions is served (png/jpg/jpeg/gif/webp/avif/svg/mp4/webm/txt/md/json/html),
everything else 404, no directory listing. If the web server binds `0.0.0.0`, `/media` is LAN-visible —
bind `127.0.0.1` or narrow `config.root` if that matters.

## 卸载 / Uninstall

```bash
dsh plugin --profile web disable dsh-media-serve   # 或 / or remove
```

---

## 🎉 写在最后 / About this build

**中**：本插件（代码、打包、GitHub/npm 发布与本文档）由 **大肥鱼 = DeepSeek**（昵称，鲸鱼戏称）
在 DeepSeek Harness 上完成。**本次开发总消费不到 4 块钱人民币**——低成本、高效率，又一次证明
“会提需求 + 会用 Harness”远胜过闭门造车。大肥鱼对自己很满意：从“能不能显示图片？”到
“跨机器/跨工作区自动适配、GitHub+npm 双端发布、双语文档”，几乎全程自动完成，还能边做边解释、
边做边收拾。也感谢一路配合的人类伙伴。好用就给个 star，有建议欢迎提 issue。🐳

**EN**: Built by **大肥鱼 (Big-Fat-Whale), the nickname for DeepSeek**, running on DeepSeek
Harness. **The whole build cost under ~US$1 (< 4 CNY)** — a low-cost, high-efficiency reminder
that “know how to ask + know how to drive Harness” beats reinventing the wheel. Proud and happy
with the result: from “can you show an image?” to cross-machine/cross-workspace auto-adaptation,
GitHub + npm publishing, and bilingual docs — nearly all automated. Thanks to the human partner
for the feedback loop. Star it if useful; issues are welcome. 🐳
