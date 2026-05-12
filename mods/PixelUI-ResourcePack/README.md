# 奶茶像素UI模组 🎨

## 项目概述
这是一个 Minecraft 我的世界编辑器资源包项目，用于自定义游戏UI的像素风格外观。

## 项目结构

```
PixelUI-ResourcePack/
├── manifest.json                  # 资源包清单
├── textures/
│   ├── textures_list.json        # 纹理列表定义
│   └── ui/                        # UI纹理目录
│       ├── pixel_hotbar_background.png      # 快捷栏背景
│       ├── pixel_hotbar_selection.png       # 快捷栏选择框
│       ├── pixel_experience_bar.png         # 经验条纹理
│       ├── pixel_health_background.png      # 生命值背景
│       ├── pixel_health_bar.png             # 生命值条
│       ├── pixel_hunger_background.png      # 饥饿值背景
│       ├── pixel_hunger_bar.png             # 饥饿值条
│       ├── pixel_background.png             # 菜单背景
│       └── pixel_overlay.png                # 暂停屏幕遮罩
└── ui/
    ├── hud_screen.json            # HUD界面定义（快捷栏、血量、饥饿值）
    ├── start_screen.json          # 开始屏幕定义（主菜单）
    └── pause_screen.json          # 暂停屏幕定义
```

## 像素风格设计规范 🎮

### 颜色调色板
- **主色调**：金色 (#FFD700) - 标题和重点文字
- **背景**：深灰/黑色 (#1a1a1a)
- **文字**：白色 (#FFFFFF)
- **强调**：红色 (#FF0000) - 血量
- **绿色**：#00FF00 - 生命值回复
- **黄色**：#FFFF00 - 经验值

### 像素尺寸规范
- **最小单位**：4px（确保清晰的像素感）
- **快捷栏项目**：20px × 20px
- **健康条/饥饿条**：9px 高
- **按钮高度**：40px

### 字体设计
- 所有文字使用 **Minecraft 默认位图字体**
- 启用阴影效果提高可读性
- 字体大小等级：small, normal, large, extra_large

## 功能模块

### 1. HUD界面（hud_screen.json）
自定义游戏内界面元素：
- ✅ 快捷栏（Hotbar）- 物品栏选择条
- ✅ 经验条（Experience Bar）- 等级进度
- ✅ 生命值显示（Health）- 角色HP状态
- ✅ 饥饿值显示（Hunger）- 食物条

### 2. 主菜单（start_screen.json）
- 游戏标题显示
- 开始游戏按钮
- 设置按钮
- 退出游戏按钮

### 3. 暂停菜单（pause_screen.json）
- 游戏暂停标题
- 继续游戏
- 游戏设置
- 返回主菜单

## 如何使用

### 导入到我的世界编辑器：
1. 打开 **我的世界编辑器**
2. 创建新的**资源包**
3. 将项目文件导入编辑器
4. 编辑 UI JSON 文件和纹理资源
5. 预览效果
6. 导出为 `.mcpack` 文件

### 安装到游戏：
1. 导出资源包为 `.mcpack` 格式
2. 在我的世界游戏中打开资源包文件
3. 创建新世界时选择该资源包
4. 启动游戏即可看到新UI效果

## 自定义指南

### 修改UI布局：
编辑对应的 JSON 文件中的 `offset` 和 `size` 属性：
- `offset`: [x偏移, y偏移]
- `size`: [宽度, 高度]

### 修改颜色：
在控件中添加 `color` 属性：
```json
"color": "#FFD700"  // 16进制颜色代码
```

### 修改纹理：
1. 准备 PNG 纹理文件（推荐 256×256 以下）
2. 放入 `textures/ui/` 目录
3. 在 `textures_list.json` 中注册纹理
4. 在 JSON UI 中引用该纹理

## 技术要求
- **Minecraft 版本**：1.20+ （网易版）
- **编辑器版本**：最新版我的世界编辑器
- **文件格式**：JSON UI + PNG 纹理

## 开发建议 💡

1. **逐步测试**：修改一个UI元素后立即测试
2. **保持一致性**：使用统一的像素尺寸和颜色方案
3. **性能考虑**：避免过于复杂的透明度效果
4. **备份重要文件**：随时保存项目副本

## 常见问题

**Q: 纹理没有显示？**
A: 检查 textures_list.json 中的路径是否正确，确保纹理文件已放入 textures/ui/ 文件夹。

**Q: UI布局混乱？**
A: 检查 offset 和 size 的值是否合理，可以使用百分比单位或像素单位。

**Q: 如何改变字体大小？**
A: 修改 JSON 中的 `font_size` 属性（small, normal, large, extra_large）。

## 许可证
此项目仅用于个人学习和使用。

---

**作者**：奶茶  
**最后更新**：2026年5月  
**版本**：1.0.0
