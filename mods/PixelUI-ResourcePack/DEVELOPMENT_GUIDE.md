# Minecraft UI 开发指南

## 快速开始

### 步骤 1：准备纹理资源
在 `textures/ui/` 文件夹中放入以下 PNG 纹理文件（推荐 16×16 或 32×32 像素）：
- pixel_hotbar_background.png
- pixel_hotbar_selection.png  
- pixel_experience_bar.png
- pixel_health_background.png
- pixel_health_bar.png
- pixel_hunger_background.png
- pixel_hunger_bar.png
- pixel_background.png
- pixel_overlay.png

### 步骤 2：编辑 JSON 文件
修改 `ui/` 目录下的 JSON 文件来自定义 UI 布局：
- hud_screen.json - 游戏内界面
- start_screen.json - 菜单界面
- pause_screen.json - 暂停菜单

### 步骤 3：在编辑器中打开
1. 启动我的世界编辑器
2. 打开此资源包
3. 使用编辑器的可视化界面预览和调整
4. 导出为 .mcpack 文件

### 步骤 4：测试游戏
1. 在我的世界游戏中打开 .mcpack 文件
2. 选择资源包应用到世界
3. 进入游戏测试 UI 效果

## JSON UI 常用属性

### 基础属性
```json
{
  "type": "panel|image|label|button",           // 控件类型
  "size": ["100%", "50px"],                      // 大小（可用%或px）
  "offset": ["10px", "20px"],                    // 偏移位置
  "color": "#FFFFFF",                            // 颜色（16进制）
  "layer": 1,                                    // 图层深度
  "visible": true                                // 是否可见
}
```

### Panel（面板）
```json
{
  "type": "panel",
  "size": ["100%", "100%"],
  "controls": [/* 子控件 */]
}
```

### Image（图片）
```json
{
  "type": "image",
  "texture": "ui/my_texture",
  "size": ["64px", "64px"],
  "color": "#FFFFFF",
  "clip_direction": "left"  // 可选：left, up等
}
```

### Label（文字）
```json
{
  "type": "label",
  "text": "Hello World",
  "font_size": "large",      // small|normal|large|extra_large
  "color": "#FFFFFF",
  "shadow": true             // 阴影效果
}
```

### Button（按钮）
```json
{
  "type": "button",
  "text": "Click Me",
  "size": ["100px", "40px"],
  "button_mappings": [{
    "from_button_id": "button.menu_play"
  }]
}
```

## 坐标系统

- **anchor_from**: 控件自身的锚点位置
- **anchor_to**: 相对于父容器的锚点位置
- 可选值：top_left, top_center, top_right, center_left, center, center_right, bottom_left, bottom_center, bottom_right

## 绑定变量

健康值、饥饿值等动态绑定：
```json
"bindings": [
  {
    "binding_name": "#health_percent"  // 生命值百分比
  }
]
```

常用绑定：
- #health_percent - 生命值百分比
- #hunger_percent - 饥饿值百分比
- #hotbar_offset - 快捷栏偏移

## 示例：自定义按钮

```json
{
  "my_button": {
    "type": "button",
    "size": ["200px", "50px"],
    "offset": ["50% - 100px", "50% - 25px"],
    "text": "开始游戏",
    "font_size": "large",
    "color": "#FFD700",
    "button_mappings": [
      {
        "from_button_id": "button.menu_play"
      }
    ]
  }
}
```

## 色值参考

### 基础颜色
- 白色：#FFFFFF
- 黑色：#000000
- 灰色：#808080
- 红色：#FF0000
- 绿色：#00FF00
- 蓝色：#0000FF
- 黄色：#FFFF00
- 金色：#FFD700
- 深绿：#228B22

## 调试技巧

1. **启用边框**：在 panel 上添加 `border: "outline"` 查看布局
2. **检查日志**：查看编辑器或游戏日志找出错误
3. **逐步修改**：每次只改一个属性然后测试
4. **使用比例**：用百分比而不是固定像素使UI更灵活

## 常见问题排查

| 问题 | 解决方案 |
|------|--------|
| UI 不显示 | 检查 visible 属性，检查 size 是否为 0 |
| 纹理模糊 | 使用倍数关系的像素尺寸，如 16×16, 32×32 |
| 布局错乱 | 检查 anchor 和 offset 是否冲突 |
| 颜色显示不对 | 确认 16 进制颜色代码的正确性 |
| JSON 错误 | 使用 JSON 验证工具检查语法 |

## 资源链接

- 📖 Minecraft Wiki: wiki.biligame.com
- 🎨 像素艺术工具: Piskel, Aseprite, PyxelEdit
- 🔧 JSON 在线验证: jsonlint.com
- 💡 配色灵感: coolors.co, colorhexa.com

