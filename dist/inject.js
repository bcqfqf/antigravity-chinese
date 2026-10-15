(function () {
  if (window.__antigravityChineseInstalled) return;

  const fs = require('fs');
  const path = require('path');
  const os = require('os');

  const PLUGIN_DIR = path.join(os.homedir(), '.gemini', 'config', 'plugins', 'antigravity-chinese');
  const CONFIG_FILE = path.join(PLUGIN_DIR, 'dist', 'config.json');

  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const cfg = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
      if (cfg.enabled === false) return;
    }
  } catch {}

  window.__antigravityChineseInstalled = true;

  const DICTS_DIR = path.join(PLUGIN_DIR, 'dist', 'dicts');

  // 加载字典
  let dictionary = {};
  function reloadDictionary() {
    try {
      if (fs.existsSync(DICTS_DIR)) {
        const files = fs.readdirSync(DICTS_DIR);
        let merged = {};
        for (const file of files) {
          if (file.endsWith('.json')) {
            const data = JSON.parse(fs.readFileSync(path.join(DICTS_DIR, file), 'utf-8'));
            Object.assign(merged, data);
          }
        }
        dictionary = merged;
      }
    } catch (e) {
      console.warn('[Antigravity-Chinese] Failed to load dictionaries:', e);
    }
  }
  reloadDictionary();

  // 忽略翻译的选择器（代码编辑器、终端、输入区、Markdown 渲染块）
  const IGNORE_SELECTORS = [
    'pre', 'code', 'textarea', 'input',
    '.monaco-editor', '.terminal', '.xterm',
    '[data-code-block]', '.highlight'
  ].join(',');

  function isIgnored(node) {
    if (!node || node.nodeType !== Node.ELEMENT_NODE) {
      node = node?.parentElement;
    }
    return Boolean(node && node.closest(IGNORE_SELECTORS));
  }

  function translateText(text) {
    if (!text || typeof text !== 'string') return text;
    const trimmed = text.trim();
    if (!trimmed || trimmed.length < 2) return text;

    if (dictionary[trimmed]) {
      return text.replace(trimmed, dictionary[trimmed]);
    }
    return text;
  }

  function processNode(node) {
    if (!node || isIgnored(node)) return;

    if (node.nodeType === Node.TEXT_NODE) {
      const orig = node.nodeValue;
      const trans = translateText(orig);
      if (trans !== orig) {
        node.nodeValue = trans;
      }
      return;
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
      // 翻译 placeholder 与 title
      if (node.hasAttribute('placeholder')) {
        const p = node.getAttribute('placeholder');
        const tp = translateText(p);
        if (tp !== p) node.setAttribute('placeholder', tp);
      }
      if (node.hasAttribute('title')) {
        const t = node.getAttribute('title');
        const tt = translateText(t);
        if (tt !== t) node.setAttribute('title', tt);
      }
      if (node.hasAttribute('aria-label')) {
        const a = node.getAttribute('aria-label');
        const ta = translateText(a);
        if (ta !== a) node.setAttribute('aria-label', ta);
      }

      for (let child = node.firstChild; child; child = child.nextSibling) {
        processNode(child);
      }
    }
  }

  function runFullTranslation() {
    if (!document.body) return;
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
      {
        acceptNode(node) {
          if (isIgnored(node)) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    let current;
    while ((current = walker.nextNode())) {
      processNode(current);
    }
  }

  // DOM 观察器，实时对动态加载的内容进行翻译
  let observer = null;
  function startObserver() {
    if (observer) observer.disconnect();
    observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type === 'childList') {
          for (let i = 0; i < m.addedNodes.length; i++) {
            processNode(m.addedNodes[i]);
          }
        } else if (m.type === 'characterData') {
          processNode(m.target);
        }
      }
    });

    observer.observe(document.body || document.documentElement, {
      childList: true,
      subtree: true,
      characterData: true
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      runFullTranslation();
      startObserver();
    });
  } else {
    runFullTranslation();
    startObserver();
  }

  console.log('[Antigravity-Chinese] Native extension runtime active.');
})();
