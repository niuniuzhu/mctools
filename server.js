const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { DatabaseSync } = require('node:sqlite');

const host = process.env.HOST || '0.0.0.0';
const port = process.env.PORT || 3000;
const publicDir = path.join(__dirname, 'public');
const dataDir = path.join(__dirname, 'data');
const avatarsDir = path.join(dataDir, 'avatars');
const databasePath = path.join(dataDir, 'users.db');
const appVersion = 'beta0.8.1';
const sessionLifetimeMs = 1000 * 60 * 60 * 24 * 7;
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
  'fillBiome'
]);

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
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

const sessions = new Map();

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

function handleRegister(request, response) {
  parseRequestBody(request)
    .then((body) => {
      const username = String(body.username || '').trim();
      const password = String(body.password || '');

      if (username.length < 3 || username.length > 32) {
        sendJson(response, 400, { message: '用户名长度需为 3-32 个字符' });
        return;
      }

      if (password.length < 6) {
        sendJson(response, 400, { message: '密码长度至少 6 位' });
        return;
      }

      const existingUser = db.prepare('SELECT id FROM users WHERE username = ?').get(username);

      if (existingUser) {
        sendJson(response, 409, { message: '用户名已存在' });
        return;
      }

      const passwordHash = hashPassword(password);
      db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)').run(username, passwordHash);

      const sessionToken = createSession(username);
      setSessionCookie(response, sessionToken);
      sendJson(response, 201, { message: '注册成功', username, version: appVersion });
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

      if (!username || !password) {
        sendJson(response, 400, { message: '请输入用户名和密码' });
        return;
      }

      const user = db.prepare('SELECT username, password_hash FROM users WHERE username = ?').get(username);

      if (!user || !verifyPassword(password, user.password_hash)) {
        sendJson(response, 401, { message: '用户名或密码错误' });
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
    ...getVipInfo(username)
  };
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

function serveStatic(pathname, response) {
  const normalizedPath = path.normalize(path.join(publicDir, pathname)).replace(/^([.][.][/\\])+/, '');

  if (!normalizedPath.startsWith(publicDir)) {
    sendText(response, 403, '403 Forbidden');
    return;
  }

  sendFile(normalizedPath, response);
}

const server = http.createServer((request, response) => {
  cleanupExpiredSessions();

  const pathname = getPathname(request.url || '/');
  const session = getSessionFromRequest(request);

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

  if (request.method === 'GET' && pathname === '/api/me') {
    handleMe(request, response);
    return;
  }

  if (request.method === 'GET' && pathname === '/api/commands') {
    handleListCommands(request, response);
    return;
  }

  if (
    pathname === '/' ||
    pathname === '/index.html' ||
    pathname === '/commands.html' ||
    pathname === '/tutorial.html' ||
    pathname === '/recipes.html' ||
    pathname === '/coordinates.html' ||
    pathname === '/app.js' ||
    pathname === '/coordinates.js' ||
    pathname === '/styles.css'
  ) {
    if (!session) {
      redirectToLogin(response);
      return;
    }

    if (pathname === '/coordinates.html') {
      const vipInfo = getVipInfo(session.username);

      if (!vipInfo.vipPurchased) {
        redirectToIndex(response);
        return;
      }
    }

    serveStatic(pathname === '/' ? '/index.html' : pathname, response);
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
  console.log(`Server is running at http://${host}:${port}`);
});