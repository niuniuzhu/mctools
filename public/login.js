const tabButtons = document.querySelectorAll('[data-tab]');
const forms = document.querySelectorAll('[data-form]');
const message = document.querySelector('[data-message]');
const uiChoiceButtons = document.querySelectorAll('[data-ui-choice]');
const maintenanceBanner = document.querySelector('[data-maintenance-banner]');
const registerTabButton = document.querySelector('[data-tab="register"]');
const registerForm = document.querySelector('[data-form="register"]');
const maintenanceTitle = document.querySelector('[data-maintenance-title]');
const maintenanceUnlock = document.querySelector('[data-maintenance-unlock]');
const maintenanceEntryButton = document.querySelector('[data-maintenance-entry]');
const developerEntryButton = document.querySelector('[data-developer-entry]');
const maintenanceRegisterPanel = document.querySelector('[data-maintenance-register]');
const maintenanceExitButton = document.querySelector('[data-maintenance-exit]');
const maintenanceFlagInput = document.querySelector('[data-maintenance-flag]');
const maintenanceSecretInput = document.querySelector('[data-maintenance-secret]');
const developerRegisterPanel = document.querySelector('[data-developer-register]');
const developerExitButton = document.querySelector('[data-developer-exit]');
const developerFlagInput = document.querySelector('[data-developer-flag]');
const developerSecretInput = document.querySelector('[data-developer-secret]');
const captchaPreview = document.querySelector('[data-captcha-preview]');
const captchaRefreshButton = document.querySelector('[data-captcha-refresh]');
const captchaIdInput = document.querySelector('[data-captcha-id]');
const captchaInput = document.querySelector('[data-captcha-input]');
const allowedUiChoices = new Set(['normal', 'classic', 'end']);

const maintenanceUnlockStorageKey = 'mctools-maintenance-register-unlocked';
const maintenanceUnlockClickTarget = 10;
const maintenanceUnlockWindowMs = 1800;

let maintenanceEnabled = false;
let specialRegisterMode = 'normal';
let maintenanceTitleClickCount = 0;
let maintenanceUnlockResetTimer = null;

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
  const isAvailable = !maintenanceEnabled || isSpecialRegisterMode();

  if (registerTabButton) {
    registerTabButton.disabled = !isAvailable;
  }

  if (!registerForm) {
    return;
  }

  registerForm.querySelectorAll('input, button').forEach((element) => {
    if (specialRegisterMode === 'maintenance' && element === maintenanceSecretInput) {
      element.disabled = false;
      return;
    }

    if (specialRegisterMode === 'maintenance' && element === maintenanceExitButton) {
      element.disabled = false;
      return;
    }

    if (specialRegisterMode === 'developer' && element === developerSecretInput) {
      element.disabled = false;
      return;
    }

    if (specialRegisterMode === 'developer' && element === developerExitButton) {
      element.disabled = false;
      return;
    }

    element.disabled = !isAvailable;
  });

  if (!isAvailable && registerTabButton && registerTabButton.classList.contains('active')) {
    switchTab('login');
  }
}

function setSpecialRegisterMode(mode) {
  specialRegisterMode = mode;

  if (maintenanceRegisterPanel) {
    maintenanceRegisterPanel.classList.toggle('hidden', mode !== 'maintenance');
  }

  if (developerRegisterPanel) {
    developerRegisterPanel.classList.toggle('hidden', mode !== 'developer');
  }

  if (maintenanceFlagInput) {
    maintenanceFlagInput.value = mode === 'maintenance' ? '1' : '0';
  }

  if (maintenanceSecretInput) {
    maintenanceSecretInput.required = mode === 'maintenance';

    if (mode !== 'maintenance') {
      maintenanceSecretInput.value = '';
    }
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
    setMessage(mode === 'maintenance' ? '已进入维护账号注册模式' : '已进入开发者账号注册模式');
  }
}

function getCurrentUi() {
  try {
    const savedUi = localStorage.getItem('mctools-ui') || 'normal';
    return allowedUiChoices.has(savedUi) ? savedUi : 'normal';
  } catch {
    return 'normal';
  }
}

function applyUiChoice(uiName) {
  const nextUi = allowedUiChoices.has(uiName) ? uiName : 'normal';
  document.documentElement.dataset.ui = nextUi;
  uiChoiceButtons.forEach((button) => {
    button.classList.toggle('active', button.dataset.uiChoice === nextUi);
  });
}

function saveUiChoice(uiName) {
  try {
    const nextUi = allowedUiChoices.has(uiName) ? uiName : 'normal';
    localStorage.setItem('mctools-ui', nextUi);
  } catch {
    // Ignore storage write failure.
  }

  applyUiChoice(uiName);
}

function setMessage(text, isError = false) {
  if (!message) {
    return;
  }

  message.textContent = text;
  message.style.color = isError ? '#fca5a5' : '#7dd3fc';
}

function setRegisterAvailability(isAvailable) {
  maintenanceEnabled = !isAvailable;
  refreshRegisterAvailability();
}

async function loadLoginCaptcha() {
  if (captchaRefreshButton) {
    captchaRefreshButton.disabled = true;
  }

  if (captchaPreview) {
    captchaPreview.textContent = '正在加载验证码...';
  }

  try {
    const response = await fetch('/api/login/captcha');
    const result = await response.json().catch(() => ({}));

    if (!response.ok || !result.captchaId || !result.svg) {
      throw new Error(result.message || '验证码加载失败');
    }

    if (captchaIdInput) {
      captchaIdInput.value = result.captchaId;
    }

    if (captchaPreview) {
      captchaPreview.innerHTML = result.svg;
    }

    if (captchaInput) {
      captchaInput.value = '';
    }
  } catch {
    if (captchaPreview) {
      captchaPreview.textContent = '验证码加载失败';
    }
  } finally {
    if (captchaRefreshButton) {
      captchaRefreshButton.disabled = false;
    }
  }
}

async function loadMaintenanceStatus() {
  try {
    const response = await fetch('/api/maintenance/status');
    const result = await response.json().catch(() => ({ maintenanceEnabled: false }));
    const isEnabled = Boolean(result.maintenanceEnabled);

    maintenanceEnabled = isEnabled;

    refreshRegisterAvailability();

    if (!maintenanceBanner) {
      return;
    }

    maintenanceBanner.hidden = !isEnabled;
    maintenanceBanner.textContent = isEnabled
      ? '当前正在维护，仅维护账号和开发者账号可以登录并控制状态。'
      : '';
  } catch {
    maintenanceEnabled = false;
    refreshRegisterAvailability();
  }
}

function switchTab(tabName) {
  tabButtons.forEach((button) => {
    button.classList.toggle('active', button.dataset.tab === tabName);
  });

  forms.forEach((form) => {
    form.classList.toggle('hidden', form.dataset.form !== tabName);
  });

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

  if (tabName === 'login') {
    payload.captchaId = String(formData.get('captchaId') || '').trim();
    payload.captchaCode = String(formData.get('captchaCode') || '').trim();
  }

  if (tabName === 'register') {
    payload.registerAsMaintenanceAdmin = specialRegisterMode === 'maintenance';
    payload.registerAsDeveloper = specialRegisterMode === 'developer';
    payload.maintenanceSecret = specialRegisterMode === 'maintenance' ? String(formData.get('maintenanceSecret') || '') : '';
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

      if (tabName === 'login') {
        loadLoginCaptcha();
      }

      return;
    }

    setMessage(result.message || '成功');
    window.setTimeout(() => {
      window.location.href = '/index.html';
    }, 300);
  } catch {
    setMessage('网络请求失败，请稍后重试', true);

    if (tabName === 'login') {
      loadLoginCaptcha();
    }
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

if (maintenanceEntryButton) {
  maintenanceEntryButton.addEventListener('click', () => {
    setSpecialRegisterMode('maintenance');
  });
}

if (developerEntryButton) {
  developerEntryButton.addEventListener('click', () => {
    setSpecialRegisterMode('developer');
  });
}

if (maintenanceExitButton) {
  maintenanceExitButton.addEventListener('click', () => {
    setSpecialRegisterMode('normal');
    setMessage('已退出维护账号注册模式');
  });
}

if (developerExitButton) {
  developerExitButton.addEventListener('click', () => {
    setSpecialRegisterMode('normal');
    setMessage('已退出开发者账号注册模式');
  });
}

if (captchaRefreshButton) {
  captchaRefreshButton.addEventListener('click', () => {
    loadLoginCaptcha();
  });
}

forms.forEach((form) => {
  form.addEventListener('submit', submitForm);
});

uiChoiceButtons.forEach((button) => {
  button.addEventListener('click', () => {
    if (button.disabled) {
      return;
    }

    saveUiChoice(button.dataset.uiChoice || 'normal');
  });
});

applyUiChoice(getCurrentUi());
setMaintenanceUnlockVisible(isMaintenanceUnlockStored());
setSpecialRegisterMode('normal');
switchTab('login');
loadMaintenanceStatus();
loadLoginCaptcha();