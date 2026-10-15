import { existsSync, copyFileSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ASAR_PATH = 'C:\\Users\\1\\AppData\\Local\\Programs\\antigravity\\resources\\app.asar';
const BAK_PATH = 'C:\\Users\\1\\AppData\\Local\\Programs\\antigravity\\resources\\app.asar.bak';
const SAFE_ENGINE = join(__dirname, 'safe_engine.js');

export function checkStatus() {
  if (!existsSync(ASAR_PATH)) return { installed: false, error: '未找到 app.asar' };
  try {
    const buf = readFileSync(ASAR_PATH);
    const installed = buf.includes(Buffer.from('ANTIGRAVITY CHINESE LOCALIZATION', 'utf8')) ||
                      buf.includes(Buffer.from('AG_CHINESE_LOADER', 'utf8'));
    const isTw = buf.includes(Buffer.from('const USE_TW = true;', 'utf8'));
    const lang = installed ? (isTw ? 'tw' : 'zh') : 'en';
    return { installed, isTw, lang, hasBackup: existsSync(BAK_PATH) };
  } catch (e) {
    return { installed: false, error: e.message };
  }
}

export function applyPatch(brand = 'english', lang = 'zh') {
  if (!existsSync(ASAR_PATH)) throw new Error('未找到 app.asar: ' + ASAR_PATH);

  try {
    const twFlag = lang === 'tw' && existsSync(join(__dirname, 'dicts_tw')) ? ' --tw' : '';
    const out = execSync(`node "${SAFE_ENGINE}" --no-kill --brand-title ${brand}${twFlag}`, {
      cwd: __dirname,
      encoding: 'utf8',
      stdio: 'pipe'
    });
    try {
      const distDir = join(__dirname, '..', 'dist');
      if (!existsSync(distDir)) mkdirSync(distDir, { recursive: true });
      writeFileSync(join(distDir, 'config.json'), JSON.stringify({ enabled: true, brand, lang }, null, 2));
    } catch {}
    return { success: true, message: `${lang === 'tw' ? '繁體中文' : '簡體中文'}注入成功！界面已即时生效。`, stdout: out };
  } catch (err) {
    throw new Error('注入出错: ' + (err.stderr || err.stdout || err.message));
  }
}

export function restorePatch() {
  if (!existsSync(BAK_PATH)) {
    return { success: false, message: '未找到官方备份文件 app.asar.bak。' };
  }
  try {
    copyFileSync(BAK_PATH, ASAR_PATH);
    try {
      const distDir = join(__dirname, '..', 'dist');
      if (!existsSync(distDir)) mkdirSync(distDir, { recursive: true });
      writeFileSync(join(distDir, 'config.json'), JSON.stringify({ enabled: false }, null, 2));
    } catch {}
    return { success: true, message: '已成功还原官方原版英文状态！' };
  } catch (err) {
    throw new Error('还原出错: ' + err.message);
  }
}

if (process.argv[1]?.endsWith('patch.mjs')) {
  const arg = process.argv[2] || '--check';
  if (arg === '--apply') {
    console.log(JSON.stringify(applyPatch()));
  } else if (arg === '--restore') {
    console.log(JSON.stringify(restorePatch()));
  } else {
    console.log(JSON.stringify(checkStatus()));
  }
}
