const tabButtons = document.querySelectorAll('[data-tab]');
const forms = document.querySelectorAll('[data-form]');
const message = document.querySelector('[data-message]');
const registerTabButton = document.querySelector('[data-tab="register"]');
const registerForm = document.querySelector('[data-form="register"]');
const maintenanceUnlock = document.querySelector('[data-maintenance-unlock]');
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
const qrRefreshButton = document.querySelector('[data-qr-refresh]');
const qrPreview = document.querySelector('[data-qr-preview]');
const qrPlaceholder = document.querySelector('[data-qr-placeholder]');
const qrStatus = document.querySelector('[data-qr-status]');
const qrExpire = document.querySelector('[data-qr-expire]');
const qrOpenLink = document.querySelector('[data-qr-open]');
const qrCopyLinkButton = document.querySelector('[data-qr-copy-link]');
const qrLinkText = document.querySelector('[data-qr-link-text]');
const rememberLoginInput = document.querySelector('[data-remember-login]');
const developerEntryVerifiedStorageKey = 'mctools-developer-entry-verified';
const loginRedirectDelayMs = 0;
const loginPageVersion = '正式版1.4';
const developerSecretRememberStorageKey = 'mctools-developer-secret-cache';
const developerSecretRememberLifetimeMs = 1000 * 60 * 30;
const qrLoginPollIntervalMs = 2000;
const appOrigin = window.location.port === '3000'
  ? `${window.location.protocol}//${window.location.hostname}:3001`
  : window.location.origin;

function appUrl(pathname) {
  return new URL(pathname, appOrigin).toString();
}

let specialRegisterMode = 'normal';
let qrLoginToken = '';
let qrLoginPollTimer = 0;
let qrLoginExpireTimer = 0;
let qrLoginExpiresAt = 0;
let qrLoginConfirmUrl = '';

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

function isDeveloperEntryVerified() {
  try {
    return sessionStorage.getItem(developerEntryVerifiedStorageKey) === '1';
  } catch {
    return false;
  }
}

function clearDeveloperEntryVerified() {
  try {
    sessionStorage.removeItem(developerEntryVerifiedStorageKey);
  } catch {
    // Ignore storage remove failure.
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

function setQrStatus(text, isError = false) {
  if (!qrStatus) {
    return;
  }

  qrStatus.textContent = text;
  qrStatus.style.color = isError ? '#fca5a5' : '';
}

function setQrExpireText() {
  if (!qrExpire) {
    return;
  }

  if (!qrLoginExpiresAt) {
    qrExpire.textContent = '有效期：--';
    return;
  }

  const remainMs = Math.max(0, qrLoginExpiresAt - Date.now());
  const remainSeconds = Math.ceil(remainMs / 1000);
  qrExpire.textContent = `有效期：${remainSeconds} 秒`;
}

function clearQrTimers() {
  if (qrLoginPollTimer) {
    window.clearTimeout(qrLoginPollTimer);
    qrLoginPollTimer = 0;
  }

  if (qrLoginExpireTimer) {
    window.clearInterval(qrLoginExpireTimer);
    qrLoginExpireTimer = 0;
  }
}

function buildQrUrls(content, size) {
  const encoded = encodeURIComponent(content);
  return [
    'https://api.qrserver.com/v1/create-qr-code/?data=' + encoded + '&size=' + size + 'x' + size + '&margin=12',
    'https://quickchart.io/qr?text=' + encoded + '&size=' + size + '&margin=2'
  ];
}

function updateQrManualLink(url) {
  qrLoginConfirmUrl = url || '';

  if (qrOpenLink) {
    qrOpenLink.href = qrLoginConfirmUrl || appUrl('/scan-login.html');
    qrOpenLink.setAttribute('aria-disabled', qrLoginConfirmUrl ? 'false' : 'true');
  }

  if (qrCopyLinkButton) {
    qrCopyLinkButton.disabled = !qrLoginConfirmUrl;
  }

  if (qrLinkText) {
    qrLinkText.textContent = '确认链接：' + (qrLoginConfirmUrl || '--');
  }
}

function renderQrImage(urls, index = 0) {
  if (!qrPreview) {
    return;
  }

  const resolvedUrls = Array.isArray(urls) ? urls.filter(Boolean) : [urls].filter(Boolean);

  if (!resolvedUrls.length) {
    setQrStatus('二维码生成失败，请改用下方确认链接', true);
    return;
  }

  qrPreview.innerHTML = '';
  const image = document.createElement('img');
  image.src = resolvedUrls[index];
  image.alt = '扫码登录二维码';
  image.loading = 'lazy';
  image.addEventListener('load', () => {
    setQrStatus('请使用已登录设备扫码确认');
  });
  image.addEventListener('error', () => {
    if (index < resolvedUrls.length - 1) {
      renderQrImage(resolvedUrls, index + 1);
      return;
    }

    qrPreview.innerHTML = '';
    if (qrPlaceholder) {
      qrPlaceholder.hidden = false;
      qrPreview.appendChild(qrPlaceholder);
    }
    setQrStatus('二维码加载失败，请使用下方确认链接继续登录', true);
  });
  qrPreview.appendChild(image);
}

async function pollQrLoginStatus() {
  if (!qrLoginToken) {
    return;
  }

  const rememberLogin = Boolean(rememberLoginInput?.checked);

  try {
    const response = await fetch(appUrl('/api/login/qr/status?token=' + encodeURIComponent(qrLoginToken) + (rememberLogin ? '&rememberLogin=1' : '')), {
      credentials: 'same-origin'
    });
    const result = await response.json().catch(() => ({}));

    if (response.status === 404) {
      clearQrTimers();
      setQrStatus(result.message || '二维码已失效，请刷新后重试', true);
      return;
    }

    if (!response.ok) {
      clearQrTimers();
      setQrStatus(result.message || '扫码状态查询失败', true);
      return;
    }

    if (typeof result.expiresInMs === 'number') {
      qrLoginExpiresAt = Date.now() + Math.max(0, result.expiresInMs);
      setQrExpireText();
    }

    if (result.status === 'approved') {
      clearQrTimers();
      setQrStatus('扫码登录成功，正在进入首页');
      window.location.href = appUrl('/niuniu-toolbox.html');
      return;
    }

    qrLoginPollTimer = window.setTimeout(pollQrLoginStatus, qrLoginPollIntervalMs);
  } catch {
    qrLoginPollTimer = window.setTimeout(pollQrLoginStatus, qrLoginPollIntervalMs * 2);
  }
}

async function refreshQrLogin() {
  if (!qrPreview || !qrRefreshButton) {
    return;
  }

  clearQrTimers();
  qrRefreshButton.disabled = true;
  qrLoginToken = '';
  qrLoginExpiresAt = 0;
  updateQrManualLink('');

  if (qrPlaceholder) {
    qrPlaceholder.hidden = false;
    qrPreview.innerHTML = '';
    qrPreview.appendChild(qrPlaceholder);
  }

  setQrStatus('正在生成二维码...');
  setQrExpireText();

  try {
    const response = await fetch(appUrl('/api/login/qr'));
    const result = await response.json().catch(() => ({}));

    if (!response.ok || !result.token) {
      setQrStatus(result.message || '二维码生成失败，请稍后重试', true);
      return;
    }

    qrLoginToken = result.token;
    qrLoginExpiresAt = Date.now() + Math.max(0, Number(result.expiresInMs) || 0);
    const confirmUrl = new URL('/scan-login.html', appOrigin);
    confirmUrl.searchParams.set('token', qrLoginToken);
    if (rememberLoginInput?.checked) {
      confirmUrl.searchParams.set('rememberLogin', '1');
    }
    updateQrManualLink(confirmUrl.toString());
    renderQrImage(buildQrUrls(confirmUrl.toString(), 220));
    setQrExpireText();
    qrLoginExpireTimer = window.setInterval(setQrExpireText, 1000);
    qrLoginPollTimer = window.setTimeout(pollQrLoginStatus, qrLoginPollIntervalMs);
  } catch {
    setQrStatus('网络请求失败，请稍后重试', true);
  } finally {
    qrRefreshButton.disabled = false;
  }
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
    ? '创建账号后会直接进入工具箱；开发者注册需先通过 developer-entry 页面验证。'
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
    password: String(formData.get('password') || ''),
    rememberLogin: Boolean(rememberLoginInput?.checked)
  };

  if (tabName === 'register') {
    payload.registerAsDeveloper = specialRegisterMode === 'developer';
    payload.developerSecret = specialRegisterMode === 'developer' ? String(formData.get('developerSecret') || '') : '';
  }

  const endpoint = tabName === 'register' ? '/api/register' : '/api/login';

  try {
    const response = await fetch(appUrl(endpoint), {
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
      window.location.href = appUrl('/niuniu-toolbox.html');
      return;
    }

    window.setTimeout(() => {
      window.location.href = appUrl('/niuniu-toolbox.html');
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
    clearDeveloperEntryVerified();
    return;
  }

  if (isDeveloperEntryVerified()) {
    clearDeveloperEntryVerified();
    setSpecialRegisterMode('developer');
    setMessage('开发者入口已通过校验，请继续填写并注册。');
    return;
  }

  setMessage('未检测到入口凭据，请从提示页进入开发者入口。', true);
}

tabButtons.forEach((button) => {
  button.addEventListener('click', () => switchTab(button.dataset.tab));
});

if (developerExitButton) {
  developerExitButton.addEventListener('click', () => {
    setSpecialRegisterMode('normal');
    setMessage('已退出开发者账号注册模式');
  });
}

forms.forEach((form) => {
  form.addEventListener('submit', submitForm);
});

if (qrRefreshButton) {
  qrRefreshButton.addEventListener('click', refreshQrLogin);
}

if (qrCopyLinkButton) {
  qrCopyLinkButton.addEventListener('click', async () => {
    if (!qrLoginConfirmUrl) {
      setQrStatus('当前还没有可复制的确认链接', true);
      return;
    }

    try {
      await navigator.clipboard.writeText(qrLoginConfirmUrl);
      setQrStatus('确认链接已复制，可在另一台设备直接打开');
    } catch {
      setQrStatus('复制失败，请手动复制下方链接', true);
    }
  });
}

applyLoginEnvironmentState();
applyAppVersion(loginPageVersion);

setMaintenanceUnlockVisible(false);
setSpecialRegisterMode('normal');
switchTab('login');
applyDeveloperEntryFromQuery();
refreshQrLogin();
