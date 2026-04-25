const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { DatabaseSync } = require('node:sqlite');

const host = process.env.HOST || '0.0.0.0';
const port = process.env.PORT || 3000;
const publicDir = path.join(__dirname, 'public');
const configDir = path.join(__dirname, 'config');
const dataDir = path.join(__dirname, 'data');
const avatarsDir = path.join(dataDir, 'avatars');
const databasePath = path.join(dataDir, 'users.db');
const apiKeysConfigPath = path.join(configDir, 'api-keys.json');
const appVersion = 'v1.2.0';
const sessionLifetimeMs = 1000 * 60 * 60 * 24 * 7;
const maintenanceAdminAccount = {
  username: 'maintenance_admin',
  password: 'McTools2026!'
};
const developerRegistrationSecret = 'McTools2026!';
const developerEditableExtensions = new Set(['.js', '.html', '.css', '.json', '.md', '.txt', '.bat', '.svg']);
const vipOnlyCommandNames = new Set([
  'executeChain',
  'scoreboardObjective',
  'scoreboardOperation',
  'itemReplace',
  'lootTable',
  'dataMergeBlock',
  'dataMergeEntity',
  'attributeBase',
  'scheduleFunction',
  'fillBiome',
  'snowballMenuOpen',
  'snowballMenuHud',
  'snowballMenuRun',
  'banMenuOpen',
  'banMenuSelect',
  'banMenuHud',
  'banMenuPage',
  'banMenuBan',
  'banMenuKick',
  'banMenuUnban',
  'banRecordQuery'
]);

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

if (!fs.existsSync(configDir)) {
  fs.mkdirSync(configDir, { recursive: true });
}

if (!fs.existsSync(avatarsDir)) {
  fs.mkdirSync(avatarsDir, { recursive: true });
}

const db = new DatabaseSync(databasePath);

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`);

try {
  db.exec('ALTER TABLE users ADD COLUMN avatar_path TEXT');
} catch {
  // Column already exists in existing databases.
}

try {
  db.exec('ALTER TABLE users ADD COLUMN is_maintenance_admin INTEGER NOT NULL DEFAULT 0');
} catch {
  // Column already exists in existing databases.
}

try {
  db.exec('ALTER TABLE users ADD COLUMN is_developer INTEGER NOT NULL DEFAULT 0');
} catch {
  // Column already exists in existing databases.
}

db.exec(`
  CREATE TABLE IF NOT EXISTS command_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    command_name TEXT NOT NULL,
    command_text TEXT NOT NULL,
    input_json TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS vip_purchases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    amount INTEGER NOT NULL,
    purchased_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS svip_purchases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    amount INTEGER NOT NULL,
    purchased_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`);

const sessions = new Map();
const loginCaptchas = new Map();
const captchaLifetimeMs = 1000 * 60 * 5;

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

function sendText(response, statusCode, content) {
  response.writeHead(statusCode, { 'Content-Type': 'text/plain; charset=utf-8' });
  response.end(content);
}

function sendJson(response, statusCode, payload, extraHeaders = {}) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    ...extraHeaders
  });
  response.end(JSON.stringify(payload));
}

function sendFile(filePath, response) {
  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        sendText(response, 404, '404 Not Found');
        return;
      }

      sendText(response, 500, '500 Internal Server Error');
      return;
    }

    const extension = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[extension] || 'application/octet-stream';
    response.writeHead(200, { 'Content-Type': contentType });
    response.end(content);
  });
}

function loadApiKeysConfig() {
  if (!fs.existsSync(apiKeysConfigPath)) {
    return {};
  }

  try {
    const rawContent = fs.readFileSync(apiKeysConfigPath, 'utf8');
    const parsedContent = JSON.parse(rawContent);
    return parsedContent && typeof parsedContent === 'object' ? parsedContent : {};
  } catch {
    return {};
  }
}

function getConfiguredValue(envKey, configKey, fallbackValue = '') {
  const envValue = String(process.env[envKey] || '').trim();

  if (envValue) {
    return envValue;
  }

  const config = loadApiKeysConfig();
  const configValue = config && typeof config[configKey] === 'string' ? config[configKey].trim() : '';
  return configValue || fallbackValue;
}

function getMimeTypeFromExtension(extension) {
  return mimeTypes[extension] || 'application/octet-stream';
}

function parseRequestBody(request) {
  return new Promise((resolve, reject) => {
    let body = '';

    request.on('data', (chunk) => {
      body += chunk;

      if (body.length > 1024 * 16) {
        reject(new Error('Payload too large'));
        request.destroy();
      }
    });

    request.on('end', () => {
      if (!body) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error('Invalid JSON'));
      }
    });

    request.on('error', reject);
  });
}

function parseCookies(cookieHeader) {
  return (cookieHeader || '').split(';').reduce((cookies, part) => {
    const [name, ...rest] = part.trim().split('=');

    if (!name) {
      return cookies;
    }

    cookies[name] = decodeURIComponent(rest.join('=') || '');
    return cookies;
  }, {});
}

function setSessionCookie(response, sessionToken) {
  response.setHeader('Set-Cookie', [
    `mctools_session=${encodeURIComponent(sessionToken)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${sessionLifetimeMs / 1000}`
  ]);
}

function clearSessionCookie(response) {
  response.setHeader('Set-Cookie', [
    'mctools_session=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0'
  ]);
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, storedHash) {
  const [salt, hash] = storedHash.split(':');

  if (!salt || !hash) {
    return false;
  }

  const candidate = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(candidate, 'hex'), Buffer.from(hash, 'hex'));
}

function createSession(username) {
  const sessionToken = crypto.randomBytes(32).toString('hex');
  sessions.set(sessionToken, {
    username,
    expiresAt: Date.now() + sessionLifetimeMs
  });
  return sessionToken;
}

function cleanupExpiredSessions() {
  const now = Date.now();

  for (const [sessionToken, session] of sessions.entries()) {
    if (session.expiresAt <= now) {
      sessions.delete(sessionToken);
    }
  }
}

function cleanupExpiredCaptchas() {
  const now = Date.now();

  for (const [captchaId, captcha] of loginCaptchas.entries()) {
    if (captcha.expiresAt <= now) {
      loginCaptchas.delete(captchaId);
    }
  }
}

function generateCaptchaCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';

  for (let index = 0; index < 4; index += 1) {
    const randomIndex = crypto.randomInt(0, alphabet.length);
    code += alphabet[randomIndex];
  }

  return code;
}

function createCaptchaSvg(code) {
  const characters = code.split('');
  const textNodes = characters.map((character, index) => {
    const x = 26 + index * 24;
    const y = 30 + (index % 2 === 0 ? 2 : -2);
    const rotation = index % 2 === 0 ? -8 : 7;
    return `<text x="${x}" y="${y}" fill="#e2e8f0" font-size="24" font-family="Segoe UI, Arial, sans-serif" font-weight="700" transform="rotate(${rotation} ${x} ${y})">${character}</text>`;
  }).join('');

  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 44" width="140" height="44" role="img" aria-label="登录验证码">
      <rect width="140" height="44" rx="12" fill="#0f172a"/>
      <path d="M8 32 C 26 10, 44 40, 62 18 S 98 34, 132 12" stroke="#38bdf8" stroke-opacity="0.35" stroke-width="2" fill="none"/>
      <path d="M10 12 C 30 30, 46 4, 72 24 S 110 10, 132 28" stroke="#94a3b8" stroke-opacity="0.22" stroke-width="2" fill="none"/>
      ${textNodes}
    </svg>
  `.trim();
}

function issueLoginCaptcha() {
  cleanupExpiredCaptchas();
  const captchaId = crypto.randomBytes(16).toString('hex');
  const answer = generateCaptchaCode();
  loginCaptchas.set(captchaId, {
    answer,
    expiresAt: Date.now() + captchaLifetimeMs
  });

  return {
    captchaId,
    svg: createCaptchaSvg(answer)
  };
}

function verifyLoginCaptcha(captchaId, captchaCode) {
  const captcha = loginCaptchas.get(captchaId);
  loginCaptchas.delete(captchaId);

  if (!captcha || captcha.expiresAt <= Date.now()) {
    return { ok: false, message: '验证码已过期，请刷新后重试' };
  }

  const normalizedCode = String(captchaCode || '').trim().toUpperCase();

  if (!normalizedCode) {
    return { ok: false, message: '请输入验证码' };
  }

  if (normalizedCode !== captcha.answer) {
    return { ok: false, message: '验证码错误，请重新输入' };
  }

  return { ok: true };
}

function getSessionFromRequest(request) {
  const cookies = parseCookies(request.headers.cookie);
  const sessionToken = cookies.mctools_session;

  if (!sessionToken) {
    return null;
  }

  const session = sessions.get(sessionToken);

  if (!session) {
    return null;
  }

  if (session.expiresAt <= Date.now()) {
    sessions.delete(sessionToken);
    return null;
  }

  return { sessionToken, username: session.username };
}

function getPathname(requestUrl) {
  return new URL(requestUrl, `http://${host}:${port}`).pathname;
}

function redirectToLogin(response) {
  response.writeHead(302, { Location: '/login.html' });
  response.end();
}

function redirectToIndex(response) {
  response.writeHead(302, { Location: '/index.html' });
  response.end();
}

function getSettingValue(settingKey, fallbackValue = '') {
  const row = db.prepare('SELECT value FROM app_settings WHERE key = ?').get(settingKey);
  return row ? String(row.value) : fallbackValue;
}

function setSettingValue(settingKey, value) {
  db.prepare(
    `INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP`
  ).run(settingKey, String(value));
}

function isMaintenanceEnabled() {
  return getSettingValue('maintenance_enabled', '0') === '1';
}

function isMaintenanceAdmin(username) {
  if (!username) {
    return false;
  }

  const row = db.prepare('SELECT is_maintenance_admin AS isMaintenanceAdmin FROM users WHERE username = ?').get(username);
  return Boolean(row && row.isMaintenanceAdmin);
}

function isDeveloper(username) {
  if (!username) {
    return false;
  }

  const row = db.prepare('SELECT is_developer AS isDeveloper FROM users WHERE username = ?').get(username);
  return Boolean(row && row.isDeveloper);
}

function isPrivilegedUser(username) {
  return isMaintenanceAdmin(username) || isDeveloper(username);
}

function isTextLikeFile(filePath) {
  return developerEditableExtensions.has(path.extname(filePath).toLowerCase());
}

function getSafeDeveloperFilePath(relativeFilePath) {
  const normalizedRelativePath = String(relativeFilePath || '').replace(/\\/g, '/').replace(/^\/+/, '');

  if (!normalizedRelativePath) {
    throw new Error('缺少文件路径');
  }

  if (normalizedRelativePath.startsWith('data/') || normalizedRelativePath === 'data') {
    throw new Error('该路径不可访问');
  }

  const absolutePath = path.resolve(__dirname, normalizedRelativePath);

  if (!absolutePath.startsWith(__dirname)) {
    throw new Error('非法文件路径');
  }

  if (!isTextLikeFile(absolutePath)) {
    throw new Error('当前仅支持查看和修改文本代码文件');
  }

  return {
    relativePath: normalizedRelativePath,
    absolutePath
  };
}

function collectDeveloperFiles(currentDir, baseDir = __dirname) {
  const entries = fs.readdirSync(currentDir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === '.git') {
      continue;
    }

    const absolutePath = path.join(currentDir, entry.name);
    const relativePath = path.relative(baseDir, absolutePath).replace(/\\/g, '/');

    if (!relativePath || relativePath.startsWith('data/')) {
      continue;
    }

    if (entry.isDirectory()) {
      files.push(...collectDeveloperFiles(absolutePath, baseDir));
      continue;
    }

    if (entry.isFile() && isTextLikeFile(absolutePath)) {
      files.push(relativePath);
    }
  }

  return files.sort((left, right) => left.localeCompare(right, 'zh-CN'));
}

function ensureMaintenanceAdminAccount() {
  const passwordHash = hashPassword(maintenanceAdminAccount.password);
  const existingUser = db.prepare('SELECT id FROM users WHERE username = ?').get(maintenanceAdminAccount.username);

  if (existingUser) {
    db.prepare('UPDATE users SET password_hash = ?, is_maintenance_admin = 1 WHERE username = ?').run(
      passwordHash,
      maintenanceAdminAccount.username
    );
  } else {
    db.prepare('INSERT INTO users (username, password_hash, is_maintenance_admin) VALUES (?, ?, 1)').run(
      maintenanceAdminAccount.username,
      passwordHash
    );
  }

  if (!db.prepare('SELECT key FROM app_settings WHERE key = ?').get('maintenance_enabled')) {
    setSettingValue('maintenance_enabled', '0');
  }
}

ensureMaintenanceAdminAccount();

function handleRegister(request, response) {
  parseRequestBody(request)
    .then((body) => {
      const username = String(body.username || '').trim();
      const password = String(body.password || '');
      const registerAsMaintenanceAdmin =
        body.registerAsMaintenanceAdmin === true ||
        body.registerAsMaintenanceAdmin === 'true' ||
        body.registerAsMaintenanceAdmin === 1 ||
        body.registerAsMaintenanceAdmin === '1';
      const registerAsDeveloper =
        body.registerAsDeveloper === true ||
        body.registerAsDeveloper === 'true' ||
        body.registerAsDeveloper === 1 ||
        body.registerAsDeveloper === '1';
      const maintenanceSecret = String(body.maintenanceSecret || '');
      const developerSecret = String(body.developerSecret || '');

      if (registerAsMaintenanceAdmin && registerAsDeveloper) {
        sendJson(response, 400, { message: '一次只能注册一种特殊账号' });
        return;
      }

      if (isMaintenanceEnabled() && !registerAsMaintenanceAdmin && !registerAsDeveloper) {
        sendJson(response, 503, { message: '当前正在维护，暂不开放普通注册' });
        return;
      }

      if (username.length < 3 || username.length > 32) {
        sendJson(response, 400, { message: '用户名长度需为 3-32 个字符' });
        return;
      }

      if (password.length < 6) {
        sendJson(response, 400, { message: '密码长度至少 6 位' });
        return;
      }

      if (registerAsMaintenanceAdmin && maintenanceSecret !== maintenanceAdminAccount.password) {
        sendJson(response, 403, { message: '维护授权码错误' });
        return;
      }

      if (registerAsDeveloper && developerSecret !== developerRegistrationSecret) {
        sendJson(response, 403, { message: '开发者授权码错误' });
        return;
      }

      const existingUser = db.prepare('SELECT id FROM users WHERE username = ?').get(username);

      if (existingUser) {
        sendJson(response, 409, { message: '用户名已存在' });
        return;
      }

      const passwordHash = hashPassword(password);
      db.prepare('INSERT INTO users (username, password_hash, is_maintenance_admin, is_developer) VALUES (?, ?, ?, ?)').run(
        username,
        passwordHash,
        registerAsMaintenanceAdmin ? 1 : 0,
        registerAsDeveloper ? 1 : 0
      );

      const sessionToken = createSession(username);
      setSessionCookie(response, sessionToken);
      sendJson(response, 201, {
        message: registerAsMaintenanceAdmin
          ? '维护账号注册成功'
          : registerAsDeveloper
          ? '开发者账号注册成功'
          : '注册成功',
        username,
        version: appVersion
      });
    })
    .catch((error) => {
      const statusCode = error.message === 'Invalid JSON' ? 400 : 413;
      sendJson(response, statusCode, { message: error.message });
    });
}

function handleLogin(request, response) {
  parseRequestBody(request)
    .then((body) => {
      const username = String(body.username || '').trim();
      const password = String(body.password || '');
      const captchaId = String(body.captchaId || '').trim();
      const captchaCode = String(body.captchaCode || '').trim();

      if (!username || !password) {
        sendJson(response, 400, { message: '请输入用户名和密码' });
        return;
      }

      const captchaResult = verifyLoginCaptcha(captchaId, captchaCode);

      if (!captchaResult.ok) {
        sendJson(response, 400, { message: captchaResult.message });
        return;
      }

      const user = db.prepare('SELECT username, password_hash FROM users WHERE username = ?').get(username);

      if (!user || !verifyPassword(password, user.password_hash)) {
        sendJson(response, 401, { message: '用户名或密码错误' });
        return;
      }

      if (isMaintenanceEnabled() && !isPrivilegedUser(user.username)) {
        sendJson(response, 503, { message: '当前正在维护，仅维护账号和开发者账号可登录' });
        return;
      }

      const sessionToken = createSession(user.username);
      setSessionCookie(response, sessionToken);
      sendJson(response, 200, { message: '登录成功', username: user.username, version: appVersion });
    })
    .catch((error) => {
      const statusCode = error.message === 'Invalid JSON' ? 400 : 413;
      sendJson(response, statusCode, { message: error.message });
    });
}

function handleLoginCaptcha(request, response) {
  const captcha = issueLoginCaptcha();
  sendJson(response, 200, {
    captchaId: captcha.captchaId,
    svg: captcha.svg,
    version: appVersion
  });
}

function handleLogout(request, response) {
  const session = getSessionFromRequest(request);

  if (session) {
    sessions.delete(session.sessionToken);
  }

  clearSessionCookie(response);
  sendJson(response, 200, { message: '已退出登录' });
}

function getVipInfo(username) {
  const vipPurchase = db.prepare('SELECT amount, purchased_at FROM vip_purchases WHERE username = ?').get(username);
  const svipPurchase = db.prepare('SELECT amount, purchased_at FROM svip_purchases WHERE username = ?').get(username);
  const hasSvip = Boolean(svipPurchase);
  const hasVip = Boolean(vipPurchase) || hasSvip;

  return {
    vipPurchased: hasVip,
    vipAmount: vipPurchase ? vipPurchase.amount : 0,
    vipPurchasedAt: vipPurchase ? vipPurchase.purchased_at : hasSvip ? svipPurchase.purchased_at : null,
    svipPurchased: hasSvip,
    svipAmount: svipPurchase ? svipPurchase.amount : 0,
    svipPurchasedAt: svipPurchase ? svipPurchase.purchased_at : null,
    membershipLevel: hasSvip ? 'SVIP' : hasVip ? 'VIP' : 'NORMAL'
  };
}

function getAvatarUrl(username) {
  const row = db.prepare('SELECT avatar_path FROM users WHERE username = ?').get(username);

  if (!row || !row.avatar_path) {
    return null;
  }

  return row.avatar_path;
}

function getUserPayload(username) {
  return {
    username,
    version: appVersion,
    avatarUrl: getAvatarUrl(username),
    maintenanceEnabled: isMaintenanceEnabled(),
    isMaintenanceAdmin: isMaintenanceAdmin(username),
    isDeveloper: isDeveloper(username),
    ...getVipInfo(username)
  };
}

function requireDeveloperSession(request, response) {
  const session = getSessionFromRequest(request);

  if (!session) {
    sendJson(response, 401, { message: '未登录' });
    return null;
  }

  if (!isDeveloper(session.username)) {
    sendJson(response, 403, { message: '仅开发者账号可访问' });
    return null;
  }

  return session;
}

function handleDeveloperFiles(request, response) {
  const session = requireDeveloperSession(request, response);

  if (!session) {
    return;
  }

  const files = collectDeveloperFiles(__dirname);
  sendJson(response, 200, {
    items: files,
    username: session.username,
    version: appVersion
  });
}

function handleDeveloperFileRead(request, response) {
  const session = requireDeveloperSession(request, response);

  if (!session) {
    return;
  }

  try {
    const url = new URL(request.url || '/', `http://${host}:${port}`);
    const { relativePath, absolutePath } = getSafeDeveloperFilePath(url.searchParams.get('path') || '');

    if (!fs.existsSync(absolutePath)) {
      sendJson(response, 404, { message: '文件不存在' });
      return;
    }

    const stat = fs.statSync(absolutePath);

    if (stat.size > 1024 * 512) {
      sendJson(response, 400, { message: '文件过大，暂不支持在线编辑' });
      return;
    }

    const content = fs.readFileSync(absolutePath, 'utf8');
    sendJson(response, 200, {
      path: relativePath,
      content,
      size: stat.size,
      version: appVersion
    });
  } catch (error) {
    sendJson(response, 400, { message: error.message || '读取文件失败' });
  }
}

function handleDeveloperFileSave(request, response) {
  const session = requireDeveloperSession(request, response);

  if (!session) {
    return;
  }

  parseRequestBody(request)
    .then((body) => {
      const { relativePath, absolutePath } = getSafeDeveloperFilePath(body.path || '');
      const content = String(body.content || '');

      if (!fs.existsSync(absolutePath)) {
        sendJson(response, 404, { message: '文件不存在' });
        return;
      }

      if (Buffer.byteLength(content, 'utf8') > 1024 * 512) {
        sendJson(response, 400, { message: '文件内容过大，保存失败' });
        return;
      }

      fs.writeFileSync(absolutePath, content, 'utf8');
      sendJson(response, 200, {
        message: '文件已保存',
        path: relativePath,
        version: appVersion,
        username: session.username
      });
    })
    .catch((error) => {
      const statusCode = error.message === 'Invalid JSON' ? 400 : 413;
      sendJson(response, statusCode, { message: error.message });
    });
}

function normalizePrompt(text) {
  return String(text || '').trim().toLowerCase();
}

function generateAiCommand(prompt) {
  const normalizedPrompt = normalizePrompt(prompt);

  if (!normalizedPrompt) {
    return null;
  }

  if (normalizedPrompt.includes('传送') || normalizedPrompt.includes('tp')) {
    const coordinateMatch = normalizedPrompt.match(/(-?\d+)\s+(-?\d+)\s+(-?\d+)/);
    const destination = coordinateMatch ? coordinateMatch.slice(1).join(' ') : '@s';
    return {
      commandName: 'ai-tp',
      commandText: `tp @p ${destination}`,
      confidence: 0.88,
      label: 'AI 传送建议'
    };
  }

  if (normalizedPrompt.includes('给') || normalizedPrompt.includes('物品') || normalizedPrompt.includes('give')) {
    const countMatch = normalizedPrompt.match(/(\d+)\s*(个|份|个物品)?/);
    const count = countMatch ? Math.max(1, Number.parseInt(countMatch[1], 10)) : 1;
    const item = normalizedPrompt.includes('钻石') ? 'minecraft:diamond' : 'minecraft:stone';
    return {
      commandName: 'ai-give',
      commandText: `give @p ${item} ${count}`,
      confidence: 0.86,
      label: 'AI 给予建议'
    };
  }

  if (normalizedPrompt.includes('召唤') || normalizedPrompt.includes('summon')) {
    const entity = normalizedPrompt.includes('僵尸') ? 'minecraft:zombie' : 'minecraft:pig';
    return {
      commandName: 'ai-summon',
      commandText: `summon ${entity} ~ ~ ~`,
      confidence: 0.84,
      label: 'AI 召唤建议'
    };
  }

  if (normalizedPrompt.includes('效果') || normalizedPrompt.includes('速度') || normalizedPrompt.includes('effect')) {
    return {
      commandName: 'ai-effect',
      commandText: 'effect give @p minecraft:speed 30 1 true',
      confidence: 0.82,
      label: 'AI 效果建议'
    };
  }

  if (normalizedPrompt.includes('时间') || normalizedPrompt.includes('白天') || normalizedPrompt.includes('夜晚') || normalizedPrompt.includes('time')) {
    const value = normalizedPrompt.includes('夜') ? '13000' : '1000';
    return {
      commandName: 'ai-time',
      commandText: `time set ${value}`,
      confidence: 0.8,
      label: 'AI 时间建议'
    };
  }

  if (normalizedPrompt.includes('清空') || normalizedPrompt.includes('背包') || normalizedPrompt.includes('clear')) {
    return {
      commandName: 'ai-clear',
      commandText: 'clear @p',
      confidence: 0.81,
      label: 'AI 清空建议'
    };
  }

  if (normalizedPrompt.includes('难度') || normalizedPrompt.includes('困难') || normalizedPrompt.includes('和平') || normalizedPrompt.includes('difficulty')) {
    const level = normalizedPrompt.includes('和平') ? 'peaceful' : normalizedPrompt.includes('困难') ? 'hard' : 'normal';
    return {
      commandName: 'ai-difficulty',
      commandText: `difficulty ${level}`,
      confidence: 0.79,
      label: 'AI 难度建议'
    };
  }

  if (normalizedPrompt.includes('规则') || normalizedPrompt.includes('死亡不掉落') || normalizedPrompt.includes('gamerule')) {
    const rule = normalizedPrompt.includes('死亡不掉落') ? 'keepInventory' : 'doDaylightCycle';
    const value = normalizedPrompt.includes('关') || normalizedPrompt.includes('false') ? 'false' : 'true';
    return {
      commandName: 'ai-gamerule',
      commandText: `gamerule ${rule} ${value}`,
      confidence: 0.78,
      label: 'AI 规则建议'
    };
  }

  if (normalizedPrompt.includes('定位') || normalizedPrompt.includes('村庄') || normalizedPrompt.includes('locate')) {
    const target = normalizedPrompt.includes('村庄') ? 'minecraft:village' : 'minecraft:trial_chambers';
    return {
      commandName: 'ai-locate',
      commandText: `locate structure ${target}`,
      confidence: 0.77,
      label: 'AI 定位建议'
    };
  }

  if (normalizedPrompt.includes('标题') || normalizedPrompt.includes('公告') || normalizedPrompt.includes('title')) {
    return {
      commandName: 'ai-title',
      commandText: 'title @a title {"text":"欢迎来到服务器"}',
      confidence: 0.76,
      label: 'AI 标题建议'
    };
  }

  return {
    commandName: 'ai-general',
    commandText: '请描述更具体一些，例如“给我 3 个钻石”或“传送到 0 64 0”',
    confidence: 0.4,
    label: 'AI 提示'
  };
}

function generateSvipAiCommand(prompt) {
  const normalizedPrompt = normalizePrompt(prompt);

  if (!normalizedPrompt) {
    return null;
  }

  if (normalizedPrompt.includes('钻石') || normalizedPrompt.includes('diamond')) {
    const countMatch = normalizedPrompt.match(/(\d+)/);
    const count = countMatch ? Math.max(1, Number.parseInt(countMatch[1], 10)) : 3;
    return {
      commandName: 'svip-ai-give',
      commandText: `give @p minecraft:diamond ${count}`,
      confidence: 0.96,
      label: 'SVIP AI 高阶物品建议',
      reasoning: '检测到钻石需求，优先使用更精确的物品 ID 与数量。'
    };
  }

  if (normalizedPrompt.includes('传送') || normalizedPrompt.includes('tp')) {
    const coordinateMatch = normalizedPrompt.match(/(-?\d+)\s+(-?\d+)\s+(-?\d+)/);
    const destination = coordinateMatch ? coordinateMatch.slice(1).join(' ') : '0 64 0';
    return {
      commandName: 'svip-ai-tp',
      commandText: `tp @p ${destination}`,
      confidence: 0.95,
      label: 'SVIP AI 高阶传送建议',
      reasoning: '优先抽取三维坐标，并在缺失时补默认安全坐标。'
    };
  }

  if (normalizedPrompt.includes('僵尸') || normalizedPrompt.includes('zombie') || normalizedPrompt.includes('召唤')) {
    return {
      commandName: 'svip-ai-summon',
      commandText: 'summon minecraft:zombie ~ ~ ~ {CustomName:"\"Boss\"",Health:40f,PersistenceRequired:1b}',
      confidence: 0.93,
      label: 'SVIP AI 高阶召唤建议',
      reasoning: '根据召唤意图补充了更复杂的实体 NBT 示例。'
    };
  }

  if (normalizedPrompt.includes('夜视') || normalizedPrompt.includes('速度') || normalizedPrompt.includes('效果')) {
    const effectId = normalizedPrompt.includes('夜视') ? 'minecraft:night_vision' : 'minecraft:speed';
    return {
      commandName: 'svip-ai-effect',
      commandText: `effect give @p ${effectId} 120 1 true`,
      confidence: 0.92,
      label: 'SVIP AI 高阶效果建议',
      reasoning: '识别到状态效果需求，自动拉长持续时间并隐藏粒子。'
    };
  }

  if (normalizedPrompt.includes('粒子') || normalizedPrompt.includes('particle')) {
    return {
      commandName: 'svip-ai-particle',
      commandText: 'particle minecraft:flame ~ ~1 ~ 0.5 0.5 0.5 0 20 force @a',
      confidence: 0.91,
      label: 'SVIP AI 高阶粒子建议',
      reasoning: '识别到视觉效果需求，自动补全粒子范围、数量和可见目标。'
    };
  }

  if (normalizedPrompt.includes('声音') || normalizedPrompt.includes('音效') || normalizedPrompt.includes('playsound')) {
    return {
      commandName: 'svip-ai-playsound',
      commandText: 'playsound minecraft:entity.player.levelup master @a ~ ~ ~ 1 1 0',
      confidence: 0.9,
      label: 'SVIP AI 高阶音效建议',
      reasoning: '识别到音效播放意图，自动补齐声音源、坐标和音量参数。'
    };
  }

  const fallback = generateAiCommand(prompt);

  return fallback
    ? {
        ...fallback,
        commandName: `svip-${fallback.commandName}`,
        confidence: Math.min(0.99, fallback.confidence + 0.08),
        label: `SVIP 增强 · ${fallback.label}`,
        reasoning: '使用了 SVIP 增强提示策略，对基础建议进行了补强。'
      }
    : null;
}

function handleVipPurchase(request, response) {
  const session = getSessionFromRequest(request);

  if (!session) {
    sendJson(response, 401, { message: '未登录' });
    return;
  }

  const existingPurchase = db.prepare('SELECT id FROM vip_purchases WHERE username = ?').get(session.username);

  if (existingPurchase) {
    sendJson(response, 200, {
      message: 'VIP 已开通',
      username: session.username,
      version: appVersion,
      price: 10,
      ...getVipInfo(session.username)
    });
    return;
  }

  db.prepare('INSERT INTO vip_purchases (username, amount) VALUES (?, ?)').run(session.username, 10);

  sendJson(response, 201, {
    message: 'VIP 开通成功',
    username: session.username,
    version: appVersion,
    price: 10,
    ...getVipInfo(session.username)
  });
}

function handleSvipPurchase(request, response) {
  const session = getSessionFromRequest(request);

  if (!session) {
    sendJson(response, 401, { message: '未登录' });
    return;
  }

  const existingPurchase = db.prepare('SELECT id FROM svip_purchases WHERE username = ?').get(session.username);
  const vipInfo = getVipInfo(session.username);

  if (existingPurchase) {
    sendJson(response, 200, {
      message: 'SVIP 已开通',
      username: session.username,
      version: appVersion,
      price: vipInfo.svipAmount || (vipInfo.vipPurchased ? 10 : 25),
      ...getVipInfo(session.username)
    });
    return;
  }

  const upgradePrice = vipInfo.vipPurchased ? 10 : 25;
  db.prepare('INSERT INTO svip_purchases (username, amount) VALUES (?, ?)').run(session.username, upgradePrice);

  sendJson(response, 201, {
    message: 'SVIP 开通成功',
    username: session.username,
    version: appVersion,
    price: upgradePrice,
    ...getVipInfo(session.username)
  });
}

function handleAvatarUpload(request, response) {
  const session = getSessionFromRequest(request);

  if (!session) {
    sendJson(response, 401, { message: '未登录' });
    return;
  }

  parseRequestBody(request)
    .then((body) => {
      const imageData = String(body.imageData || '');
      const match = imageData.match(/^data:(image\/(png|jpeg|jpg|webp));base64,(.+)$/);

      if (!match) {
        sendJson(response, 400, { message: '仅支持 PNG、JPG、WEBP 图片' });
        return;
      }

      const extension = match[2] === 'jpeg' || match[2] === 'jpg' ? '.jpg' : match[2] === 'png' ? '.png' : '.webp';
      const fileName = `${session.username}${extension}`;
      const absolutePath = path.join(avatarsDir, fileName);
      const buffer = Buffer.from(match[3], 'base64');

      if (buffer.length > 1024 * 1024 * 2) {
        sendJson(response, 400, { message: '头像图片不能超过 2MB' });
        return;
      }

      const existingFiles = fs.readdirSync(avatarsDir).filter((name) => name.startsWith(`${session.username}.`));
      existingFiles.forEach((name) => {
        const oldPath = path.join(avatarsDir, name);
        if (oldPath !== absolutePath && fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      });

      fs.writeFileSync(absolutePath, buffer);
      const avatarUrl = `/avatars/${fileName}`;
      db.prepare('UPDATE users SET avatar_path = ? WHERE username = ?').run(avatarUrl, session.username);

      sendJson(response, 200, {
        message: '头像上传成功',
        ...getUserPayload(session.username)
      });
    })
    .catch((error) => {
      const statusCode = error.message === 'Invalid JSON' ? 400 : 413;
      sendJson(response, statusCode, { message: error.message });
    });
}

function handleAvatarDelete(request, response) {
  const session = getSessionFromRequest(request);

  if (!session) {
    sendJson(response, 401, { message: '未登录' });
    return;
  }

  const avatarUrl = getAvatarUrl(session.username);

  if (avatarUrl) {
    const fileName = avatarUrl.replace('/avatars/', '');
    const avatarPath = path.join(avatarsDir, fileName);

    if (fs.existsSync(avatarPath)) {
      fs.unlinkSync(avatarPath);
    }
  }

  db.prepare('UPDATE users SET avatar_path = NULL WHERE username = ?').run(session.username);
  sendJson(response, 200, {
    message: '头像已删除',
    ...getUserPayload(session.username)
  });
}

function handleAiGenerate(request, response) {
  const session = getSessionFromRequest(request);

  if (!session) {
    sendJson(response, 401, { message: '未登录' });
    return;
  }

  const vipInfo = getVipInfo(session.username);

  if (!vipInfo.vipPurchased) {
    sendJson(response, 403, { message: 'AI 功能仅限 VIP 使用' });
    return;
  }

  parseRequestBody(request)
    .then((body) => {
      const prompt = String(body.prompt || '').trim();
      const result = vipInfo.svipPurchased ? generateSvipAiCommand(prompt) : generateAiCommand(prompt);

      if (!result) {
        sendJson(response, 400, { message: '请输入要生成的内容' });
        return;
      }

      if (result.commandText && !result.commandText.startsWith('请描述更具体一些')) {
        db.prepare(
          'INSERT INTO command_history (username, command_name, command_text, input_json) VALUES (?, ?, ?, ?)'
        ).run(
          session.username,
          result.commandName,
          result.commandText,
          JSON.stringify({ prompt, source: 'ai' })
        );
      }

      sendJson(response, 200, {
        ...result,
        username: session.username,
        version: appVersion,
        aiTier: vipInfo.svipPurchased ? 'SVIP' : 'VIP',
        ...getVipInfo(session.username)
      });
    })
    .catch((error) => {
      const statusCode = error.message === 'Invalid JSON' ? 400 : 413;
      sendJson(response, statusCode, { message: error.message });
    });
}

async function callGeminiAnswer(question) {
  const apiKey = getConfiguredValue('GEMINI_API_KEY', 'geminiApiKey');

  if (!apiKey) {
    throw new Error('服务器未配置 Gemini API Key，请先填写 config/api-keys.json');
  }

  const requestedModel = getConfiguredValue('GEMINI_MODEL', 'geminiModel');
  const candidateModels = requestedModel
    ? [requestedModel]
    : ['gemini-3.1-pro', 'gemini-2.5-pro', 'gemini-3-flash-preview'];

  let lastError = null;

  for (const modelName of candidateModels) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelName)}:generateContent`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey
          },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [
                  {
                    text: [
                      '你是“我的世界工具箱”的 SVIP AI 助手。',
                      '请始终使用简体中文回答。',
                      '优先回答 Minecraft 指令、玩法、红石、配方、坐标、服务器管理相关问题。',
                      '如果问题适合给步骤，请给简洁步骤；如果适合给命令，请给可直接复制的命令。',
                      `用户问题：${question}`
                    ].join('\n')
                  }
                ]
              }
            ]
          })
        }
      );

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        const errorMessage = result && result.error && result.error.message
          ? result.error.message
          : `Gemini 请求失败（${response.status}）`;
        lastError = new Error(`${modelName}: ${errorMessage}`);
        continue;
      }

      const parts = (((result || {}).candidates || [])[0] || {}).content?.parts || [];
      const answer = parts
        .map((part) => (part && typeof part.text === 'string' ? part.text : ''))
        .join('\n')
        .trim();

      if (!answer) {
        lastError = new Error(`${modelName}: 模型未返回文本内容`);
        continue;
      }

      return {
        model: modelName,
        answer
      };
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error('Gemini 调用失败');
}

function handleAiChat(request, response) {
  const session = getSessionFromRequest(request);

  if (!session) {
    sendJson(response, 401, { message: '未登录' });
    return;
  }

  const vipInfo = getVipInfo(session.username);

  if (!vipInfo.svipPurchased) {
    sendJson(response, 403, { message: 'AI 问答仅限 SVIP 使用' });
    return;
  }

  parseRequestBody(request)
    .then(async (body) => {
      const question = String(body.question || '').trim();

      if (!question) {
        sendJson(response, 400, { message: '请输入要提问的问题' });
        return;
      }

      const result = await callGeminiAnswer(question);
      sendJson(response, 200, {
        message: 'AI 回复成功',
        answer: result.answer,
        model: result.model,
        username: session.username,
        version: appVersion,
        aiTier: 'SVIP'
      });
    })
    .catch((error) => {
      const isJsonError = error.message === 'Invalid JSON';
      const statusCode = isJsonError ? 400 : 500;
      sendJson(response, statusCode, { message: error.message || 'AI 问答失败' });
    });
}

function handleExecutorRun(request, response) {
  const session = getSessionFromRequest(request);

  if (!session) {
    sendJson(response, 401, { message: '未登录' });
    return;
  }

  const vipInfo = getVipInfo(session.username);

  if (!vipInfo.svipPurchased) {
    sendJson(response, 403, { message: '指令执行器仅限 SVIP 使用' });
    return;
  }

  parseRequestBody(request)
    .then((body) => {
      const commandText = String(body.commandText || '').trim();

      if (!commandText) {
        sendJson(response, 400, { message: '请输入要执行的指令' });
        return;
      }

      const normalized = commandText.replace(/^\//, '');
      let summary = '指令已进入模拟执行流程';

      if (normalized.startsWith('give ')) {
        summary = '模拟执行完成：已识别为给予类指令';
      } else if (normalized.startsWith('tp ')) {
        summary = '模拟执行完成：已识别为传送类指令';
      } else if (normalized.startsWith('summon ')) {
        summary = '模拟执行完成：已识别为召唤类指令';
      } else if (normalized.startsWith('effect ')) {
        summary = '模拟执行完成：已识别为状态效果类指令';
      }

      db.prepare(
        'INSERT INTO command_history (username, command_name, command_text, input_json) VALUES (?, ?, ?, ?)'
      ).run(session.username, 'executor', commandText, JSON.stringify({ source: 'executor' }));

      sendJson(response, 200, {
        message: '执行完成',
        summary,
        commandText,
        executorTier: 'SVIP',
        version: appVersion
      });
    })
    .catch((error) => {
      const statusCode = error.message === 'Invalid JSON' ? 400 : 413;
      sendJson(response, statusCode, { message: error.message });
    });
}

function handleSaveCommand(request, response) {
  const session = getSessionFromRequest(request);

  if (!session) {
    sendJson(response, 401, { message: '未登录' });
    return;
  }

  parseRequestBody(request)
    .then((body) => {
      const commandName = String(body.commandName || '').trim();
      const commandText = String(body.commandText || '').trim();
      const inputJson = JSON.stringify(body.inputs || {});
      const vipInfo = getVipInfo(session.username);

      if (!commandName || !commandText) {
        sendJson(response, 400, { message: '指令内容不能为空' });
        return;
      }

      if (vipOnlyCommandNames.has(commandName) && !vipInfo.vipPurchased) {
        sendJson(response, 403, { message: '这条复杂指令仅限 VIP 使用' });
        return;
      }

      db.prepare(
        'INSERT INTO command_history (username, command_name, command_text, input_json) VALUES (?, ?, ?, ?)'
      ).run(session.username, commandName, commandText, inputJson);

      sendJson(response, 201, { message: '指令已保存' });
    })
    .catch((error) => {
      const statusCode = error.message === 'Invalid JSON' ? 400 : 413;
      sendJson(response, statusCode, { message: error.message });
    });
}

function handleDeleteCommand(request, response) {
  const session = getSessionFromRequest(request);

  if (!session) {
    sendJson(response, 401, { message: '未登录' });
    return;
  }

  parseRequestBody(request)
    .then((body) => {
      const id = Number.parseInt(body.id, 10);

      if (!id) {
        sendJson(response, 400, { message: '缺少历史记录 ID' });
        return;
      }

      const command = db.prepare('SELECT id FROM command_history WHERE id = ? AND username = ?').get(id, session.username);

      if (!command) {
        sendJson(response, 404, { message: '历史记录不存在' });
        return;
      }

      db.prepare('DELETE FROM command_history WHERE id = ? AND username = ?').run(id, session.username);
      sendJson(response, 200, { message: '历史记录已删除' });
    })
    .catch((error) => {
      const statusCode = error.message === 'Invalid JSON' ? 400 : 413;
      sendJson(response, statusCode, { message: error.message });
    });
}

function handleClearCommands(request, response) {
  const session = getSessionFromRequest(request);

  if (!session) {
    sendJson(response, 401, { message: '未登录' });
    return;
  }

  db.prepare('DELETE FROM command_history WHERE username = ?').run(session.username);
  sendJson(response, 200, { message: '历史记录已全部清空' });
}

function handleListCommands(request, response) {
  const session = getSessionFromRequest(request);

  if (!session) {
    sendJson(response, 401, { message: '未登录' });
    return;
  }

  const url = new URL(request.url || '/', `http://${host}:${port}`);
  const commandName = (url.searchParams.get('commandName') || '').trim();
  const keyword = (url.searchParams.get('keyword') || '').trim();
  const limit = Math.min(Math.max(Number.parseInt(url.searchParams.get('limit') || '10', 10) || 10, 1), 50);

  let sql = 'SELECT id, command_name AS commandName, command_text AS commandText, input_json AS inputJson, created_at AS createdAt FROM command_history WHERE username = ?';
  const params = [session.username];

  if (commandName) {
    sql += ' AND command_name = ?';
    params.push(commandName);
  }

  if (keyword) {
    sql += ' AND command_text LIKE ?';
    params.push(`%${keyword}%`);
  }

  sql += ' ORDER BY id DESC LIMIT ?';
  params.push(limit);

  const rows = db.prepare(sql).all(...params);
  sendJson(response, 200, { items: rows, username: session.username, version: appVersion });
}

function handleMe(request, response) {
  const session = getSessionFromRequest(request);

  if (!session) {
    sendJson(response, 401, { message: '未登录' });
    return;
  }

  sendJson(response, 200, getUserPayload(session.username));
}

function handleMaintenanceStatus(request, response) {
  sendJson(response, 200, {
    maintenanceEnabled: isMaintenanceEnabled(),
    version: appVersion
  });
}

function handleMaintenanceUpdate(request, response) {
  const session = getSessionFromRequest(request);

  if (!session) {
    sendJson(response, 401, { message: '未登录' });
    return;
  }

  parseRequestBody(request)
    .then((body) => {
      const canEnableMaintenance = isMaintenanceAdmin(session.username);
      const canDisableMaintenance = isPrivilegedUser(session.username);
      let nextEnabled;

      if (typeof body.enabled === 'boolean') {
        nextEnabled = body.enabled;
      } else if (body.enabled === 'true' || body.enabled === '1' || body.enabled === 1) {
        nextEnabled = true;
      } else if (body.enabled === 'false' || body.enabled === '0' || body.enabled === 0) {
        nextEnabled = false;
      } else {
        nextEnabled = !isMaintenanceEnabled();
      }

      if (nextEnabled && !canEnableMaintenance) {
        sendJson(response, 403, { message: '只有维护账号可以开启维护状态' });
        return;
      }

      if (!nextEnabled && !canDisableMaintenance) {
        sendJson(response, 403, { message: '只有特权账号可以关闭维护状态' });
        return;
      }

      setSettingValue('maintenance_enabled', nextEnabled ? '1' : '0');

      sendJson(response, 200, {
        message: nextEnabled ? '维护模式已开启' : '维护模式已关闭',
        ...getUserPayload(session.username)
      });
    })
    .catch((error) => {
      const statusCode = error.message === 'Invalid JSON' ? 400 : 413;
      sendJson(response, statusCode, { message: error.message });
    });
}

function serveStatic(pathname, response) {
  const safePath = resolveSafePublicPath(pathname);

  if (!safePath) {
    sendText(response, 403, '403 Forbidden');
    return;
  }

  sendFile(safePath, response);
}

function resolveSafePublicPath(pathname) {
  const requestPath = pathname.startsWith('/') ? pathname : `/${pathname}`;
  const safePath = path.resolve(publicDir, `.${requestPath}`);
  const publicRoot = `${publicDir}${path.sep}`;

  if (safePath !== publicDir && !safePath.startsWith(publicRoot)) {
    return null;
  }

  return safePath;
}

function resolvePublicFilePath(pathname) {
  const safePath = resolveSafePublicPath(pathname);

  if (!safePath) {
    return null;
  }

  try {
    const stats = fs.statSync(safePath);
    return stats.isFile() ? safePath : null;
  } catch {
    return null;
  }
}

const server = http.createServer((request, response) => {
  cleanupExpiredSessions();
  cleanupExpiredCaptchas();

  const pathname = getPathname(request.url || '/');
  const session = getSessionFromRequest(request);
  const maintenanceEnabled = isMaintenanceEnabled();
  const maintenanceAdmin = session ? isMaintenanceAdmin(session.username) : false;
  const developer = session ? isDeveloper(session.username) : false;
  const privilegedUser = maintenanceAdmin || developer;

  if (request.method === 'GET' && pathname === '/api/maintenance/status') {
    handleMaintenanceStatus(request, response);
    return;
  }

  if (request.method === 'GET' && pathname === '/api/login/captcha') {
    handleLoginCaptcha(request, response);
    return;
  }

  const isLoginAsset = pathname === '/login.html' || pathname === '/login.css' || pathname === '/login.js';
  const isAllowedApiDuringMaintenance =
    (request.method === 'POST' && (pathname === '/api/login' || pathname === '/api/logout' || pathname === '/api/register')) ||
    (request.method === 'GET' && (pathname === '/api/maintenance/status' || pathname === '/api/login/captcha'));

  if (maintenanceEnabled && !privilegedUser && !isLoginAsset && !isAllowedApiDuringMaintenance) {
    if (pathname.startsWith('/api/')) {
      sendJson(response, 503, {
        message: '当前正在维护，仅维护账号可使用',
        maintenanceEnabled: true
      });
      return;
    }

    redirectToLogin(response);
    return;
  }

  if (request.method === 'POST' && pathname === '/api/register') {
    handleRegister(request, response);
    return;
  }

  if (request.method === 'POST' && pathname === '/api/login') {
    handleLogin(request, response);
    return;
  }

  if (request.method === 'POST' && pathname === '/api/logout') {
    handleLogout(request, response);
    return;
  }

  if (request.method === 'POST' && pathname === '/api/commands') {
    handleSaveCommand(request, response);
    return;
  }

  if (request.method === 'POST' && pathname === '/api/commands/delete') {
    handleDeleteCommand(request, response);
    return;
  }

  if (request.method === 'POST' && pathname === '/api/commands/clear') {
    handleClearCommands(request, response);
    return;
  }

  if (request.method === 'POST' && pathname === '/api/vip/purchase') {
    handleVipPurchase(request, response);
    return;
  }

  if (request.method === 'POST' && pathname === '/api/svip/purchase') {
    handleSvipPurchase(request, response);
    return;
  }

  if (request.method === 'POST' && pathname === '/api/ai/generate') {
    handleAiGenerate(request, response);
    return;
  }

  if (request.method === 'POST' && pathname === '/api/ai/chat') {
    handleAiChat(request, response);
    return;
  }

  if (request.method === 'POST' && pathname === '/api/executor/run') {
    handleExecutorRun(request, response);
    return;
  }

  if (request.method === 'POST' && pathname === '/api/avatar') {
    handleAvatarUpload(request, response);
    return;
  }

  if (request.method === 'POST' && pathname === '/api/avatar/delete') {
    handleAvatarDelete(request, response);
    return;
  }

  if (request.method === 'POST' && pathname === '/api/maintenance') {
    handleMaintenanceUpdate(request, response);
    return;
  }

  if (request.method === 'GET' && pathname === '/api/developer/files') {
    handleDeveloperFiles(request, response);
    return;
  }

  if (request.method === 'GET' && pathname === '/api/developer/file') {
    handleDeveloperFileRead(request, response);
    return;
  }

  if (request.method === 'POST' && pathname === '/api/developer/file') {
    handleDeveloperFileSave(request, response);
    return;
  }

  if (request.method === 'GET' && pathname === '/api/me') {
    handleMe(request, response);
    return;
  }

  if (request.method === 'GET' && pathname === '/api/commands') {
    handleListCommands(request, response);
    return;
  }

  const staticPath = pathname === '/' ? '/index.html' : pathname;
  const publicFilePath = resolvePublicFilePath(staticPath);

  if (publicFilePath && !isLoginAsset) {
    if (!session) {
      redirectToLogin(response);
      return;
    }

    if (staticPath === '/coordinates.html') {
      const vipInfo = getVipInfo(session.username);

      if (!vipInfo.vipPurchased) {
        redirectToIndex(response);
        return;
      }
    }

    if ((staticPath === '/developer.html' || staticPath === '/developer.js') && !developer) {
      redirectToIndex(response);
      return;
    }

    serveStatic(staticPath, response);
    return;
  }

  if (pathname.startsWith('/avatars/')) {
    const avatarPath = path.normalize(path.join(avatarsDir, pathname.replace('/avatars/', '')));

    if (!avatarPath.startsWith(avatarsDir)) {
      sendText(response, 403, '403 Forbidden');
      return;
    }

    fs.readFile(avatarPath, (error, content) => {
      if (error) {
        sendText(response, 404, '404 Not Found');
        return;
      }

      const extension = path.extname(avatarPath).toLowerCase();
      response.writeHead(200, { 'Content-Type': getMimeTypeFromExtension(extension) });
      response.end(content);
    });
    return;
  }

  if (pathname === '/login.html' || pathname === '/login.css' || pathname === '/login.js') {
    serveStatic(pathname, response);
    return;
  }

  sendText(response, 404, '404 Not Found');
});

server.listen(port, host, () => {
  console.log(`Server is running at http://${host}:${port} (${appVersion})`);
});