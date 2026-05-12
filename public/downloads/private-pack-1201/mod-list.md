# Minecraft 1.20.1 私人整合包 - Mod 清单

## 必选（基础运行）
- Fabric Loader（1.20.1）
- Fabric API（1.20.1）
- Mod Menu（菜单管理）

## 性能优化（建议全开）
- Sodium（渲染优化）
- Lithium（逻辑优化）
- Starlight（光照优化）
- FerriteCore（内存优化）
- Entity Culling（遮挡剔除）
- ImmediatelyFast（UI 和渲染优化）

## 光影与视觉（可选）
- Iris（光影框架）
- Continuity（连接纹理）
- LambDynamicLights（动态光源）

## UI 与体验（可选）
- AppleSkin（食物信息）
- Xaero's Minimap（小地图）
- Xaero's World Map（世界地图）

## 下载与管理建议
- 优先使用 Modrinth 或 CurseForge 官方页面。
- 每个 mod 必须确认支持 Minecraft 1.20.1。
- 避免同类优化 mod 重复安装（例如多个光照优化同时启用）。

## 兼容性排查顺序
1. 只保留“必选 + 性能优化”启动一次。
2. 再增加“光影与视觉”组启动测试。
3. 最后加“UI 与体验”组，出现崩溃就回退最近新增项。
