/**
 * 奶茶像素UI - 纹理生成脚本
 * 使用 Node.js 内置模块生成所有 PNG 纹理文件，无需安装额外依赖
 * 运行方式：node generate-textures.js
 */

'use strict';

const zlib = require('zlib');
const fs   = require('fs');
const path = require('path');

// ─── PNG 基础工具 ────────────────────────────────────────────────────────────

/** CRC-32 查找表 */
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[i] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const t   = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crc]);
}

/**
 * 将像素数组编码为 PNG 文件 Buffer
 * @param {number}       width
 * @param {number}       height
 * @param {Uint8Array}   rgba  - 扁平 RGBA 数组，长度 = width*height*4
 * @returns {Buffer}
 */
function encodePNG(width, height, rgba) {
  // IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; ihdrData[9] = 6; // RGBA

  // 每行前加 filter=0 字节
  const raw = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    raw[y * (1 + width * 4)] = 0;
    for (let x = 0; x < width; x++) {
      const si = (y * width + x) * 4;
      const di = y * (1 + width * 4) + 1 + x * 4;
      raw[di]     = rgba[si];
      raw[di + 1] = rgba[si + 1];
      raw[di + 2] = rgba[si + 2];
      raw[di + 3] = rgba[si + 3];
    }
  }

  const PNG_SIG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    PNG_SIG,
    chunk('IHDR', ihdrData),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

// ─── 像素画布工具 ─────────────────────────────────────────────────────────────

function createCanvas(w, h, fillR = 0, fillG = 0, fillB = 0, fillA = 0) {
  const buf = new Uint8Array(w * h * 4);
  if (fillA > 0) {
    for (let i = 0; i < w * h; i++) {
      buf[i * 4]     = fillR;
      buf[i * 4 + 1] = fillG;
      buf[i * 4 + 2] = fillB;
      buf[i * 4 + 3] = fillA;
    }
  }
  return buf;
}

function setPixel(buf, w, x, y, r, g, b, a = 255) {
  if (x < 0 || y < 0) return;
  const i = (y * w + x) * 4;
  buf[i] = r; buf[i + 1] = g; buf[i + 2] = b; buf[i + 3] = a;
}

function fillRect(buf, bw, x, y, rw, rh, r, g, b, a = 255) {
  for (let dy = 0; dy < rh; dy++)
    for (let dx = 0; dx < rw; dx++)
      setPixel(buf, bw, x + dx, y + dy, r, g, b, a);
}

function drawRect(buf, bw, x, y, rw, rh, r, g, b, thick = 1, a = 255) {
  for (let t = 0; t < thick; t++) {
    fillRect(buf, bw, x + t, y + t, rw - t * 2, thick, r, g, b, a);           // top
    fillRect(buf, bw, x + t, y + rh - thick + t, rw - t * 2, thick, r, g, b, a); // bottom
    fillRect(buf, bw, x + t, y + t, thick, rh - t * 2, r, g, b, a);           // left
    fillRect(buf, bw, x + rw - thick + t, y + t, thick, rh - t * 2, r, g, b, a); // right
  }
}

function drawCircle(buf, bw, cx, cy, radius, r, g, b, a = 255) {
  const rr = radius * radius;
  for (let y = -radius; y <= radius; y++) {
    for (let x = -radius; x <= radius; x++) {
      if (x * x + y * y <= rr) setPixel(buf, bw, cx + x, cy + y, r, g, b, a);
    }
  }
}

/** 将一个 9×9 位图 stamp 绘制到画布 */
function drawStamp(buf, bw, ox, oy, stamp, r, g, b, a = 255) {
  for (let row = 0; row < stamp.length; row++)
    for (let col = 0; col < stamp[row].length; col++)
      if (stamp[row][col]) setPixel(buf, bw, ox + col, oy + row, r, g, b, a);
}

// ─── 颜色常量 ────────────────────────────────────────────────────────────────
const C = {
  transparent: [0,   0,   0,   0],
  black:       [0,   0,   0, 255],
  teaDark:     [59,  36,  21, 255],  // #3B2415
  teaMid:      [107, 68,  35, 255],  // #6B4423
  teaLight:    [145, 96,  56, 255],  // #916038
  cream:       [247, 232, 208,255],  // #F7E8D0
  caramel:     [201, 123, 58, 255],  // #C97B3A
  pearl:       [42,  27,  18, 255],  // #2A1B12
  border:      [184, 135, 90, 255],  // #B8875A
  white:       [255,255,255, 255],
  gold:        [230,188,126,255],    // 奶茶金
  red:         [220,  0,  0, 255],   // hearts
  redDark:     [100,  0,  0, 255],   // empty hearts
  green:       [208,160, 98,255],    // XP bar -> 奶油焦糖色
  greenDark:   [78,  48,  27,255],   // XP background -> 深茶色
  orange:      [82,  52,  30,255],   // hunger icons -> 珍珠色
  orangeDark:  [48,  30,  18,255],   // empty icons -> 深珍珠
  overlay:     [37,  20,  10,170],   // 暖棕遮罩
};

// ─── 纹理绘制函数 ────────────────────────────────────────────────────────────

/** 1. 快捷栏背景 (182 × 22) */
function makeHotbarBackground() {
  const W = 182, H = 22;
  const buf = createCanvas(W, H, ...C.teaDark);

  // 外框
  drawRect(buf, W, 0, 0, W, H, ...C.border.slice(0,3), 2);
  // 内填充
  fillRect(buf, W, 2, 2, W - 4, H - 4, ...C.teaMid.slice(0,3));
  // 9 个格子（每格 20×20，间距 1px，左边距 1px）
  for (let i = 0; i < 9; i++) {
    const cx = 1 + i * 20;
    drawRect(buf, W, cx, 1, 20, H - 2, ...C.teaLight.slice(0,3), 1);
    // 内轻微亮面（左边和上边）
    fillRect(buf, W, cx + 1, 2, 18, 1, ...C.cream.slice(0,3));
    fillRect(buf, W, cx + 1, 2, 1, H - 5, ...C.cream.slice(0,3));
    // 每格加一颗“珍珠”点缀
    drawCircle(buf, W, cx + 16, 17, 2, ...C.pearl.slice(0,3));
  }
  return encodePNG(W, H, buf);
}

/** 2. 快捷栏选中框 (24 × 24) */
function makeHotbarSelection() {
  const W = 24, H = 24;
  const buf = createCanvas(W, H, ...C.transparent);

  // 金色外框 2px
  drawRect(buf, W, 0, 0, W, H, ...C.caramel.slice(0,3), 2);
  // 内框深色
  drawRect(buf, W, 2, 2, W - 4, H - 4, ...C.pearl.slice(0,3), 1);
  // 半透明内填充
  fillRect(buf, W, 3, 3, W - 6, H - 6, ...C.cream.slice(0,3), 42);
  // 四角高亮点
  for (const [x, y] of [[1,1],[W-2,1],[1,H-2],[W-2,H-2]])
    setPixel(buf, W, x, y, ...C.cream.slice(0,3));
  return encodePNG(W, H, buf);
}

/** 3. 经验条 (182 × 5) */
function makeExperienceBar() {
  const W = 182, H = 5;
  const buf = createCanvas(W, H, ...C.greenDark);

  // 背景边框
  drawRect(buf, W, 0, 0, W, H, ...C.teaLight.slice(0,3), 1);
  // 绿色填充（从左80%处截断示意）
  fillRect(buf, W, 1, 1, Math.floor(W * 0.6), H - 2, ...C.green.slice(0,3));
  // 高亮顶部
  fillRect(buf, W, 1, 1, Math.floor(W * 0.6), 1, ...C.cream.slice(0,3));
  return encodePNG(W, H, buf);
}

/** 心形 9×9 位图 stamp */
const HEART_STAMP = [
  [0,1,1,0,0,0,1,1,0],
  [1,1,1,1,0,1,1,1,1],
  [1,1,1,1,1,1,1,1,1],
  [1,1,1,1,1,1,1,1,1],
  [0,1,1,1,1,1,1,1,0],
  [0,0,1,1,1,1,1,0,0],
  [0,0,0,1,1,1,0,0,0],
  [0,0,0,0,1,0,0,0,0],
  [0,0,0,0,0,0,0,0,0],
];

/** 4. 生命值背景 (81 × 9) - 空心形 */
function makeHealthBackground() {
  const W = 81, H = 9;
  const buf = createCanvas(W, H, ...C.transparent);
  for (let i = 0; i < 9; i++)
    drawStamp(buf, W, i * 9, 0, HEART_STAMP, ...C.redDark.slice(0,3));
  return encodePNG(W, H, buf);
}

/** 5. 生命值条 (81 × 9) - 满心形 */
function makeHealthBar() {
  const W = 81, H = 9;
  const buf = createCanvas(W, H, ...C.transparent);
  for (let i = 0; i < 9; i++) {
    drawStamp(buf, W, i * 9, 0, HEART_STAMP, ...C.red.slice(0,3));
    // 高亮顶部
    if (HEART_STAMP[0][3]) setPixel(buf, W, i * 9 + 3, 0, 255, 120, 120);
    if (HEART_STAMP[0][5]) setPixel(buf, W, i * 9 + 5, 0, 255, 120, 120);
  }
  return encodePNG(W, H, buf);
}

/** 食物（鸡腿）9×9 位图 stamp */
const FOOD_STAMP = [
  [0,0,0,0,1,1,0,0,0],
  [0,0,0,1,1,1,1,0,0],
  [0,0,1,1,1,1,1,1,0],
  [0,1,1,1,1,1,1,1,1],
  [0,1,1,1,1,1,1,1,0],
  [0,0,1,1,1,1,1,0,0],
  [0,0,0,1,1,1,0,0,0],
  [0,0,0,0,1,0,0,0,0],
  [0,0,0,0,0,0,0,0,0],
];

/** 6. 饥饿值背景 (81 × 9) - 空食物图标 */
function makeHungerBackground() {
  const W = 81, H = 9;
  const buf = createCanvas(W, H, ...C.transparent);
  for (let i = 0; i < 9; i++)
    drawStamp(buf, W, i * 9, 0, FOOD_STAMP, ...C.orangeDark.slice(0,3));
  return encodePNG(W, H, buf);
}

/** 7. 饥饿值条 (81 × 9) - 满食物图标 */
function makeHungerBar() {
  const W = 81, H = 9;
  const buf = createCanvas(W, H, ...C.transparent);
  for (let i = 0; i < 9; i++) {
    drawStamp(buf, W, i * 9, 0, FOOD_STAMP, ...C.orange.slice(0,3));
    // 高亮
    setPixel(buf, W, i * 9 + 4, 0, ...C.cream.slice(0,3));
  }
  return encodePNG(W, H, buf);
}

/** 8. 菜单背景 (256 × 256) - 像素方块图案 */
function makeBackground() {
  const W = 256, H = 256;
  const buf = createCanvas(W, H, ...C.teaDark);

  // 绘制 16×16 的方块图案（棋盘式深浅交替）
  const TILE = 16;
  for (let ty = 0; ty < H / TILE; ty++) {
    for (let tx = 0; tx < W / TILE; tx++) {
      const isDark = (tx + ty) % 2 === 0;
      const r = isDark ? 64 : 86;
      const g = isDark ? 39 : 53;
      const b = isDark ? 24 : 31;
      fillRect(buf, W, tx * TILE, ty * TILE, TILE, TILE, r, g, b);
    }
  }

  // 奶泡高光条纹
  for (let y = 0; y < H; y += 32) {
    fillRect(buf, W, 0, y, W, 2, 229, 210, 184, 110);
  }

  // 珍珠点缀
  for (let y = 12; y < H; y += 40) {
    for (let x = 14; x < W; x += 40) {
      drawCircle(buf, W, x, y, 3, ...C.pearl.slice(0,3));
      setPixel(buf, W, x - 1, y - 1, ...C.cream.slice(0,3), 220);
    }
  }

  // 添加一些随机像素噪点增加质感
  const seed = 42;
  let rng = seed;
  const rand = () => { rng = (rng * 1664525 + 1013904223) & 0xFFFFFFFF; return (rng >>> 0) / 0x100000000; };
  for (let i = 0; i < 800; i++) {
    const x = Math.floor(rand() * W);
    const y = Math.floor(rand() * H);
    const v = Math.floor(rand() * 22) + 120;
    setPixel(buf, W, x, y, v, Math.max(90, v - 20), Math.max(70, v - 35), 70);
  }

  // 四边暗角渐变（叠加更暗的像素）
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const edgeX = Math.min(x, W - 1 - x) / (W / 2);
      const edgeY = Math.min(y, H - 1 - y) / (H / 2);
      const vignette = Math.min(edgeX, edgeY);
      if (vignette < 0.2) {
        const idx = (y * W + x) * 4;
        const factor = vignette / 0.2;
        buf[idx]     = Math.floor(buf[idx]     * factor);
        buf[idx + 1] = Math.floor(buf[idx + 1] * factor);
        buf[idx + 2] = Math.floor(buf[idx + 2] * factor);
      }
    }
  }

  return encodePNG(W, H, buf);
}

/** 9. 暂停遮罩 (256 × 256) - 半透明黑色 */
function makeOverlay() {
  const W = 256, H = 256;
  const buf = createCanvas(W, H, ...C.overlay);

  // 添加一点点噪点
  let rng = 7;
  const rand = () => { rng = (rng * 1664525 + 1013904223) & 0xFFFFFFFF; return (rng >>> 0) / 0x100000000; };
  for (let i = 0; i < 300; i++) {
    const x = Math.floor(rand() * W);
    const y = Math.floor(rand() * H);
    setPixel(buf, W, x, y, 58, 35, 20, 180);
  }

  return encodePNG(W, H, buf);
}

// ─── 生成所有纹理 ────────────────────────────────────────────────────────────

const OUTPUT_DIR = path.join(__dirname, 'textures', 'ui');

const TEXTURES = [
  { name: 'pixel_hotbar_background',  fn: makeHotbarBackground,   size: '182×22'   },
  { name: 'pixel_hotbar_selection',   fn: makeHotbarSelection,    size: '24×24'    },
  { name: 'pixel_experience_bar',     fn: makeExperienceBar,      size: '182×5'    },
  { name: 'pixel_health_background',  fn: makeHealthBackground,   size: '81×9'     },
  { name: 'pixel_health_bar',         fn: makeHealthBar,          size: '81×9'     },
  { name: 'pixel_hunger_background',  fn: makeHungerBackground,   size: '81×9'     },
  { name: 'pixel_hunger_bar',         fn: makeHungerBar,          size: '81×9'     },
  { name: 'pixel_background',         fn: makeBackground,         size: '256×256'  },
  { name: 'pixel_overlay',            fn: makeOverlay,            size: '256×256'  },
];

if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

console.log('🎨 奶茶像素UI - 纹理生成器');
console.log('─'.repeat(45));

let ok = 0, fail = 0;
for (const { name, fn, size } of TEXTURES) {
  try {
    const png = fn();
    const dest = path.join(OUTPUT_DIR, name + '.png');
    fs.writeFileSync(dest, png);
    console.log(`  ✅ ${name}.png  (${size})`);
    ok++;
  } catch (e) {
    console.error(`  ❌ ${name}: ${e.message}`);
    fail++;
  }
}

console.log('─'.repeat(45));
console.log(`生成完成：${ok} 成功，${fail} 失败`);
console.log(`输出目录：${OUTPUT_DIR}`);
if (ok === TEXTURES.length) {
  console.log('\n🚀 所有纹理已就绪！现在可以导入我的世界编辑器。');
}
