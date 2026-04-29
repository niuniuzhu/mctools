const tabButtons = document.querySelectorAll('[data-tab]');
const forms = document.querySelectorAll('[data-form]');
const message = document.querySelector('[data-message]');
const registerTabButton = document.querySelector('[data-tab="register"]');
const registerForm = document.querySelector('[data-form="register"]');
const maintenanceTitle = document.querySelector('[data-maintenance-title]');
const maintenanceUnlock = document.querySelector('[data-maintenance-unlock]');
const developerEntryButton = document.querySelector('[data-developer-entry]');
const developerRegisterPanel = document.querySelector('[data-developer-register]');
const developerExitButton = document.querySelector('[data-developer-exit]');
const developerFlagInput = document.querySelector('[data-developer-flag]');
const developerSecretInput = document.querySelector('[data-developer-secret]');
const tabStatus = document.querySelector('[data-tab-status]');
const tabStatusTag = document.querySelector('[data-tab-status-tag]');
const tabStatusTitle = document.querySelector('[data-tab-status-title]');
const tabStatusNote = document.querySelector('[data-tab-status-note]');
const criticalAlert = document.querySelector('[data-critical-alert]');
const maintenanceUnlockStorageKey = 'mctools-maintenance-register-unlocked';
const maintenanceUnlockClickTarget = 10;
const maintenanceUnlockWindowMs = 1800;
const blockedDeploymentUrl = 'http://115.29.198.193:3000/login.html';

let specialRegisterMode = 'normal';
let maintenanceTitleClickCount = 0;
let maintenanceUnlockResetTimer = null;

function isBlockedDeployment() {
  return window.location.href === blockedDeploymentUrl;
}

function applyAppVersion(version) {
  document.querySelectorAll('[data-app-version]').forEach((element) => {
    element.textContent = `当前版本 ${version}`;
  });
}

function isSpecialRegisterMode() {
  return specialRegisterMode !== 'normal';
}

function isMaintenanceUnlockStored() {
  try {
    return sessionStorage.getItem(maintenanceUnlockStorageKey) === '1';
  } catch {
    return false;
  }
}

function storeMaintenanceUnlock() {
  try {
    sessionStorage.setItem(maintenanceUnlockStorageKey, '1');
  } catch {
    // Ignore storage write failure.
  }
}

function setMaintenanceUnlockVisible(isVisible) {
  if (!maintenanceUnlock) {
    return;
  }

  maintenanceUnlock.classList.toggle('hidden', !isVisible);
}

function refreshRegisterAvailability() {
  if (isBlockedDeployment()) {
    tabButtons.forEach((button) => {
      button.disabled = true;
    });

    forms.forEach((form) => {
      form.querySelectorAll('input, button').forEach((element) => {
        element.disabled = true;
      });
    });

    return;
  }

  tabButtons.forEach((button) => {
    button.disabled = false;
  });

  if (registerTabButton) {
    registerTabButton.disabled = false;
  }

  if (!registerForm) {
    return;
  }

  registerForm.querySelectorAll('input, button').forEach((element) => {
    if (specialRegisterMode === 'developer' && element === developerSecretInput) {
      element.disabled = false;
      return;
    }

    if (specialRegisterMode === 'developer' && element === developerExitButton) {
      element.disabled = false;
      return;
    }

    element.disabled = false;
  });
}

function setSpecialRegisterMode(mode) {
  specialRegisterMode = mode;

  if (developerRegisterPanel) {
    developerRegisterPanel.classList.toggle('hidden', mode !== 'developer');
  }

  if (developerFlagInput) {
    developerFlagInput.value = mode === 'developer' ? '1' : '0';
  }

  if (developerSecretInput) {
    developerSecretInput.required = mode === 'developer';

    if (mode !== 'developer') {
      developerSecretInput.value = '';
    }
  }

  refreshRegisterAvailability();

  if (mode !== 'normal') {
    switchTab('register');
    setMessage('已进入开发者账号注册模式');
  }
}

function setMessage(text, isError = false) {
  if (!message) {
    return;
  }

  message.textContent = text;
  message.style.color = isError ? '#fca5a5' : '#7dd3fc';
}

function updateTabStatus(tabName) {
  if (!tabStatus || !tabStatusTag || !tabStatusTitle || !tabStatusNote) {
    return;
  }

  if (isBlockedDeployment()) {
    tabStatus.classList.remove('register-mode');
    tabStatus.classList.add('outage-mode');
    tabStatusTag.textContent = '故障版本';
    tabStatusTitle.textContent = '该网站存在严重问题';
    tabStatusNote.textContent = '请耐心等待新版本推送与修复，当前入口的登录与注册功能已临时关闭。';
    return;
  }

  const isRegister = tabName === 'register';
  tabStatus.classList.remove('outage-mode');
  tabStatus.classList.toggle('register-mode', isRegister);
  tabStatusTag.textContent = isRegister ? '创建账号' : '当前模式';
  tabStatusTitle.textContent = isRegister ? '注册并建立新存档入口' : '登录工具箱';
  tabStatusNote.textContent = isRegister
    ? '创建账号后会直接进入工具箱；如果已解锁开发者入口，也可以从这里切换开发者注册模式。'
    : '输入账号和密码后直接进入首页。';
}

function switchTab(tabName) {
  tabButtons.forEach((button) => {
    button.classList.toggle('active', button.dataset.tab === tabName);
  });

  forms.forEach((form) => {
    form.classList.toggle('hidden', form.dataset.form !== tabName);
  });

  updateTabStatus(tabName);
  setMessage('');
}

async function submitForm(event) {
  event.preventDefault();

  if (isBlockedDeployment()) {
    setMessage('该网站存在严重问题，请耐心等待新版本推送与修复', true);
    return;
  }

  const form = event.currentTarget;
  const tabName = form.dataset.form;
  const formData = new FormData(form);
  const payload = {
    username: String(formData.get('username') || '').trim(),
    password: String(formData.get('password') || '')
  };

  if (tabName === 'register') {
    payload.registerAsDeveloper = specialRegisterMode === 'developer';
    payload.developerSecret = specialRegisterMode === 'developer' ? String(formData.get('developerSecret') || '') : '';
  }

  const endpoint = tabName === 'register' ? '/api/register' : '/api/login';

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (!response.ok) {
      setMessage(result.message || '操作失败', true);

      return;
    }

    setMessage(result.message || '成功');
    window.setTimeout(() => {
      window.location.href = '/index.html';
    }, 300);
  } catch {
    setMessage('网络请求失败，请稍后重试', true);
  }
}

tabButtons.forEach((button) => {
  button.addEventListener('click', () => switchTab(button.dataset.tab));
});

if (maintenanceTitle) {
  maintenanceTitle.addEventListener('click', () => {
    maintenanceTitleClickCount += 1;

    if (maintenanceUnlockResetTimer) {
      window.clearTimeout(maintenanceUnlockResetTimer);
    }

    maintenanceUnlockResetTimer = window.setTimeout(() => {
      maintenanceTitleClickCount = 0;
    }, maintenanceUnlockWindowMs);

    if (maintenanceTitleClickCount >= maintenanceUnlockClickTarget) {
      maintenanceTitleClickCount = 0;
      storeMaintenanceUnlock();
      setMaintenanceUnlockVisible(true);
      setMessage('入口已解锁');
    }
  });
}

if (developerEntryButton) {
  developerEntryButton.addEventListener('click', () => {
    if (isBlockedDeployment()) {
      setMessage('该网站存在严重问题，请耐心等待新版本推送与修复', true);
      return;
    }

    setSpecialRegisterMode('developer');
  });
}

if (developerExitButton) {
  developerExitButton.addEventListener('click', () => {
    setSpecialRegisterMode('normal');
    setMessage('已退出开发者账号注册模式');
  });
}

forms.forEach((form) => {
  form.addEventListener('submit', submitForm);
});

if (isBlockedDeployment()) {
  criticalAlert?.classList.remove('hidden');
  setMaintenanceUnlockVisible(false);
  switchTab('login');
  refreshRegisterAvailability();
  setMessage('该网站存在严重问题，请耐心等待新版本推送与修复', true);
} else {
  setMaintenanceUnlockVisible(isMaintenanceUnlockStored());
}

setSpecialRegisterMode('normal');
switchTab('login');
