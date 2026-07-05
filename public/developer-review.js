const reviewUsername = document.querySelector('[data-review-username]');
const reviewSummary = document.querySelector('[data-review-summary]');
const reviewNote = document.querySelector('[data-review-note]');
const refreshAllButton = document.querySelector('[data-refresh-all]');
const showPendingButton = document.querySelector('[data-show-pending]');
const tabs = Array.from(document.querySelectorAll('[data-tab-target]'));
const panels = Array.from(document.querySelectorAll('[data-review-panel]'));
const commandList = document.querySelector('[data-list-commands]');
const serverList = document.querySelector('[data-list-servers]');
const bugList = document.querySelector('[data-list-bugs]');
const countCommands = document.querySelector('[data-count-commands]');
const countServers = document.querySelector('[data-count-servers]');
const countBugs = document.querySelector('[data-count-bugs]');

let showOnlyPending = true;
let activeTab = 'commands';

function applyAppVersion(version) {
  document.querySelectorAll('[data-app-version]').forEach((element) => {
    element.textContent = `当前版本 ${version}`;
  });
}

function setSummary(text, isError = false) {
  if (!reviewSummary) {
    return;
  }

  reviewSummary.textContent = text;
  reviewSummary.style.color = isError ? '#fca5a5' : '';
}

function setNote(text, isError = false) {
  if (!reviewNote) {
    return;
  }

  reviewNote.textContent = text;
  reviewNote.style.color = isError ? '#fca5a5' : '';
}

function setTab(tabName) {
  activeTab = tabName;

  tabs.forEach((tab) => {
    tab.classList.toggle('active', tab.dataset.tabTarget === tabName);
  });

  panels.forEach((panel) => {
    panel.hidden = panel.dataset.reviewPanel !== tabName;
  });
}

function formatDate(value) {
  if (!value) {
    return '未知时间';
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('zh-CN');
}

function getStatusLabel(status) {
  const map = {
    PENDING: '待审核',
    APPROVED: '已通过',
    REJECTED: '已拒绝',
    OPEN: '待处理',
    TRIAGED: '已分流',
    FIXED: '已修复',
    CLOSED: '已关闭'
  };

  return map[String(status || '').toUpperCase()] || String(status || '未知');
}

function getReviewActions(type) {
  if (type === 'bugs') {
    return [
      { status: 'OPEN', label: '回退待审' },
      { status: 'TRIAGED', label: '标记处理中' },
      { status: 'FIXED', label: '已修复' },
      { status: 'CLOSED', label: '已关闭' }
    ];
  }

  return [
    { status: 'PENDING', label: '回退待审' },
    { status: 'APPROVED', label: '通过' },
    { status: 'REJECTED', label: '拒绝' }
  ];
}

function escapeHtml(text) {
  return String(text || '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[char]);
}

function renderReviewItems(container, items, type) {
  if (!container) {
    return;
  }

  if (!items.length) {
    container.innerHTML = '<p class="empty-state">当前没有可显示的数据</p>';
    return;
  }

  container.innerHTML = items.map((item) => {
    const title = type === 'bugs'
      ? item.title
      : type === 'servers'
        ? item.server_name
        : item.commandText;

    const subtitle = type === 'bugs'
      ? `${item.username} · ${item.category}`
      : type === 'servers'
        ? `${item.submitter_name} · ${item.game_edition || 'unknown'}`
        : `${item.submitterName} · ${item.category}`;

    const detail = type === 'bugs'
      ? item.description
      : type === 'servers'
        ? `${item.description || ''}\nIP: ${item.ip_address || ''}`
        : item.description || '';

    const id = item.id;
    const currentStatus = item.status;
    const noteValue = item.review_note || '';
    const reviewer = item.reviewer_name || item.reviewerName || '未填写';
    const reviewActions = getReviewActions(type);

    return `
      <article class="review-card">
        <div class="review-card-head">
          <div>
            <h3>${escapeHtml(title || '未命名条目')}</h3>
            <p>${escapeHtml(subtitle)}</p>
          </div>
          <div class="version-pill">${escapeHtml(getStatusLabel(currentStatus))}</div>
        </div>
        <p class="review-card-body">${escapeHtml(detail)}</p>
        <div class="review-card-meta">
          <span>编号：${id}</span>
          <span>提交时间：${escapeHtml(formatDate(item.createdAt || item.created_at))}</span>
          <span>审核员：${escapeHtml(reviewer)}</span>
        </div>
        <label class="field-label">审核备注</label>
        <textarea class="developer-editor review-note-input" rows="3" data-review-note-input="${type}:${id}" placeholder="填写审核备注，可留空">${escapeHtml(noteValue)}</textarea>
        <div class="button-row review-actions">
          ${reviewActions.map((action) => `
            <button type="button" class="ghost-button compact-button" data-review-action="${type}:${id}:${action.status}">${action.label}</button>
          `).join('')}
        </div>
      </article>
    `;
  }).join('');

  container.querySelectorAll('[data-review-action]').forEach((button) => {
    button.addEventListener('click', () => {
      const [typeName, idText, status] = button.dataset.reviewAction.split(':');
      updateReviewStatus(typeName, idText, status);
    });
  });
}

function getReviewNote(type, id) {
  const input = document.querySelector(`[data-review-note-input="${type}:${id}"]`);
  return input ? input.value.trim() : '';
}

async function fetchMe() {
  const response = await fetch('/api/me');

  if (!response.ok) {
    window.location.href = '/login.html';
    return null;
  }

  const me = await response.json();
  if (reviewUsername) {
    reviewUsername.textContent = me.isDeveloper ? `审核员：${me.username}` : `当前账号：${me.username}`;
  }
  if (me.version) {
    applyAppVersion(me.version);
  }
  if (!me.isDeveloper) {
    setSummary('当前账号没有开发者权限', true);
    setNote('请使用开发者账号登录后再进入审核中心。', true);
    if (refreshAllButton) {
      refreshAllButton.disabled = true;
    }
    if (showPendingButton) {
      showPendingButton.disabled = true;
    }
  }

  return me;
}

async function loadCommands() {
  const response = await fetch(`/api/command-community/review?status=${showOnlyPending ? 'PENDING' : 'ALL'}&limit=100`);
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || '命令投稿加载失败');
  }

  const items = result.items || [];
  renderReviewItems(commandList, items, 'commands');
  if (countCommands) {
    countCommands.textContent = `${items.length} 条`;
  }
  return items.length;
}

async function loadServers() {
  const response = await fetch('/api/developer/servers');
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || '服务器投稿加载失败');
  }

  const items = (result.servers || []).filter((item) => {
    return showOnlyPending ? String(item.status || '').toUpperCase() === 'PENDING' : true;
  });

  renderReviewItems(serverList, items, 'servers');
  if (countServers) {
    countServers.textContent = `${items.length} 条`;
  }
  return items.length;
}

async function loadBugs() {
  const response = await fetch(`/api/developer/bugs?status=${showOnlyPending ? 'OPEN' : ''}&limit=100`);
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || 'BUG 反馈加载失败');
  }

  const items = result.items || [];
  const filtered = showOnlyPending ? items.filter((item) => String(item.status || '').toUpperCase() === 'OPEN') : items;
  renderReviewItems(bugList, filtered, 'bugs');
  if (countBugs) {
    countBugs.textContent = `${filtered.length} 条`;
  }
  return filtered.length;
}

async function loadAll() {
  setSummary('正在刷新审核队列...');
  setNote('请稍候，正在同步命令、服务器和 BUG 反馈。');

  try {
    const [commandsCount, serversCount, bugsCount] = await Promise.all([
      loadCommands(),
      loadServers(),
      loadBugs()
    ]);

    setSummary(`已加载：命令 ${commandsCount} 条，服务器 ${serversCount} 条，BUG ${bugsCount} 条`);
    setNote(showOnlyPending ? '当前显示待审核内容。' : '当前显示全部记录。');
  } catch (error) {
    setSummary(error.message || '刷新失败', true);
    setNote('请确认当前账号具备开发者权限。', true);
  }
}

async function updateReviewStatus(type, idText, status) {
  const id = Number(idText);
  const reviewNoteValue = getReviewNote(type, idText);

  if (!Number.isInteger(id) || id <= 0) {
    setSummary('审核编号无效', true);
    return;
  }

  try {
    let endpoint = '';
    let payload = { id, status, reviewNote: reviewNoteValue };

    if (type === 'commands') {
      endpoint = '/api/command-community/review';
    } else if (type === 'servers') {
      endpoint = '/api/developer/servers/status';
      payload = { id, status };
    } else if (type === 'bugs') {
      endpoint = '/api/developer/bugs/status';
      payload = { id, status };
    } else {
      throw new Error('未知审核类型');
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || '更新失败');
    }

    setSummary(`编号 ${id} 已更新为 ${getStatusLabel(status)}`);
    await loadAll();
  } catch (error) {
    setSummary(error.message || '更新失败', true);
  }
}

if (tabs.length) {
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      setTab(tab.dataset.tabTarget || 'commands');
    });
  });
}

if (refreshAllButton) {
  refreshAllButton.addEventListener('click', () => {
    loadAll();
  });
}

if (showPendingButton) {
  showPendingButton.addEventListener('click', () => {
    showOnlyPending = !showOnlyPending;
    showPendingButton.textContent = showOnlyPending ? '只看待审' : '显示全部';
    loadAll();
  });
}

fetchMe().then((me) => {
  if (me && me.isDeveloper) {
    loadAll();
  }
});
