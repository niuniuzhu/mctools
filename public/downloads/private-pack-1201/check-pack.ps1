# 整合包快速检查脚本（Windows PowerShell）
# 将此脚本保存为 check-pack.ps1，然后运行：powershell -ExecutionPolicy Bypass -File check-pack.ps1

Write-Host "MC 1.20.1 私人整合包检查工具" -ForegroundColor Cyan

# 检查项目
$checks = @(
    @{ Name = "mods 目录"; Test = { Test-Path "mods" -PathType Container } },
    @{ Name = "config 目录"; Test = { Test-Path "config" -PathType Container } },
    @{ Name = "README.txt"; Test = { Test-Path "README.txt" } },
    @{ Name = "modpack-manifest.json"; Test = { Test-Path "modpack-manifest.json" } },
    @{ Name = "mod-list.md"; Test = { Test-Path "mod-list.md" } },
    @{ Name = "jvm-args.txt"; Test = { Test-Path "jvm-args.txt" } },
    @{ Name = "changelog.txt"; Test = { Test-Path "changelog.txt" } }
)

Write-Host "`n📋 文件结构检查" -ForegroundColor Green

$passed = 0
foreach ($check in $checks) {
    $result = & $check.Test
    $symbol = if ($result) { "✅" } else { "❌" }
    Write-Host "$symbol $($check.Name)" -ForegroundColor $(if ($result) { "Green" } else { "Red" })
    if ($result) { $passed += 1 }
}

Write-Host "`n📊 检查结果：$passed / $($checks.Count) 项通过`n" -ForegroundColor Yellow

# 检查 mod 数量
if (Test-Path "mods" -PathType Container) {
    $modCount = @(Get-ChildItem "mods" -Filter "*.jar" -ErrorAction SilentlyContinue).Count
    Write-Host "🔧 mods 目录：$modCount 个模组文件" -ForegroundColor Cyan
    if ($modCount -lt 5) {
        Write-Host "⚠️  建议至少放入 5-10 个必选模组后再启动" -ForegroundColor Yellow
    } elseif ($modCount -ge 5) {
        Write-Host "✅ 模组数量充足，可以尝试启动" -ForegroundColor Green
    }
}

# Java 版本检查
Write-Host "`n🔍 环境检查" -ForegroundColor Green
try {
    $javaVersion = java -version 2>&1 | Select-Object -First 1
    if ($javaVersion -match "17") {
        Write-Host "✅ Java 17 已安装：$javaVersion" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Java 版本：$javaVersion（建议 Java 17）" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Java 未检测到，请确认已安装 Java 17" -ForegroundColor Red
}

Write-Host "`n✨ 检查完成！" -ForegroundColor Cyan
