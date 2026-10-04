(function () {
  const languageStorageKey = 'mctools-store-language';
  const backgroundStorageKey = 'mctools-store-background-enabled';
  const themeStorageKey = 'mctools-store-theme';
  const reducedMotionStorageKey = 'mctools-store-reduced-motion';
  const compactModeStorageKey = 'mctools-store-compact-mode';
  const systemThemeStorageKey = 'mctools-store-system-theme';
  const minimalGlassStorageKey = 'mctools-store-minimal-glass';
  const highContrastStorageKey = 'mctools-store-high-contrast';
  const lowerGlowStorageKey = 'mctools-store-lower-glow';
  const stickyHeaderStorageKey = 'mctools-store-sticky-header';
  const rememberLastPageStorageKey = 'mctools-store-remember-last-page';
  const hideDecorationsStorageKey = 'mctools-store-hide-decorations';
  const openccScriptPath = '/vendor/opencc-cn2t.js';
  const skipDynamicTranslationPaths = new Set(['/store-account.html']);
  const englishGlossary = new Map([
    ['设置', 'Settings'],
    ['关于', 'About'],
    ['语言', 'Language'],
    ['通用', 'General'],
    ['返回商店', 'Back to Store'],
    ['返回首页', 'Back to Home'],
    ['返回选择界面', 'Back to Selection'],
    ['登录', 'Sign in'],
    ['注册', 'Register'],
    ['登录账号', 'Sign in'],
    ['注册账号', 'Register account'],
    ['退出登录', 'Sign out'],
    ['控制面板', 'Control Panel'],
    ['白天模式', 'Day Mode'],
    ['黑夜模式', 'Night Mode'],
    ['密码登录', 'Password Sign-in'],
    ['使用 Google 登录', 'Sign in with Google'],
    ['使用 Google 注册 / 登录', 'Register / Sign in with Google'],
    ['确认登录', 'Confirm Sign-in'],
    ['刷新二维码', 'Refresh QR Code'],
    ['复制确认链接', 'Copy Confirmation Link'],
    ['在已登录设备打开确认页', 'Open Confirmation Page on Signed-in Device'],
    ['未登录', 'Not signed in'],
    ['已登录：', 'Signed in: '],
    ['当前版本', 'Current version'],
    ['模块：设置', 'Module: Settings'],
    ['模块：', 'Module: '],
    ['首页', 'Home'],
    ['教程', 'Tutorials'],
    ['商店', 'Store'],
    ['时间管理', 'Time Management'],
    ['官方下载入口', 'Official Downloads'],
    ['进入时间管理', 'Open Time Management'],
    ['收款设置', 'Payment Settings'],
    ['请输入', 'Please enter'],
    ['用户名', 'Username'],
    ['邮箱', 'Email'],
    ['密码', 'Password'],
    ['有效期：', 'Valid for: '],
    ['确认链接：', 'Confirmation link: ']
  ]);
  let openccLoadPromise = null;
  let conversionObserver = null;

  function safeReadStorage(key, fallbackValue) {
    try {
      const value = localStorage.getItem(key);
      return value == null ? fallbackValue : value;
    } catch {
      return fallbackValue;
    }
  }

  function getLanguage() {
    const stored = safeReadStorage(languageStorageKey, 'zh-Hans');
    if (stored === 'zh-Hant' || stored === 'en-GB') {
      return stored;
    }
    return 'zh-Hans';
  }

  function getBackgroundImageEnabled() {
    return safeReadStorage(backgroundStorageKey, '1') !== '0';
  }

  function getPreferredTheme() {
    const stored = safeReadStorage(themeStorageKey, 'night');
    return stored === 'day' || stored === 'night' ? stored : 'night';
  }

  function applyThemePreference() {
    const followSystemTheme = safeReadStorage(systemThemeStorageKey, '0') === '1';
    const theme = followSystemTheme && window.matchMedia
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'night' : 'day')
      : getPreferredTheme();
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.dataset.theme = theme;
  }

  function applyMotionAndCompactPreference() {
    const reducedMotionEnabled = safeReadStorage(reducedMotionStorageKey, '0') === '1';
    const compactModeEnabled = safeReadStorage(compactModeStorageKey, '0') === '1';
    const minimalGlassEnabled = safeReadStorage(minimalGlassStorageKey, '0') === '1';
    const highContrastEnabled = safeReadStorage(highContrastStorageKey, '0') === '1';
    const lowerGlowEnabled = safeReadStorage(lowerGlowStorageKey, '0') === '1';
    const stickyHeaderEnabled = safeReadStorage(stickyHeaderStorageKey, '0') === '1';
    const hideDecorationsEnabled = safeReadStorage(hideDecorationsStorageKey, '0') === '1';
    const body = document.body;
    if (body) {
      body.classList.toggle('reduced-motion', reducedMotionEnabled);
      body.classList.toggle('compact-mode', compactModeEnabled);
      body.classList.toggle('minimal-glass', minimalGlassEnabled);
      body.classList.toggle('high-contrast', highContrastEnabled);
      body.classList.toggle('lower-glow', lowerGlowEnabled);
      body.classList.toggle('sticky-header', stickyHeaderEnabled);
      body.classList.toggle('hide-decorations', hideDecorationsEnabled);
    }
  }

  function trackLastVisitedPage() {
    try {
      const rememberLastPageEnabled = safeReadStorage(rememberLastPageStorageKey, '0') === '1';
      if (!rememberLastPageEnabled) {
        return;
      }
      const nextPath = `${window.location.pathname}${window.location.search || ''}`;
      if (nextPath && nextPath !== '/favicon.ico') {
        localStorage.setItem('mctools-last-visited-page', nextPath);
      }
    } catch {
      // Ignore storage issues.
    }
  }

  function shouldHandleDynamicTranslation() {
    return !skipDynamicTranslationPaths.has(window.location.pathname);
  }

  function loadOpenCC() {
    if (window.OpenCC) {
      return Promise.resolve(window.OpenCC);
    }

    if (openccLoadPromise) {
      return openccLoadPromise;
    }

    openccLoadPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-opencc-bundle]');
      if (existing) {
        existing.addEventListener('load', () => resolve(window.OpenCC), { once: true });
        existing.addEventListener('error', reject, { once: true });
        return;
      }

      const script = document.createElement('script');
      script.src = openccScriptPath;
      script.defer = true;
      script.dataset.openccBundle = 'true';
      script.addEventListener('load', () => resolve(window.OpenCC), { once: true });
      script.addEventListener('error', reject, { once: true });
      document.head.appendChild(script);
    });

    return openccLoadPromise;
  }

  function shouldSkipTextNode(node) {
    if (!node || !node.parentElement) {
      return true;
    }

    const tagName = node.parentElement.tagName;
    return ['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'CODE', 'PRE'].includes(tagName);
  }

  function convertTextNode(node, converter) {
    if (shouldSkipTextNode(node)) {
      return;
    }

    const originalText = String(node.nodeValue || '');
    if (!originalText.trim()) {
      return;
    }

    const convertedText = converter(originalText);
    if (convertedText && convertedText !== originalText) {
      node.nodeValue = convertedText;
    }
  }

  function convertElementAttributes(root, converter) {
    if (!root || root.nodeType !== Node.ELEMENT_NODE) {
      return;
    }

    const elements = [root, ...root.querySelectorAll('*')];
    elements.forEach((element) => {
      ['placeholder', 'title', 'aria-label'].forEach((attributeName) => {
        if (!element.hasAttribute(attributeName)) {
          return;
        }
        const originalValue = element.getAttribute(attributeName) || '';
        const convertedValue = converter(originalValue);
        if (convertedValue && convertedValue !== originalValue) {
          element.setAttribute(attributeName, convertedValue);
        }
      });

      if (
        element.tagName === 'INPUT' &&
        ['button', 'submit', 'reset'].includes(String(element.getAttribute('type') || '').toLowerCase())
      ) {
        const originalValue = element.value || '';
        const convertedValue = converter(originalValue);
        if (convertedValue && convertedValue !== originalValue) {
          element.value = convertedValue;
        }
      }
    });
  }

  function convertSubtree(root, converter) {
    if (!root) {
      return;
    }

    if (root.nodeType === Node.TEXT_NODE) {
      convertTextNode(root, converter);
      return;
    }

    if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_NODE) {
      return;
    }

    convertElementAttributes(root.nodeType === Node.ELEMENT_NODE ? root : document.documentElement, converter);

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let currentNode = walker.nextNode();
    while (currentNode) {
      convertTextNode(currentNode, converter);
      currentNode = walker.nextNode();
    }
  }

  function convertTextNodeWithGlossary(node) {
    if (shouldSkipTextNode(node)) {
      return;
    }

    const originalText = String(node.nodeValue || '');
    const trimmed = originalText.trim();
    if (!trimmed) {
      return;
    }

    let nextText = originalText;
    englishGlossary.forEach((replacement, source) => {
      if (nextText.includes(source)) {
        nextText = nextText.split(source).join(replacement);
      }
    });

    if (nextText !== originalText) {
      node.nodeValue = nextText;
    }
  }

  function convertElementAttributesWithGlossary(root) {
    if (!root || root.nodeType !== Node.ELEMENT_NODE) {
      return;
    }

    const elements = [root, ...root.querySelectorAll('*')];
    elements.forEach((element) => {
      ['placeholder', 'title', 'aria-label'].forEach((attributeName) => {
        if (!element.hasAttribute(attributeName)) {
          return;
        }

        const originalValue = element.getAttribute(attributeName) || '';
        let convertedValue = originalValue;
        englishGlossary.forEach((replacement, source) => {
          if (convertedValue.includes(source)) {
            convertedValue = convertedValue.split(source).join(replacement);
          }
        });

        if (convertedValue !== originalValue) {
          element.setAttribute(attributeName, convertedValue);
        }
      });
    });
  }

  function translateSubtreeToEnglish(root) {
    if (!root) {
      return;
    }

    if (root.nodeType === Node.TEXT_NODE) {
      convertTextNodeWithGlossary(root);
      return;
    }

    if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_NODE) {
      return;
    }

    convertElementAttributesWithGlossary(root.nodeType === Node.ELEMENT_NODE ? root : document.documentElement);

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let currentNode = walker.nextNode();
    while (currentNode) {
      convertTextNodeWithGlossary(currentNode);
      currentNode = walker.nextNode();
    }
  }

  function applyBackgroundPreference() {
    const enabled = getBackgroundImageEnabled();
    document.documentElement.dataset.backgroundImageEnabled = enabled ? '1' : '0';
    if (!enabled && document.body) {
      document.body.style.background = '';
      document.body.style.backgroundImage = '';
      document.body.style.backgroundPosition = '';
      document.body.style.backgroundSize = '';
      document.body.style.backgroundRepeat = '';
      document.body.style.backgroundAttachment = '';
    }
  }

  async function applyTraditionalChineseIfNeeded() {
    const nextLanguage = getLanguage();
    if (!shouldHandleDynamicTranslation()) {
      document.documentElement.lang = nextLanguage === 'zh-Hant' ? 'zh-Hant' : nextLanguage === 'en-GB' ? 'en-GB' : 'zh-CN';
      return;
    }

    if (nextLanguage === 'en-GB') {
      document.documentElement.lang = 'en-GB';
      translateSubtreeToEnglish(document.body || document.documentElement);
      return;
    }

    if (nextLanguage !== 'zh-Hant') {
      document.documentElement.lang = 'zh-CN';
      return;
    }

    try {
      const opencc = await loadOpenCC();
      const converter = opencc.Converter({ from: 'cn', to: 'tw' });
      document.documentElement.lang = 'zh-Hant';
      convertSubtree(document.body || document.documentElement, converter);

      if (conversionObserver) {
        conversionObserver.disconnect();
      }

      conversionObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'characterData') {
            convertTextNode(mutation.target, converter);
            return;
          }

          if (mutation.type === 'attributes' && mutation.target.nodeType === Node.ELEMENT_NODE) {
            convertElementAttributes(mutation.target, converter);
            return;
          }

          mutation.addedNodes.forEach((node) => convertSubtree(node, converter));
        });
      });

      conversionObserver.observe(document.documentElement, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true,
        attributeFilter: ['placeholder', 'title', 'aria-label', 'value']
      });
    } catch {
      // Keep simplified text when the converter bundle is unavailable.
    }
  }

  function initializeGlobalPreferences() {
    applyThemePreference();
    applyMotionAndCompactPreference();
    applyBackgroundPreference();
    trackLastVisitedPage();
    applyTraditionalChineseIfNeeded();
  }

  if (window.matchMedia) {
    const colorSchemeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    if (typeof colorSchemeMediaQuery.addEventListener === 'function') {
      colorSchemeMediaQuery.addEventListener('change', () => {
        if (safeReadStorage(systemThemeStorageKey, '0') === '1') {
          applyThemePreference();
        }
      });
    }
  }

  window.MCToolsGlobalPreferences = {
    getLanguage,
    getBackgroundImageEnabled,
    getPreferredTheme,
    applyBackgroundPreference,
    applyThemePreference,
    applyMotionAndCompactPreference,
    initializeGlobalPreferences
  };

  window.addEventListener('storage', (event) => {
    if (event.key === backgroundStorageKey) {
      applyBackgroundPreference();
      return;
    }

    if (event.key === languageStorageKey && shouldHandleDynamicTranslation()) {
      window.location.reload();
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeGlobalPreferences, { once: true });
  } else {
    initializeGlobalPreferences();
  }
})();