const tabButtons = document.querySelectorAll('[data-tab]');
const forms = document.querySelectorAll('[data-form]');
const message = document.querySelector('[data-message]');
const uiChoiceButtons = document.querySelectorAll('[data-ui-choice]');

function getCurrentUi() {
  try {
    return localStorage.getItem('mctools-ui') || 'normal';
  } catch {
    return 'normal';
  }
}

function applyUiChoice(uiName) {
  document.documentElement.dataset.ui = uiName;
  uiChoiceButtons.forEach((button) => {
    button.classList.toggle('active', button.dataset.uiChoice === uiName);
  });
}

function saveUiChoice(uiName) {
  try {
    localStorage.setItem('mctools-ui', uiName);
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

forms.forEach((form) => {
  form.addEventListener('submit', submitForm);
});

uiChoiceButtons.forEach((button) => {
  button.addEventListener('click', () => saveUiChoice(button.dataset.uiChoice || 'normal'));
});

applyUiChoice(getCurrentUi());
switchTab('login');