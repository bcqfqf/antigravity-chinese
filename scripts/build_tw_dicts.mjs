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
  '会话列表': '對話列表',
  '置顶': '釘選',
  '取消置顶': '取消釘選',
  '置顶会话': '釘選對話',
  '取消置顶会话': '取消釘選對話',
  '归档': '封存',
  '取消归档': '取消封存',
  '归档会话': '封存對話',
  '取消归档会话': '取消封存對話',
  '已归档': '已封存',
  '会话已归档': '對話已封存',
  '重命名': '重新命名',
  '拆分': '分割',
  '向右拆分': '向右分割',
  '向下拆分': '向下分割',
  '向上拆分': '向上分割',
  '向左拆分': '向左分割',
  '水平拆分': '水平分割',
  '垂直拆分': '垂直分割',
  '水平拆分会话': '水平分割對話',
  '垂直拆分会话': '垂直分割對話',
  '拆分会话': '分割對話',
  '关闭拆分': '關閉分割',
  '复制链接': '複製連結',
  '复制会话链接': '複製對話連結'
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
