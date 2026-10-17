# Antigravity 中文本地化扩展套件 (Chinese Localization Plugin)

<p align="center">
  <img src="assets/logo.svg" width="96" height="96" alt="Antigravity Chinese Logo" />
</p>

<p align="center">
  专为 <b>Google Antigravity</b> 设计的原生扩展式中文本地化中心。<br>
  提供对齐 <b>Antigrative Dashboard</b> 视觉风格的侧边栏控制面板，支持一键切换简体/繁体/官方原版英文，官方更新不丢失。
</p>

---

## ✨ 核心特性

- **🎨 原生 Sidecar 控制面板**：
  采用类似 Antigrative Dashboard 的高质感深浅自适应 UI，完美嵌入 Antigravity 右侧辅助窗格（Auxiliary Pane）。
- **🤖 官方更新自动补全汉化 (v1.1.0 新增)**：
  Antigravity 官方每次自动更新升级覆盖核心文件后，后台 Sidecar 守护进程会自动识别并无感补全注入中文，**彻底免去用户手动打开面板再次点击注入的繁琐操作**！
- **🔄 一键优雅重启 & 桌面通知**：
  提供系统级安全重启机制（一键平稳退出并重新加载 Antigravity），支持桌面气泡提醒与顶部状态横幅，亦支持配置更新后全自动静默重启。
- **🇨🇳 🇭🇰 🇺🇸 三语自由切换**：
  - 🇨🇳 **简体中文**：包含 8 大模块全量 2,825+ 条精准翻译词库；
  - 🇭🇰 **繁體中文**：OpenCC 高精度字符与常用港台软件术语适配（設定/儲存/檢視/視窗/專案列表等）；
  - 🇺🇸 **官方原版**：保留 100% 官方纯净备份，随时无损一键还原。
- **🔍 全场景生态覆盖**：
  全面覆盖应用窗口主界面、提示词与快捷键、系统原生菜单栏、系统托盘右键菜单、以及**右键会话上下文菜单与多级二级子菜单**（复制会话/项目名、会话拆分等）。
- **🔒 代码与终端物理隔离**：
  Monaco Editor、Xterm 终端、代码输入框及上下文路径受到物理隔离保护，杜绝代码和终端输出被误汉化。
- **⚡ 轻量安全注入引擎**：
  采用原生直接字节注入技术，支持词库热更新与官方原版无损备份恢复，保障客户端环境稳定纯净。

---

## 📂 目录结构

```
antigravity-chinese/
├── assets/
│   └── logo.svg                 # 矢量图标
├── dist/
│   ├── dicts/                   # 简体中文字典 (8个模块, 2,825条)
│   ├── dicts_tw/                # 繁体中文字典 (8个模块, 2,825条)
│   └── inject.js                # 运行时轻量挂载器
├── scripts/
│   ├── dicts/                   # 源码简体词库
│   ├── dicts_tw/                # 源码繁体词库
│   ├── build_tw_dicts.mjs       # 繁体词库转换生成脚本
│   ├── patch.mjs                # Node.js 封装的注入与备份模块
│   └── safe_engine.js           # 零中断全生态安全注入引擎
├── sidecars/
│   └── panel/
│       ├── index.html           # Dashboard 风格自适应面板 UI
│       ├── server.mjs           # Sidecar 后端微服务
│       └── sidecar.json         # 扩展清单定义
├── skills/
│   └── chinese-localizer/
│       └── SKILL.md             # Antigravity Agent 自动化调度技能
└── plugin.json                  # 插件主配置清单
```

---

## 🚀 安装与启用

### 方式一：克隆到全局插件目录（推荐）

将本仓库克隆至用户的全局配置目录：

```bash
# Windows PowerShell
cd $env:USERPROFILE\.gemini\config\plugins
git clone https://github.com/bcqfqf/antigravity-chinese.git antigravity-chinese
```

在 `~/.gemini/config/config.json` 的 `plugins` 中注册启用：

```json
{
  "plugins": {
    "antigravity-chinese": {
      "enabled": true
    }
  }
}
```

启动或重启 Antigravity，即可在右侧窗格（或扩展中心）看到 **「中文本地化」** 图标。

---

## 🛠️ 使用说明

1. 在右侧面板中，可查看当前语言状态（简体中文 / 繁體中文 / 官方英文）；
2. 点击分段切换按钮即可秒级切换语言；
3. 切换完成后，正常关闭客户端重新启动即可看到全界面最新文字；
4. 官方发布新版本后，直接在面板中点击 **【⚡ 重新注入 / 修复中文】** 即可。

---

## 📄 License

[MIT License](LICENSE)
