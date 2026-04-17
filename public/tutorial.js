let fpsRunning = false;
let fpsFrameCount = 0;
let fpsLastSecond = 0;
let fpsLive = 0;
let fpsAverageSamples = [];
let fpsLowest = null;
let fpsRafId = 0;
let fpsStartTime = 0;

function setTutorialText(selector, text) {
  const element = document.querySelector(selector);

  if (element) {
    element.textContent = text;
  }
}

function renderFpsStats() {
  const average = fpsAverageSamples.length
    ? (fpsAverageSamples.reduce((sum, value) => sum + value, 0) / fpsAverageSamples.length).toFixed(1)
    : '--';

  setTutorialText('[data-fps-live]', `当前 FPS：${fpsLive || '--'}`);
  setTutorialText('[data-fps-average]', `平均 FPS：${average}`);
  setTutorialText('[data-fps-low]', `最低 FPS：${fpsLowest === null ? '--' : fpsLowest}`);
}

function stopFpsMonitor() {
  fpsRunning = false;

  if (fpsRafId) {
    cancelAnimationFrame(fpsRafId);
    fpsRafId = 0;
  }

  setTutorialText('[data-fps-status]', '实时帧率检测已停止。');
}

function handleFpsFrame(timestamp) {
  if (!fpsRunning) {
    return;
  }

  if (!fpsStartTime) {
    fpsStartTime = timestamp;
    fpsLastSecond = timestamp;
  }

  fpsFrameCount += 1;
  const elapsedSinceLastSecond = timestamp - fpsLastSecond;

  if (elapsedSinceLastSecond >= 1000) {
    fpsLive = Math.round((fpsFrameCount * 1000) / elapsedSinceLastSecond);
    fpsAverageSamples.push(fpsLive);
    fpsAverageSamples = fpsAverageSamples.slice(-30);
    fpsLowest = fpsLowest === null ? fpsLive : Math.min(fpsLowest, fpsLive);
    fpsFrameCount = 0;
    fpsLastSecond = timestamp;
    renderFpsStats();

    const seconds = Math.max(1, Math.round((timestamp - fpsStartTime) / 1000));
    setTutorialText('[data-fps-status]', `检测中，已运行 ${seconds} 秒。当前结果每秒刷新一次。`);
  }

  fpsRafId = requestAnimationFrame(handleFpsFrame);
}

function startFpsMonitor() {
  fpsRunning = true;
  fpsFrameCount = 0;
  fpsLastSecond = 0;
  fpsLive = 0;
  fpsAverageSamples = [];
  fpsLowest = null;
  fpsStartTime = 0;
  renderFpsStats();
  setTutorialText('[data-fps-status]', '实时帧率检测已启动，正在采样...');
  fpsRafId = requestAnimationFrame(handleFpsFrame);
}

function scoreMinecraftRelevance(text) {
  const normalized = String(text || '').toLowerCase();
  const keywords = [
    'minecraft',
    '我的世界',
    'mojang',
    'bedrock',
    'java edition',
    'forge',
    'fabric',
    'spigot',
    'paper',
    'bukkit',
    '末影龙',
    '下界',
    'creeper',
    'redstone',
    '指令',
    '服务器',
    '方块',
    '生物群系',
    'modrinth',
    'curseforge'
  ];

  return keywords.reduce((score, keyword) => score + (normalized.includes(keyword) ? 1 : 0), 0);
}

function detectMinecraftPage() {
  const url = String(document.querySelector('[data-page-url]')?.value || '').trim();
  const title = String(document.querySelector('[data-page-title]')?.value || '').trim();
  const content = String(document.querySelector('[data-page-content]')?.value || '').trim();
  const combined = [url, title, content].join('\n');
  const score = scoreMinecraftRelevance(combined);

  let level = '低相关';
  let summary = '当前内容和 Minecraft 关联度较低。';

  if (score >= 6) {
    level = '高相关';
    summary = '这很可能是 Minecraft 官方、Wiki、模组站或服务器页面。';
  } else if (score >= 3) {
    level = '中相关';
    summary = '内容中包含较多 Minecraft 相关关键词，建议进一步人工确认。';
  }

  const typeHints = [];

  if (/minecraft\.net|mojang/i.test(url)) {
    typeHints.push('疑似官方站');
  }

  if (/wiki|fandom/i.test(url) || /wiki/i.test(title)) {
    typeHints.push('疑似 Wiki 页面');
  }

  if (/modrinth|curseforge|forge|fabric/i.test(combined)) {
    typeHints.push('疑似模组/插件页面');
  }

  if (/server|服务器|spigot|paper|bukkit/i.test(combined)) {
    typeHints.push('疑似服务器相关页面');
  }

  const extra = typeHints.length ? ` 页面类型判断：${typeHints.join('、')}。` : '';
  setTutorialText('[data-page-detect-result]', `检测结果：${level}。关键词命中 ${score} 项。${summary}${extra}`);
}

function fillCurrentTutorialPage() {
  const urlInput = document.querySelector('[data-page-url]');
  const titleInput = document.querySelector('[data-page-title]');
  const contentInput = document.querySelector('[data-page-content]');

  if (urlInput) {
    urlInput.value = window.location.href;
  }

  if (titleInput) {
    titleInput.value = document.title;
  }

  if (contentInput) {
    contentInput.value = document.body ? document.body.innerText.slice(0, 800) : '';
  }

  detectMinecraftPage();
}

const fpsStartButton = document.querySelector('[data-fps-start]');
const fpsStopButton = document.querySelector('[data-fps-stop]');
const pageDetectButton = document.querySelector('[data-page-detect]');
const pageFillCurrentButton = document.querySelector('[data-page-fill-current]');

if (fpsStartButton) {
  fpsStartButton.addEventListener('click', () => {
    if (!fpsRunning) {
      startFpsMonitor();
    }
  });
}

if (fpsStopButton) {
  fpsStopButton.addEventListener('click', stopFpsMonitor);
}

if (pageDetectButton) {
  pageDetectButton.addEventListener('click', detectMinecraftPage);
}

if (pageFillCurrentButton) {
  pageFillCurrentButton.addEventListener('click', fillCurrentTutorialPage);
}

window.addEventListener('beforeunload', stopFpsMonitor);
renderFpsStats();