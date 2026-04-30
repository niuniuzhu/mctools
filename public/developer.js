const fileList = document.querySelector('[data-file-list]');
const codeEditor = document.querySelector('[data-code-editor]');
const currentFile = document.querySelector('[data-current-file]');
const editorStatus = document.querySelector('[data-editor-status]');
const saveFileButton = document.querySelector('[data-save-file]');
const refreshButton = document.querySelector('[data-developer-refresh]');
const logoutButton = document.querySelector('[data-developer-logout]');
const usernameLabel = document.querySelector('[data-developer-username]');
const openIndexButton = document.querySelector('[data-open-index]');
const versionInput = document.querySelector('[data-version-input]');
const versionStatus = document.querySelector('[data-version-status]');
const loadVersionButton = document.querySelector('[data-load-version]');
const saveVersionButton = document.querySelector('[data-save-version]');
const accessNote = document.querySelector('[data-developer-access-note]');

let currentFilePath = '';
let currentFiles = [];

function setDeveloperControlsEnabled(enabled) {
  [
    versionInput,
    loadVersionButton,
    saveVersionButton,
    refreshButton,
    saveFileButton,
    codeEditor
  ].forEach((element) => {
    if (!element) {
      return;
    }

    element.disabled = !enabled;
  });
}

function renderDeveloperLockedState(me) {
  if (usernameLabel) {
    usernameLabel.textContent = `当前账号：${me.username} · 无开发者权限`;
  }

  if (accessNote) {
    accessNote.textContent = '当前账号不是开发者账号，因此只能查看说明，不能读取或修改版本号与项目文件。需要开发者账号时，请回到登录页使用开发者账号注册模式。';
  }

  if (currentFile) {
    currentFile.textContent = '当前账号没有开发者权限';
  }

  if (fileList) {
    fileList.innerHTML = '<p class="empty-state compact">当前账号没有开发者权限，无法查看文件列表。</p>';
  }

  if (codeEditor) {
    codeEditor.value = '当前账号没有开发者权限。请返回登录页，使用开发者账号注册模式创建开发者账号后再进入本页。';
  }

  setDeveloperControlsEnabled(false);
  setVersionStatus('需要开发者账号才可读取或修改版本号', true);
  setStatus('需要开发者账号才可查看和保存文件', true);
}

function applyAppVersion(version) {
  document.querySelectorAll('[data-app-version]').forEach((element) => {
    element.textContent = `当前版本 ${version}`;
  });
}

function setVersionStatus(text, isError = false) {
  if (!versionStatus) {
    return;
  }

  versionStatus.textContent = text;
  versionStatus.style.color = isError ? '#fca5a5' : '';
}

function setStatus(text, isError = false) {
  if (!editorStatus) {
    return;
  }

  editorStatus.textContent = text;
  editorStatus.style.color = isError ? '#fca5a5' : '';
}

function setActiveFileButton(pathname) {
  document.querySelectorAll('[data-file-button]').forEach((button) => {
    button.classList.toggle('active', button.dataset.fileButton === pathname);
  });
}

function renderFileList(items) {
  currentFiles = items;

  if (!fileList) {
    return;
  }

  if (!items.length) {
    fileList.innerHTML = '<p class="empty-state compact">当前没有可编辑文件</p>';
    return;
  }

  fileList.innerHTML = items.map((item) => `
    <button type="button" class="ghost-button compact-button developer-file-button" data-file-button="${item}">${item}</button>
  `).join('');

  fileList.querySelectorAll('[data-file-button]').forEach((button) => {
    button.addEventListener('click', () => {
      loadFile(button.dataset.fileButton || '');
    });
  });

  if (currentFilePath && items.includes(currentFilePath)) {
    setActiveFileButton(currentFilePath);
  }
}

async function fetchMe() {
  const response = await fetch('/api/me');

  if (!response.ok) {
    window.location.href = '/login.html';
    return null;
  }

  const me = await response.json();

  if (usernameLabel) {
    usernameLabel.textContent = me.isDeveloper
      ? `当前账号：${me.username} · 开发者`
      : `当前账号：${me.username}`;
  }

  if (me.version) {
    applyAppVersion(me.version);
  }

  if (!me.isDeveloper) {
    renderDeveloperLockedState(me);
  }

  return me;
}

async function loadVersion() {
  setVersionStatus('正在读取版本号...');

  try {
    const response = await fetch('/api/developer/version');
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || '版本号读取失败');
    }

    if (versionInput) {
      versionInput.value = result.version || '';
    }

    if (result.version) {
      applyAppVersion(result.version);
    }

    setVersionStatus(`当前版本：${result.version || '未设置'}`);
  } catch (error) {
    setVersionStatus(error.message || '版本号读取失败', true);
  }
}

async function saveVersion() {
  if (!versionInput) {
    return;
  }

  const nextVersion = versionInput.value.trim();

  if (!nextVersion) {
    setVersionStatus('请输入版本号', true);
    return;
  }

  if (saveVersionButton) {
    saveVersionButton.disabled = true;
  }

  setVersionStatus('正在保存版本号...');

  try {
    const response = await fetch('/api/developer/version', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ version: nextVersion })
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || '版本号保存失败');
    }

    if (result.version) {
      versionInput.value = result.version;
      applyAppVersion(result.version);
    }

    setVersionStatus(`版本号已更新为 ${result.version}`);
  } catch (error) {
    setVersionStatus(error.message || '版本号保存失败', true);
  } finally {
    if (saveVersionButton) {
      saveVersionButton.disabled = false;
    }
  }
}

async function loadFiles() {
  setStatus('正在加载文件列表...');

  try {
    const response = await fetch('/api/developer/files');
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || '文件列表加载失败');
    }

    renderFileList(result.items || []);
    setStatus('文件列表已更新');
  } catch (error) {
    renderFileList([]);
    setStatus(error.message || '文件列表加载失败', true);
  }
}

async function loadFile(pathname) {
  if (!pathname) {
    return;
  }

  currentFilePath = pathname;
  setActiveFileButton(pathname);

  if (currentFile) {
    currentFile.textContent = pathname;
  }

  if (codeEditor) {
    codeEditor.disabled = true;
    codeEditor.value = '正在读取文件...';
  }

  if (saveFileButton) {
    saveFileButton.disabled = true;
  }

  try {
    const response = await fetch(`/api/developer/file?path=${encodeURIComponent(pathname)}`);
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || '读取文件失败');
    }

    if (codeEditor) {
      codeEditor.value = result.content || '';
      codeEditor.disabled = false;
    }

    if (saveFileButton) {
      saveFileButton.disabled = false;
    }

    setStatus(`文件已加载：${pathname}`);
  } catch (error) {
    if (codeEditor) {
      codeEditor.value = '';
      codeEditor.disabled = true;
    }

    if (saveFileButton) {
      saveFileButton.disabled = true;
    }

    setStatus(error.message || '读取文件失败', true);
  }
}

async function saveCurrentFile() {
  if (!currentFilePath || !codeEditor) {
    return;
  }

  if (saveFileButton) {
    saveFileButton.disabled = true;
  }

  setStatus(`正在保存：${currentFilePath}`);

  try {
    const response = await fetch('/api/developer/file', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: currentFilePath,
        content: codeEditor.value
      })
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || '保存失败');
    }

    setStatus(`保存成功：${currentFilePath}`);
  } catch (error) {
    setStatus(error.message || '保存失败', true);
  } finally {
    if (saveFileButton) {
      saveFileButton.disabled = false;
    }
  }
}

async function logout() {
  try {
    await fetch('/api/logout', { method: 'POST' });
  } finally {
    window.location.href = '/login.html';
  }
}

if (saveFileButton) {
  saveFileButton.addEventListener('click', saveCurrentFile);
}

if (refreshButton) {
  refreshButton.addEventListener('click', loadFiles);
}

if (logoutButton) {
  logoutButton.addEventListener('click', logout);
}

if (openIndexButton) {
  openIndexButton.addEventListener('click', () => {
    window.location.href = '/index.html';
  });
}

if (loadVersionButton) {
  loadVersionButton.addEventListener('click', loadVersion);
}

if (saveVersionButton) {
  saveVersionButton.addEventListener('click', saveVersion);
}

fetchMe().then((me) => {
  if (!me) {
    return;
  }

  if (!me.isDeveloper) {
    return;
  }

  loadVersion();
  loadFiles();
});