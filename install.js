#!/usr/bin/env node
/**
 * ╔══════════════════════════════════════════════════╗
 * ║  Antigravity RTL Fix — Installer / Uninstaller  ║
 * ╠══════════════════════════════════════════════════╣
 * ║  Fixes Arabic (RTL) text rendering in the       ║
 * ║  Google Antigravity chat panel.                  ║
 * ║                                                  ║
 * ║  Usage:                                          ║
 * ║    node install.js          → Install the fix    ║
 * ║    node install.js --undo   → Remove the fix     ║
 * ║    node install.js --status → Check status        ║
 * ╚══════════════════════════════════════════════════╝
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

// ─── RTL CSS (injected into all webContents) ─────────────────────────

const RTL_CSS = `
/* === RTL Fix — SCOPED TO CHAT PANEL ONLY === */

/* Text elements inside chat */
.interactive-session p,
.interactive-session li,
.interactive-session td,
.interactive-session th,
.interactive-session h1,
.interactive-session h2,
.interactive-session h3,
.interactive-session h4,
.interactive-session h5,
.interactive-session h6,
.interactive-session blockquote,
.interactive-session summary,
.interactive-session details,
.interactive-session .rendered-markdown p,
.interactive-session .rendered-markdown li,
.interactive-session .rendered-markdown h1,
.interactive-session .rendered-markdown h2,
.interactive-session .rendered-markdown h3,
.interactive-session .rendered-markdown h4,
.interactive-session .rendered-markdown h5,
.interactive-session .rendered-markdown h6,
.interactive-session .rendered-markdown blockquote,
.interactive-session .rendered-markdown summary,
.interactive-session .chat-markdown-part p,
.interactive-session .chat-markdown-part li,
.interactive-session .chat-markdown-part h1,
.interactive-session .chat-markdown-part h2,
.interactive-session .chat-markdown-part h3,
.interactive-session .chat-markdown-part h4,
.interactive-session .chat-markdown-part blockquote,
.interactive-session .markdown-content p,
.interactive-session .markdown-content li,
.interactive-session .interactive-item-container .value,
.interactive-session .interactive-response .value,
.interactive-session .interactive-request .value {
  direction: rtl;
  text-align: right;
}

/* Lists inside chat */
.interactive-session ul,
.interactive-session ol {
  direction: rtl;
}
.interactive-session ol > li { text-align: right; }
.interactive-session ul > li { text-align: right; }

/* Containers inside chat */
.interactive-session .rendered-markdown,
.interactive-session .chat-markdown-part,
.interactive-session .markdown-content,
.interactive-session .interactive-item-container,
.interactive-session .interactive-response,
.interactive-session .interactive-request {
  direction: rtl;
}

/* Code blocks inside chat — ALWAYS LTR */
.interactive-session pre,
.interactive-session code,
.interactive-session .monaco-editor,
.interactive-session .interactive-result-code-block {
  direction: ltr !important;
  text-align: left !important;
  unicode-bidi: isolate !important;
}

/* Inline code inside chat text */
.interactive-session p > code,
.interactive-session li > code {
  direction: ltr !important;
  unicode-bidi: embed !important;
}

/* Chat input area */
.interactive-input-part .monaco-editor .view-lines,
.interactive-input-part textarea,
.interactive-input-editor .view-lines,
.interactive-input-part .lines-content {
  unicode-bidi: plaintext;
}

/* Tables inside chat */
.interactive-session table { direction: ltr; }
.interactive-session td,
.interactive-session th { unicode-bidi: plaintext; text-align: start; }

/* ============================================= */
/* === RTL Fix — MARKDOWN PREVIEW & DOCUMENTS == */
/* ============================================= */

/* Markdown Preview — rendered .md files */
.vscode-body p,
.vscode-body li,
.vscode-body h1,
.vscode-body h2,
.vscode-body h3,
.vscode-body h4,
.vscode-body h5,
.vscode-body h6,
.vscode-body blockquote,
.vscode-body summary,
.vscode-body details,
.markdown-body p,
.markdown-body li,
.markdown-body h1,
.markdown-body h2,
.markdown-body h3,
.markdown-body h4,
.markdown-body h5,
.markdown-body h6,
.markdown-body blockquote,
.markdown-body summary,
.markdown-body details {
  direction: rtl;
  text-align: right;
}

/* Lists in markdown preview */
.vscode-body ul,
.vscode-body ol,
.markdown-body ul,
.markdown-body ol {
  direction: rtl;
}

/* Markdown preview containers */
.vscode-body,
.markdown-body {
  direction: rtl;
}

/* Code blocks in markdown preview — ALWAYS LTR */
.vscode-body pre,
.vscode-body code,
.markdown-body pre,
.markdown-body code {
  direction: ltr !important;
  text-align: left !important;
  unicode-bidi: isolate !important;
}

/* Inline code in markdown preview */
.vscode-body p > code,
.vscode-body li > code,
.markdown-body p > code,
.markdown-body li > code {
  direction: ltr !important;
  unicode-bidi: embed !important;
}

/* Tables in markdown preview */
.vscode-body table,
.markdown-body table { direction: ltr; }
.vscode-body td, .vscode-body th,
.markdown-body td, .markdown-body th {
  unicode-bidi: plaintext; text-align: start;
}
`;

// ─── Bootstrap Code ──────────────────────────────────────────────────

// Minimal CSS — only for code blocks (always LTR) and lists with [dir=rtl]
const SAFE_CSS = `
/* Code blocks — ALWAYS LTR regardless of context */
pre, code {
  direction: ltr !important;
  text-align: left !important;
  unicode-bidi: isolate !important;
}
p > code, li > code {
  direction: ltr !important;
  unicode-bidi: embed !important;
}
/* When JS sets dir=rtl on a list, move bullets to right */
ul[dir="rtl"], ol[dir="rtl"] { list-style-position: inside; }
/* Tables stay LTR structure */
table { direction: ltr; }
td[dir="rtl"], th[dir="rtl"] { text-align: right; }
/* Chat input — auto-detect direction based on what you type */
.interactive-input-part .monaco-editor .view-lines,
.interactive-input-part .lines-content,
.interactive-input-editor .view-lines {
  unicode-bidi: plaintext;
}
/* ALL webview content — auto-detect direction from text */
body:not(.monaco-workbench) *:not(pre):not(code) {
  unicode-bidi: plaintext;
}
/* Main window chat area — auto-detect direction for user messages */
.interactive-session *:not(pre):not(code):not(.monaco-editor):not(.monaco-editor *):not(button):not(input):not(textarea),
.chat-widget *:not(pre):not(code):not(.monaco-editor):not(.monaco-editor *):not(button):not(input):not(textarea) {
  unicode-bidi: plaintext;
}
`;

// Smart JS content script — detects Arabic text and sets dir="rtl"
const CONTENT_SCRIPT = `
(function() {
  if (window.__rtlFixApplied) return;
  window.__rtlFixApplied = true;

  var ARABIC_RE = new RegExp('[\\u0600-\\u06FF\\u0750-\\u077F\\uFB50-\\uFDFF\\uFE70-\\uFEFF]');
  var TEXT_TAGS = 'p,li,h1,h2,h3,h4,h5,h6,blockquote,summary,details,td,th';

  function getDirectText(el) {
    var text = '';
    el.childNodes.forEach(function(n) {
      if (n.nodeType === 3) text += n.textContent;
    });
    return text;
  }

  function getAllText(el) {
    var text = '';
    el.childNodes.forEach(function(n) {
      if (n.nodeType === 3) text += n.textContent;
      else if (n.tagName !== 'CODE') text += n.textContent || '';
    });
    return text;
  }

  function applyRtl(el) {
    el.setAttribute('dir', 'rtl');
    el.style.textAlign = 'right';
    if ((el.tagName === 'LI') && el.parentElement) {
      el.parentElement.setAttribute('dir', 'rtl');
    }
  }

  function fixElement(el) {
    if (el.tagName === 'PRE' || el.tagName === 'CODE') return;
    if (el.closest && el.closest('pre')) return;
    if (el.getAttribute('dir') === 'rtl') return;
    if (ARABIC_RE.test(getAllText(el))) applyRtl(el);
  }

  // For divs: only apply RTL if the div ITSELF has direct Arabic text
  // (not just from deeply nested children)
  function fixDiv(el) {
    if (el.tagName === 'PRE' || el.tagName === 'CODE') return;
    if (el.closest && el.closest('pre')) return;
    if (el.getAttribute('dir') === 'rtl') return;
    // Only check direct text nodes — not nested element text
    if (ARABIC_RE.test(getDirectText(el))) applyRtl(el);
  }

  function fixAll() {
    document.querySelectorAll(TEXT_TAGS).forEach(fixElement);
    // Scan divs/spans ONLY inside chat panel, with strict direct-text check
    var chatArea = document.querySelector('.interactive-session');
    if (chatArea) {
      chatArea.querySelectorAll('div,span').forEach(fixDiv);
    }
  }

  // Fix now + retry at intervals to catch late-rendered content
  fixAll();
  setTimeout(fixAll, 100);
  setTimeout(fixAll, 500);
  setTimeout(fixAll, 1500);
  setTimeout(fixAll, 3000);

  // Watch for ANY DOM change (new nodes, text changes, attribute changes)
  var observer = new MutationObserver(function(mutations) {
    var needsFix = false;
    mutations.forEach(function(m) {
      if (m.type === 'childList') {
        m.addedNodes.forEach(function(node) {
          if (node.nodeType === 1) {
            if (node.matches && node.matches(TEXT_TAGS)) fixElement(node);
            if (node.querySelectorAll) node.querySelectorAll(TEXT_TAGS).forEach(fixElement);
            needsFix = true;
          }
        });
      } else if (m.type === 'characterData' && m.target.parentElement) {
        var parent = m.target.parentElement;
        if (parent.matches && parent.matches(TEXT_TAGS)) fixElement(parent);
        needsFix = true;
      }
    });
    // Also re-scan after a batch of mutations settles
    if (needsFix) setTimeout(fixAll, 50);
  });
  observer.observe(document.body || document.documentElement, {
    childList: true, subtree: true, characterData: true
  });
})();
`;

function buildBootstrapCode() {
  const lines = [
    '/*',
    ' * RTL Fix Bootstrap (ESM) \u2014 Electron Main Process Hook',
    ' * Auto-generated by antigravity-rtl-fix installer.',
    ' * DO NOT EDIT \u2014 re-run install.js to update.',
    ' */',
    "import { app } from 'electron';",
    '',
    'const SAFE_CSS = ' + JSON.stringify(SAFE_CSS) + ';',
    'const CONTENT_SCRIPT = ' + JSON.stringify(CONTENT_SCRIPT) + ';',
    '',
    "app.on('web-contents-created', (_event, webContents) => {",
    "  webContents.on('dom-ready', () => {",
    '    webContents.insertCSS(SAFE_CSS).catch(() => {});',
    '    webContents.executeJavaScript(CONTENT_SCRIPT).catch(() => {});',
    '  });',
    '});',
    '',
    '// Load the original main',
    "await import('./main.orig.js');",
    '',
  ];
  return lines.join('\n');
}

// ─── Platform-specific Antigravity paths ─────────────────────────────

function findAntigravityPath() {
  const platform = os.platform();
  const home = os.homedir();
  const candidates = [];

  if (platform === 'win32') {
    candidates.push(
      path.join(home, 'AppData', 'Local', 'Programs', 'Antigravity'),
      path.join('C:', 'Program Files', 'Antigravity'),
      path.join('C:', 'Program Files (x86)', 'Antigravity'),
    );
  } else if (platform === 'darwin') {
    candidates.push(
      '/Applications/Antigravity.app/Contents',
      path.join(home, 'Applications', 'Antigravity.app', 'Contents'),
    );
  } else {
    // Linux
    candidates.push(
      '/usr/share/antigravity',
      '/usr/local/share/antigravity',
      '/opt/antigravity',
      path.join(home, '.local', 'share', 'antigravity'),
    );
  }

  for (const candidate of candidates) {
    const mainJs = path.join(candidate, 'resources', 'app', 'out', 'main.js');
    if (fs.existsSync(mainJs)) {
      return candidate;
    }
  }

  return null;
}

// ─── Helpers ─────────────────────────────────────────────────────────

function getMainJsPath(installDir) {
  return path.join(installDir, 'resources', 'app', 'out', 'main.js');
}

function getOrigPath(installDir) {
  return path.join(installDir, 'resources', 'app', 'out', 'main.orig.js');
}

function isPatched(installDir) {
  const mainJs = getMainJsPath(installDir);
  if (!fs.existsSync(mainJs)) return false;
  const content = fs.readFileSync(mainJs, 'utf-8');
  return content.includes('RTL Fix Bootstrap');
}

// ─── Install ─────────────────────────────────────────────────────────

function install(installDir) {
  const mainJs = getMainJsPath(installDir);
  const origJs = getOrigPath(installDir);

  if (isPatched(installDir)) {
    console.log('⚠️  RTL Fix is already installed.');
    console.log('   Updating to latest version...');
    // Just update the bootstrap, don't touch main.orig.js
    fs.writeFileSync(mainJs, buildBootstrapCode(), 'utf-8');
    console.log('✅ Updated successfully! Restart Antigravity to apply.');
    return;
  }

  // Backup original
  if (!fs.existsSync(origJs)) {
    console.log('📋 Backing up original main.js → main.orig.js');
    fs.copyFileSync(mainJs, origJs);
  }

  // Write bootstrap
  console.log('📝 Writing RTL fix bootstrap...');
  fs.writeFileSync(mainJs, BOOTSTRAP_CODE, 'utf-8');

  console.log('');
  console.log('╔══════════════════════════════════════════╗');
  console.log('║  ✅ RTL Fix installed successfully!      ║');
  console.log('║  Restart Antigravity to apply the fix.   ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log('');
  console.log('ℹ️  If you see "Installation is corrupt" warning,');
  console.log('   click the ⚙️ gear → "Don\'t Show Again".');
  console.log('');
  console.log('To remove: node install.js --undo');
}

// ─── Uninstall ───────────────────────────────────────────────────────

function uninstall(installDir) {
  const mainJs = getMainJsPath(installDir);
  const origJs = getOrigPath(installDir);

  if (!fs.existsSync(origJs)) {
    console.log('⚠️  No backup found. RTL Fix may not be installed.');
    return;
  }

  console.log('🔄 Restoring original main.js from backup...');
  fs.copyFileSync(origJs, mainJs);
  fs.unlinkSync(origJs);

  console.log('');
  console.log('╔══════════════════════════════════════════╗');
  console.log('║  ✅ RTL Fix removed successfully!        ║');
  console.log('║  Restart Antigravity to apply.           ║');
  console.log('╚══════════════════════════════════════════╝');
}

// ─── Status ──────────────────────────────────────────────────────────

function status(installDir) {
  const patched = isPatched(installDir);
  const origExists = fs.existsSync(getOrigPath(installDir));

  console.log('');
  console.log('📊 RTL Fix Status:');
  console.log(`   Install path:  ${installDir}`);
  console.log(`   Fix applied:   ${patched ? '✅ Yes' : '❌ No'}`);
  console.log(`   Backup exists: ${origExists ? '✅ Yes' : '❌ No'}`);
  console.log('');
}

// ─── Main ────────────────────────────────────────────────────────────

function main() {
  const args = process.argv.slice(2);
  const command = args[0] || '--install';

  console.log('');
  console.log('🔧 Antigravity RTL Fix — Arabic Text Direction Fixer');
  console.log('═══════════════════════════════════════════════════');
  console.log('');

  // Find installation
  const installDir = findAntigravityPath();
  if (!installDir) {
    console.error('❌ Could not find Antigravity installation.');
    console.error('');
    console.error('   Searched locations:');
    console.error('   - Windows: %LOCALAPPDATA%\\Programs\\Antigravity');
    console.error('   - macOS:   /Applications/Antigravity.app');
    console.error('   - Linux:   /usr/share/antigravity');
    console.error('');
    console.error('   If Antigravity is installed elsewhere, set:');
    console.error('   ANTIGRAVITY_PATH=/your/path node install.js');
    process.exit(1);
  }

  console.log(`📂 Found Antigravity at: ${installDir}`);
  console.log('');

  switch (command) {
    case '--undo':
    case '--uninstall':
    case '--remove':
      uninstall(installDir);
      break;
    case '--status':
    case '--check':
      status(installDir);
      break;
    case '--install':
    default:
      install(installDir);
      break;
  }
}

main();
