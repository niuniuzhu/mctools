let coordinateUsername = 'guest';

function numberFromInput(selector) {
  const element = document.querySelector(selector);
  return element ? Number.parseFloat(element.value) || 0 : 0;
}

function textFromInput(selector) {
  const element = document.querySelector(selector);
  return element ? String(element.value || '').trim() : '';
}

function setText(selector, text) {
  const element = document.querySelector(selector);

  if (element) {
    element.textContent = text;
  }
}

function getCoordinateStorageKey(scope) {
  return `mctools:${scope}:${coordinateUsername}`;
}

function readCoordinateStorage(scope, fallback) {
  try {
    const raw = localStorage.getItem(getCoordinateStorageKey(scope));
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeCoordinateStorage(scope, value) {
  try {
    localStorage.setItem(getCoordinateStorageKey(scope), JSON.stringify(value));
  } catch {
    // Ignore storage write failure.
  }
}

function getSavedPoints() {
  const items = readCoordinateStorage('saved-points', []);
  return Array.isArray(items) ? items : [];
}

function setSavedPoints(items) {
  writeCoordinateStorage('saved-points', items);
}

function formatCoordinateTriplet(point) {
  return `${point.x} ${point.y} ${point.z}`;
}

function convertToNether() {
  const x = numberFromInput('[data-ow-x]');
  const z = numberFromInput('[data-ow-z]');
  const netherX = (x / 8).toFixed(2);
  const netherZ = (z / 8).toFixed(2);
  setText('[data-coordinate-result]', `下界建议坐标：X ${netherX}，Z ${netherZ}。适合搭地狱高速路或传送门对点。`);
}

function convertToOverworld() {
  const x = numberFromInput('[data-ow-x]');
  const z = numberFromInput('[data-ow-z]');
  const overworldX = (x * 8).toFixed(2);
  const overworldZ = (z * 8).toFixed(2);
  setText('[data-coordinate-result]', `主世界对应坐标：X ${overworldX}，Z ${overworldZ}。适合反推地狱门落点。`);
}

function getDirectionLabel(deltaX, deltaZ) {
  const horizontal = deltaX === 0 ? '' : deltaX > 0 ? '东' : '西';
  const vertical = deltaZ === 0 ? '' : deltaZ > 0 ? '南' : '北';
  return `${vertical}${horizontal}` || '原地';
}

function calculateDistance() {
  const ax = numberFromInput('[data-point-ax]');
  const az = numberFromInput('[data-point-az]');
  const bx = numberFromInput('[data-point-bx]');
  const bz = numberFromInput('[data-point-bz]');
  const deltaX = bx - ax;
  const deltaZ = bz - az;
  const distance = Math.hypot(deltaX, deltaZ).toFixed(2);
  const direction = getDirectionLabel(deltaX, deltaZ);
  const netherShortcut = (Math.hypot(deltaX / 8, deltaZ / 8)).toFixed(2);
  setText(
    '[data-distance-result]',
    `两点平面距离：${distance} 格；方向：${direction}；若走下界高速路，理论只需约 ${netherShortcut} 格。`
  );
}

function parseBatchLine(line) {
  const parts = line.trim().split(/\s+/).map((item) => Number.parseFloat(item));

  if (parts.length < 2 || Number.isNaN(parts[0]) || Number.isNaN(parts[parts.length - 1])) {
    return null;
  }

  if (parts.length >= 3) {
    return { x: parts[0], y: parts[1], z: parts[2] };
  }

  return { x: parts[0], y: null, z: parts[1] };
}

function convertBatchCoordinates() {
  const mode = textFromInput('[data-batch-mode]') || 'ow-to-nether';
  const raw = textFromInput('[data-batch-input]');
  const lines = raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);

  if (!lines.length) {
    setText('[data-batch-result]', '请先输入至少一行坐标。');
    return;
  }

  const results = lines.map((line, index) => {
    const point = parseBatchLine(line);

    if (!point) {
      return `${index + 1}. 无法识别：${line}`;
    }

    const factor = mode === 'ow-to-nether' ? 1 / 8 : 8;
    const nextX = (point.x * factor).toFixed(2);
    const nextZ = (point.z * factor).toFixed(2);
    const prefix = mode === 'ow-to-nether' ? '下界' : '主世界';
    const middle = point.y === null ? '' : ` Y ${point.y}`;
    return `${index + 1}. ${prefix}：X ${nextX}${middle} Z ${nextZ}`;
  });

  setText('[data-batch-result]', results.join('\n'));
}

function copyBatchResult() {
  const result = document.querySelector('[data-batch-result]');

  if (!result) {
    return;
  }

  navigator.clipboard.writeText(result.textContent || '').catch(() => {
    const helper = document.createElement('textarea');
    helper.value = result.textContent || '';
    document.body.appendChild(helper);
    helper.select();
    document.execCommand('copy');
    helper.remove();
  });
}

function readBookmarkForm() {
  return {
    name: textFromInput('[data-bookmark-name]') || '未命名点位',
    dimension: textFromInput('[data-bookmark-dimension]') || '主世界',
    x: numberFromInput('[data-bookmark-x]'),
    y: numberFromInput('[data-bookmark-y]'),
    z: numberFromInput('[data-bookmark-z]')
  };
}

function renderSavedPoints() {
  const container = document.querySelector('[data-saved-point-list]');

  if (!container) {
    return;
  }

  const items = getSavedPoints();

  if (!items.length) {
    container.innerHTML = '<p class="empty-state">还没有保存任何点位。</p>';
    return;
  }

  container.innerHTML = items.map((item) => `
    <article class="saved-point-item">
      <div class="history-item-head">
        <strong>${item.name}</strong>
        <span>${item.type === 'death' ? '死亡点' : item.dimension}</span>
      </div>
      <p class="tool-card-note">坐标：${formatCoordinateTriplet(item)} · 维度：${item.dimension}</p>
      <div class="favorite-item-actions">
        <button type="button" class="ghost-button compact-button" data-point-load="${item.id}">载入</button>
        <button type="button" class="ghost-button compact-button" data-point-copy="${item.id}">复制 /tp</button>
        <button type="button" class="history-delete" data-point-delete="${item.id}">删除</button>
      </div>
    </article>
  `).join('');
}

function savePoint(type) {
  const point = readBookmarkForm();
  const items = getSavedPoints();

  items.unshift({
    id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    ...point,
    type,
    createdAt: new Date().toISOString()
  });

  setSavedPoints(items.slice(0, 50));
  renderSavedPoints();
}

function loadSavedPoint(pointId) {
  const point = getSavedPoints().find((item) => item.id === pointId);

  if (!point) {
    return;
  }

  const mapping = {
    '[data-bookmark-name]': point.name,
    '[data-bookmark-dimension]': point.dimension,
    '[data-bookmark-x]': point.x,
    '[data-bookmark-y]': point.y,
    '[data-bookmark-z]': point.z,
    '[data-point-ax]': point.x,
    '[data-point-az]': point.z,
    '[data-ow-x]': point.x,
    '[data-ow-z]': point.z
  };

  Object.entries(mapping).forEach(([selector, value]) => {
    const element = document.querySelector(selector);
    if (element) {
      element.value = value;
    }
  });

  setText('[data-coordinate-result]', `已载入点位：${point.name} (${point.dimension})`);
}

function copyPointCommand(pointId) {
  const point = getSavedPoints().find((item) => item.id === pointId);

  if (!point) {
    return;
  }

  const command = `/tp @p ${formatCoordinateTriplet(point)}`;
  navigator.clipboard.writeText(command).catch(() => {
    const helper = document.createElement('textarea');
    helper.value = command;
    document.body.appendChild(helper);
    helper.select();
    document.execCommand('copy');
    helper.remove();
  });
}

function deleteSavedPoint(pointId) {
  setSavedPoints(getSavedPoints().filter((item) => item.id !== pointId));
  renderSavedPoints();
}

function fillBookmarkFromConverter() {
  const x = numberFromInput('[data-ow-x]');
  const z = numberFromInput('[data-ow-z]');
  const xInput = document.querySelector('[data-bookmark-x]');
  const zInput = document.querySelector('[data-bookmark-z]');

  if (xInput) {
    xInput.value = x;
  }

  if (zInput) {
    zInput.value = z;
  }
}

async function loadCoordinateUser() {
  try {
    const response = await fetch('/api/me');

    if (!response.ok) {
      return;
    }

    const result = await response.json().catch(() => null);
    if (result && result.username) {
      coordinateUsername = result.username;
    }
  } finally {
    renderSavedPoints();
  }
}

const convertNetherButton = document.querySelector('[data-convert-nether]');
const convertOverworldButton = document.querySelector('[data-convert-overworld]');
const calcDistanceButton = document.querySelector('[data-calc-distance]');
const batchConvertButton = document.querySelector('[data-batch-convert]');
const batchCopyButton = document.querySelector('[data-batch-copy]');
const saveBookmarkButton = document.querySelector('[data-save-bookmark]');
const saveDeathButton = document.querySelector('[data-save-death]');
const fillCurrentButton = document.querySelector('[data-fill-current]');

if (convertNetherButton) {
  convertNetherButton.addEventListener('click', convertToNether);
}

if (convertOverworldButton) {
  convertOverworldButton.addEventListener('click', convertToOverworld);
}

if (calcDistanceButton) {
  calcDistanceButton.addEventListener('click', calculateDistance);
}

if (batchConvertButton) {
  batchConvertButton.addEventListener('click', convertBatchCoordinates);
}

if (batchCopyButton) {
  batchCopyButton.addEventListener('click', copyBatchResult);
}

if (saveBookmarkButton) {
  saveBookmarkButton.addEventListener('click', () => savePoint('waypoint'));
}

if (saveDeathButton) {
  saveDeathButton.addEventListener('click', () => savePoint('death'));
}

if (fillCurrentButton) {
  fillCurrentButton.addEventListener('click', fillBookmarkFromConverter);
}

document.addEventListener('click', (event) => {
  const loadButton = event.target.closest('[data-point-load]');

  if (loadButton) {
    loadSavedPoint(loadButton.getAttribute('data-point-load') || '');
    return;
  }

  const copyButton = event.target.closest('[data-point-copy]');

  if (copyButton) {
    copyPointCommand(copyButton.getAttribute('data-point-copy') || '');
    return;
  }

  const deleteButton = event.target.closest('[data-point-delete]');

  if (deleteButton) {
    deleteSavedPoint(deleteButton.getAttribute('data-point-delete') || '');
  }
});

loadCoordinateUser();
