# 快速参考卡片 (Quick Reference)

## JSON UI 最常用的 5 个属性

```json
{
  "type": "panel|image|label|button",
  "size": ["100%", "50px"],
  "offset": ["0px", "0px"],
  "color": "#FFFFFF",
  "visible": true
}
```

## 像素尺寸速查表

| 元素 | 推荐尺寸 | 说明 |
|------|--------|------|
| 按钮高度 | 40px | 便于点击 |
| 快捷栏项 | 20px × 20px | Minecraft 标准 |
| 血量条 | 81px × 9px | 9 颗心 |
| 菜单背景 | 512px × 512px | 自动缩放 |
| 图标 | 16/32/64px | 像素倍数 |

## 快速颜色码

```
白色：#FFFFFF      |  黑色：#000000      |  灰色：#808080
红色：#FF0000      |  绿色：#00FF00      |  蓝色：#0000FF
黄色：#FFFF00      |  金色：#FFD700      |  橙色：#FF8800
```

## JSON 控件类型

| 类型 | 用途 | 例子 |
|------|------|------|
| `panel` | 容器 | 按钮组、菜单 |
| `image` | 显示纹理 | 图标、背景 |
| `label` | 文字 | 标题、说明 |
| `button` | 可点击 | 菜单按钮 |

## 坐标位置速查

```
左上      顶部中       右上
(0%,0%)  (50%,0%)   (100%,0%)
  
   
中左      正中心       中右
(0%,50%) (50%,50%)  (100%,50%)

   
左下      底部中       右下
(0%,100%) (50%,100%) (100%,100%)
```

## 文件位置检查表

```
✓ textures/ui/pixel_hotbar_background.png
✓ textures/ui/pixel_health_bar.png
✓ textures/ui/pixel_hunger_bar.png
✓ ui/hud_screen.json
✓ ui/start_screen.json
✓ manifest.json
```

## 常见错误速查

| 错误 | 原因 | 修复 |
|------|------|------|
| 控件不显示 | size 为 0 或 visible:false | 检查 size 和 visible |
| 布局混乱 | offset 和 anchor 冲突 | 只用 offset 或只用 anchor |
| JSON 报错 | 语法错误 | 用 JSON 验证工具 |
| 纹理丢失 | 路径错误 | 检查文件夹和文件名 |

## 编辑器快捷键（常见）

- **Ctrl+S** - 保存
- **Ctrl+Z** - 撤销
- **Ctrl+Y** - 重做
- **F5** - 刷新预览
- **Ctrl+R** - 重新加载资源

## 部署检查清单

在导出为 .mcpack 前：

- [ ] 所有 JSON 文件语法正确
- [ ] 所有纹理文件已放入 textures/ui/
- [ ] manifest.json 中的 UUID 已更新
- [ ] 在编辑器中预览无错误
- [ ] 所有自定义纹理已在 textures_list.json 中注册
- [ ] 没有遗漏的图片文件

## 像素艺术快速检查表

制作纹理时：
- [ ] 使用偶数像素尺寸（16, 32, 64, 128）
- [ ] 边缘清晰，无模糊
- [ ] 颜色对比度足够（> 50%）
- [ ] 文件大小合理（< 500KB）
- [ ] PNG 格式，无损压缩

## 性能优化建议

- 📦 纹理合并：多个小图合并到一张大图
- 🎨 颜色限制：使用 256 色而非全彩
- ⚡ 简化动画：减少帧数
- 🔲 适当缩放：大背景用 512px，小图标用 16px

## 在线资源

- **JSON 验证**：[jsonlint.com](https://www.jsonlint.com/)
- **颜色工具**：[colorhexa.com](https://www.colorhexa.com/)
- **图片压缩**：[tinypng.com](https://tinypng.com/)
- **MC Wiki**：[wiki.biligame.com](https://wiki.biligame.com/)

---

💾 保存此文档为快速参考！

