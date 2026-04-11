const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { DatabaseSync } = require('node:sqlite');

const host = '127.0.0.1';
const port = process.env.PORT || 3000;
const publicDir = path.join(__dirname, 'public');
const dataDir = path.join(__dirname, 'data');
const databasePath = path.join(dataDir, 'users.db');
const appVersion = '0.1.1 beta';
const sessionLifetimeMs = 1000 * 60 * 60 * 24 * 7;

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
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

function handleMe(request, response) {
  const session = getSessionFromRequest(request);

  if (!session) {
    sendJson(response, 401, { message: '未登录' });
    return;
  }

  sendJson(response, 200, {
    username: session.username,
    version: appVersion
  });
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

  if (request.method === 'GET' && pathname === '/api/me') {
    handleMe(request, response);
    return;
  }

  if (pathname === '/' || pathname === '/index.html' || pathname === '/app.js' || pathname === '/styles.css') {
    if (!session) {
      redirectToLogin(response);
      return;
    }

    serveStatic(pathname === '/' ? '/index.html' : pathname, response);
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