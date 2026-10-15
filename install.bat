@echo off
chcp 65001 >nul
title Antigravity 中文本地化插件一键安装
echo 正在启动安装程序...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0install.ps1"
pause
