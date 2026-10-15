import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import OpenCC from 'opencc-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const converter = OpenCC.Converter({ from: 'cn', to: 'tw' });

// 特殊术语精准映射（符合港台软件习惯）
const termOverrides = {
  '加载中...': '載入中...',
  '保存': '儲存',
  '设置': '設定',
  '偏好设置': '偏好設定',
  '视图': '檢視',
  '窗口': '視窗',
  '文件': '檔案',
  '刷新': '重新整理',
  '默认': '預設',
  '支持': '支援',
  '项目列表': '專案列表',
  '会话列表': '對話列表'
};

const PLUGIN_ROOT = path.join(__dirname, '..');

const srcDirs = [
  path.join(PLUGIN_ROOT, 'scripts', 'dicts'),
  path.join(PLUGIN_ROOT, 'dist', 'dicts')
];

const targetDirs = [
  path.join(PLUGIN_ROOT, 'scripts', 'dicts_tw'),
  path.join(PLUGIN_ROOT, 'dist', 'dicts_tw')
];

targetDirs.forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const srcDir = srcDirs[0];
const files = fs.readdirSync(srcDir).filter(f => f.endsWith('.json'));

let totalEntries = 0;
for (const file of files) {
  const content = JSON.parse(fs.readFileSync(path.join(srcDir, file), 'utf8'));
  const twContent = {};

  for (const [key, val] of Object.entries(content)) {
    if (typeof val === 'string') {
      let twVal = converter(val);
      for (const [sTerm, tTerm] of Object.entries(termOverrides)) {
        if (val === sTerm) {
          twVal = tTerm;
          break;
        }
      }
      twContent[key] = twVal;
    } else {
      twContent[key] = val;
    }
    totalEntries++;
  }

  targetDirs.forEach(dir => {
    fs.writeFileSync(path.join(dir, file), JSON.stringify(twContent, null, 4), 'utf8');
  });
}

console.log(`Successfully generated Traditional Chinese dicts: ${files.length} files, ${totalEntries} entries.`);
