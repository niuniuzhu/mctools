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
const authLoadingOverlay = document.querySelector('[data-auth-loading]');
const authLoadingMessage = document.querySelector('[data-auth-loading-message]');
const authLoadingProgress = document.querySelector('[data-auth-loading-progress]');
const previewEntryRow = document.querySelector('.preview-entry-row');
const maintenanceUnlockStorageKey = 'mctools-maintenance-register-unlocked';
const maintenanceUnlockClickTarget = 10;
const maintenanceUnlockWindowMs = 1800;
const loginRedirectDelayMs = 0;
const loginPageVersion = '正式版1.4';
const developerSecretRememberStorageKey = 'mctools-developer-secret-cache';
const developerSecretRememberLifetimeMs = 1000 * 60 * 30;

let specialRegisterMode = 'normal';
let maintenanceTitleClickCount = 0;
let maintenanceUnlockResetTimer = null;

function isOfficialPublicLogin() {
  return window.location.protocol === 'http:' && window.location.host === '115.29.198.193:3000' && window.location.pathname === '/login.html';
}

function applyLoginEnvironmentState() {
  if (!isOfficialPublicLogin()) {
    return;
  }

   if (previewEntryRow) {
    previewEntryRow.hidden = true;
  }

  if (maintenanceUnlock) {
    maintenanceUnlock.hidden = true;
  }

  if (developerRegisterPanel) {
    developerRegisterPanel.classList.add('hidden');
  }

  setSpecialRegisterMode('normal');
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

function getRememberedDeveloperSecret() {
  try {
    const rawValue = sessionStorage.getItem(developerSecretRememberStorageKey);

    if (!rawValue) {
      return '';
    }

    const parsed = JSON.parse(rawValue);
    const secret = parsed && typeof parsed.secret === 'string' ? parsed.secret : '';
    const expiresAt = Number(parsed && parsed.expiresAt);

    if (!secret || !Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
      sessionStorage.removeItem(developerSecretRememberStorageKey);
      return '';
    }

    return secret;
  } catch {
    return '';
  }
}

function rememberDeveloperSecret(secret) {
  const nextSecret = String(secret || '').trim();

  if (!nextSecret) {
    return;
  }

  try {
    sessionStorage.setItem(developerSecretRememberStorageKey, JSON.stringify({
      secret: nextSecret,
      expiresAt: Date.now() + developerSecretRememberLifetimeMs
    }));
  } catch {
    // Ignore storage write failure.
  }
}

function clearRememberedDeveloperSecret() {
  try {
    sessionStorage.removeItem(developerSecretRememberStorageKey);
  } catch {
    // Ignore storage remove failure.
  }
}

function applyRememberedDeveloperSecret() {
  if (!developerSecretInput) {
    return;
  }

  const rememberedSecret = getRememberedDeveloperSecret();

  if (rememberedSecret && !developerSecretInput.value) {
    developerSecretInput.value = rememberedSecret;
  }
}


function setMaintenanceUnlockVisible(isVisible) {
  if (!maintenanceUnlock) {
    return;
  }

  maintenanceUnlock.classList.toggle('hidden', !isVisible);
}

function refreshRegisterAvailability() {
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

    if (mode === 'developer') {
      applyRememberedDeveloperSecret();
    }

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

function showAuthLoading(tabName) {
  if (loginRedirectDelayMs <= 0) {
    return;
  }

  if (!authLoadingOverlay) {
    return;
  }

  authLoadingOverlay.hidden = false;
  if (authLoadingMessage) {
    authLoadingMessage.textContent = tabName === 'register'
      ? '注册成功，正在创建账号资料并进入首页。'
      : '登录成功，正在同步账号状态与首页模块。';
  }

  if (authLoadingProgress) {
    authLoadingProgress.style.transition = 'none';
    authLoadingProgress.style.width = '0%';
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        authLoadingProgress.style.transition = `width ${loginRedirectDelayMs}ms linear`;
        authLoadingProgress.style.width = '100%';
      });
    });
  }
}

function updateTabStatus(tabName) {
  if (!tabStatus || !tabStatusTag || !tabStatusTitle || !tabStatusNote) {
    return;
  }

  const isRegister = tabName === 'register';
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
      if (tabName === 'register' && specialRegisterMode === 'developer' && (result.message || '').includes('开发者授权码错误')) {
        clearRememberedDeveloperSecret();
      }

      setMessage(result.message || '操作失败', true);

      return;
    }

    if (tabName === 'register' && specialRegisterMode === 'developer') {
      rememberDeveloperSecret(payload.developerSecret);
    }

    setMessage(result.message || '成功');
    showAuthLoading(tabName);
    if (loginRedirectDelayMs <= 0) {
      window.location.href = '/niuniu-toolbox.html';
      return;
    }

    window.setTimeout(() => {
      window.location.href = '/niuniu-toolbox.html';
    }, loginRedirectDelayMs);
  } catch {
    setMessage('网络请求失败，请稍后重试', true);
  }
}

function applyDeveloperEntryFromQuery() {
  const params = new URLSearchParams(window.location.search);
  const queryUsername = String(params.get('username') || '').trim();
  let storedUsername = '';

  try {
    storedUsername = String(sessionStorage.getItem('mctools-developer-prefill-username') || '').trim();
  } catch {
    storedUsername = '';
  }

  const prefillUsername = queryUsername || storedUsername;

  if (prefillUsername) {
    document.querySelectorAll('input[name="username"]').forEach((input) => {
      input.value = prefillUsername;
    });
  }

  if (params.get('developer') !== '1') {
    return;
  }

  if (isMaintenanceUnlockStored()) {
    setSpecialRegisterMode('developer');
    setMessage('开发者入口已通过校验，请继续填写并注册。');
    return;
  }

  setMessage('未检测到入口凭据，请从提示页进入开发者入口。', true);
}

tabButtons.forEach((button) => {
  button.addEventListener('click', () => switchTab(button.dataset.tab));
});

if (maintenanceTitle) {
  maintenanceTitle.addEventListener('click', () => {
    if (isOfficialPublicLogin()) {
      return;
    }

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

applyLoginEnvironmentState();
applyAppVersion(loginPageVersion);

setMaintenanceUnlockVisible(isMaintenanceUnlockStored());
setSpecialRegisterMode('normal');
switchTab('login');
applyDeveloperEntryFromQuery();
