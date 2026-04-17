let fpsRunning = false;
let fpsFrameCount = 0;
let fpsLastSecond = 0;
let fpsLive = 0;
let fpsAverageSamples = [];
let fpsLowest = null;
let fpsRafId = 0;
let fpsStartTime = 0;

function setText(selector, text) {
  const element = document.querySelector(selector);
  if (element) {
    element.textContent = text;
  }
}

function renderStats() {
  const average = fpsAverageSamples.length
    ? (fpsAverageSamples.reduce((sum, value) => sum + value, 0) / fpsAverageSamples.length).toFixed(1)
    : '--';

  setText('[data-fps-live]', `当前 FPS：${fpsLive || '--'}`);
  setText('[data-fps-average]', `平均 FPS：${average}`);
  setText('[data-fps-low]', `最低 FPS：${fpsLowest === null ? '--' : fpsLowest}`);
}

function stopMonitor() {
  fpsRunning = false;
  if (fpsRafId) {
    cancelAnimationFrame(fpsRafId);
    fpsRafId = 0;
  }
  setText('[data-fps-status]', '实时帧率检测已停止。');
}

function step(timestamp) {
  if (!fpsRunning) {
    return;
  }

  if (!fpsStartTime) {
    fpsStartTime = timestamp;
    fpsLastSecond = timestamp;
  }

  fpsFrameCount += 1;
  const elapsed = timestamp - fpsLastSecond;

  if (elapsed >= 1000) {
    fpsLive = Math.round((fpsFrameCount * 1000) / elapsed);
    fpsAverageSamples.push(fpsLive);
    fpsAverageSamples = fpsAverageSamples.slice(-30);
    fpsLowest = fpsLowest === null ? fpsLive : Math.min(fpsLowest, fpsLive);
    fpsFrameCount = 0;
    fpsLastSecond = timestamp;
    renderStats();
    const seconds = Math.max(1, Math.round((timestamp - fpsStartTime) / 1000));
    setText('[data-fps-status]', `检测中，已运行 ${seconds} 秒。当前结果每秒刷新一次。`);
  }

  fpsRafId = requestAnimationFrame(step);
}

function startMonitor() {
  fpsRunning = true;
  fpsFrameCount = 0;
  fpsLastSecond = 0;
  fpsLive = 0;
  fpsAverageSamples = [];
  fpsLowest = null;
  fpsStartTime = 0;
  renderStats();
  setText('[data-fps-status]', '实时帧率检测已启动，正在采样...');
  fpsRafId = requestAnimationFrame(step);
}

document.querySelector('[data-fps-start]')?.addEventListener('click', () => {
  if (!fpsRunning) {
    startMonitor();
  }
});

document.querySelector('[data-fps-stop]')?.addEventListener('click', stopMonitor);
window.addEventListener('beforeunload', stopMonitor);
renderStats();