const fpsElements = {
  live: document.querySelector('[data-fps-live]'),
  average: document.querySelector('[data-fps-average]'),
  low: document.querySelector('[data-fps-low]'),
  high: document.querySelector('[data-fps-high]'),
  jank: document.querySelector('[data-fps-jank]'),
  score: document.querySelector('[data-fps-score]'),
  duration: document.querySelector('[data-fps-duration]'),
  status: document.querySelector('[data-fps-status]'),
  hint: document.querySelector('[data-fps-hint]'),
  mode: document.querySelector('[data-fps-mode]'),
  stage: document.querySelector('[data-fps-stage]'),
  wave: document.querySelector('[data-fps-wave]'),
  orb: document.querySelector('[data-fps-orb]'),
  orbSecondary: document.querySelector('[data-fps-orb-secondary]'),
  start: document.querySelector('[data-fps-start]'),
  stop: document.querySelector('[data-fps-stop]'),
  reset: document.querySelector('[data-fps-reset]')
};

const deviceElements = {
  browser: document.querySelectorAll('[data-device-browser]'),
  platform: document.querySelectorAll('[data-device-platform]'),
  memory: document.querySelector('[data-device-memory]'),
  cores: document.querySelector('[data-device-cores]'),
  screen: document.querySelector('[data-device-screen]'),
  screenDetail: document.querySelector('[data-device-screen-detail]'),
  viewport: document.querySelectorAll('[data-device-viewport]'),
  userAgent: document.querySelector('[data-device-useragent]')
};

const fpsState = {
  running: false,
  rafId: 0,
  startTime: 0,
  previousFrameTime: 0,
  frameValues: [],
  sampleWindow: [],
  low: Infinity,
  high: 0,
  live: 0,
  jankCount: 0
};

function setText(target, text) {
  if (!target) {
    return;
  }

  if (target instanceof NodeList || Array.isArray(target)) {
    target.forEach((element) => {
      if (element) {
        element.textContent = text;
      }
    });
    return;
  }

  target.textContent = text;
}

function detectBrowserLabel() {
  const userAgent = navigator.userAgent;

  if (/edg/iu.test(userAgent)) {
    return 'Microsoft Edge';
  }

  if (/chrome/iu.test(userAgent) && !/edg/iu.test(userAgent)) {
    return 'Google Chrome';
  }

  if (/safari/iu.test(userAgent) && !/chrome/iu.test(userAgent)) {
    return 'Safari';
  }

  if (/firefox/iu.test(userAgent)) {
    return 'Firefox';
  }

  return '未知浏览器';
}

function renderDeviceInfo() {
  const browserLabel = detectBrowserLabel();
  const platform = navigator.userAgentData?.platform || navigator.platform || '未知平台';
  const cores = navigator.hardwareConcurrency ? `${navigator.hardwareConcurrency} 线程` : 'CPU 线程：未知';
  const memory = navigator.deviceMemory ? `${navigator.deviceMemory} GB` : '浏览器未提供';
  const screenText = `${window.screen.width} × ${window.screen.height}`;
  const viewportText = `${window.innerWidth} × ${window.innerHeight} / DPR ${window.devicePixelRatio || 1}`;

  setText(deviceElements.browser, browserLabel);
  setText(deviceElements.platform, platform);
  setText(deviceElements.memory, memory);
  setText(deviceElements.cores, `CPU 线程：${cores}`);
  setText(deviceElements.screen, `${screenText} / ${viewportText}`);
  setText(deviceElements.screenDetail, `${screenText} 像素`);
  setText(deviceElements.viewport, `视口：${viewportText}`);

  if (deviceElements.userAgent) {
    deviceElements.userAgent.textContent = navigator.userAgent;
  }
}

function getScoreLabel(average, jankCount) {
  if (!Number.isFinite(average)) {
    return '等待检测';
  }

  if (average >= 100 && jankCount <= 1) {
    return '旗舰顺滑';
  }

  if (average >= 60 && jankCount <= 4) {
    return '流畅稳定';
  }

  if (average >= 40) {
    return '可用但有波动';
  }

  return '存在明显卡顿';
}

function renderStats() {
  const average = fpsState.frameValues.length
    ? fpsState.frameValues.reduce((sum, value) => sum + value, 0) / fpsState.frameValues.length
    : NaN;
  const liveText = Number.isFinite(fpsState.live) && fpsState.live > 0 ? `${fpsState.live} FPS` : '-- FPS';
  const avgText = Number.isFinite(average) ? `${average.toFixed(1)} FPS` : '-- FPS';
  const lowText = Number.isFinite(fpsState.low) && fpsState.low !== Infinity ? `${fpsState.low} FPS` : '-- FPS';
  const highText = fpsState.high ? `${fpsState.high} FPS` : '-- FPS';
  const durationSeconds = fpsState.startTime ? ((performance.now() - fpsState.startTime) / 1000).toFixed(1) : '0.0';

  setText(fpsElements.live, liveText);
  setText(fpsElements.average, avgText);
  setText(fpsElements.low, lowText);
  setText(fpsElements.high, highText);
  setText(fpsElements.jank, `${fpsState.jankCount} 次`);
  setText(fpsElements.score, getScoreLabel(average, fpsState.jankCount));
  setText(fpsElements.duration, `${durationSeconds} 秒`);
}

function renderStageMotion(timestamp) {
  if (!fpsElements.stage || !fpsElements.orb || !fpsElements.orbSecondary || !fpsElements.wave) {
    return;
  }

  const width = fpsElements.stage.clientWidth;
  const height = fpsElements.stage.clientHeight;
  const progress = timestamp / 1000;
  const x = ((Math.sin(progress * 1.8) + 1) / 2) * (width - 72);
  const y = ((Math.cos(progress * 1.3) + 1) / 2) * (height - 82);
  const x2 = ((Math.sin(progress * 2.4 + 0.8) + 1) / 2) * (width - 46);
  const y2 = ((Math.sin(progress * 1.7) + 1) / 2) * (height - 52);
  const waveShift = Math.sin(progress * 1.1) * 24;

  fpsElements.orb.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  fpsElements.orbSecondary.style.transform = `translate3d(${x2}px, ${y2}px, 0)`;
  fpsElements.wave.style.transform = `translate3d(${waveShift}px, 0, 0)`;
}

function stopMonitor(isUnload = false) {
  fpsState.running = false;

  if (fpsState.rafId) {
    cancelAnimationFrame(fpsState.rafId);
    fpsState.rafId = 0;
  }

  if (fpsElements.mode) {
    fpsElements.mode.textContent = '已停止';
  }

  if (fpsElements.start) {
    fpsElements.start.disabled = false;
  }

  if (fpsElements.stop) {
    fpsElements.stop.disabled = true;
  }

  if (!isUnload) {
    setText(fpsElements.status, '检测已停止，结果会保留，方便你继续对比。');
    setText(fpsElements.hint, '如果你修改了页面样式或切换了浏览器窗口，可以重新开始一轮检测。');
  }
}

function step(timestamp) {
  if (!fpsState.running) {
    return;
  }

  if (!fpsState.startTime) {
    fpsState.startTime = timestamp;
  }

  if (fpsState.previousFrameTime) {
    const frameDelta = timestamp - fpsState.previousFrameTime;
    const fpsValue = Math.max(1, Math.round(1000 / frameDelta));
    fpsState.live = fpsValue;
    fpsState.frameValues.push(fpsValue);
    fpsState.sampleWindow.push(fpsValue);

    if (fpsState.sampleWindow.length > 12) {
      fpsState.sampleWindow.shift();
    }

    if (frameDelta > 34) {
      fpsState.jankCount += 1;
    }

    fpsState.low = Math.min(fpsState.low, fpsValue);
    fpsState.high = Math.max(fpsState.high, fpsValue);
    const liveAverage = fpsState.sampleWindow.reduce((sum, value) => sum + value, 0) / fpsState.sampleWindow.length;
    fpsState.live = Math.round(liveAverage);
  }

  fpsState.previousFrameTime = timestamp;
  renderStageMotion(timestamp);
  renderStats();
  setText(fpsElements.status, `检测中，已记录 ${fpsState.frameValues.length} 帧采样，卡顿 ${fpsState.jankCount} 次。`);
  setText(fpsElements.hint, '保持当前页可见时结果最准确；切到后台标签页后浏览器会主动降帧。');
  fpsState.rafId = requestAnimationFrame(step);
}

function resetMonitor() {
  fpsState.frameValues = [];
  fpsState.sampleWindow = [];
  fpsState.low = Infinity;
  fpsState.high = 0;
  fpsState.live = 0;
  fpsState.jankCount = 0;
  fpsState.startTime = 0;
  fpsState.previousFrameTime = 0;
  renderStats();

  if (!fpsState.running) {
    setText(fpsElements.status, '结果已重置，点击“开始检测”即可重新采样。');
    setText(fpsElements.hint, '建议在你要观察的页面交互条件下重新测试。');
    if (fpsElements.mode) {
      fpsElements.mode.textContent = '空闲中';
    }
  }
}

function startMonitor() {
  if (fpsState.running) {
    return;
  }

  resetMonitor();
  fpsState.running = true;
  if (fpsElements.mode) {
    fpsElements.mode.textContent = '检测中';
  }

  if (fpsElements.start) {
    fpsElements.start.disabled = true;
  }

  if (fpsElements.stop) {
    fpsElements.stop.disabled = false;
  }

  setText(fpsElements.status, '检测已启动，正在构建第一批采样数据。');
  setText(fpsElements.hint, '建议至少运行 10 秒；如果你拖动窗口或滚动页面，数值会更贴近真实使用场景。');
  fpsState.rafId = requestAnimationFrame(step);
}

fpsElements.start?.addEventListener('click', startMonitor);
fpsElements.stop?.addEventListener('click', () => stopMonitor(false));
fpsElements.reset?.addEventListener('click', resetMonitor);
window.addEventListener('beforeunload', () => stopMonitor(true));
window.addEventListener('resize', renderDeviceInfo);

renderDeviceInfo();
renderStats();