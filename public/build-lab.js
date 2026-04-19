const buildThemes = ['海边港口主城', '雪山城堡基地', '樱花山谷商贸镇', '下界熔炉都市', '地底蘑菇避难所', '沙漠神殿改造基地'];
const buildPalettes = ['云杉木 + 深板岩 + 石砖', '白色混凝土 + 石英 + 淡灰玻璃', '樱花木 + 平滑石 + 铜块', '黑石 + 下界砖 + 绯红木', '橡木 + 圆石 + 苔石'];
const buildRooms = ['附魔图书馆', '地窖仓库', '战利品陈列室', '自动熔炉间', '观景阳台', '药水实验室'];

function choose(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function setBuildText(selector, text) {
  const element = document.querySelector(selector);
  if (element) {
    element.textContent = text;
  }
}

async function copyBuildText(text) {
  if (!text) {
    return;
  }

  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const helper = document.createElement('textarea');
    helper.value = text;
    document.body.appendChild(helper);
    helper.select();
    document.execCommand('copy');
    helper.remove();
  }
}

function drawBuildTheme() {
  setBuildText('[data-build-theme-result]', `基地主题：${choose(buildThemes)}`);
}

function drawBuildPalette() {
  setBuildText('[data-build-palette-result]', `材料配色：${choose(buildPalettes)}`);
}

function drawBuildRoom() {
  setBuildText('[data-build-room-result]', `房间功能：${choose(buildRooms)}`);
}

function drawBuildPack() {
  const result = `建筑方案：${choose(buildThemes)}；主材使用 ${choose(buildPalettes)}；优先加入 ${choose(buildRooms)}。`;
  setBuildText('[data-build-pack-result]', result);
  return result;
}

const buildThemeButton = document.querySelector('[data-build-theme]');
const buildPaletteButton = document.querySelector('[data-build-palette]');
const buildRoomButton = document.querySelector('[data-build-room]');
const buildPackButton = document.querySelector('[data-build-pack]');
const buildPackCopyButton = document.querySelector('[data-build-pack-copy]');

if (buildThemeButton) buildThemeButton.addEventListener('click', drawBuildTheme);
if (buildPaletteButton) buildPaletteButton.addEventListener('click', drawBuildPalette);
if (buildRoomButton) buildRoomButton.addEventListener('click', drawBuildRoom);
if (buildPackButton) buildPackButton.addEventListener('click', drawBuildPack);
if (buildPackCopyButton) {
  buildPackCopyButton.addEventListener('click', async () => {
    const current = String(document.querySelector('[data-build-pack-result]')?.textContent || '').trim();
    await copyBuildText(current && current !== '建筑方案会显示在这里。' ? current : drawBuildPack());
  });
}