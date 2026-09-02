# dsh-media-serve

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

## 安装

```bash
# 在 dsh 运行目录里，把本插件作为本地 link 装进 web profile：
dsh plugin --profile web add link:<本目录的绝对路径>

# 例如
dsh plugin --profile web add link:C:\path\to\dsh-media-serve
```

安装后需**重启 dsh / 刷新 GUI 页面**让插件生效。
（可选）若要强制暴露注册表之外/特定目录，可在 profile 的补丁里配置 `config.root`，或启动时设
`DSH_MEDIA_ROOT=C:/some/dir;D:/another`。

## 怎么用（给对话里的 agent）

在任意对话里告诉 agent：

> 把文件 `<工作区内某路径>\xxx.png` 显示出来；它对应当前工作区 URL
> `http://<host>:<port>/media/<相对路径>`，用 markdown 图片引用它。

agent 就能用 markdown 图片把它渲染到对话里（GUI 原生支持渲染该 URL 下的图片，已实测）。

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
