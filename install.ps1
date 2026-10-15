# Antigravity 中文本地化插件一键安装与注册脚本 (Windows PowerShell)
$ErrorActionPreference = "Stop"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host " Antigravity 中文本地化插件一键安装程序" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

$userHome = [System.Environment]::GetFolderPath('UserProfile')
$geminiConfigDir = Join-Path $userHome ".gemini\config"
$pluginsDir = Join-Path $geminiConfigDir "plugins"
$targetDir = Join-Path $pluginsDir "antigravity-chinese"
$configFile = Join-Path $geminiConfigDir "config.json"

# 1. 确保插件目录存在并复制文件
if ($PSScriptRoot -ne $targetDir) {
    Write-Host "[1/3] 正在将插件部署至: $targetDir ..." -ForegroundColor Yellow
    if (!(Test-Path $pluginsDir)) { New-Item -ItemType Directory -Path $pluginsDir -Force | Out-Null }
    if (!(Test-Path $targetDir)) { New-Item -ItemType Directory -Path $targetDir -Force | Out-Null }
    Copy-Item -Path "$PSScriptRoot\*" -Destination $targetDir -Recurse -Force
} else {
    Write-Host "[1/3] 检测到已位于插件目录，跳过文件复制。" -ForegroundColor Green
}

# 2. 自动在 config.json 注册插件
Write-Host "[2/3] 正在注册插件到 Antigravity 全局配置..." -ForegroundColor Yellow
if (!(Test-Path $geminiConfigDir)) { New-Item -ItemType Directory -Path $geminiConfigDir -Force | Out-Null }

$config = @{}
if (Test-Path $configFile) {
    try {
        $raw = Get-Content $configFile -Raw -Encoding UTF8
        if ($raw.Trim()) { $config = $raw | ConvertFrom-Json }
    } catch {
        $config = @{}
    }
}

if (-not $config.plugins) {
    $config | Add-Member -NotePropertyName "plugins" -NotePropertyValue (New-Object PSObject) -Force
}

if (-not $config.plugins.'antigravity-chinese') {
    $pluginEntry = New-Object PSObject
    $pluginEntry | Add-Member -NotePropertyName "enabled" -NotePropertyValue $true
    $config.plugins | Add-Member -NotePropertyName "antigravity-chinese" -NotePropertyValue $pluginEntry -Force
} else {
    $config.plugins.'antigravity-chinese'.enabled = $true
}

$config | ConvertTo-Json -Depth 10 | Set-Content $configFile -Encoding UTF8
Write-Host "[2/3] 插件全局注册成功！" -ForegroundColor Green

# 3. 执行首次全生态中文注入
Write-Host "[3/3] 正在注入全生态中文本地化资源..." -ForegroundColor Yellow
$patchScript = Join-Path $targetDir "scripts\patch.mjs"
if (Test-Path $patchScript) {
    try {
        node $patchScript --apply
        Write-Host "==========================================" -ForegroundColor Cyan
        Write-Host " [√] 安装成功！全生态中文已注入完成。" -ForegroundColor Green
        Write-Host " 请启动/重启 Antigravity 客户端即可享受全中文体验！" -ForegroundColor Green
        Write-Host "==========================================" -ForegroundColor Cyan
    } catch {
        Write-Host "[!] 注入脚本执行遇到警告，请重启 Antigravity 后在面板中点击修复。" -ForegroundColor Yellow
    }
}
