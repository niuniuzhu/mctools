# 📦 我的世界编辑器 - 奶茶像素UI模组项目

## 项目已创建！ ✅

### 项目位置
```
d:\Projects\mctools\mods\PixelUI-ResourcePack\
```

### 完整项目结构

```
PixelUI-ResourcePack/
│
├── 📄 manifest.json                    # 资源包清单（必需）
│   └── 定义模组名称、版本、UUID
│
├── 📁 textures/
│   ├── textures_list.json              # 纹理注册表
│   └── 📁 ui/                          # UI纹理文件夹（放PNG纹理）
│       ├── pixel_hotbar_background.png      # 快捷栏背景
│       ├── pixel_hotbar_selection.png       # 快捷栏选择框
│       ├── pixel_experience_bar.png         # 经验条
│       ├── pixel_health_background.png      # 血量背景
│       ├── pixel_health_bar.png             # 血量条
│       ├── pixel_hunger_background.png      # 饥饿值背景
│       ├── pixel_hunger_bar.png             # 饥饿值条
│       ├── pixel_background.png             # 菜单背景
│       └── pixel_overlay.png                # 暂停遮罩
│
├── 📁 ui/                              # UI定义JSON文件
│   ├── hud_screen.json                 # HUD界面（游戏内）
│   ├── start_screen.json               # 开始屏幕（主菜单）
│   └── pause_screen.json               # 暂停屏幕
│
├── 📖 README.md                        # 项目说明书
├── 📋 DEVELOPMENT_GUIDE.md             # 开发完整指南
├── 🎨 TEXTURE_DESIGN_GUIDE.md          # 纹理设计指南
└── ⚡ QUICK_REFERENCE.md               # 快速参考卡片

```

## 🚀 快速开始 (3步)

### 1️⃣ 准备纹理素材
在 `textures/ui/` 文件夹中放入你制作的 PNG 纹理文件：
- 可用 Aseprite、Piskel 等工具制作像素纹理
- 参考 **TEXTURE_DESIGN_GUIDE.md** 了解尺寸规范
- 推荐尺寸：16px、32px、64px、128px（像素倍数）

### 2️⃣ 编辑 JSON 文件
修改 `ui/` 目录下的三个JSON文件：
- **hud_screen.json** - 游戏内UI（血量、饥饿值、快捷栏）
- **start_screen.json** - 主菜单
- **pause_screen.json** - 暂停菜单

参考 **DEVELOPMENT_GUIDE.md** 了解 JSON 语法

### 3️⃣ 在编辑器中打开
1. 启动 **我的世界编辑器**
2. 打开此项目文件夹
3. 使用编辑器预览 UI 效果
4. 调整满意后，导出为 `.mcpack` 文件
5. 在游戏中导入使用

## 📚 文档指南

| 文档 | 用途 | 适合人群 |
|------|------|--------|
| **README.md** | 项目概述和基本说明 | 所有人 |
| **DEVELOPMENT_GUIDE.md** | JSON UI 开发详细教程 | 开发者 |
| **TEXTURE_DESIGN_GUIDE.md** | 像素纹理制作指南 | 美术师 |
| **QUICK_REFERENCE.md** | 常用速查表 | 快速查阅 |

## 🎨 样本内容说明

项目中已包含的示例：

### ✅ manifest.json
- 完整的资源包清单
- UUID、版本号、支持版本信息

### ✅ ui/hud_screen.json
定义了游戏内的 HUD 元素：
```
┌─────────────────────────────────┐
│ ♥ Health        🍖 Hunger       │  <- 血量和饥饿条
│                                 │
│        [选中物品]               │  <- 快捷栏
└─────────────────────────────────┘
```

### ✅ ui/start_screen.json
定义了主菜单布局：
```
     🎮 我的世界
     
   [开始游戏]
   [设置]
   [退出游戏]
```

### ✅ ui/pause_screen.json
暂停菜单布局

## 🛠️ 下一步该做什么？

### 第一阶段 - 制作纹理
- [ ] 打开 Aseprite 或 Piskel
- [ ] 参考 TEXTURE_DESIGN_GUIDE.md 制作纹理
- [ ] 导出为 PNG 文件放入 `textures/ui/`
- [ ] 检查文件名是否与 JSON 中的引用一致

### 第二阶段 - 调整布局
- [ ] 在编辑器中打开项目
- [ ] 预览 HUD、菜单等界面
- [ ] 调整 JSON 中的 size 和 offset
- [ ] 修改颜色、字体大小等

### 第三阶段 - 测试和发布
- [ ] 在编辑器中测试所有界面
- [ ] 检查纹理是否正确加载
- [ ] 导出为 .mcpack 文件
- [ ] 在游戏中创建新世界并应用资源包
- [ ] 进游戏验证效果

## 💡 开发建议

### 美术设计
- 💾 保持一致的像素风格和配色
- 🎯 使用推荐的颜色调色板
- ⚡ 优化文件大小，保持清晰度

### 代码开发
- ✅ 使用 JSON 验证工具检查语法
- 🔄 逐个测试修改，不要一次改太多
- 📝 使用有意义的控件名称，方便维护

### 性能优化
- 🖼️ 合并纹理减少文件数量
- 📦 使用 PNG 无损压缩工具
- ⚙️ 避免过度复杂的UI结构

## 🔗 相关资源

### 官方文档
- Minecraft 基岩版 Wiki
- 官方 UI JSON 参考

### 工具
- **Aseprite** - 专业像素编辑器
- **Piskel** - 免费网页版像素工具
- **Paint.NET** - 轻量级图像编辑
- **JSON Lint** - JSON 验证工具

### 社区
- Reddit: r/minecraftsuggestions
- Minecraft Forum
- BiliBili Minecraft 创意社区

## ⚙️ 技术规格

- **Minecraft 版本**：1.20+（网易版）
- **资源包格式**：资源包v8
- **UI 系统**：JSON UI
- **支持的纹理格式**：PNG（推荐）
- **最大纹理尺寸**：1024×1024px

## 📝 许可证和使用

此项目模板可自由使用、修改和分享，仅供个人学习和娱乐。

## 🎓 学习路线

建议学习顺序：
1. 👉 **阅读 README.md** - 了解项目结构
2. 👉 **学习 QUICK_REFERENCE.md** - 快速掌握基础
3. 👉 **参考 DEVELOPMENT_GUIDE.md** - 深入学习 JSON
4. 👉 **研究 TEXTURE_DESIGN_GUIDE.md** - 制作像素纹理
5. 👉 **动手制作** - 修改项目文件

## ❓ 常见问题

**Q: 我完全没有编程基础可以做吗？**
A: 完全可以！JSON UI 语法很简单，按照教程一步步来就行。

**Q: 纹理我不会制作怎么办？**
A: 可以用 Piskel（免费网页版）或找现成的像素风格素材修改。

**Q: 做好了如何分享给其他玩家？**
A: 导出为 `.mcpack` 文件，其他玩家可以直接打开导入游戏。

**Q: 支持动画吗？**
A: 支持！可以创建多帧纹理实现动画效果（进阶功能）。

---

## 🎉 开始创建你的像素UI模组吧！

有问题可以随时查看对应的文档或快速参考。祝你创建愉快！🚀

**最后更新**：2026年5月  
**项目版本**：1.0.0  
**作者**：奶茶开发团队

