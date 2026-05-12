const canvas = document.getElementById('sandboxCanvas');
const context = canvas.getContext('2d');
const hotbarElement = document.querySelector('[data-hotbar]');
const statPos = document.querySelector('[data-stat-pos]');
const statSeed = document.querySelector('[data-stat-seed]');
const statBlock = document.querySelector('[data-stat-block]');
const statTime = document.querySelector('[data-stat-time]');
const resetButton = document.querySelector('[data-action="reset-world"]');
const saveButton = document.querySelector('[data-action="save-world"]');

const WORLD_SIZE = 192;
const TILE_SIZE = 32;
const VIEW_PADDING = 2;
const PLAYER_RADIUS = 0.35;
const PLAYER_REACH = 4.8;
const DAY_LENGTH_SECONDS = 180;
const SAVE_KEY = 'mctools-sandbox-1201-save-v1';
const SAVE_INTERVAL_MS = 12000;

const BLOCKS = [
  { id: 0, name: '空气', solid: false, color: '#00000000' },
  { id: 1, name: '草方块', solid: true, color: '#3f9b4a' },
  { id: 2, name: '泥土', solid: true, color: '#7d4f29' },
  { id: 3, name: '石头', solid: true, color: '#6b7280' },
  { id: 4, name: '木头', solid: true, color: '#9a6b3a' },
  { id: 5, name: '木板', solid: true, color: '#c08b4b' },
  { id: 6, name: '水', solid: false, color: '#2563eb' }
];

const PLACEABLE_BLOCKS = [1, 2, 3, 4, 5, 6];
const blockById = new Map(BLOCKS.map((block) => [block.id, block]));

function hashNoise(x, y, seed) {
  const sinValue = Math.sin((x * 127.1 + y * 311.7 + seed * 17.3) * 0.01745329252) * 43758.5453123;
  return sinValue - Math.floor(sinValue);
}

function layeredNoise(x, y, seed) {
  const scale1 = hashNoise(x * 0.11, y * 0.11, seed);
  const scale2 = hashNoise(x * 0.27, y * 0.27, seed + 31);
  const scale3 = hashNoise(x * 0.045, y * 0.045, seed + 67);
  return scale1 * 0.45 + scale2 * 0.35 + scale3 * 0.2;
}

function createEmptyWorld() {
  return Array.from({ length: WORLD_SIZE }, () => new Uint8Array(WORLD_SIZE));
}

function generateWorld(seed) {
  const world = createEmptyWorld();
  for (let y = 0; y < WORLD_SIZE; y += 1) {
    for (let x = 0; x < WORLD_SIZE; x += 1) {
      const noise = layeredNoise(x, y, seed);
      let blockId = 2;

      if (noise < 0.25) {
        blockId = 6;
      } else if (noise < 0.42) {
        blockId = 1;
      } else if (noise < 0.74) {
        blockId = 2;
      } else if (noise < 0.9) {
        blockId = 3;
      } else {
        blockId = 4;
      }

      world[y][x] = blockId;
    }
  }

  return world;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function createInitialState(seed = Math.floor(Date.now() % 1000000)) {
  return {
    seed,
    world: generateWorld(seed),
    player: {
      x: Math.floor(WORLD_SIZE / 2) + 0.5,
      y: Math.floor(WORLD_SIZE / 2) + 0.5,
      speed: 3.25,
      sprintMultiplier: 1.7
    },
    selectedSlot: 0,
    timeSeconds: DAY_LENGTH_SECONDS * 0.25,
    mouse: {
      x: canvas.width / 2,
      y: canvas.height / 2
    }
  };
}

function serializeWorld(world) {
  const rows = world.map((row) => Array.from(row));
  return rows;
}

function deserializeWorld(rows) {
  if (!Array.isArray(rows) || rows.length !== WORLD_SIZE) {
    return null;
  }

  const world = createEmptyWorld();
  for (let y = 0; y < WORLD_SIZE; y += 1) {
    const row = rows[y];
    if (!Array.isArray(row) || row.length !== WORLD_SIZE) {
      return null;
    }
    for (let x = 0; x < WORLD_SIZE; x += 1) {
      const cell = Number(row[x]);
      world[y][x] = Number.isFinite(cell) ? clamp(Math.round(cell), 0, 6) : 0;
    }
  }

  return world;
}

function saveState(state) {
  try {
    const payload = {
      seed: state.seed,
      world: serializeWorld(state.world),
      player: { x: state.player.x, y: state.player.y },
      selectedSlot: state.selectedSlot,
      timeSeconds: state.timeSeconds
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore save errors when storage is unavailable.
  }
}

function loadState() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    const world = deserializeWorld(parsed.world);
    if (!world) {
      return null;
    }

    const state = createInitialState(Number(parsed.seed) || undefined);
    state.seed = Number(parsed.seed) || state.seed;
    state.world = world;
    state.player.x = clamp(Number(parsed.player?.x) || state.player.x, 1, WORLD_SIZE - 2);
    state.player.y = clamp(Number(parsed.player?.y) || state.player.y, 1, WORLD_SIZE - 2);
    state.selectedSlot = clamp(Number(parsed.selectedSlot) || 0, 0, PLACEABLE_BLOCKS.length - 1);
    state.timeSeconds = Number.isFinite(parsed.timeSeconds) ? Number(parsed.timeSeconds) : state.timeSeconds;
    return state;
  } catch {
    return null;
  }
}

const inputState = {
  keys: new Set(),
  mouseDownLeft: false,
  mouseDownRight: false
};

let state = loadState() || createInitialState();
let lastTimestamp = performance.now();
let breakCooldown = 0;
let placeCooldown = 0;
let autosaveTimer = 0;

function getBlockAt(tileX, tileY) {
  if (tileX < 0 || tileX >= WORLD_SIZE || tileY < 0 || tileY >= WORLD_SIZE) {
    return 3;
  }
  return state.world[tileY][tileX];
}

function setBlockAt(tileX, tileY, blockId) {
  if (tileX < 0 || tileX >= WORLD_SIZE || tileY < 0 || tileY >= WORLD_SIZE) {
    return;
  }
  state.world[tileY][tileX] = blockId;
}

function isSolidAt(tileX, tileY) {
  const block = blockById.get(getBlockAt(tileX, tileY));
  return Boolean(block && block.solid);
}

function canOccupy(x, y) {
  const radius = PLAYER_RADIUS;
  const points = [
    [x - radius, y - radius],
    [x + radius, y - radius],
    [x - radius, y + radius],
    [x + radius, y + radius]
  ];

  for (const [px, py] of points) {
    if (isSolidAt(Math.floor(px), Math.floor(py))) {
      return false;
    }
  }

  return true;
}

function movePlayer(deltaSeconds) {
  let moveX = 0;
  let moveY = 0;

  if (inputState.keys.has('KeyW')) {
    moveY -= 1;
  }
  if (inputState.keys.has('KeyS')) {
    moveY += 1;
  }
  if (inputState.keys.has('KeyA')) {
    moveX -= 1;
  }
  if (inputState.keys.has('KeyD')) {
    moveX += 1;
  }

  if (!moveX && !moveY) {
    return;
  }

  const length = Math.hypot(moveX, moveY) || 1;
  const sprinting = inputState.keys.has('ShiftLeft') || inputState.keys.has('ShiftRight');
  const speed = state.player.speed * (sprinting ? state.player.sprintMultiplier : 1);
  const velocityX = (moveX / length) * speed * deltaSeconds;
  const velocityY = (moveY / length) * speed * deltaSeconds;

  const targetX = clamp(state.player.x + velocityX, 1, WORLD_SIZE - 2);
  const targetY = clamp(state.player.y + velocityY, 1, WORLD_SIZE - 2);

  if (canOccupy(targetX, state.player.y)) {
    state.player.x = targetX;
  }
  if (canOccupy(state.player.x, targetY)) {
    state.player.y = targetY;
  }
}

function getCameraOffset() {
  return {
    x: state.player.x * TILE_SIZE - canvas.width / 2,
    y: state.player.y * TILE_SIZE - canvas.height / 2
  };
}

function getMouseWorldPosition() {
  const camera = getCameraOffset();
  return {
    x: (state.mouse.x + camera.x) / TILE_SIZE,
    y: (state.mouse.y + camera.y) / TILE_SIZE
  };
}

function getTargetTile() {
  const mouseWorld = getMouseWorldPosition();
  const playerCenter = { x: state.player.x, y: state.player.y };
  const deltaX = mouseWorld.x - playerCenter.x;
  const deltaY = mouseWorld.y - playerCenter.y;
  const distance = Math.hypot(deltaX, deltaY);

  if (distance > PLAYER_REACH) {
    return null;
  }

  return {
    x: Math.floor(mouseWorld.x),
    y: Math.floor(mouseWorld.y)
  };
}

function breakBlock() {
  const target = getTargetTile();
  if (!target) {
    return;
  }

  const blockId = getBlockAt(target.x, target.y);
  if (blockId === 0 || blockId === 6) {
    return;
  }

  setBlockAt(target.x, target.y, 0);
}

function placeBlock() {
  const target = getTargetTile();
  if (!target) {
    return;
  }

  if (getBlockAt(target.x, target.y) !== 0) {
    return;
  }

  const selectedBlockId = PLACEABLE_BLOCKS[state.selectedSlot];
  if (!selectedBlockId) {
    return;
  }

  const playerTileX = Math.floor(state.player.x);
  const playerTileY = Math.floor(state.player.y);
  if (target.x === playerTileX && target.y === playerTileY) {
    return;
  }

  setBlockAt(target.x, target.y, selectedBlockId);
}

function updateInteractions(deltaSeconds) {
  breakCooldown -= deltaSeconds;
  placeCooldown -= deltaSeconds;

  if (inputState.mouseDownLeft && breakCooldown <= 0) {
    breakBlock();
    breakCooldown = 0.12;
  }

  if (inputState.mouseDownRight && placeCooldown <= 0) {
    placeBlock();
    placeCooldown = 0.15;
  }
}

function getTileShade(x, y, baseColor) {
  const noise = hashNoise(x * 0.32, y * 0.32, state.seed + 7);
  const shade = 0.86 + noise * 0.28;
  const rgb = baseColor.match(/[0-9a-f]{2}/gi);
  if (!rgb) {
    return baseColor;
  }
  const [r, g, b] = rgb.map((hex) => Math.round(parseInt(hex, 16) * shade));
  return `rgb(${clamp(r, 0, 255)}, ${clamp(g, 0, 255)}, ${clamp(b, 0, 255)})`;
}

function drawWorld() {
  const camera = getCameraOffset();
  const startTileX = clamp(Math.floor(camera.x / TILE_SIZE) - VIEW_PADDING, 0, WORLD_SIZE - 1);
  const startTileY = clamp(Math.floor(camera.y / TILE_SIZE) - VIEW_PADDING, 0, WORLD_SIZE - 1);
  const endTileX = clamp(Math.ceil((camera.x + canvas.width) / TILE_SIZE) + VIEW_PADDING, 0, WORLD_SIZE - 1);
  const endTileY = clamp(Math.ceil((camera.y + canvas.height) / TILE_SIZE) + VIEW_PADDING, 0, WORLD_SIZE - 1);

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = '#0b1325';
  context.fillRect(0, 0, canvas.width, canvas.height);

  for (let y = startTileY; y <= endTileY; y += 1) {
    for (let x = startTileX; x <= endTileX; x += 1) {
      const blockId = getBlockAt(x, y);
      const block = blockById.get(blockId);
      const screenX = x * TILE_SIZE - camera.x;
      const screenY = y * TILE_SIZE - camera.y;

      if (blockId === 0) {
        context.fillStyle = '#0f172a';
        context.fillRect(screenX, screenY, TILE_SIZE, TILE_SIZE);
      } else {
        context.fillStyle = getTileShade(x, y, block.color);
        context.fillRect(screenX, screenY, TILE_SIZE, TILE_SIZE);
      }

      context.strokeStyle = 'rgba(148,163,184,0.08)';
      context.strokeRect(screenX + 0.5, screenY + 0.5, TILE_SIZE - 1, TILE_SIZE - 1);
    }
  }

  const target = getTargetTile();
  if (target) {
    const screenX = target.x * TILE_SIZE - camera.x;
    const screenY = target.y * TILE_SIZE - camera.y;
    context.strokeStyle = 'rgba(34,211,238,0.95)';
    context.lineWidth = 2;
    context.strokeRect(screenX + 1, screenY + 1, TILE_SIZE - 2, TILE_SIZE - 2);
  }

  const playerScreenX = state.player.x * TILE_SIZE - camera.x;
  const playerScreenY = state.player.y * TILE_SIZE - camera.y;
  const playerRadiusPx = PLAYER_RADIUS * TILE_SIZE;
  context.fillStyle = '#f8fafc';
  context.beginPath();
  context.arc(playerScreenX, playerScreenY, playerRadiusPx, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = '#0f172a';
  context.beginPath();
  context.arc(playerScreenX + 5, playerScreenY - 3, 3, 0, Math.PI * 2);
  context.fill();

  drawDayNightOverlay();
}

function drawDayNightOverlay() {
  const dayProgress = (state.timeSeconds % DAY_LENGTH_SECONDS) / DAY_LENGTH_SECONDS;
  const darkness = 0.42 + Math.cos(dayProgress * Math.PI * 2) * 0.28;
  const alpha = clamp(darkness, 0.08, 0.5);
  context.fillStyle = `rgba(2, 6, 23, ${alpha})`;
  context.fillRect(0, 0, canvas.width, canvas.height);
}

function formatGameTime() {
  const ratio = (state.timeSeconds % DAY_LENGTH_SECONDS) / DAY_LENGTH_SECONDS;
  const totalMinutes = Math.floor(ratio * 24 * 60);
  const hours = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
  const minutes = String(totalMinutes % 60).padStart(2, '0');
  return `${hours}:${minutes}`;
}

function renderHotbar() {
  hotbarElement.innerHTML = '';

  PLACEABLE_BLOCKS.forEach((blockId, slotIndex) => {
    const block = blockById.get(blockId);
    const slot = document.createElement('button');
    slot.type = 'button';
    slot.className = 'slot' + (slotIndex === state.selectedSlot ? ' active' : '');
    slot.innerHTML = `
      <div class="swatch" style="background:${block.color}"></div>
      <div>${slotIndex + 1}</div>
      <div>${block.name}</div>
    `;
    slot.addEventListener('click', () => {
      state.selectedSlot = slotIndex;
      renderHotbar();
      refreshStats();
    });
    hotbarElement.appendChild(slot);
  });
}

function refreshStats() {
  statPos.textContent = `X:${state.player.x.toFixed(1)} Y:${state.player.y.toFixed(1)}`;
  statSeed.textContent = String(state.seed);
  statTime.textContent = formatGameTime();
  statBlock.textContent = blockById.get(PLACEABLE_BLOCKS[state.selectedSlot]).name;
}

function update(deltaSeconds) {
  state.timeSeconds += deltaSeconds;
  movePlayer(deltaSeconds);
  updateInteractions(deltaSeconds);

  autosaveTimer += deltaSeconds * 1000;
  if (autosaveTimer >= SAVE_INTERVAL_MS) {
    autosaveTimer = 0;
    saveState(state);
  }
}

function tick(timestamp) {
  const deltaSeconds = clamp((timestamp - lastTimestamp) / 1000, 0, 0.05);
  lastTimestamp = timestamp;

  update(deltaSeconds);
  drawWorld();
  refreshStats();

  requestAnimationFrame(tick);
}

function updateMousePosition(event) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  state.mouse.x = (event.clientX - rect.left) * scaleX;
  state.mouse.y = (event.clientY - rect.top) * scaleY;
}

document.addEventListener('keydown', (event) => {
  if (event.code >= 'Digit1' && event.code <= 'Digit6') {
    const nextSlot = Number(event.code.replace('Digit', '')) - 1;
    state.selectedSlot = clamp(nextSlot, 0, PLACEABLE_BLOCKS.length - 1);
    renderHotbar();
    refreshStats();
    return;
  }

  inputState.keys.add(event.code);
});

document.addEventListener('keyup', (event) => {
  inputState.keys.delete(event.code);
});

canvas.addEventListener('mousemove', (event) => {
  updateMousePosition(event);
});

canvas.addEventListener('mousedown', (event) => {
  updateMousePosition(event);
  if (event.button === 0) {
    inputState.mouseDownLeft = true;
  }
  if (event.button === 2) {
    inputState.mouseDownRight = true;
  }
});

document.addEventListener('mouseup', (event) => {
  if (event.button === 0) {
    inputState.mouseDownLeft = false;
  }
  if (event.button === 2) {
    inputState.mouseDownRight = false;
  }
});

canvas.addEventListener('contextmenu', (event) => {
  event.preventDefault();
});

canvas.addEventListener('wheel', (event) => {
  const delta = Math.sign(event.deltaY);
  state.selectedSlot = (state.selectedSlot + delta + PLACEABLE_BLOCKS.length) % PLACEABLE_BLOCKS.length;
  renderHotbar();
  refreshStats();
  event.preventDefault();
}, { passive: false });

resetButton.addEventListener('click', () => {
  state = createInitialState();
  renderHotbar();
  saveState(state);
});

saveButton.addEventListener('click', () => {
  saveState(state);
});

window.addEventListener('beforeunload', () => {
  saveState(state);
});

renderHotbar();
refreshStats();
requestAnimationFrame((timestamp) => {
  lastTimestamp = timestamp;
  tick(timestamp);
});