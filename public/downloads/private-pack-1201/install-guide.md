# MC 1.20.1 私人整合包 - 安装与部署完全指南

## 阶段 1：环境准备

### 检查清单
- [ ] Java 17 已安装
- [ ] Fabric 加载器 0.15.x 已下载
- [ ] 启动器已准备（PCL / HMCL / MultiMC）

### 验证 Java 版本
```bash
java -version
# 应显示：openjdk version "17.x.x" 或 Java(TM) SE Runtime Environment 17.x.x
```

---

## 阶段 2：文件结构组织

### 创建实例目录
```
MyPack-1.20.1/
├── mods/                 （放入所有 .jar 文件）
├── config/               （配置文件夹，可选）
├── resourcepacks/        （资源包，可选）
├── shaderpacks/          （光影，可选）
├── README.txt            （本说明）
├── modpack-manifest.json （清单）
├── mod-list.md           （Mod 清单）
├── jvm-args.txt          （启动参数）
└── changelog.txt         （更新日志）
```

### 目录详解
| 目录 | 用途 | 必需 |
|------|------|------|
| mods | 放置所有 mod 的 .jar 文件 | ✅ |
| config | mod 配置文件（首次启动自动生成） | 🟡 |
| resourcepacks | Java 资源包 .zip | ❌ |
| shaderpacks | Java 光影 .zip（需 Iris） | ❌ |

---

## 阶段 3：Mod 下载与放置

### 快速下载方式

#### 方式 A：Modrinth 官方平台（推荐）
1. 打开 https://modrinth.com
2. 搜索每个 mod 名称（从 mod-list.md）
3. 筛选版本：`Minecraft 1.20.1` + `Fabric`
4. 下载 .jar 文件
5. 放入 mods/ 目录

#### 方式 B：CurseForge（备选）
1. 打开 https://www.curseforge.com/minecraft/mods
2. 过滤版本 1.20.1 和 Fabric
3. 下载 .jar 文件
4. 放入 mods/ 目录

### 关键 Mod（优先下载）
按以下顺序优先下载，确保基础能跑：
```
1. Fabric API（必须）
2. Sodium（必须）
3. Lithium（必须）
4. Starlight（必须）
5. Mod Menu（推荐）
```

### 验证完整性
```bash
# 检查 mods 目录文件数
ls mods/*.jar | wc -l

# 应显示 10+ 个 mod（"必选 + 性能优化"组）
```

---

## 阶段 4：启动器配置

### PCL（Plain Craft Launcher）配置
1. 打开 PCL
2. 新建游戏实例 → 选择 Fabric
3. 版本：1.20.1
4. 加载器：Fabric 0.15.x
5. 实例文件夹：选择你的 MyPack-1.20.1 目录
6. JVM 参数：复制 jvm-args.txt 内容
7. 最大内存：6144（6GB）
8. 启动

### HMCL（Hello Minecraft Launcher）配置
1. 新建版本隔离
2. 加载器：Fabric（Minecraft 1.20.1）
3. 游戏目录：指向 MyPack-1.20.1
4. JVM 选项：粘贴 jvm-args.txt
5. 内存：6G
6. 启动

### MultiMC 配置
1. 新建实例
2. Minecraft 版本：1.20.1
3. 加载器：Fabric
4. 将 mods、config 等文件夹拖入实例目录
5. 设置 → Java：JVM 参数粘贴 jvm-args.txt
6. 启动

---

## 阶段 5：首次启动与排查

### 预期行为
✅ 启动屏幕显示 Fabric 加载器
✅ Mod 加载进度条正常
✅ 进入世界或主菜单
✅ Mod Menu 或 Shift+P 能打开 mod 列表

### 常见问题排查

#### 问题 1：卡在加载界面
**原因**：mod 冲突或版本不匹配
**解决**：
1. 只保留"必选 + 性能优化"组，删除其他 mod
2. 重新启动
3. 如果成功，逐个添加其他 mod 组

#### 问题 2：崩溃报告（crash-report）
**原因**：特定 mod 不兼容
**解决**：
1. 查看 crash-report 中 mod 名称
2. 删除该 mod 或找到兼容版本
3. 重启

#### 问题 3：帧数很低（FPS < 30）
**原因**：内存不足或显卡不支持
**解决**：
1. 增加 JVM 内存：jvm-args.txt 中 `-Xmx` 改为 8G
2. 降低图形设置：关闭光影、降低距离
3. 检查独显是否被识别

#### 问题 4：光影无法启用
**原因**：缺少 Iris mod
**解决**：
1. 从 Modrinth 下载 Iris（1.20.1 Fabric）
2. 放入 mods
3. 重启后在视频设置中启用光影

---

## 阶段 6：配置微调

### 推荐首次游玩设置
```
图形：快速
距离：12-16 区块
光影：无（Iris 需另配）
细节纹理：关闭
动态光源：开启（如已装 LambDynamicLights）
```

### 性能优化建议
- **低端**（GTX 960 及以下）：关闭大部分特效，6G 内存
- **中端**（GTX 1660 或 RTX 3060）：开启中档特效，8G 内存 + 光影
- **高端**（RTX 4070 及以上）：全开，16G 内存

---

## 阶段 7：发布与分享

### 打包为可分发形式
```bash
# 不包含以下文件夹（这些是运行时生成的）
rm -rf logs/
rm -rf crash-reports/
rm -rf cache/
rm -rf .minecraft/

# 压缩整个 MyPack-1.20.1
zip -r MyPack-1.20.1.zip MyPack-1.20.1/

# 分享 zip 文件
```

### 更新 modpack-manifest.json
在发布前修改以下字段：
```json
{
  "name": "你的整合包名称",
  "version": "1.0.0",
  "author": "你的用户名",
  "notes": "你的说明文字"
}
```

---

## 快速检查清单

| 步骤 | 状态 | 说明 |
|------|------|------|
| Java 17 安装 | ⬜ | `java -version` 检查 |
| 文件夹结构 | ⬜ | mods、config 等齐全 |
| 必选 Mod 下载 | ⬜ | Fabric API、Sodium 等 5 个 |
| 启动器配置 | ⬜ | PCL/HMCL 指向正确目录 |
| JVM 参数设置 | ⬜ | 内存 6G、G1GC 等参数 |
| 首次启动 | ⬜ | 能进入主菜单或世界 |
| Mod 加载验证 | ⬜ | Mod Menu 显示 mod 列表 |
| 游玩测试 | ⬜ | 进入世界、构建、挖掘正常 |

---

## 获取帮助

- **Mod 兼容性问题** → 查看 mod-list.md 或 Modrinth 讨论
- **启动器问题** → 参考启动器官方教程
- **Fabric 问题** → 访问 https://fabricmc.net
- **崩溃报告** → 从 logs 目录找 latest.log 并搜索错误关键词
