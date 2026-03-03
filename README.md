<div align="center">

# 🔧 Antigravity RTL Fix

**Fix Arabic & Hebrew (RTL) text rendering in Google Antigravity's chat panel and Markdown Preview.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-blue.svg)]()

</div>

---

## The Problem

Google Antigravity renders Arabic, Hebrew, and other RTL (Right-to-Left) text incorrectly in its chat panel. When you communicate with an AI assistant in Arabic, the text direction gets mixed up — sentences appear reversed, mixed Arabic/English content becomes unreadable, and bullet points are misaligned.

**Before:**

- Arabic sentences render left-to-right (wrong direction)
- Mixed Arabic/English text gets reversed and jumbled
- Bullet points and numbered lists appear on the wrong side

**After:**

- Arabic text flows naturally from right to left ✅
- English words within Arabic sentences maintain correct order ✅
- Bullet points and numbers align to the right ✅
- Code blocks always stay LTR (left-to-right) ✅
- Markdown Preview also supports RTL ✅

## How It Works

Antigravity's chat panel renders inside an isolated Electron webview. Standard CSS injection methods (extensions, custom CSS loaders) cannot reach this webview. This tool patches Antigravity's Electron main process to inject scoped RTL CSS into all webviews at startup via `webContents.insertCSS()`.

The CSS:

- Is **scoped** to the chat panel (`.interactive-session`) and Markdown Preview (`.vscode-body`) — no other UI elements are affected
- Sets `direction: rtl` as the base direction for text elements
- Forces `direction: ltr` on code blocks so code never gets flipped
- Handles lists, tables, inline code, and mixed content correctly

## Quick Start

### Install

```bash
# Clone the repo
git clone https://github.com/AhmedMahmoud113/antigravity-rtl-fix.git

# Run the installer
cd antigravity-rtl-fix
node install.js
```

Then **restart Antigravity** (close completely and reopen).

> **Note:** You may see an "Installation is corrupt" warning — click the ⚙️ gear icon → **Don't Show Again**. This is expected and doesn't affect functionality.

### Uninstall

```bash
node install.js --undo
```

### Check Status

```bash
node install.js --status
```

## After Antigravity Updates

Antigravity updates may overwrite the fix. Simply re-run:

```bash
node install.js
```

## Supported Platforms

| Platform | Install Path (auto-detected)                 |
| -------- | -------------------------------------------- |
| Windows  | `%LOCALAPPDATA%\Programs\Antigravity`        |
| macOS    | `/Applications/Antigravity.app`              |
| Linux    | `/usr/share/antigravity`, `/opt/antigravity` |

## What Gets Fixed

| Area                           | Direction        |
| ------------------------------ | ---------------- |
| Chat messages (AI responses)   | RTL ✅           |
| Chat messages (your messages)  | RTL ✅           |
| Markdown Preview (`.md` files) | RTL ✅           |
| Code blocks & inline code      | Always LTR ✅    |
| Bullet points & numbered lists | Right-aligned ✅ |
| Editor, menus, tabs, explorer  | Unchanged ✅     |

## Technical Details

The installer performs three atomic operations:

1. **Backup** — Copies `main.js` → `main.orig.js` (one-time, idempotent)
2. **Patch** — Replaces `main.js` with a bootstrap that:
   - Hooks `app.on('web-contents-created')` in Electron's main process
   - Calls `webContents.insertCSS()` on every `dom-ready` event
   - Then loads the original `main.orig.js` via dynamic `import()`
3. **Restore** (on `--undo`) — Copies `main.orig.js` back to `main.js`

The injected CSS uses scoped selectors (`.interactive-session`, `.vscode-body`, `.markdown-body`) to target only the chat panel and Markdown Preview without affecting other UI elements.

## Contributing

Contributions are welcome! Feel free to:

- Report issues with specific text rendering
- Add support for additional RTL languages (Hebrew, Persian, Urdu)
- Improve CSS selectors for edge cases
- Add screenshots showing before/after

## License

[MIT](LICENSE) — free to use, modify, and distribute.
