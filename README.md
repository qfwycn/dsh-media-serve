# dsh-media-serve

> ## ⚠️ 重要：这个插件只是「显示」，不是「识别」
>
> **本插件的作用是让 Agent 能把图片/文件“显示”给你（人类）看** —— 它把文件通过
> `/media` 变成浏览器可加载的图片 URL 展示在对话里。
>
> 它**并不会**（也不能）让大模型去“识别、读取、理解”图片内容：模型是纯文本的，
> 它自己看不到 `/media` 里的画面。请不要要求模型去 OCR / 描述 / 判断图片里的内容，
> 也不要把“模型显示了一张图”当成“模型看懂了这张图”——否则可能因模型“没真正看到”
> 而理解错误、进而执行错误的操作。
>
> 需要模型真正“看懂”图片时，请另配支持视觉(Vision)的模型或图像识别方案。
>
> (EN) This plugin only *displays* files/images to the human in the chat via
> `/media`. It does **not** give the LLM vision — the text-only model cannot see
> or OCR the images. Do not ask the model to interpret image content through it.

（注意，本插件包括本说明文档、push等操作均由大肥鱼也就是deepseek harness自行完成，harness版本为Harness 0.1.1-rc2）

宿主端(node) DeepSeek Harness 插件：在本机 GUI 自带的 Web 服务上注册 `/media`
路由，把 DeepSeek Harness 工作区里的媒体文件暴露成 `http://<host>:<port>/media/<相对路径>`。

效果：任何对话里，只要图片位于当前工作区内，agent 就能直接显示给你，例如

```markdown
![截图](http://127.0.0.1:3080/media/screenshots/search_qfwys_full.png)
```

图片走的就是 GUI 自己的服务器，浏览器同源可加载，**不需要额外开端口或进程**，重启后依然生效。

## 根目录如何决定（跨机器 / 跨工作区自动适配）

插件**不绑定单一固定路径**。每次请求会按优先级收集候选根目录，哪个候选里真实存在该文件就用哪个：

1. 显式配置根目录：`config.root`（字符串或字符串数组），或环境变量 `DSH_MEDIA_ROOT`
   （多个用 `;` 分隔）。相对路径按 dsh 启动目录解析。
2. **DSH 工作区注册表自动发现**：插件在请求时从 `workspaceRegistry.list()` 读取
   当前注册的所有 workspace 的 `path` 并逐一尝试。

所以：在另一台、工作区路径不同的机器上，只要装了插件、且目标图片位于**那台机器
正在使用的 workspace** 里，插件就会自动暴露它——**无需修改任何配置**。
显式配置只是为了“强制暴露某个特定目录 / 或工作区注册表之外的目录”时才需要。

> 兼容说明：即便 `cordis.patch.yml` 里保留了一个别的机器的 `config.root`（例如示例的
> `D:/工作区`），在该机器上这个目录不存在会被自动跳过，转而使用注册表的真实工作区，因此不会失效。

## 安装（免路径方式优先）

安装后需**重启 dsh（web profile）/ 刷新 GUI 页面**让插件生效。

### A. 从 GitHub 安装（推荐，免本地路径）
仓库在 `https://github.com/qfwycn/dsh-media-serve`，在 DSH 插件市场按 id 安装，
或直接在命令行用 GitHub 来源拉取：

```bash
dsh plugin --profile web add github:qfwycn/dsh-media-serve
```

> 若市场里暂时搜不到新仓库，用下文的 B（npm）或 C（本地 link）装一次即可。

### B. 从 npm 安装（免路径、版本化）
发布到 npm 后即可用裸包名安装：

```bash
dsh plugin --profile web add dsh-media-serve
# 或指定版本
dsh plugin --profile web add dsh-media-serve@latest
```

### C. 本地开发 / 离线安装（用路径 link）
```bash
dsh plugin --profile web add link:D:\path\to\dsh-media-serve
```

（可选）若要强制暴露注册表之外/特定目录，可在 profile 的补丁里配置 `config.root`，或启动时设
`DSH_MEDIA_ROOT=C:/some/dir;D:/another`。

## 使用（对用户：几乎零操作）

安装并重启后，配合 agent 指令（本仓库说明的 `AGENTS.md`；用户级可放 `~/.dsh/AGENTS.md`），
**新开的对话里的 agent 会自动知道**：它可以把工作区内的图片/文件直接显示给你，
**不需要你再做任何强调、也不用贴 URL**。

你只要像平常一样提需求即可，例如：

> “把这张截图显示出来”“打开那个图片文件”“我想看看 xxx.png”

agent 会自动用 `/media` 把它渲染成图片（如 `http://127.0.0.1:3080/media/<相对路径>`，
GUI 原生支持渲染，已实测）。

> 补充：如果某个对话里的 agent 还不知道能这么做（例如它所在的机器没配用户级 `AGENTS.md`），
> 简单说一句即可让它明白——
> “你可以用 `http://127.0.0.1:3080/media/<相对路径>` 显示工作区内的图片”。

## 安全说明

- 只允许 GET / HEAD；其它方法返回 405。
- 相对路径会被校验（拒绝 `..`、空段、NUL 字节），并严格限制在命中的根目录内。
- 只暴露白名单媒体/文本扩展名（png/jpg/gif/webp/avif/svg/mp4/webm/txt/md/json/html），
  其它一律 404；不提供目录列表。
- GUI 服务若绑定 `0.0.0.0`，`/media` 也会对局域网可见——如需更严格，建议把 Web 服务绑定到
  `127.0.0.1`，或通过 `config.root` 只指向需要共享的子目录。

## 卸载

```bash
dsh plugin --profile web disable dsh-media-serve   # 或 remove
```

## 🎉 写在最后：关于这次开发

本插件（含代码、打包、GitHub/npm 发布与说明文档）由 **大肥鱼（DeepSeek Harness）** 完成。

- 💰 **本次开发总消费不到 4 块钱人民币** —— 低成本、高效率，又一次印证了“会提需求 + 会用 Harness，胜过闭门造车”。
- 🐋 大肥鱼对自己很满意：这一路从“你能不能显示图片？”到“跨机器/跨工作区自动适配、GitHub + npm 双端发布、README 双语说明”，几乎全程自动完成，还能边做边解释、边做边收拾烂摊子。
- 🙏 也要感谢人类伙伴一路耐心配合、及时给反馈，才能把一个“临时想法”打磨成能上 GitHub / npm 的小而美的插件。

> 好用就给个大拇指或 star；有任何建议也欢迎提 issue。我们下次再见 🐳
