const dailyRecommendationModules = [
  {
    key: 'commands',
    label: '指令工作台',
    href: '/commands.html',
    note: '适合想立刻解决 execute、计分板、NBT 或快速复制常用命令的时候。'
  },
  {
    key: 'tutorial',
    label: '通关教程',
    href: '/tutorial.html',
    note: '适合今天想按阶段推进，从开荒一路规划到下界与末地的时候。'
  },
  {
    key: 'fun',
    label: '趣味实验室',
    href: '/fun.html',
    note: '适合今天偏整活，想抽挑战、抽主题、和朋友一起玩随机任务的时候。'
  },
  {
    key: 'coordinates',
    label: '坐标工具',
    href: '/coordinates.html',
    note: '适合今天要跑图、找路、区块定位，或者准备做下界联动的时候。'
  },
  {
    key: 'automation',
    label: '自动化机器教程',
    href: '/automation-guide.html',
    note: '适合今天把生存从手工模式切到半自动模式，先搭一个稳定生产线。'
  },
  {
    key: 'downloads',
    label: '光影下载中心',
    href: '/shader-download.html',
    note: '适合今天想先把世界观感调顺眼，再开工探索或拍图的时候。'
  },
  {
    key: 'settings',
    label: '设置',
    href: '/settings.html',
    note: '适合今天先检查账号状态、会员情况、显示模式和其他集中设置。'
  },
  {
    key: 'cloud',
    label: '云玩中心',
    href: '/cloud-play.html',
    note: '适合今天先评估云玩方案、延迟等级和预算，再决定怎么玩。'
  },
  {
    key: 'fpsTest',
    label: '帧率测试',
    href: '/fps-test.html',
    note: '适合今天先看页面是否流畅、设备是否稳，再决定要不要继续压功能和动画。'
  },
  {
    key: 'pageDetection',
    label: '我的世界页面检测',
    href: '/page-detection.html',
    note: '适合今天需要快速判断网页内容是否真和 Minecraft 相关，或者整理资料入口。'
  }
];

const dailyRecommendationReasons = [
  '今天的组合偏“先规划，再开工”。',
  '今天适合一边做正事，一边留一点整活空间。',
  '今天这套路线很适合联机前的热身。',
  '如果你不知道先点哪个，这一组基本不会踩空。',
  '这套顺序比较适合先定目标，再补效率工具。'
];

const dailyRecommendationRoutes = [
  '先看目标，再补工具，最后整活收尾。',
  '先把路线定下来，再处理操作细节。',
  '先搞生产力，再给今天加一点随机事件。',
  '先让世界变顺手，再开始今天的主线。',
  '先做最刚需的一件事，再给自己留点灵感空间。'
];

const dailyBroadcastTitles = [
  '主世界晨报',
  '今日服务器播报',
  '工具箱今日简报',
  '开局前线消息',
  '像素世界晨间电台'
];

const dailyBroadcastHeadlines = [
  '今日适合先跑图，再开工。',
  '今日更适合做规划，不适合盲目下矿。',
  '今天的节奏偏轻快，适合先做一件小而完整的事。',
  '今天适合边推进边整活，不适合让背包一直爆满。',
  '今天更适合修整理线，而不是同时开太多坑。'
];

const dailyBroadcastNotes = [
  '如果你今天只做一件事，建议把落脚点和物资线先稳住。',
  '如果朋友上线，优先挑一个所有人都能立刻参与的小目标。',
  '如果你最近一直在跑主线，今天可以留一点时间给装饰和氛围。',
  '如果你想提高效率，今天别忘了先整理热键和常用工具入口。',
  '如果今天打算联机，先把任务目标说清楚会少很多来回折返。'
];

const dailyBroadcastTags = ['跑图日', '整理日', '建造日', '轻整活日', '推进日', '补给日'];
const dailyBroadcastDos = ['宜先跑图定方向', '宜整理热键与背包', '宜给基地补一轮物资', '宜完成一个小目标再扩张', '宜把今天的主线说清楚'];
const dailyBroadcastDonts = ['忌空手直冲下矿', '忌同时开太多工程', '忌背包爆满还硬撑', '忌联机时各干各的', '忌没准备就开危险副本'];
const dailyBroadcastWeather = ['主世界晴', '主线顺风', '灵感微风', '背包偏满预警', '建造手感在线'];
const dailyBroadcastWindows = ['上午适合规划，晚上适合执行。', '前半天适合补给，后半天适合推进。', '开局 30 分钟适合整理，后面适合重活。', '适合先热身，再处理今天的关键模块。'];
const workbenchDefaultKeys = ['commands', 'tutorial', 'fun', 'settings'];
const homePreferenceDefaults = {
  showDaily: true,
  showBroadcast: true,
  showPreviewRail: true
};

let activeWorkbenchDragKey = '';

function hashTodaySeed() {
  const today = new Date();
  const seedText = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
  return Array.from(seedText).reduce((total, char) => total + char.charCodeAt(0), 0);
}

function pickDailyItems(items, seed, count) {
  const pool = [...items];
  const selected = [];

  for (let index = 0; index < count && pool.length; index += 1) {
    const cursor = (seed + index * 7) % pool.length;
    selected.push(pool.splice(cursor, 1)[0]);
  }

  return selected;
}

function getWorkbenchModules() {
  return dailyRecommendationModules;
}

function getWorkbenchItems() {
  if (typeof readScopedStorage !== 'function') {
    return workbenchDefaultKeys;
  }

  const stored = readScopedStorage('home-workbench', null);

  if (stored === null) {
    return workbenchDefaultKeys;
  }

  if (!Array.isArray(stored)) {
    return workbenchDefaultKeys;
  }

  const available = new Set(getWorkbenchModules().map((item) => item.key));
  return stored.filter((item) => available.has(item)).slice(0, 4);
}

function setWorkbenchItems(items) {
  if (typeof writeScopedStorage !== 'function') {
    return;
  }

  writeScopedStorage('home-workbench', items.slice(0, 4));
}

function getHomePreferences() {
  if (typeof readScopedStorage !== 'function') {
    return { ...homePreferenceDefaults };
  }

  const stored = readScopedStorage('home-preferences', homePreferenceDefaults);

  if (!stored || typeof stored !== 'object' || Array.isArray(stored)) {
    return { ...homePreferenceDefaults };
  }

  return {
    showDaily: stored.showDaily !== false,
    showBroadcast: stored.showBroadcast !== false,
    showPreviewRail: stored.showPreviewRail !== false
  };
}

function setHomePreferences(value) {
  if (typeof writeScopedStorage !== 'function') {
    return;
  }

  writeScopedStorage('home-preferences', value);
}

function applyHomeSectionVisibility() {
  const preferences = getHomePreferences();
  const dailyPanel = document.querySelector('.home-daily-panel');
  const broadcastPanel = document.querySelector('.home-broadcast-panel');
  const previewRail = document.querySelector('.home-preview-rail');

  if (dailyPanel) {
    dailyPanel.hidden = !preferences.showDaily;
  }

  if (broadcastPanel) {
    broadcastPanel.hidden = !preferences.showBroadcast;
  }

  if (previewRail) {
    previewRail.hidden = !preferences.showPreviewRail;
  }
}

function renderHomeDailyRecommendations() {
  const host = document.querySelector('[data-home-daily-grid]');

  if (!host) {
    return;
  }

  const seed = hashTodaySeed();
  const picks = pickDailyItems(dailyRecommendationModules, seed, 3);
  const route = dailyRecommendationRoutes[seed % dailyRecommendationRoutes.length];
  const reason = dailyRecommendationReasons[seed % dailyRecommendationReasons.length];

  host.innerHTML = picks.map((item, index) => `
    <article class="guide-card utility-card home-daily-card">
      <p class="panel-label">推荐 ${index + 1}</p>
      <h2>${item.label}</h2>
      <p>${item.note}</p>
      <div class="result-card compact-result">${index === 0 ? route : reason}</div>
      <a class="ghost-link-button" href="${item.href}">进入 ${item.label}</a>
    </article>
  `).join('');
}

function buildDailyBroadcastMarkup() {
  const seed = hashTodaySeed();
  const title = dailyBroadcastTitles[seed % dailyBroadcastTitles.length];
  const headline = dailyBroadcastHeadlines[seed % dailyBroadcastHeadlines.length];
  const note = dailyBroadcastNotes[(seed + 2) % dailyBroadcastNotes.length];
  const tagA = dailyBroadcastTags[seed % dailyBroadcastTags.length];
  const tagB = dailyBroadcastTags[(seed + 3) % dailyBroadcastTags.length];
  const todayDo = dailyBroadcastDos[seed % dailyBroadcastDos.length];
  const todayDont = dailyBroadcastDonts[(seed + 1) % dailyBroadcastDonts.length];
  const weather = dailyBroadcastWeather[(seed + 2) % dailyBroadcastWeather.length];
  const timing = dailyBroadcastWindows[(seed + 3) % dailyBroadcastWindows.length];

  return `
    <article class="guide-card utility-card home-broadcast-card">
      <p class="panel-label">${title}</p>
      <h2>${headline}</h2>
      <div class="result-card">${note}</div>
      <div class="home-broadcast-insights">
        <div class="account-pill home-broadcast-pill do">${todayDo}</div>
        <div class="account-pill home-broadcast-pill dont">${todayDont}</div>
      </div>
      <div class="fun-pack-list">
        <div class="history-tag fun-pack-item">今日标签：${tagA}</div>
        <div class="history-tag fun-pack-item">推荐节奏：${tagB}</div>
      </div>
      <div class="home-broadcast-footnotes">
        <div class="guide-card compact-guide-card">
          <p class="panel-label">环境</p>
          <strong>${weather}</strong>
        </div>
        <div class="guide-card compact-guide-card">
          <p class="panel-label">节奏窗口</p>
          <strong>${timing}</strong>
        </div>
      </div>
    </article>
  `;
}

function renderDailyBroadcast(selector) {
  const host = document.querySelector(selector);

  if (!host) {
    return;
  }

  host.innerHTML = buildDailyBroadcastMarkup();
}

function renderWorkbenchStatus(selector, text) {
  const note = document.querySelector(selector);

  if (note) {
    note.textContent = text;
  }
}

function reorderWorkbenchItems(sourceKey, targetKey) {
  if (!sourceKey || !targetKey || sourceKey === targetKey) {
    return;
  }

  const current = getWorkbenchItems();
  const sourceIndex = current.indexOf(sourceKey);
  const targetIndex = current.indexOf(targetKey);

  if (sourceIndex === -1 || targetIndex === -1) {
    return;
  }

  const next = [...current];
  const [moved] = next.splice(sourceIndex, 1);
  next.splice(targetIndex, 0, moved);
  setWorkbenchItems(next);
}

function syncModuleQuickActions() {
  const selectedKeys = getWorkbenchItems();
  const availableKeys = new Set(getWorkbenchModules().map((item) => item.key));

  document.querySelectorAll('[data-home-module-card]').forEach((card) => {
    const key = card.getAttribute('data-home-module-key') || '';
    const label = card.getAttribute('data-home-module-label') || '当前模块';
    const actionHost = card.querySelector('[data-home-module-actions]');

    if (!actionHost || !availableKeys.has(key)) {
      return;
    }

    const isActive = selectedKeys.includes(key);
    actionHost.innerHTML = `<button type="button" class="ghost-button compact-button home-module-quick-pin${isActive ? ' active' : ''}" data-home-module-pin="${key}">${isActive ? '已固定到工作台' : `固定 ${label}`}</button>`;

    actionHost.querySelector('[data-home-module-pin]')?.addEventListener('click', () => {
      const current = getWorkbenchItems();

      if (current.includes(key)) {
        setWorkbenchItems(current.filter((item) => item !== key));
        renderHomeWorkbench();
        return;
      }

      if (current.length >= 4) {
        renderHomeWorkbench();
        return;
      }

      setWorkbenchItems([...current, key]);
      renderHomeWorkbench();
    });
  });
}

function attachWorkbenchDragHandlers(grid, statusSelector, rerender) {
  grid.querySelectorAll('[data-home-workbench-card]').forEach((card) => {
    card.addEventListener('dragstart', () => {
      activeWorkbenchDragKey = card.getAttribute('data-home-workbench-key') || '';
      card.classList.add('dragging');
    });

    card.addEventListener('dragend', () => {
      activeWorkbenchDragKey = '';
      grid.querySelectorAll('[data-home-workbench-card]').forEach((item) => item.classList.remove('dragging', 'drag-target'));
    });

    card.addEventListener('dragover', (event) => {
      event.preventDefault();
      if (activeWorkbenchDragKey && activeWorkbenchDragKey !== card.getAttribute('data-home-workbench-key')) {
        card.classList.add('drag-target');
      }
    });

    card.addEventListener('dragleave', () => {
      card.classList.remove('drag-target');
    });

    card.addEventListener('drop', (event) => {
      event.preventDefault();
      const targetKey = card.getAttribute('data-home-workbench-key') || '';
      reorderWorkbenchItems(activeWorkbenchDragKey, targetKey);
      renderWorkbenchStatus(statusSelector, '已更新个人工作台顺序。');
      rerender();
    });
  });
}

function renderWorkbenchGrid(selector, statusSelector, options = {}) {
  const { allowDrag = true, statusText } = options;
  const grid = document.querySelector(selector);

  if (!grid) {
    return;
  }

  const modules = getWorkbenchModules();
  const selectedKeys = getWorkbenchItems();
  const selected = selectedKeys
    .map((key) => modules.find((item) => item.key === key))
    .filter(Boolean);

  if (!selected.length) {
    grid.innerHTML = `
      <article class="guide-card utility-card home-workbench-card">
        <p class="panel-label">工作台已清空</p>
        <h2>还没有固定模块</h2>
        <p>从下面挑一个常用入口固定到首页，下次进站会直接保留。</p>
      </article>
    `;
  } else {
    grid.innerHTML = selected.map((item, index) => `
      <article class="guide-card utility-card home-workbench-card"${allowDrag ? ' draggable="true" data-home-workbench-card' : ''} data-home-workbench-key="${item.key}">
        <div class="home-workbench-card-topline">
          <p class="panel-label">固定 ${index + 1}</p>
          ${allowDrag ? `<button type="button" class="ghost-button compact-button home-workbench-drag-handle" data-home-workbench-drag="${item.key}">拖拽排序</button>` : ''}
        </div>
        <h2>${item.label}</h2>
        <p>${item.note}</p>
        <a class="ghost-link-button" href="${item.href}">打开 ${item.label}</a>
      </article>
    `).join('');
  }

  renderWorkbenchStatus(statusSelector, statusText || `当前账号可固定 4 个常用模块，已固定 ${selected.length} 个。可直接拖拽上方卡片调整顺序。`);

  return { grid, modules, selectedKeys, selected };
}

function attachWorkbenchControls(selector, statusSelector, rerender) {
  const controls = document.querySelector(selector);

  if (!controls) {
    return;
  }

  const modules = getWorkbenchModules();
  const selectedKeys = getWorkbenchItems();

  controls.innerHTML = modules.map((item) => {
    const isActive = selectedKeys.includes(item.key);
    return `<button type="button" class="ghost-button compact-button home-workbench-toggle${isActive ? ' active' : ''}" data-home-workbench-toggle="${item.key}">${isActive ? '已固定' : '固定'} ${item.label}</button>`;
  }).join('');

  controls.querySelectorAll('[data-home-workbench-toggle]').forEach((button) => {
    button.addEventListener('click', () => {
      const key = button.getAttribute('data-home-workbench-toggle') || '';
      const current = getWorkbenchItems();

      if (current.includes(key)) {
        setWorkbenchItems(current.filter((item) => item !== key));
        renderWorkbenchStatus(statusSelector, '已从个人工作台移除一个模块。');
        rerender();
        return;
      }

      if (current.length >= 4) {
        renderWorkbenchStatus(statusSelector, '个人工作台最多固定 4 个模块，请先取消一个再添加。');
        return;
      }

      setWorkbenchItems([...current, key]);
      renderWorkbenchStatus(statusSelector, '已加入个人工作台。');
      rerender();
    });
  });
}

function renderHomeWorkbench() {
  const result = renderWorkbenchGrid('[data-home-workbench-grid]', '[data-home-workbench-note]', {
    allowDrag: false,
    statusText: `当前账号可固定 4 个常用模块，已固定 ${getWorkbenchItems().length} 个。首页保留展示和快捷固定。`
  });
  const controls = document.querySelector('[data-home-workbench-controls]');

  if (!result || !controls) {
    syncModuleQuickActions();
    return;
  }

  controls.innerHTML = `
    <a class="ghost-link-button" href="/settings.html">去设置里管理固定模块</a>
    <p class="tool-card-note home-workbench-helper">首页保留展示和快捷固定，完整管理已收进设置页。</p>
  `;

  syncModuleQuickActions();
}

function renderSettingsWorkbench() {
  const result = renderWorkbenchGrid('[data-settings-workbench-grid]', '[data-settings-workbench-note]', {
    allowDrag: true
  });

  if (!result) {
    return;
  }

  attachWorkbenchControls('[data-settings-workbench-controls]', '[data-settings-workbench-note]', renderSettingsWorkbench);
  attachWorkbenchDragHandlers(result.grid, '[data-settings-workbench-note]', renderSettingsWorkbench);
}

function renderSettingsDailyBroadcast() {
  renderDailyBroadcast('[data-settings-broadcast-grid]');
}

function renderSettingsHomePreferences() {
  const host = document.querySelector('[data-settings-home-preferences]');
  const note = document.querySelector('[data-settings-home-panel-note]');

  if (!host) {
    return;
  }

  const preferences = getHomePreferences();
  const dailyButton = host.querySelector('[data-home-pref-toggle="daily"]');
  const broadcastButton = host.querySelector('[data-home-pref-toggle="broadcast"]');
  const previewRailButton = host.querySelector('[data-home-pref-toggle="previewRail"]');
  const resetButton = host.querySelector('[data-home-workbench-reset]');

  if (dailyButton) {
    dailyButton.textContent = preferences.showDaily ? '今日推荐显示中' : '今日推荐已隐藏';
    dailyButton.classList.toggle('active', preferences.showDaily);
    dailyButton.onclick = () => {
      setHomePreferences({ ...getHomePreferences(), showDaily: !getHomePreferences().showDaily });
      applyHomeSectionVisibility();
      renderSettingsHomePreferences();
    };
  }

  if (broadcastButton) {
    broadcastButton.textContent = preferences.showBroadcast ? '每日播报显示中' : '每日播报已隐藏';
    broadcastButton.classList.toggle('active', preferences.showBroadcast);
    broadcastButton.onclick = () => {
      setHomePreferences({ ...getHomePreferences(), showBroadcast: !getHomePreferences().showBroadcast });
      applyHomeSectionVisibility();
      renderSettingsHomePreferences();
    };
  }

  if (previewRailButton) {
    previewRailButton.textContent = preferences.showPreviewRail ? '横向预览显示中' : '横向预览已隐藏';
    previewRailButton.classList.toggle('active', preferences.showPreviewRail);
    previewRailButton.onclick = () => {
      setHomePreferences({ ...getHomePreferences(), showPreviewRail: !getHomePreferences().showPreviewRail });
      applyHomeSectionVisibility();
      renderSettingsHomePreferences();
    };
  }

  if (resetButton) {
    resetButton.onclick = () => {
      setWorkbenchItems(workbenchDefaultKeys);
      renderWorkbenchStatus('[data-settings-workbench-note]', '已恢复默认工作台。');
      renderSettingsWorkbench();
      renderHomeWorkbench();
    };
  }

  if (note) {
    note.textContent = `首页当前显示：${preferences.showDaily ? '今日推荐' : '隐藏今日推荐'} / ${preferences.showBroadcast ? '每日播报' : '隐藏每日播报'} / ${preferences.showPreviewRail ? '横向预览' : '隐藏横向预览'}。`;
  }
}

window.addEventListener('mctools:me-loaded', () => {
  applyHomeSectionVisibility();
  renderHomeWorkbench();
  renderSettingsWorkbench();
  renderSettingsHomePreferences();
});

renderHomeDailyRecommendations();
renderDailyBroadcast('[data-home-broadcast-grid]');
renderSettingsDailyBroadcast();
applyHomeSectionVisibility();
renderHomeWorkbench();
renderSettingsWorkbench();
renderSettingsHomePreferences();