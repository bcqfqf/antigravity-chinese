import { readFileSync, existsSync, readdirSync, openSync, readSync, closeSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import os from 'node:os';
import { applyPatch, restorePatch } from '../../scripts/patch.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PLUGIN_ROOT = join(__dirname, '..', '..');
const DICTS_DIR = join(PLUGIN_ROOT, 'dist', 'dicts');

const LOCAL_APP_DATA = process.env.LOCALAPPDATA || join(os.homedir(), 'AppData', 'Local');
const ASAR_PATH = join(LOCAL_APP_DATA, 'Programs', 'antigravity', 'resources', 'app.asar');
const BAK_PATH = join(LOCAL_APP_DATA, 'Programs', 'antigravity', 'resources', 'app.asar.bak');

function getDictSummary(folder = 'dicts') {
  const list = [];
  let total = 0;
  const dir = join(PLUGIN_ROOT, 'dist', folder);
  if (!existsSync(dir)) return { list: [], total: 0 };
  try {
    const files = readdirSync(dir);
    for (const f of files) {
      if (f.endsWith('.json')) {
        const content = JSON.parse(readFileSync(join(dir, f), 'utf-8'));
        const count = Object.keys(content).length;
        total += count;
        list.push({ file: f, count });
      }
    }
  } catch {}
  return { list, total };
}

function checkLocalizationStatus() {
  const origNoAsar = process.noAsar;
  process.noAsar = true;
  try {
    if (!existsSync(ASAR_PATH)) return { installed: false, hasBackup: false };
    const fd = openSync(ASAR_PATH, 'r');
    const buf = Buffer.alloc(1024 * 1024 * 20); // 最大读取 20MB
    const bytesRead = readSync(fd, buf, 0, buf.length, 0);
    closeSync(fd);
    const content = buf.subarray(0, bytesRead);
    const installed = content.includes(Buffer.from('ANTIGRAVITY CHINESE LOCALIZATION', 'utf8')) ||
                      content.includes(Buffer.from('AG_CHINESE_LOADER', 'utf8')) ||
                      content.includes(Buffer.from('反重力', 'utf8'));
    const isTw = content.includes(Buffer.from('const USE_TW = true;', 'utf8'));
    const currentLang = installed ? (isTw ? 'tw' : 'zh') : 'en';
    const hasBackup = existsSync(BAK_PATH);
    return { installed, isTw, currentLang, hasBackup };
  } catch (e) {
    return { installed: false, hasBackup: false, error: e.message };
  } finally {
    process.noAsar = origNoAsar;
  }
}

// 统一加载 Sidecar SDK
let SidecarApp = null;
try {
  const sdkPath = 'C:/Users/1/.gemini/config/node_modules/sidecar_sdk/index.mjs';
  const sdkUrl = pathToFileURL(sdkPath).href;
  const sdkModule = await import(sdkUrl);
  SidecarApp = sdkModule.SidecarApp;
} catch (e) {
  console.warn('[Antigravity-Chinese] Sidecar SDK failed to load:', e.message);
}

if (process.env.ANTIGRAVITY_SIDECAR_WEB_PORT && SidecarApp) {
  const app = new SidecarApp();

  // 主页
  app.page('/', () => {
    return readFileSync(join(__dirname, 'index.html'), 'utf-8');
  });

  const handleStatus = () => {
    const status = checkLocalizationStatus();
    const dictInfo = getDictSummary(status.isTw ? 'dicts_tw' : 'dicts');
    return {
      version: '2.23.1',
      installed: status.installed,
      currentLang: status.currentLang,
      hasBackup: status.hasBackup,
      dictEntries: dictInfo.total || 2825,
      dictFiles: dictInfo.list,
      error: status.error
    };
  };

  const handleApply = async (data = {}) => {
    try {
      const brand = data.brandTitle || 'english';
      const lang = data.lang || 'zh';
      const res = applyPatch(brand, lang);
      return res;
    } catch (e) {
      return { success: false, message: e.message };
    }
  };

  const handleRestore = async () => {
    try {
      const res = restorePatch();
      return res;
    } catch (e) {
      return { success: false, message: e.message };
    }
  };

  app.api('/api/status', handleStatus, 'GET');
  app.api('/api/status', handleStatus, 'POST');
  app.api('/api/apply', handleApply, 'GET');
  app.api('/api/apply', handleApply, 'POST');
  app.api('/api/restore', handleRestore, 'GET');
  app.api('/api/restore', handleRestore, 'POST');

  app.run();
  console.log('[Antigravity-Chinese] Sidecar server running on port', process.env.ANTIGRAVITY_SIDECAR_WEB_PORT);
} else {
  // 独立调试服务器
  import('node:http').then(({ createServer }) => {
    const server = createServer((req, res) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      if (req.url === '/' || req.url === '/index.html') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(readFileSync(join(__dirname, 'index.html'), 'utf-8'));
      } else if (req.url.startsWith('/api/status')) {
        const status = checkLocalizationStatus();
        const dictInfo = getDictSummary(status.isTw ? 'dicts_tw' : 'dicts');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          version: '2.23.1',
          installed: status.installed,
          currentLang: status.currentLang,
          hasBackup: status.hasBackup,
          dictEntries: dictInfo.total || 2825,
          dictFiles: dictInfo.list
        }));
      } else if (req.url.startsWith('/api/apply')) {
        try {
          const result = applyPatch();
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(result));
        } catch (e) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, message: e.message }));
        }
      } else if (req.url.startsWith('/api/restore')) {
        try {
          const result = restorePatch();
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(result));
        } catch (e) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, message: e.message }));
        }
      } else {
        res.writeHead(404);
        res.end('Not Found');
      }
    });
    const PORT = 59288;
    server.listen(PORT, '127.0.0.1', () => {
      console.log(`[Antigravity-Chinese] Standalone server running on http://127.0.0.1:${PORT}`);
    });
  });
}
