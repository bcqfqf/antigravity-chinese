import { readFileSync, writeFileSync, existsSync, readdirSync, openSync, readSync, closeSync } from 'node:fs';
import { execSync, spawn } from 'node:child_process';
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

function getAntigravityExePath() {
  const candidates = [
    join(LOCAL_APP_DATA, 'Programs', 'antigravity', 'Antigravity.exe'),
    join(process.env.PROGRAMFILES || 'C:\\Program Files', 'Antigravity', 'Antigravity.exe'),
    join(process.env['PROGRAMFILES(X86)'] || 'C:\\Program Files (x86)', 'Antigravity', 'Antigravity.exe')
  ];
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  return candidates[0];
}

function getConfig() {
  const configPath = join(PLUGIN_ROOT, 'dist', 'config.json');
  if (existsSync(configPath)) {
    try {
      return JSON.parse(readFileSync(configPath, 'utf-8'));
    } catch {}
  }
  return { enabled: true, autoPatchOnUpdate: true, autoRestartOnUpdate: false, brand: 'english', lang: 'zh' };
}

function saveConfig(updates) {
  const configPath = join(PLUGIN_ROOT, 'dist', 'config.json');
  const current = getConfig();
  const merged = { ...current, ...updates };
  writeFileSync(configPath, JSON.stringify(merged, null, 2), 'utf-8');
  return merged;
}

function restartAntigravity() {
  const exePath = getAntigravityExePath();
  if (process.platform === 'win32') {
    const psScript = `
      Start-Sleep -Milliseconds 400
      $procs = Get-Process -Name 'Antigravity' -ErrorAction SilentlyContinue
      if ($procs) {
        $procs | ForEach-Object { $_.CloseMainWindow() } | Out-Null
        Start-Sleep -Milliseconds 800
        $procs = Get-Process -Name 'Antigravity' -ErrorAction SilentlyContinue
        if ($procs) { $procs | Stop-Process -Force -ErrorAction SilentlyContinue }
      }
      Start-Sleep -Milliseconds 400
      Start-Process -FilePath '${exePath.replace(/'/g, "''")}'
    `;
    const b64 = Buffer.from(psScript, 'utf16le').toString('base64');
    const child = spawn('powershell.exe', ['-NoProfile', '-WindowStyle', 'Hidden', '-EncodedCommand', b64], {
      detached: true,
      stdio: 'ignore'
    });
    child.unref();
  } else if (process.platform === 'darwin') {
    const script = `osascript -e 'quit app "Antigravity"'; sleep 1; open -a Antigravity`;
    const child = spawn('bash', ['-c', script], { detached: true, stdio: 'ignore' });
    child.unref();
  } else {
    const script = `pkill -x Antigravity || pkill -f antigravity; sleep 1; antigravity &`;
    const child = spawn('sh', ['-c', script], { detached: true, stdio: 'ignore' });
    child.unref();
  }
}

function sendDesktopNotification(title, message) {
  try {
    if (process.platform === 'win32') {
      const psScript = `
        Add-Type -AssemblyName System.Windows.Forms
        $notify = New-Object System.Windows.Forms.NotifyIcon
        $notify.Icon = [System.Drawing.SystemIcons]::Information
        $notify.BalloonTipTitle = '${title.replace(/'/g, "''")}'
        $notify.BalloonTipText = '${message.replace(/'/g, "''")}'
        $notify.Visible = $true
        $notify.ShowBalloonTip(10000)
        Start-Sleep -Seconds 10
        $notify.Dispose()
      `;
      const b64 = Buffer.from(psScript, 'utf16le').toString('base64');
      const child = spawn('powershell.exe', ['-NoProfile', '-WindowStyle', 'Hidden', '-EncodedCommand', b64], {
        detached: true,
        stdio: 'ignore'
      });
      child.unref();
    } else if (process.platform === 'darwin') {
      const script = `display notification "${message.replace(/"/g, '\\"')}" with title "${title.replace(/"/g, '\\"')}"`;
      const child = spawn('osascript', ['-e', script], { detached: true, stdio: 'ignore' });
      child.unref();
    } else {
      const child = spawn('notify-send', [title, message], { detached: true, stdio: 'ignore' });
      child.unref();
    }
  } catch (e) {
    console.warn('[Antigravity-Chinese] Notification failed:', e.message);
  }
}

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

let pendingRestart = false;
let lastAutoPatchInfo = null;
let isAutoPatching = false;

async function autoDetectAndPatch() {
  if (isAutoPatching) return;
  const cfg = getConfig();
  if (cfg.enabled === false) return; // 用户手动关闭了汉化
  if (cfg.autoPatchOnUpdate === false) return; // 用户手动关闭了自动更新注入

  const status = checkLocalizationStatus();
  if (!status.installed) {
    isAutoPatching = true;
    console.log('[Antigravity-Chinese] 🚀 检测到 Antigravity 官方已更新，正在自动补全汉化注入...');
    try {
      const res = applyPatch(cfg.brand || 'english', cfg.lang || 'zh');
      console.log('[Antigravity-Chinese] 官方更新自动注入完成:', res.message);
      pendingRestart = true;
      lastAutoPatchInfo = {
        time: new Date().toLocaleTimeString(),
        date: new Date().toLocaleDateString(),
        message: res.message
      };

      if (cfg.autoRestartOnUpdate) {
        console.log('[Antigravity-Chinese] 用户已配置自动重启，正在重启客户端以生效...');
        restartAntigravity();
      } else {
        sendDesktopNotification(
          'Antigravity 中文本地化',
          '检测到官方版本已更新，已自动在后台注入汉化！重启客户端即可生效。'
        );
      }
    } catch (err) {
      console.error('[Antigravity-Chinese] 自动注入失败:', err.message);
    } finally {
      isAutoPatching = false;
    }
  }
}

// 启动后延迟 2.5 秒触发一次初始检测，避免与 Electron 启动初期资源争用
setTimeout(autoDetectAndPatch, 2500);

// 后台定时巡检（每 30 秒），以便在 Antigravity 后台更新完毕后第一时间自动注入
setInterval(autoDetectAndPatch, 30000);

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
    const cfg = getConfig();
    return {
      version: '2.23.1',
      installed: status.installed,
      currentLang: status.currentLang,
      hasBackup: status.hasBackup,
      dictEntries: dictInfo.total || 2855,
      dictFiles: dictInfo.list,
      autoPatchOnUpdate: cfg.autoPatchOnUpdate !== false,
      autoRestartOnUpdate: !!cfg.autoRestartOnUpdate,
      pendingRestart: pendingRestart,
      lastAutoPatchInfo: lastAutoPatchInfo,
      error: status.error
    };
  };

  const handleApply = async (data = {}) => {
    try {
      const brand = data.brandTitle || 'english';
      const lang = data.lang || 'zh';
      const res = applyPatch(brand, lang);
      pendingRestart = true;
      return res;
    } catch (e) {
      return { success: false, message: e.message };
    }
  };

  const handleRestore = async () => {
    try {
      const res = restorePatch();
      pendingRestart = true;
      return res;
    } catch (e) {
      return { success: false, message: e.message };
    }
  };

  const handleConfig = async (data = {}) => {
    try {
      const updated = saveConfig(data);
      return { success: true, config: updated };
    } catch (e) {
      return { success: false, message: e.message };
    }
  };

  const handleRestart = async () => {
    try {
      restartAntigravity();
      return { success: true, message: '正在重启客户端...' };
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
  app.api('/api/config', handleConfig, 'POST');
  app.api('/api/restart', handleRestart, 'POST');

  app.run();
  console.log('[Antigravity-Chinese] Sidecar server running on port', process.env.ANTIGRAVITY_SIDECAR_WEB_PORT);
} else {
  // 独立调试服务器
  import('node:http').then(({ createServer }) => {
    const server = createServer((req, res) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Sidecar-Token');
      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }

      if (req.url === '/' || req.url === '/index.html') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(readFileSync(join(__dirname, 'index.html'), 'utf-8'));
      } else if (req.url.startsWith('/api/status')) {
        const status = checkLocalizationStatus();
        const dictInfo = getDictSummary(status.isTw ? 'dicts_tw' : 'dicts');
        const cfg = getConfig();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          version: '2.23.1',
          installed: status.installed,
          currentLang: status.currentLang,
          hasBackup: status.hasBackup,
          dictEntries: dictInfo.total || 2855,
          dictFiles: dictInfo.list,
          autoPatchOnUpdate: cfg.autoPatchOnUpdate !== false,
          autoRestartOnUpdate: !!cfg.autoRestartOnUpdate,
          pendingRestart: pendingRestart,
          lastAutoPatchInfo: lastAutoPatchInfo,
          error: status.error
        }));
      } else if (req.url.startsWith('/api/apply')) {
        try {
          const result = applyPatch();
          pendingRestart = true;
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(result));
        } catch (e) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, message: e.message }));
        }
      } else if (req.url.startsWith('/api/restore')) {
        try {
          const result = restorePatch();
          pendingRestart = true;
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(result));
        } catch (e) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, message: e.message }));
        }
      } else if (req.url.startsWith('/api/config')) {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
          try {
            const data = JSON.parse(body || '{}');
            const updated = saveConfig(data);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, config: updated }));
          } catch (e) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, message: e.message }));
          }
        });
      } else if (req.url.startsWith('/api/restart')) {
        try {
          restartAntigravity();
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, message: '正在重启客户端...' }));
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
