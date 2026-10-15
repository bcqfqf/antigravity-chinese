---
name: chinese-localizer
description: Antigravity 界面中文本地化技能。用于检查汉化状态、在官方更新后重新注入轻量挂载点、或无损还原官方原版英文。
---

# Antigravity 中文本地化技能

本技能由内置插件 `antigravity-chinese` 提供，用于管理 Antigravity 界面语言。

## 常用操作

1. **一键注入/修复中文**：
   在官方更新后，如果用户反映界面变回英文，直接执行：
   ```bash
   node "C:/Users/1/.gemini/config/plugins/antigravity-chinese/scripts/patch.mjs" --apply
   ```

2. **还原官方英文**：
   ```bash
   node "C:/Users/1/.gemini/config/plugins/antigravity-chinese/scripts/patch.mjs" --restore
   ```
