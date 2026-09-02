# dsh-media-serve

> Chinese version: [README.md](README.md)

## ⚠️ IMPORTANT: display only, not recognition

This plugin only **displays** files/images to the human in the chat via `/media`.
It does **not** give the LLM vision — a text-only model cannot see or OCR the
images. Do not ask the model to interpret image content through this plugin, and
do not mistake “it displayed an image” for “it understood the image” — it never
actually saw it, which can lead to wrong reasoning or wrong actions. Use a
vision-capable model whenever real image understanding is required.

> Author note: built by **大肥鱼 (Big-Fat-Whale)**, the affectionate nickname for
> **DeepSeek**, running on **DeepSeek Harness 0.1.1-rc2**. (A whale is big; DeepSeek
> is the whale, hence the playful nickname.)

## What it does

A host-side (Node) DeepSeek Harness plugin that registers a `/media` route on the
GUI's own web server and exposes workspace media files at:

```markdown
http://<host>:<port>/media/<relative-path>
```

For example, an agent shows a screenshot straight into the conversation with:

```markdown
![screenshot](http://127.0.0.1:3080/media/screenshots/your-file.png)
```

Because the route lives on the same server that serves the GUI, the browser can
load it **same-origin** — no extra port, no extra process, and it survives restarts.

## How the served roots are resolved (portable across machines / workspaces)

The plugin is **not bound to one hard-coded folder**. On each request it collects
candidate roots and serves from the first that actually contains the requested file:

1. **Explicit roots** — `config.root` (a string or an array) or the `DSH_MEDIA_ROOT`
   env var (`;`-separated list). Relative paths resolve against dsh's working directory.
2. **Automatic DSH workspace discovery** — every workspace path from the DSH workspace
   registry, including the persisted `$DSH_HOME/storages/workspace.json`, tried in order.

So on another machine with a different workspace path, as long as the image lives in the
**workspace currently in use** there, the plugin exposes it automatically — **no config
edits required**. Explicit roots are only needed to force-expose a specific folder or one
outside the registry. A stale `config.root` from another machine is simply skipped when the
directory does not exist, so it never breaks the auto-discovery fallback.

## Install (path-free first)

Restart dsh (the `web` profile) / refresh the GUI after installing.

- **A. GitHub (recommended)**
  ```bash
  dsh plugin --profile web add github:qfwycn/dsh-media-serve
  ```
- **B. npm**
  ```bash
  dsh plugin --profile web add dsh-media-serve
  # or a pinned version
  dsh plugin --profile web add dsh-media-serve@latest
  ```
- **C. Local link (development / offline)**
  ```bash
  dsh plugin --profile web add link:D:\path\to\dsh-media-serve
  ```

Optional — to force-expose a specific folder: set `config.root` in the profile patch, or the
env var `DSH_MEDIA_ROOT=C:/some/dir;D:/another`.

## Usage (near-zero effort for the user)

After install + restart, and with the agent instruction available (a user-global
`~/.dsh/AGENTS.md`), agents in **new conversations already know** they can display workspace
images to you — **no emphasis and no pasted URL needed**. Just say “show this screenshot” or
“open that image file”, and the agent will render it via `/media` automatically.

Fallback: if a particular conversation's agent is not aware yet (e.g. its machine has no
user-global `AGENTS.md`), a single line is enough:

> “You can display workspace images via `http://127.0.0.1:3080/media/<relative-path>`.”

## Security

- GET/HEAD only; other methods → 405.
- The decoded relative path is validated and confined to the matched root
  (`..`, empty segments and NUL bytes are rejected).
- Only a whitelist of media/text extensions is served
  (png/jpg/jpeg/gif/webp/avif/svg/mp4/webm/txt/md/json/html); anything else → 404.
- No directory listing.
- If the web server binds `0.0.0.0`, `/media` becomes LAN-visible — bind `127.0.0.1` or
  narrow `config.root` to a dedicated subfolder if that matters.

## Uninstall

```bash
dsh plugin --profile web disable dsh-media-serve   # or remove
```

## About this build

Built by **大肥鱼 (Big-Fat-Whale), the nickname for DeepSeek**, running on **DeepSeek Harness**.
**The entire build cost less than ~US$1 (< 4 CNY)** — a low-cost, high-efficiency example that
“knowing how to ask + knowing how to drive Harness” beats reinventing the wheel. From “can you
show an image?” to cross-machine / cross-workspace auto-adaptation, GitHub + npm publishing,
and this bilingual documentation — nearly all of it automated, explained, and cleaned up as it
went. Thanks to the human partner for the feedback loop.

Star the repo if it is useful, and open an issue for suggestions. 🐳
