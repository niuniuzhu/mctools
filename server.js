const http = require('http');
const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const QRCode = require('qrcode');
const { DatabaseSync } = require('node:sqlite');

const host = process.env.HOST || '0.0.0.0';
const port = process.env.PORT || 3001;
const publicDir = path.join(__dirname, 'public');
const configDir = path.join(__dirname, 'config');
const dataDir = path.join(__dirname, 'data');
const avatarsDir = path.join(dataDir, 'avatars');
const databasePath = path.join(dataDir, 'users.db');
const apiKeysConfigPath = path.join(configDir, 'api-keys.json');
const sourceAppVersion = '正式版1.4';
let appVersion = sourceAppVersion;
const vipSystemPaused = true;
const aiMaintenanceEndsAt = new Date('2026-05-17T17:40:00+08:00');
const sessionLifetimeMs = 1000 * 60 * 60 * 24 * 7;
const developerRegistrationSecret = 'McTools2026!';
const localDevQuickEntryLifetimeMs = 1000 * 60 * 5;
const developerEditableExtensions = new Set(['.js', '.html', '.css', '.json', '.md', '.txt', '.bat', '.svg']);
const previewablePublicPages = new Set([
  '/ai.html',
  '/automation-guide.html',
  '/bug-report.html',
  '/build-lab.html',
  '/cloud-play.html',
  '/text-converter.html',
  '/unit-converter.html',
  '/base-converter.html',
  '/entertainment-assistant.html',
  '/coin-collector.html',
  '/json-tools.html',
  '/calculator.html',
  '/commands.html',
  '/command-community.html',
  '/coordinates.html',
  '/qrcode-generator.html',
  '/fps-test.html',
  '/fun.html',
  '/index.html',
  '/ios-liquid-glass.html',
  '/mods.html',
  '/official-downloads.html',
  '/pack-center.html',
  '/page-detection.html',
  '/recipes.html',
  '/redstone-lab.html',
  '/scan-login.html',
  '/seed-lab.html',
  '/server-hub.html',
  '/settings.html',
  '/shader-download.html',
  '/store.html',
  '/sandbox-1201.html',
  '/time-management.html',
  '/modpack-installer-1201.html',
  '/extension-hub.html',
  '/launch-game.html',
  '/survival-board.html',
  '/tutorial.html',
  '/niuniu-toolbox.html',
  '/niuniu-utility.html'
]);
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
  CREATE TABLE IF NOT EXISTS command_submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    submitter_name TEXT NOT NULL,
    command_text TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    category TEXT NOT NULL DEFAULT '通用',
    status TEXT NOT NULL DEFAULT 'PENDING',
    reviewer_name TEXT NOT NULL DEFAULT '',
    review_note TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS community_accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL DEFAULT '',
    is_developer INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_login_at TEXT
  )
`);

try {
  const communityColumns = db.prepare('PRAGMA table_info(community_accounts)').all().map((column) => column.name);
  if (!communityColumns.includes('last_login_at')) {
    db.exec('ALTER TABLE community_accounts ADD COLUMN last_login_at TEXT');
  }
  if (!communityColumns.includes('is_developer')) {
    db.exec('ALTER TABLE community_accounts ADD COLUMN is_developer INTEGER NOT NULL DEFAULT 0');
  }
  if (!communityColumns.includes('password_hash')) {
    db.exec("ALTER TABLE community_accounts ADD COLUMN password_hash TEXT NOT NULL DEFAULT ''");
  }
} catch {
  // Keep startup resilient if migration fails unexpectedly.
}

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

db.exec(`
  CREATE TABLE IF NOT EXISTS bug_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    contact TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'OPEN',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS store_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_no TEXT NOT NULL UNIQUE,
    product_code TEXT NOT NULL,
    product_name TEXT NOT NULL,
    amount_fen INTEGER NOT NULL,
    currency TEXT NOT NULL DEFAULT 'CNY',
    status TEXT NOT NULL DEFAULT 'PENDING',
    card_secret TEXT NOT NULL DEFAULT '',
    mch_id TEXT NOT NULL DEFAULT '',
    app_id TEXT NOT NULL DEFAULT '',
    code_url TEXT NOT NULL DEFAULT '',
    wechat_prepay_id TEXT NOT NULL DEFAULT '',
    wechat_transaction_id TEXT NOT NULL DEFAULT '',
    request_json TEXT NOT NULL DEFAULT '',
    response_json TEXT NOT NULL DEFAULT '',
    notify_json TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`);

try {
  const storeOrderColumns = db.prepare('PRAGMA table_info(store_orders)').all().map((column) => column.name);
  if (!storeOrderColumns.includes('card_secret')) {
    db.exec('ALTER TABLE store_orders ADD COLUMN card_secret TEXT NOT NULL DEFAULT \"\"');
  }
} catch {
  // Keep startup resilient if migration fails unexpectedly.
}

db.exec(`
  CREATE TABLE IF NOT EXISTS store_products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    original_price_fen INTEGER NOT NULL DEFAULT 100,
    sale_price_fen INTEGER NOT NULL DEFAULT 100,
    currency TEXT NOT NULL DEFAULT 'CNY',
    is_active INTEGER NOT NULL DEFAULT 1,
    sort_order INTEGER NOT NULL DEFAULT 100,
    tags_json TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS server_listings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    server_name TEXT NOT NULL,
    ip_address TEXT NOT NULL,
    avatar_path TEXT,
    game_edition TEXT NOT NULL DEFAULT 'international',
    description TEXT NOT NULL DEFAULT '',
    server_type TEXT NOT NULL DEFAULT 'survival',
    version TEXT NOT NULL DEFAULT '',
    max_players INTEGER NOT NULL DEFAULT 0,
    contact TEXT NOT NULL DEFAULT '',
    submitter_name TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'PENDING',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS plaza_accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_login_at TEXT
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS site_daily_visits (
    date_text TEXT NOT NULL,
    visitor_key TEXT NOT NULL,
    first_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (date_text, visitor_key)
  )
`);

try {
  const serverListingColumns = db.prepare('PRAGMA table_info(server_listings)').all().map((column) => column.name);

  if (!serverListingColumns.includes('game_edition')) {
    db.exec("ALTER TABLE server_listings ADD COLUMN game_edition TEXT DEFAULT 'international'");
    db.exec("UPDATE server_listings SET game_edition = 'international' WHERE game_edition IS NULL OR game_edition = ''");
  }

  if (!serverListingColumns.includes('avatar_path')) {
    db.exec('ALTER TABLE server_listings ADD COLUMN avatar_path TEXT');
  }
} catch {
  // Keep startup resilient if migration fails unexpectedly.
}

const sessions = new Map();
const loginCaptchas = new Map();
const localDevQuickEntryTokens = new Map();
const qrLoginTickets = new Map();
const plazaVerifyCodes = new Map(); // email -> {code, username, expiresAt}
const plazaSessions = new Map();    // token -> {username, email, expiresAt}
const communityVerifyCodes = new Map(); // email -> {code, username, expiresAt}
const communitySessions = new Map(); // token -> {username, email, expiresAt}
const siteOnlineVisitors = new Map(); // visitorKey -> {lastSeenAt, pathname, userAgent}
const captchaLifetimeMs = 1000 * 60 * 5;
const qrLoginTicketLifetimeMs = 1000 * 60 * 3;
const plazaVerifyCodeLifetimeMs = 1000 * 60 * 10;
const plazaSessionLifetimeMs = 1000 * 60 * 60 * 24 * 3;
const communityVerifyCodeLifetimeMs = 1000 * 60 * 10;
const communitySessionLifetimeMs = 1000 * 60 * 60 * 24 * 3;
const siteOnlineVisitorLifetimeMs = 1000 * 75;
const watchedCommunityEmails = ['naicha638104@163.com', '3805506653@qq.com'];
const authEmailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;

const defaultStoreProducts = [
  {
    productCode: '65997548',
    name: '星际无限资源服管理',
    description: '主商品：资源服管理服务。',
    originalPriceFen: 1500,
    salePriceFen: 100,
    currency: 'CNY',
    isActive: 1,
    sortOrder: 10,
    tags: ['资源服', '官方', '热卖']
  },
  {
    productCode: 'CMD-20CB-IN',
    name: '指令代做 · 20cb 以内',
    description: '适合 20cb 以内基础指令代做。',
    originalPriceFen: 2000,
    salePriceFen: 100,
    currency: 'CNY',
    isActive: 1,
    sortOrder: 20,
    tags: ['指令代做', '20cb以内']
  },
  {
    productCode: 'CMD-20CB-PLUS',
    name: '指令代做 · 20cb 以上',
    description: '适合 20cb 以上复杂指令代做。',
    originalPriceFen: 4000,
    salePriceFen: 100,
    currency: 'CNY',
    isActive: 1,
    sortOrder: 30,
    tags: ['指令代做', '20cb以上']
  },
  {
    productCode: 'BUILD-IMPORT-ONCE',
    name: '建筑导入一次',
    description: '一次性建筑导入服务。',
    originalPriceFen: 2000,
    salePriceFen: 100,
    currency: 'CNY',
    isActive: 1,
    sortOrder: 40,
    tags: ['建筑导入', '一次']
  }
];

function seedStoreProductsIfEmpty() {
  const row = db.prepare('SELECT COUNT(1) AS count FROM store_products').get();
  const count = Number(row?.count || 0);

  if (count > 0) {
    return;
  }

  const insert = db.prepare(
    `INSERT INTO store_products (
      product_code, name, description, original_price_fen, sale_price_fen, currency, is_active, sort_order, tags_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  for (const product of defaultStoreProducts) {
    insert.run(
      product.productCode,
      product.name,
      product.description,
      product.originalPriceFen,
      product.salePriceFen,
      product.currency,
      product.isActive,
      product.sortOrder,
      JSON.stringify(product.tags || [])
    );
  }
}

seedStoreProductsIfEmpty();

function isValidAuthUsername(username) {
  return typeof username === 'string' && username.length > 0 && username.length <= 32;
}

function isValidAuthEmail(email) {
  return typeof email === 'string' && authEmailRegex.test(email);
}

function setScopedAuthCookie(response, cookieName, cookiePath, token, lifetimeMs) {
  response.setHeader('Set-Cookie', [
    `${cookieName}=${token}; HttpOnly; Path=${cookiePath}; Max-Age=${Math.floor(lifetimeMs / 1000)}; SameSite=Lax`,
    `${cookieName}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`
  ]);
}

function clearScopedAuthCookie(response, cookieName, cookiePath) {
  response.setHeader('Set-Cookie', [
    `${cookieName}=; HttpOnly; Path=${cookiePath}; Max-Age=0; SameSite=Lax`,
    `${cookieName}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`
  ]);
}

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

function sendHtml(response, statusCode, content) {
  response.writeHead(statusCode, { 'Content-Type': 'text/html; charset=utf-8' });
  response.end(content);
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

function readConfiguredFileText(filePath) {
  const normalizedPath = String(filePath || '').trim();

  if (!normalizedPath) {
    return '';
  }

  const absolutePath = path.isAbsolute(normalizedPath) ? normalizedPath : path.join(__dirname, normalizedPath);

  if (!fs.existsSync(absolutePath)) {
    return '';
  }

  try {
    return fs.readFileSync(absolutePath, 'utf8');
  } catch {
    return '';
  }
}

function normalizePemText(text) {
  return String(text || '').replace(/\r\n/g, '\n').replace(/\\n/g, '\n').trim();
}

function getWechatPayConfig() {
  const privateKeyPath = getConfiguredValue('WECHATPAY_PRIVATE_KEY_PATH', 'wechatPayPrivateKeyPath');
  const inlinePrivateKey = getConfiguredValue('WECHATPAY_PRIVATE_KEY', 'wechatPayPrivateKey');
  const privateKeyPem = normalizePemText(privateKeyPath ? readConfiguredFileText(privateKeyPath) : inlinePrivateKey);

  return {
    appId: getConfiguredValue('WECHATPAY_APPID', 'wechatPayAppId'),
    mchId: getConfiguredValue('WECHATPAY_MCHID', 'wechatPayMchId'),
    serialNo: getConfiguredValue('WECHATPAY_MERCHANT_SERIAL_NO', 'wechatPayMerchantSerialNo'),
    apiV3Key: getConfiguredValue('WECHATPAY_API_V3_KEY', 'wechatPayApiV3Key'),
    notifyUrl: getConfiguredValue('WECHATPAY_NOTIFY_URL', 'wechatPayNotifyUrl'),
    privateKeyPem
  };
}

function getWechatPayReadiness() {
  const config = getWechatPayConfig();
  const missing = [];

  if (!config.appId) missing.push('appId');
  if (!config.mchId) missing.push('mchId');
  if (!config.serialNo) missing.push('serialNo');
  if (!config.apiV3Key) missing.push('apiV3Key');
  if (!config.notifyUrl) missing.push('notifyUrl');
  if (!config.privateKeyPem) missing.push('privateKey');

  return {
    ready: missing.length === 0,
    missing
  };
}

function getHongxingPayConfig() {
  const createUrl = getConfiguredValue('HONGXING_PAY_CREATE_URL', 'hongxingPayCreateUrl');
  const queryUrl = getConfiguredValue('HONGXING_PAY_QUERY_URL', 'hongxingPayQueryUrl');
  const apiKey = getConfiguredValue('HONGXING_PAY_API_KEY', 'hongxingPayApiKey');
  const merchantId = getConfiguredValue('HONGXING_PAY_MERCHANT_ID', 'hongxingPayMerchantId');
  const payType = String(getConfiguredValue('HONGXING_PAY_PAY_TYPE', 'hongxingPayPayType', 'wxpay') || 'wxpay').trim().toLowerCase();
  const signType = String(getConfiguredValue('HONGXING_PAY_SIGN_TYPE', 'hongxingPaySignType', 'MD5') || 'MD5').trim().toUpperCase();
  const notifyUrl = getConfiguredValue('HONGXING_PAY_NOTIFY_URL', 'hongxingPayNotifyUrl');
  const returnUrl = getConfiguredValue('HONGXING_PAY_RETURN_URL', 'hongxingPayReturnUrl');
  const createMethod = String(getConfiguredValue('HONGXING_PAY_CREATE_METHOD', 'hongxingPayCreateMethod', 'POST') || 'POST').trim().toUpperCase();
  const queryMethod = String(getConfiguredValue('HONGXING_PAY_QUERY_METHOD', 'hongxingPayQueryMethod', 'POST') || 'POST').trim().toUpperCase();

  return {
    enabled: Boolean(createUrl || queryUrl),
    createUrl: createUrl || queryUrl,
    queryUrl,
    apiKey,
    merchantId,
    payType,
    signType,
    notifyUrl,
    returnUrl,
    createMethod: createMethod === 'GET' ? 'GET' : 'POST',
    queryMethod: queryMethod === 'GET' ? 'GET' : 'POST'
  };
}

function getHongxingPayReadiness() {
  const config = getHongxingPayConfig();
  const missing = [];

  if (!config.createUrl) {
    missing.push('createUrl');
  }

  if (!config.queryUrl) {
    missing.push('queryUrl');
  }

  return {
    ready: missing.length === 0,
    missing
  };
}

function getStorePaymentReadiness() {
  const hongxing = getHongxingPayReadiness();
  if (hongxing.ready) {
    return {
      ready: true,
      provider: 'hongxing',
      missing: [],
      providers: {
        hongxing,
        wechat: getWechatPayReadiness()
      }
    };
  }

  const wechat = getWechatPayReadiness();
  return {
    ready: wechat.ready,
    provider: wechat.ready ? 'wechat' : '',
    missing: wechat.missing,
    providers: {
      hongxing,
      wechat
    }
  };
}

function normalizeStoreProductRow(row) {
  if (!row) {
    return null;
  }

  let tags = [];
  try {
    const parsedTags = JSON.parse(String(row.tagsJson || '[]'));
    tags = Array.isArray(parsedTags) ? parsedTags.map((tag) => String(tag || '').trim()).filter(Boolean) : [];
  } catch {
    tags = [];
  }

  const originalPriceFen = Number(row.originalPriceFen || 0);
  const salePriceFen = Number(row.salePriceFen || 0);

  return {
    id: Number(row.id || 0),
    productCode: String(row.productCode || ''),
    name: String(row.name || ''),
    description: String(row.description || ''),
    originalPriceFen,
    salePriceFen,
    currency: String(row.currency || 'CNY').toUpperCase(),
    isActive: Boolean(Number(row.isActive || 0)),
    sortOrder: Number(row.sortOrder || 100),
    tags,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    originalPrice: Number((originalPriceFen / 100).toFixed(2)),
    salePrice: Number((salePriceFen / 100).toFixed(2)),
    discountFen: Math.max(0, originalPriceFen - salePriceFen)
  };
}

function getStoreProductByCode(productCode, includeInactive = false) {
  const normalizedCode = String(productCode || '').trim();

  if (!normalizedCode) {
    return null;
  }

  const row = includeInactive
    ? db.prepare(
      `SELECT id, product_code AS productCode, name, description,
        original_price_fen AS originalPriceFen,
        sale_price_fen AS salePriceFen,
        currency, is_active AS isActive, sort_order AS sortOrder,
        tags_json AS tagsJson, created_at AS createdAt, updated_at AS updatedAt
      FROM store_products WHERE product_code = ?`
    ).get(normalizedCode)
    : db.prepare(
      `SELECT id, product_code AS productCode, name, description,
        original_price_fen AS originalPriceFen,
        sale_price_fen AS salePriceFen,
        currency, is_active AS isActive, sort_order AS sortOrder,
        tags_json AS tagsJson, created_at AS createdAt, updated_at AS updatedAt
      FROM store_products WHERE product_code = ? AND is_active = 1`
    ).get(normalizedCode);

  return normalizeStoreProductRow(row);
}

function listStoreProducts(includeInactive = false) {
  const rows = includeInactive
    ? db.prepare(
      `SELECT id, product_code AS productCode, name, description,
        original_price_fen AS originalPriceFen,
        sale_price_fen AS salePriceFen,
        currency, is_active AS isActive, sort_order AS sortOrder,
        tags_json AS tagsJson, created_at AS createdAt, updated_at AS updatedAt
      FROM store_products
      ORDER BY sort_order ASC, id ASC`
    ).all()
    : db.prepare(
      `SELECT id, product_code AS productCode, name, description,
        original_price_fen AS originalPriceFen,
        sale_price_fen AS salePriceFen,
        currency, is_active AS isActive, sort_order AS sortOrder,
        tags_json AS tagsJson, created_at AS createdAt, updated_at AS updatedAt
      FROM store_products
      WHERE is_active = 1
      ORDER BY sort_order ASC, id ASC`
    ).all();

  return rows.map(normalizeStoreProductRow).filter(Boolean);
}

function sanitizeStoreTags(tagsInput) {
  if (Array.isArray(tagsInput)) {
    return tagsInput.map((tag) => String(tag || '').trim()).filter(Boolean).slice(0, 8);
  }

  return String(tagsInput || '')
    .split(/[,，]/)
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 8);
}

function requireCommunityDeveloper(request, response) {
  const session = getCommunitySessionFromRequest(request);

  if (!session) {
    sendJson(response, 401, { message: '请先登录社区账号' });
    return null;
  }

  const account = getCommunityAccountByEmail(session.email);
  const isCommunityDeveloper = Boolean(session.isDeveloper || account?.isDeveloper || isDeveloper(session.username));

  if (!isCommunityDeveloper) {
    sendJson(response, 403, { message: '仅开发者可操作商品配置' });
    return null;
  }

  return {
    username: session.username,
    email: session.email,
    isDeveloper: true
  };
}

function handleStoreProducts(request, response) {
  sendJson(response, 200, {
    products: listStoreProducts(false)
  });
}

function handleStoreProductsAdmin(request, response) {
  const session = requireCommunityDeveloper(request, response);

  if (!session) {
    return;
  }

  sendJson(response, 200, {
    products: listStoreProducts(true),
    operator: session.username
  });
}

function handleStoreProductsCreate(request, response) {
  const session = requireCommunityDeveloper(request, response);

  if (!session) {
    return;
  }

  parseRequestBody(request)
    .then((body) => {
      const productCode = String(body.productCode || '').trim().toUpperCase();
      const name = String(body.name || '').trim();
      const description = String(body.description || '').trim();
      const originalPriceFen = Number(body.originalPriceFen);
      const salePriceFen = Number(body.salePriceFen);
      const sortOrder = Number(body.sortOrder ?? 100);
      const isActive = body.isActive === false || body.isActive === 0 || body.isActive === '0' ? 0 : 1;
      const tags = sanitizeStoreTags(body.tags);

      if (!/^[A-Z0-9_-]{3,48}$/.test(productCode)) {
        sendJson(response, 400, { message: '商品编码仅支持 3-48 位大写字母、数字、下划线或中划线' });
        return;
      }

      if (!name || name.length > 60) {
        sendJson(response, 400, { message: '商品名称不能为空，且不能超过 60 个字符' });
        return;
      }

      if (!Number.isInteger(originalPriceFen) || originalPriceFen <= 0) {
        sendJson(response, 400, { message: '原价必须为大于 0 的整数分' });
        return;
      }

      if (!Number.isInteger(salePriceFen) || salePriceFen <= 0) {
        sendJson(response, 400, { message: '优惠价必须为大于 0 的整数分' });
        return;
      }

      if (salePriceFen > originalPriceFen) {
        sendJson(response, 400, { message: '优惠价不能高于原价' });
        return;
      }

      db.prepare(
        `INSERT INTO store_products (
          product_code, name, description, original_price_fen, sale_price_fen,
          currency, is_active, sort_order, tags_json, updated_at
        ) VALUES (?, ?, ?, ?, ?, 'CNY', ?, ?, ?, CURRENT_TIMESTAMP)`
      ).run(
        productCode,
        name,
        description,
        originalPriceFen,
        salePriceFen,
        isActive,
        Number.isFinite(sortOrder) ? Math.round(sortOrder) : 100,
        JSON.stringify(tags)
      );

      sendJson(response, 201, {
        message: '商品创建成功',
        product: getStoreProductByCode(productCode, true)
      });
    })
    .catch((error) => {
      const message = String(error?.message || '创建商品失败');
      if (message.includes('UNIQUE')) {
        sendJson(response, 409, { message: '商品编码已存在' });
        return;
      }
      sendJson(response, 400, { message });
    });
}

function handleStoreProductsUpdate(request, response) {
  const session = requireCommunityDeveloper(request, response);

  if (!session) {
    return;
  }

  parseRequestBody(request)
    .then((body) => {
      const productCode = String(body.productCode || '').trim().toUpperCase();
      const existing = getStoreProductByCode(productCode, true);

      if (!existing) {
        sendJson(response, 404, { message: '商品不存在' });
        return;
      }

      const name = body.name === undefined ? existing.name : String(body.name || '').trim();
      const description = body.description === undefined ? existing.description : String(body.description || '').trim();
      const originalPriceFen = body.originalPriceFen === undefined ? existing.originalPriceFen : Number(body.originalPriceFen);
      const salePriceFen = body.salePriceFen === undefined ? existing.salePriceFen : Number(body.salePriceFen);
      const sortOrder = body.sortOrder === undefined ? existing.sortOrder : Number(body.sortOrder);
      const tags = body.tags === undefined ? existing.tags : sanitizeStoreTags(body.tags);

      if (!name || name.length > 60) {
        sendJson(response, 400, { message: '商品名称不能为空，且不能超过 60 个字符' });
        return;
      }

      if (!Number.isInteger(originalPriceFen) || originalPriceFen <= 0) {
        sendJson(response, 400, { message: '原价必须为大于 0 的整数分' });
        return;
      }

      if (!Number.isInteger(salePriceFen) || salePriceFen <= 0) {
        sendJson(response, 400, { message: '优惠价必须为大于 0 的整数分' });
        return;
      }

      if (salePriceFen > originalPriceFen) {
        sendJson(response, 400, { message: '优惠价不能高于原价' });
        return;
      }

      db.prepare(
        `UPDATE store_products SET
          name = ?,
          description = ?,
          original_price_fen = ?,
          sale_price_fen = ?,
          sort_order = ?,
          tags_json = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE product_code = ?`
      ).run(
        name,
        description,
        originalPriceFen,
        salePriceFen,
        Number.isFinite(sortOrder) ? Math.round(sortOrder) : existing.sortOrder,
        JSON.stringify(tags),
        productCode
      );

      sendJson(response, 200, {
        message: '商品更新成功',
        product: getStoreProductByCode(productCode, true)
      });
    })
    .catch((error) => {
      sendJson(response, 400, { message: error.message || '更新商品失败' });
    });
}

function handleStoreProductsToggle(request, response) {
  const session = requireCommunityDeveloper(request, response);

  if (!session) {
    return;
  }

  parseRequestBody(request)
    .then((body) => {
      const productCode = String(body.productCode || '').trim().toUpperCase();
      const nextActive = body.isActive === true || body.isActive === 1 || body.isActive === '1';
      const existing = getStoreProductByCode(productCode, true);

      if (!existing) {
        sendJson(response, 404, { message: '商品不存在' });
        return;
      }

      db.prepare('UPDATE store_products SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE product_code = ?').run(
        nextActive ? 1 : 0,
        productCode
      );

      sendJson(response, 200, {
        message: nextActive ? '商品已上架' : '商品已下架',
        product: getStoreProductByCode(productCode, true)
      });
    })
    .catch((error) => {
      sendJson(response, 400, { message: error.message || '切换状态失败' });
    });
}

function getClientIpAddress(request) {
  const forwardedFor = String(request.headers['x-forwarded-for'] || '').split(',')[0].trim();
  const remoteAddress = String(request.socket?.remoteAddress || request.connection?.remoteAddress || '').trim();
  return forwardedFor || remoteAddress || '127.0.0.1';
}

function readRequestText(request) {
  return new Promise((resolve, reject) => {
    let body = '';

    request.on('data', (chunk) => {
      body += chunk;

      if (body.length > 1024 * 1024 * 5) {
        reject(new Error('Payload too large'));
        request.destroy();
      }
    });

    request.on('end', () => {
      resolve(body);
    });

    request.on('error', reject);
  });
}

function createStoreOrderNo() {
  return `SP${Date.now()}${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

function signWechatPayRequest(method, requestPath, bodyText, mchId, serialNo, privateKeyPem) {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonceStr = crypto.randomBytes(16).toString('hex');
  const message = `${method}\n${requestPath}\n${timestamp}\n${nonceStr}\n${bodyText}\n`;
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(message);
  signer.end();

  const signature = signer.sign(normalizePemText(privateKeyPem), 'base64');
  return `WECHATPAY2-SHA256-RSA2048 mchid="${mchId}",nonce_str="${nonceStr}",timestamp="${timestamp}",serial_no="${serialNo}",signature="${signature}"`;
}

function requestJson(urlString, options, bodyText = '') {
  const url = new URL(urlString);
  const requestOptions = {
    protocol: url.protocol,
    hostname: url.hostname,
    port: url.port || undefined,
    path: `${url.pathname}${url.search}`,
    method: options.method || 'GET',
    headers: options.headers || {}
  };
  const transport = url.protocol === 'https:' ? https : http;

  return new Promise((resolve, reject) => {
    const request = transport.request(requestOptions, (response) => {
      let responseBody = '';
      response.setEncoding('utf8');
      response.on('data', (chunk) => {
        responseBody += chunk;
      });
      response.on('end', () => {
        resolve({
          statusCode: response.statusCode || 0,
          headers: response.headers,
          body: responseBody
        });
      });
    });

    request.on('error', reject);

    if (bodyText) {
      request.write(bodyText);
    }

    request.end();
  });
}

function parseMaybeJson(text) {
  const normalized = String(text || '').trim();

  if (!normalized) {
    return {};
  }

  try {
    return JSON.parse(normalized);
  } catch {
    return { raw: normalized };
  }
}

function normalizePaymentSuccess(value) {
  if (value === true) {
    return true;
  }

  const normalized = String(value || '').trim().toUpperCase();
  return ['SUCCESS', 'TRADE_SUCCESS', 'PAID', 'PAY_SUCCESS', '1', 'TRUE', 'Y', 'YES', 'COMPLETED'].includes(normalized);
}

function pickFirstDefined(source, paths) {
  for (const pathKey of paths) {
    const parts = String(pathKey || '').split('.').filter(Boolean);
    let cursor = source;

    for (const part of parts) {
      if (!cursor || typeof cursor !== 'object' || !(part in cursor)) {
        cursor = undefined;
        break;
      }
      cursor = cursor[part];
    }

    if (cursor !== undefined && cursor !== null && String(cursor).trim() !== '') {
      return cursor;
    }
  }

  return '';
}

function extractPaymentQrText(payload) {
  return String(pickFirstDefined(payload, [
    'code_url',
    'codeUrl',
    'qrCode',
    'qr_code',
    'qrcode',
    'payUrl',
    'pay_url',
    'url',
    'data.code_url',
    'data.codeUrl',
    'data.qrCode',
    'data.qr_code',
    'data.qrcode',
    'data.payUrl',
    'data.pay_url',
    'data.url'
  ]) || '').trim();
}

function extractPaymentTransactionId(payload) {
  return String(pickFirstDefined(payload, [
    'transactionId',
    'transaction_id',
    'tradeNo',
    'trade_no',
    'payOrderNo',
    'pay_order_no',
    'data.transactionId',
    'data.transaction_id',
    'data.tradeNo',
    'data.trade_no',
    'data.payOrderNo',
    'data.pay_order_no'
  ]) || '').trim();
}

function extractPaymentStatus(payload, fallback = 'PENDING') {
  return String(pickFirstDefined(payload, [
    'status',
    'tradeStatus',
    'trade_status',
    'payStatus',
    'pay_status',
    'data.status',
    'data.tradeStatus',
    'data.trade_status',
    'data.payStatus',
    'data.pay_status'
  ]) || fallback).trim().toUpperCase();
}

function isRootPathUrl(urlString) {
  try {
    const parsed = new URL(String(urlString || ''));
    return parsed.pathname === '/' || parsed.pathname === '';
  } catch {
    return false;
  }
}

function buildHongxingSignText(params, userKey) {
  const signParams = {
    money: params.money,
    name: params.name,
    notify_url: params.notifyUrl,
    out_trade_no: params.outTradeNo,
    pid: params.pid,
    return_url: params.returnUrl,
    sitename: params.sitename,
    type: params.type
  };

  const signText = Object.keys(signParams)
    .filter((key) => signParams[key] !== undefined && signParams[key] !== null && String(signParams[key]).trim() !== '')
    .sort()
    .map((key) => `${key}=${signParams[key]}`)
    .join('&');

  return `${signText}${userKey}`;
}

function buildHongxingSubmitPayUrl(params, config) {
  const createBase = String(config.createUrl || '').trim();
  const baseUrl = new URL(createBase);
  const signText = buildHongxingSignText(params, config.apiKey || '');
  const sign = crypto.createHash('md5').update(signText, 'utf8').digest('hex');
  const submitUrl = new URL('/submit.php', `${baseUrl.protocol}//${baseUrl.host}`);

  submitUrl.searchParams.set('pid', params.pid);
  submitUrl.searchParams.set('type', params.type);
  submitUrl.searchParams.set('out_trade_no', params.outTradeNo);
  submitUrl.searchParams.set('notify_url', params.notifyUrl);
  submitUrl.searchParams.set('return_url', params.returnUrl);
  submitUrl.searchParams.set('name', params.name);
  submitUrl.searchParams.set('money', params.money);
  submitUrl.searchParams.set('sign', sign);
  submitUrl.searchParams.set('sign_type', config.signType || 'MD5');

  return submitUrl.toString();
}

function buildHongxingOrderQueryUrl(config, orderNo) {
  const queryBase = String(config.queryUrl || '').trim();

  if (!queryBase) {
    return '';
  }

  if (isRootPathUrl(queryBase) && config.merchantId && config.apiKey) {
    const baseUrl = new URL(queryBase);
    const apiUrl = new URL('/api.php', `${baseUrl.protocol}//${baseUrl.host}`);
    apiUrl.searchParams.set('act', 'order');
    apiUrl.searchParams.set('pid', String(config.merchantId));
    apiUrl.searchParams.set('userkey', String(config.apiKey));
    apiUrl.searchParams.set('out_trade_no', String(orderNo));
    return apiUrl.toString();
  }

  return queryBase;
}

async function trySyncStoreOrderFromHongxing(order) {
  if (!order || !order.orderNo) {
    return false;
  }

  const currentStatus = String(order.status || '').trim().toUpperCase();
  if (currentStatus === 'SUCCESS' || currentStatus === 'TRADE_SUCCESS') {
    return true;
  }

  const config = getHongxingPayConfig();
  if (!config.enabled || !config.queryUrl) {
    return false;
  }

  const resolvedQueryUrl = buildHongxingOrderQueryUrl(config, order.orderNo);
  if (!resolvedQueryUrl) {
    return false;
  }

  const payload = {
    orderNo: order.orderNo,
    outTradeNo: order.orderNo,
    productCode: order.productCode,
    amountFen: Number(order.amountFen || 0),
    merchantId: config.merchantId || ''
  };

  let requestUrl = resolvedQueryUrl;
  let bodyText = '';

  const useGetQuery = isRootPathUrl(config.queryUrl) || config.queryMethod === 'GET';

  if (useGetQuery) {
    const url = new URL(resolvedQueryUrl);
    url.searchParams.set('orderNo', String(payload.orderNo));
    url.searchParams.set('outTradeNo', String(payload.outTradeNo));
    if (payload.merchantId) {
      url.searchParams.set('merchantId', String(payload.merchantId));
    }
    requestUrl = url.toString();
  } else {
    bodyText = JSON.stringify(payload);
  }

  const headers = {
    Accept: 'application/json'
  };

  if (!useGetQuery) {
    headers['Content-Type'] = 'application/json; charset=utf-8';
  }

  if (config.apiKey && !isRootPathUrl(config.queryUrl)) {
    headers.Authorization = `Bearer ${config.apiKey}`;
    headers['X-Api-Key'] = config.apiKey;
  }

  const queryResponse = await requestJson(requestUrl, {
    method: useGetQuery ? 'GET' : config.queryMethod,
    headers
  }, bodyText);

  if (queryResponse.statusCode < 200 || queryResponse.statusCode >= 300) {
    return false;
  }

  const parsed = parseMaybeJson(queryResponse.body);
  const paid = normalizePaymentSuccess(
    parsed.paid
    ?? parsed.isPaid
    ?? parsed.success
    ?? parsed.tradeSuccess
    ?? parsed.status
    ?? parsed.tradeStatus
    ?? parsed.trade_status
    ?? parsed.payStatus
    ?? parsed.pay_status
  );

  if (!paid) {
    return false;
  }

  const nextStatus = extractPaymentStatus(parsed, 'SUCCESS') || 'SUCCESS';
  const transactionId = extractPaymentTransactionId(parsed);

  updateStoreOrder(order.orderNo, {
    status: nextStatus,
    transactionId,
    responseJson: JSON.stringify({
      source: 'hongxing-query',
      queriedAt: new Date().toISOString(),
      data: parsed
    })
  });

  return true;
}

function getStoreOrderByNo(orderNo) {
  return db.prepare(
    'SELECT order_no AS orderNo, product_code AS productCode, product_name AS productName, amount_fen AS amountFen, currency, status, card_secret AS cardSecret, mch_id AS mchId, app_id AS appId, code_url AS codeUrl, wechat_prepay_id AS prepayId, wechat_transaction_id AS transactionId, request_json AS requestJson, response_json AS responseJson, notify_json AS notifyJson, created_at AS createdAt, updated_at AS updatedAt FROM store_orders WHERE order_no = ?'
  ).get(orderNo) || null;
}

function createStoreCardSecret(orderNo) {
  const normalizedOrderNo = String(orderNo || '').trim().toUpperCase();
  const suffix = normalizedOrderNo.slice(-6) || crypto.randomBytes(3).toString('hex').toUpperCase();
  return `MC-${suffix}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

function ensureStoreOrderCardSecret(orderNo) {
  const order = getStoreOrderByNo(orderNo);

  if (!order) {
    return '';
  }

  if (String(order.cardSecret || '').trim()) {
    return String(order.cardSecret).trim();
  }

  const cardSecret = createStoreCardSecret(orderNo);
  db.prepare('UPDATE store_orders SET card_secret = ?, updated_at = CURRENT_TIMESTAMP WHERE order_no = ?').run(cardSecret, orderNo);
  return cardSecret;
}

function createStoreOrder(record) {
  db.prepare(
    `INSERT INTO store_orders (
      order_no, product_code, product_name, amount_fen, currency, status,
      card_secret, mch_id, app_id, code_url, wechat_prepay_id, wechat_transaction_id,
      request_json, response_json, notify_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    record.orderNo,
    record.productCode,
    record.productName,
    record.amountFen,
    record.currency,
    record.status,
    record.cardSecret,
    record.mchId,
    record.appId,
    record.codeUrl,
    record.prepayId,
    record.transactionId,
    record.requestJson,
    record.responseJson,
    record.notifyJson
  );
}

function updateStoreOrder(orderNo, updates) {
  const current = getStoreOrderByNo(orderNo);

  if (!current) {
    return null;
  }

  const nextOrder = {
    ...current,
    ...updates
  };

  db.prepare(
    `UPDATE store_orders SET
      status = ?,
      card_secret = ?,
      code_url = ?,
      wechat_prepay_id = ?,
      wechat_transaction_id = ?,
      response_json = ?,
      notify_json = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE order_no = ?`
  ).run(
    nextOrder.status || current.status,
    nextOrder.cardSecret || current.cardSecret || '',
    nextOrder.codeUrl || current.codeUrl || '',
    nextOrder.prepayId || current.prepayId || '',
    nextOrder.transactionId || current.transactionId || '',
    nextOrder.responseJson || current.responseJson || '',
    nextOrder.notifyJson || current.notifyJson || '',
    orderNo
  );

  return getStoreOrderByNo(orderNo);
}

function decryptWechatPayResource(resource, apiV3Key) {
  if (!resource || !apiV3Key) {
    return null;
  }

  const key = Buffer.from(normalizePemText(apiV3Key), 'utf8');

  if (key.length !== 32) {
    return null;
  }

  const ciphertext = Buffer.from(String(resource.ciphertext || ''), 'base64');
  if (ciphertext.length <= 16) {
    return null;
  }

  const authTag = ciphertext.subarray(ciphertext.length - 16);
  const encrypted = ciphertext.subarray(0, ciphertext.length - 16);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(String(resource.nonce || ''), 'utf8'));

  if (resource.associated_data) {
    decipher.setAAD(Buffer.from(String(resource.associated_data), 'utf8'));
  }

  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return JSON.parse(decrypted.toString('utf8'));
}

async function createWechatPayNativeOrder(request, response) {
  try {
    const body = await parseRequestBody(request);
    const hongxingReadiness = getHongxingPayReadiness();
    if (hongxingReadiness.ready) {
      await createHongxingNativeOrder(body, response);
      return;
    }

    const config = getWechatPayConfig();
    const productCode = String(body.productCode || '').trim().toUpperCase();
    const product = getStoreProductByCode(productCode, false);

    if (!config.appId || !config.mchId || !config.serialNo || !config.apiV3Key || !config.notifyUrl || !config.privateKeyPem) {
      sendJson(response, 500, {
        message: '微信支付配置不完整，请补全 appId、mchId、serialNo、privateKey、apiV3Key 和 notifyUrl'
      });
      return;
    }

    if (!product) {
      sendJson(response, 404, { message: '商品不存在或已下架' });
      return;
    }

    const orderNo = createStoreOrderNo();
    const amountFen = Number(product.salePriceFen || 0);
    const productName = String(product.name || '').trim();

    if (!Number.isFinite(amountFen) || amountFen <= 0) {
      sendJson(response, 400, { message: '订单金额无效' });
      return;
    }

    const orderBody = {
      appid: config.appId,
      mchid: config.mchId,
      description: `${productName} · 官方商店订单`,
      out_trade_no: orderNo,
      notify_url: config.notifyUrl,
      amount: {
        total: amountFen,
        currency: product.currency || 'CNY'
      },
      attach: JSON.stringify({
        productCode,
        productName
      })
    };

    const requestPath = '/v3/pay/transactions/native';
    const requestBodyText = JSON.stringify(orderBody);
    const authorization = signWechatPayRequest('POST', requestPath, requestBodyText, config.mchId, config.serialNo, config.privateKeyPem);

    const wechatResponse = await requestJson('https://api.mch.weixin.qq.com/v3/pay/transactions/native', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        Accept: 'application/json',
        Authorization: authorization,
        'User-Agent': 'mctools-store/1.0'
      }
    }, requestBodyText);

    if (wechatResponse.statusCode < 200 || wechatResponse.statusCode >= 300) {
      sendJson(response, 502, {
        message: '微信支付下单失败',
        statusCode: wechatResponse.statusCode,
        detail: wechatResponse.body || ''
      });
      return;
    }

    let parsedResponse = {};
    try {
      parsedResponse = wechatResponse.body ? JSON.parse(wechatResponse.body) : {};
    } catch {
      parsedResponse = { raw: wechatResponse.body || '' };
    }

    const codeUrl = String(parsedResponse.code_url || '').trim();

    if (!codeUrl) {
      sendJson(response, 502, {
        message: '微信支付未返回 code_url',
        detail: parsedResponse
      });
      return;
    }

    const qrDataUrl = await QRCode.toDataURL(codeUrl, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 320
    });

    createStoreOrder({
      orderNo,
      productCode,
      productName,
      amountFen,
      currency: product.currency || 'CNY',
      status: 'PENDING',
      cardSecret: '',
      mchId: config.mchId,
      appId: config.appId,
      codeUrl,
      prepayId: parsedResponse.prepay_id || '',
      transactionId: '',
      requestJson: JSON.stringify(orderBody),
      responseJson: JSON.stringify(parsedResponse),
      notifyJson: ''
    });

    sendJson(response, 200, {
      message: '微信支付订单已创建',
      orderNo,
      productCode,
      productName,
      amountFen,
      currency: product.currency || 'CNY',
      codeUrl,
      qrDataUrl,
      prepayId: parsedResponse.prepay_id || ''
    });
  } catch (error) {
    sendJson(response, 500, {
      message: error.message || '创建微信支付订单失败'
    });
  }
}

async function createHongxingNativeOrder(body, response) {
  const config = getHongxingPayConfig();

  if (!config.createUrl) {
    sendJson(response, 500, {
      message: '洪星支付配置不完整，请补全 createUrl'
    });
    return;
  }

  const productCode = String(body?.productCode || '').trim().toUpperCase();
  const product = getStoreProductByCode(productCode, false);

  if (!product) {
    sendJson(response, 404, { message: '商品不存在或已下架' });
    return;
  }

  const orderNo = createStoreOrderNo();
  const amountFen = Number(product.salePriceFen || 0);
  const productName = String(product.name || '').trim();

  if (!Number.isFinite(amountFen) || amountFen <= 0) {
    sendJson(response, 400, { message: '订单金额无效' });
    return;
  }

  if (isRootPathUrl(config.createUrl)) {
    if (!config.merchantId || !config.apiKey) {
      sendJson(response, 500, { message: '洪星直连模式缺少 merchantId 或 apiKey' });
      return;
    }

    const baseUrl = new URL(String(config.createUrl));
    const returnUrl = String(config.returnUrl || `${baseUrl.protocol}//${baseUrl.host}/index/payTest`).trim();
    const notifyUrl = String(config.notifyUrl || `${baseUrl.protocol}//${baseUrl.host}/Payment/UserRechargeNotify?out_trade_no=${encodeURIComponent(orderNo)}`).trim();
    const payUrl = buildHongxingSubmitPayUrl({
      pid: String(config.merchantId),
      type: String(config.payType || 'wxpay').toLowerCase(),
      outTradeNo: orderNo,
      notifyUrl,
      returnUrl,
      name: productName || '商店订单',
      money: (amountFen / 100).toFixed(2),
      sitename: ''
    }, config);

    const qrDataUrl = await QRCode.toDataURL(payUrl, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 320
    });

    createStoreOrder({
      orderNo,
      productCode,
      productName,
      amountFen,
      currency: product.currency || 'CNY',
      status: 'PENDING',
      cardSecret: '',
      mchId: String(config.merchantId),
      appId: 'hongxing',
      codeUrl: payUrl,
      prepayId: '',
      transactionId: '',
      requestJson: JSON.stringify({
        mode: 'hongxing-direct-submit',
        payType: config.payType,
        signType: config.signType,
        notifyUrl,
        returnUrl
      }),
      responseJson: JSON.stringify({ payUrl }),
      notifyJson: ''
    });

    sendJson(response, 200, {
      message: '洪星支付订单已创建',
      provider: 'hongxing',
      orderNo,
      productCode,
      productName,
      amountFen,
      currency: product.currency || 'CNY',
      codeUrl: payUrl,
      qrDataUrl,
      prepayId: ''
    });
    return;
  }

  const payload = {
    outTradeNo: orderNo,
    orderNo,
    merchantId: config.merchantId || '',
    productCode,
    productName,
    amountFen,
    amount: Number((amountFen / 100).toFixed(2)),
    currency: product.currency || 'CNY',
    notifyUrl: String(config.notifyUrl || '').trim(),
    attach: {
      productCode,
      productName
    }
  };

  let requestUrl = config.createUrl;
  let bodyText = '';

  if (config.createMethod === 'GET') {
    const url = new URL(config.createUrl);
    url.searchParams.set('orderNo', orderNo);
    url.searchParams.set('outTradeNo', orderNo);
    url.searchParams.set('amountFen', String(amountFen));
    url.searchParams.set('amount', String(payload.amount));
    url.searchParams.set('productCode', productCode);
    if (config.merchantId) {
      url.searchParams.set('merchantId', config.merchantId);
    }
    requestUrl = url.toString();
  } else {
    bodyText = JSON.stringify(payload);
  }

  const headers = {
    Accept: 'application/json',
    'User-Agent': 'mctools-store/1.0'
  };

  if (config.createMethod !== 'GET') {
    headers['Content-Type'] = 'application/json; charset=utf-8';
  }

  if (config.apiKey) {
    headers.Authorization = `Bearer ${config.apiKey}`;
    headers['X-Api-Key'] = config.apiKey;
  }

  const hongxingResponse = await requestJson(requestUrl, {
    method: config.createMethod,
    headers
  }, bodyText);

  if (hongxingResponse.statusCode < 200 || hongxingResponse.statusCode >= 300) {
    sendJson(response, 502, {
      message: '洪星支付下单失败',
      statusCode: hongxingResponse.statusCode,
      detail: hongxingResponse.body || ''
    });
    return;
  }

  const parsedResponse = parseMaybeJson(hongxingResponse.body);
  const qrText = extractPaymentQrText(parsedResponse);

  if (!qrText) {
    sendJson(response, 502, {
      message: '洪星支付未返回二维码地址',
      detail: parsedResponse
    });
    return;
  }

  const qrDataUrl = await QRCode.toDataURL(qrText, {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 320
  });

  createStoreOrder({
    orderNo,
    productCode,
    productName,
    amountFen,
    currency: product.currency || 'CNY',
    status: normalizePaymentSuccess(parsedResponse.paid ?? parsedResponse.status ?? parsedResponse.tradeStatus ?? parsedResponse.payStatus) ? 'SUCCESS' : 'PENDING',
    cardSecret: '',
    mchId: config.merchantId || 'hongxing',
    appId: 'hongxing',
    codeUrl: qrText,
    prepayId: extractPaymentTransactionId(parsedResponse),
    transactionId: '',
    requestJson: JSON.stringify(payload),
    responseJson: JSON.stringify(parsedResponse),
    notifyJson: ''
  });

  sendJson(response, 200, {
    message: '洪星支付订单已创建',
    provider: 'hongxing',
    orderNo,
    productCode,
    productName,
    amountFen,
    currency: product.currency || 'CNY',
    codeUrl: qrText,
    qrDataUrl,
    prepayId: extractPaymentTransactionId(parsedResponse)
  });
}

async function handleStoreOrderStatus(request, response) {
  const url = new URL(request.url || '/', `http://${host}:${port}`);
  const orderNo = String(url.searchParams.get('orderNo') || '').trim();

  if (!orderNo) {
    sendJson(response, 400, { message: '缺少订单号' });
    return;
  }

  let order = getStoreOrderByNo(orderNo);

  if (!order) {
    sendJson(response, 404, { message: '订单不存在' });
    return;
  }

  try {
    await trySyncStoreOrderFromHongxing(order);
    order = getStoreOrderByNo(orderNo) || order;
  } catch {
    // Keep order-status endpoint resilient even if Hongxing query fails.
  }

  const status = String(order.status || '').toUpperCase();
  const paid = status === 'SUCCESS' || status === 'TRADE_SUCCESS';
  const cardSecret = paid ? ensureStoreOrderCardSecret(orderNo) : '';

  sendJson(response, 200, {
    orderNo: order.orderNo,
    status,
    paid,
    cardSecret,
    productCode: order.productCode,
    productName: order.productName,
    amountFen: order.amountFen,
    updatedAt: order.updatedAt
  });
}

async function handleStoreWechatNotify(request, response) {
  try {
    const rawBody = await readRequestText(request);
    const payload = rawBody ? JSON.parse(rawBody) : {};
    const config = getWechatPayConfig();
    const decrypted = decryptWechatPayResource(payload.resource, config.apiV3Key);

    if (decrypted && decrypted.out_trade_no) {
      updateStoreOrder(decrypted.out_trade_no, {
        status: String(decrypted.trade_state || 'SUCCESS').toUpperCase(),
        transactionId: decrypted.transaction_id || '',
        notifyJson: rawBody,
        responseJson: JSON.stringify(decrypted)
      });
    }

    response.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    response.end(JSON.stringify({ code: 'SUCCESS', message: '成功' }));
  } catch (error) {
    response.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    response.end(JSON.stringify({ code: 'SUCCESS', message: error.message || '成功' }));
  }
}

function getMimeTypeFromExtension(extension) {
  return mimeTypes[extension] || 'application/octet-stream';
}

function shouldExposeDevCode(request) {
  const hostHeader = String(request?.headers?.host || '').trim().toLowerCase();
  return hostHeader.startsWith('127.0.0.1') || hostHeader.startsWith('localhost') || hostHeader.startsWith('[::1]');
}

function parseRequestBody(request) {
  return new Promise((resolve, reject) => {
    let body = '';

    request.on('data', (chunk) => {
      body += chunk;

      if (body.length > 1024 * 1024 * 5) {
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

function cleanupExpiredSiteOnlineVisitors() {
  const now = Date.now();

  for (const [visitorKey, visitor] of siteOnlineVisitors.entries()) {
    if (!visitor || Number(visitor.lastSeenAt || 0) + siteOnlineVisitorLifetimeMs <= now) {
      siteOnlineVisitors.delete(visitorKey);
    }
  }
}

function getRequestIp(request) {
  const forwarded = String(request.headers['x-forwarded-for'] || '').trim();
  if (forwarded) {
    const first = forwarded.split(',')[0].trim();
    if (first) {
      return first;
    }
  }

  return String(request.socket?.remoteAddress || '').trim() || '0.0.0.0';
}

function normalizeVisitorId(rawVisitorId) {
  const value = String(rawVisitorId || '').trim().toLowerCase();
  return /^[a-z0-9_-]{16,80}$/u.test(value) ? value : '';
}

function resolveSiteVisitorKey(request) {
  const headerVisitorId = normalizeVisitorId(request.headers['x-visitor-id']);
  if (headerVisitorId) {
    return `vid:${headerVisitorId}`;
  }

  const fallbackSource = `${getRequestIp(request)}|${String(request.headers['user-agent'] || '').slice(0, 160)}`;
  return `fp:${crypto.createHash('sha1').update(fallbackSource).digest('hex')}`;
}

function touchSiteOnlineVisitor(request) {
  cleanupExpiredSiteOnlineVisitors();

  const visitorKey = resolveSiteVisitorKey(request);
  siteOnlineVisitors.set(visitorKey, {
    lastSeenAt: Date.now(),
    pathname: getPathname(request.url || '/'),
    userAgent: String(request.headers['user-agent'] || '').slice(0, 180)
  });

  recordSiteDailyVisit(visitorKey);

  return visitorKey;
}

function getLocalDateKey() {
  const now = new Date();
  const yyyy = String(now.getFullYear());
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function recordSiteDailyVisit(visitorKey) {
  const normalizedKey = String(visitorKey || '').trim();
  if (!normalizedKey) {
    return;
  }

  db.prepare(
    'INSERT OR IGNORE INTO site_daily_visits (date_text, visitor_key) VALUES (?, ?)'
  ).run(getLocalDateKey(), normalizedKey);
}

function getTodaySiteVisitCount() {
  const row = db.prepare('SELECT COUNT(1) AS count FROM site_daily_visits WHERE date_text = ?').get(getLocalDateKey());
  return Number(row?.count || 0);
}

function getWatchedCommunityAccountStatuses() {
  cleanupExpiredCommunityCodes();
  const now = Date.now();

  return watchedCommunityEmails.map((rawEmail) => {
    const email = String(rawEmail || '').trim().toLowerCase();
    let online = false;

    for (const session of communitySessions.values()) {
      if (!session || session.expiresAt <= now) {
        continue;
      }

      if (String(session.email || '').trim().toLowerCase() === email) {
        online = true;
        break;
      }
    }

    const account = getCommunityAccountByEmail(email);
    return {
      email,
      username: account?.username || '',
      online
    };
  });
}

function handleSiteOnlinePing(request, response) {
  touchSiteOnlineVisitor(request);

  sendJson(response, 200, {
    success: true,
    online: siteOnlineVisitors.size,
    todayVisits: getTodaySiteVisitCount(),
    ttlSeconds: Math.round(siteOnlineVisitorLifetimeMs / 1000)
  });
}

function handleSiteOnlineStats(request, response) {
  touchSiteOnlineVisitor(request);

  sendJson(response, 200, {
    online: siteOnlineVisitors.size,
    todayVisits: getTodaySiteVisitCount(),
    watchedAccounts: getWatchedCommunityAccountStatuses(),
    ttlSeconds: Math.round(siteOnlineVisitorLifetimeMs / 1000),
    updatedAt: new Date().toISOString()
  });
}

function cleanupExpiredLocalDevQuickEntryTokens() {
  const now = Date.now();

  for (const [token, tokenInfo] of localDevQuickEntryTokens.entries()) {
    if (tokenInfo.expiresAt <= now) {
      localDevQuickEntryTokens.delete(token);
    }
  }
}

function cleanupExpiredQrLoginTickets() {
  const now = Date.now();

  for (const [ticketToken, ticket] of qrLoginTickets.entries()) {
    if (ticket.expiresAt <= now) {
      qrLoginTickets.delete(ticketToken);
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

function generateDeveloperEntryCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';

  for (let index = 0; index < 6; index += 1) {
    const randomIndex = crypto.randomInt(0, alphabet.length);
    code += alphabet[randomIndex];
  }

  return code;
}

function issueQrLoginTicket() {
  cleanupExpiredQrLoginTickets();
  const ticketToken = crypto.randomBytes(24).toString('hex');
  qrLoginTickets.set(ticketToken, {
    status: 'pending',
    username: '',
    createdAt: Date.now(),
    expiresAt: Date.now() + qrLoginTicketLifetimeMs
  });
  return ticketToken;
}

function getQrLoginTicket(ticketToken) {
  cleanupExpiredQrLoginTickets();
  const normalizedToken = String(ticketToken || '').trim();

  if (!normalizedToken) {
    return null;
  }

  const ticket = qrLoginTickets.get(normalizedToken);

  if (!ticket) {
    return null;
  }

  if (ticket.expiresAt <= Date.now()) {
    qrLoginTickets.delete(normalizedToken);
    return null;
  }

  return { token: normalizedToken, ...ticket };
}

function updateQrLoginTicket(ticketToken, nextTicket) {
  qrLoginTickets.set(ticketToken, nextTicket);
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

function redirectToSettings(response) {
  response.writeHead(302, { Location: '/settings.html' });
  response.end();
}

function handleServerListingsGet(request, response) {
  const rows = db.prepare(
    'SELECT id, server_name, ip_address, avatar_path, game_edition, description, server_type, version, max_players, created_at FROM server_listings WHERE status = ? ORDER BY created_at DESC'
  ).all('APPROVED');
  sendJson(response, 200, { servers: rows });
}

// ── Plaza 邮箱验证 ──────────────────────────────────────────────────────────

function getPlazaSessionFromRequest(request) {
  const cookieHeader = request.headers['cookie'] || '';
  const match = cookieHeader.match(/(?:^|;)\s*mctools_plaza=([^;]+)/);
  if (!match) { return null; }
  const token = decodeURIComponent(match[1]);
  const session = plazaSessions.get(token);
  if (!session || session.expiresAt <= Date.now()) {
    plazaSessions.delete(token);
    return null;
  }
  return session;
}

function cleanupExpiredPlazaCodes() {
  const now = Date.now();
  for (const [email, entry] of plazaVerifyCodes.entries()) {
    if (entry.expiresAt <= now) { plazaVerifyCodes.delete(email); }
  }
  for (const [token, session] of plazaSessions.entries()) {
    if (session.expiresAt <= now) { plazaSessions.delete(token); }
  }
}

function cleanupExpiredCommunityCodes() {
  const now = Date.now();
  for (const [email, entry] of communityVerifyCodes.entries()) {
    if (entry.expiresAt <= now) { communityVerifyCodes.delete(email); }
  }
  for (const [token, session] of communitySessions.entries()) {
    if (session.expiresAt <= now) { communitySessions.delete(token); }
  }
}

function getCommunityAccountByUsername(username) {
  return db.prepare('SELECT id, username, email, is_developer AS isDeveloper, created_at AS createdAt, last_login_at AS lastLoginAt FROM community_accounts WHERE username = ?').get(username) || null;
}

function getCommunityAccountByEmail(email) {
  return db.prepare('SELECT id, username, email, is_developer AS isDeveloper, created_at AS createdAt, last_login_at AS lastLoginAt FROM community_accounts WHERE email = ?').get(email) || null;
}

function getCommunityAccountAuthByUsername(username) {
  return db.prepare('SELECT id, username, email, password_hash AS passwordHash, is_developer AS isDeveloper, created_at AS createdAt, last_login_at AS lastLoginAt FROM community_accounts WHERE username = ?').get(username) || null;
}

function getCommunityAccountAuthByEmail(email) {
  return db.prepare('SELECT id, username, email, password_hash AS passwordHash, is_developer AS isDeveloper, created_at AS createdAt, last_login_at AS lastLoginAt FROM community_accounts WHERE email = ?').get(email) || null;
}

function createCommunityAccount(username, email, isDeveloper = false, passwordHash = '') {
  db.prepare('INSERT INTO community_accounts (username, email, password_hash, is_developer, last_login_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)').run(
    username,
    email,
    String(passwordHash || ''),
    isDeveloper ? 1 : 0
  );
  return getCommunityAccountByUsername(username);
}

function markCommunityAccountLogin(email) {
  db.prepare('UPDATE community_accounts SET last_login_at = CURRENT_TIMESTAMP WHERE email = ?').run(email);
}

function getCommunitySessionFromRequest(request) {
  // 方法1：从Authorization header中获取 token
  const authHeader = request.headers['authorization'] || '';
  if (authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const session = communitySessions.get(token);
    if (session && session.expiresAt > Date.now()) {
      return session;
    }
  }
  
  // 方法2：从Cookie header中获取 token
  const cookieHeader = request.headers['cookie'] || '';
  const match = cookieHeader.match(/(?:^|;)\s*mctools_community=([^;]+)/);
  if (match) {
    const token = decodeURIComponent(match[1]);
    const session = communitySessions.get(token);
    if (session && session.expiresAt > Date.now()) {
      return session;
    }
  }
  
  return null;
}

function issueCommunitySession(response, username, email, isCommunityDeveloper) {
  const token = crypto.randomBytes(32).toString('hex');
  communitySessions.set(token, {
    username,
    email,
    isDeveloper: Boolean(isCommunityDeveloper),
    expiresAt: Date.now() + communitySessionLifetimeMs
  });

  setScopedAuthCookie(response, 'mctools_community', '/api/community/', token, communitySessionLifetimeMs);
  return token;
}

function handleCommunityRegister(request, response) {
  parseRequestBody(request)
    .then((body) => {
      const username = String(body.username || '').trim();
      const email = String(body.email || '').trim().toLowerCase();
      const password = String(body.password || '');
      const registerAsDeveloper =
        body.registerAsDeveloper === true ||
        body.registerAsDeveloper === 'true' ||
        body.registerAsDeveloper === 1 ||
        body.registerAsDeveloper === '1';
      const developerSecret = String(body.developerSecret || '').trim();

      if (!isValidAuthUsername(username)) {
        sendJson(response, 400, { message: '用户名不能为空，且不超过 32 个字符' });
        return;
      }

      if (!isValidAuthEmail(email)) {
        sendJson(response, 400, { message: '请填写有效的邮箱地址' });
        return;
      }

      if (password.length < 6 || password.length > 64) {
        sendJson(response, 400, { message: '密码长度需在 6-64 位之间' });
        return;
      }

      if (getCommunityAccountByUsername(username)) {
        sendJson(response, 409, { message: '该用户名已被社区占用，请换一个昵称' });
        return;
      }

      if (getCommunityAccountByEmail(email)) {
        sendJson(response, 409, { message: '该邮箱已注册社区账号，请直接登录' });
        return;
      }

      let isCommunityDeveloper = Boolean(isDeveloper(username));

      if (registerAsDeveloper) {
        if (developerSecret !== developerRegistrationSecret) {
          sendJson(response, 403, { message: '开发者口令错误，无法创建开发者账号' });
          return;
        }

        isCommunityDeveloper = true;
      }

      const account = createCommunityAccount(username, email, isCommunityDeveloper, hashPassword(password));
      sendJson(response, 201, { message: '社区账号注册成功，请继续发送验证码登录', account });
    })
    .catch((error) => {
      sendJson(response, 400, { message: error.message || '请求无效' });
    });
}

function handleCommunityPasswordLogin(request, response) {
  parseRequestBody(request)
    .then((body) => {
      const username = String(body.username || '').trim();
      const email = String(body.email || '').trim().toLowerCase();
      const password = String(body.password || '');

      if (!password) {
        sendJson(response, 400, { message: '请输入密码' });
        return;
      }

      let accountAuth = null;
      if (username) {
        accountAuth = getCommunityAccountAuthByUsername(username);
      } else if (email) {
        accountAuth = getCommunityAccountAuthByEmail(email);
      }

      if (!accountAuth) {
        sendJson(response, 401, { message: '账号或密码错误' });
        return;
      }

      if (!accountAuth.passwordHash || !verifyPassword(password, accountAuth.passwordHash)) {
        sendJson(response, 401, { message: '账号或密码错误' });
        return;
      }

      markCommunityAccountLogin(accountAuth.email);
      const isCommunityDeveloper = Boolean(accountAuth?.isDeveloper || isDeveloper(accountAuth.username));
      const token = issueCommunitySession(response, accountAuth.username, accountAuth.email, isCommunityDeveloper);

      sendJson(response, 200, {
        message: '密码登录成功',
        username: accountAuth.username,
        email: accountAuth.email,
        isDeveloper: isCommunityDeveloper,
        token
      });
    })
    .catch((error) => {
      sendJson(response, 400, { message: error.message || '请求无效' });
    });
}

function handleCommunitySendCode(request, response) {
  parseRequestBody(request)
    .then(async (body) => {
      const username = String(body.username || '').trim();
      const email = String(body.email || '').trim().toLowerCase();

      if (!isValidAuthUsername(username)) {
        sendJson(response, 400, { message: '用户名不能为空，且不超过 32 个字符' });
        return;
      }

      if (!isValidAuthEmail(email)) {
        sendJson(response, 400, { message: '请填写有效的邮箱地址' });
        return;
      }

      const account = getCommunityAccountByEmail(email);
      if (!account) {
        sendJson(response, 403, { message: '请先注册账户后再登录', code: 'REGISTRATION_REQUIRED' });
        return;
      }

      if (account.username !== username) {
        sendJson(response, 400, { message: '用户名与注册账户不一致' });
        return;
      }

      const existing = communityVerifyCodes.get(email);
      if (existing && existing.expiresAt - communityVerifyCodeLifetimeMs + 60000 > Date.now()) {
        sendJson(response, 429, { message: '发送太频繁，请 60 秒后重试' });
        return;
      }

      const code = String(Math.floor(100000 + Math.random() * 900000));
      communityVerifyCodes.set(email, { code, username, expiresAt: Date.now() + communityVerifyCodeLifetimeMs });

      const result = await sendAuthCodeEmail('Community', email, code, username, shouldExposeDevCode(request));
      sendJson(response, 200, result);
    })
    .catch((error) => {
      sendJson(response, 400, { message: error.message || '请求无效' });
    });
}

function handleCommunityVerify(request, response) {
  parseRequestBody(request)
    .then((body) => {
      const email = String(body.email || '').trim().toLowerCase();
      const code = String(body.code || '').trim();

      const entry = communityVerifyCodes.get(email);
      if (!entry || entry.expiresAt <= Date.now()) {
        sendJson(response, 400, { message: '验证码不存在或已过期，请重新获取' });
        return;
      }

      if (entry.code !== code) {
        sendJson(response, 400, { message: '验证码错误' });
        return;
      }

      communityVerifyCodes.delete(email);
      markCommunityAccountLogin(email);

      const account = getCommunityAccountByEmail(email);
      const isCommunityDeveloper = Boolean(account?.isDeveloper || isDeveloper(entry.username));
      const token = issueCommunitySession(response, entry.username, email, isCommunityDeveloper);
      sendJson(response, 200, {
        message: '社区登录成功',
        username: entry.username,
        isDeveloper: isCommunityDeveloper,
        token
      });
    })
    .catch((error) => {
      sendJson(response, 400, { message: error.message || '请求无效' });
    });
}

function handleCommunityMe(request, response) {
  const session = getCommunitySessionFromRequest(request);
  if (!session) {
    sendJson(response, 200, { loggedIn: false });
    return;
  }
  const account = getCommunityAccountByEmail(session.email);
  const isCommunityDeveloper = Boolean(session.isDeveloper || account?.isDeveloper || isDeveloper(session.username));
  sendJson(response, 200, {
    loggedIn: true,
    username: session.username,
    email: session.email,
    registered: Boolean(account),
    isDeveloper: isCommunityDeveloper
  });
}

function handleCommunityLogout(request, response) {
  const cookieHeader = request.headers['cookie'] || '';
  const match = cookieHeader.match(/(?:^|;)\s*mctools_community=([^;]+)/);
  if (match) {
    const token = decodeURIComponent(match[1]);
    communitySessions.delete(token);
  }
      clearScopedAuthCookie(response, 'mctools_community', '/api/community/');
  sendJson(response, 200, { message: '已退出社区账号' });
}

function getPlazaAccountByEmail(email) {
  return db.prepare('SELECT id, username, email, created_at, last_login_at FROM plaza_accounts WHERE email = ?').get(email);
}

function getPlazaAccountByUsername(username) {
  return db.prepare('SELECT id, username, email, created_at, last_login_at FROM plaza_accounts WHERE username = ?').get(username);
}

function createPlazaAccount(username, email) {
  const result = db.prepare('INSERT INTO plaza_accounts (username, email) VALUES (?, ?)').run(username, email);
  return db.prepare('SELECT id, username, email, created_at, last_login_at FROM plaza_accounts WHERE id = ?').get(result.lastInsertRowid);
}

function markPlazaAccountLogin(email) {
  db.prepare('UPDATE plaza_accounts SET last_login_at = CURRENT_TIMESTAMP WHERE email = ?').run(email);
}

function deleteServerListingAvatarFiles(listingId) {
  const prefix = `server-${listingId}.`;

  if (!fs.existsSync(avatarsDir)) {
    return;
  }

  fs.readdirSync(avatarsDir)
    .filter((name) => name.startsWith(prefix))
    .forEach((name) => {
      const filePath = path.join(avatarsDir, name);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    });
}

function saveServerListingAvatar(listingId, imageData) {
  const dataUrl = String(imageData || '');
  const match = dataUrl.match(/^data:(image\/(png|jpeg|jpg|webp));base64,(.+)$/);

  if (!match) {
    return null;
  }

  const extension = match[2] === 'jpeg' || match[2] === 'jpg' ? '.jpg' : match[2] === 'png' ? '.png' : '.webp';
  const buffer = Buffer.from(match[3], 'base64');

  if (buffer.length > 1024 * 1024 * 2) {
    throw new Error('头像图片不能超过 2MB');
  }

  const fileName = `server-${listingId}${extension}`;
  const absolutePath = path.join(avatarsDir, fileName);

  deleteServerListingAvatarFiles(listingId);
  fs.writeFileSync(absolutePath, buffer);

  return `/avatars/${fileName}`;
}

async function trySmtpSend(toEmail, code, username) {
  const apiKeys = JSON.parse(fs.readFileSync(apiKeysConfigPath, 'utf8'));
  const smtpConfig = apiKeys.smtp;

  if (!smtpConfig?.host || !smtpConfig?.user || !smtpConfig?.pass) {
    return { ok: false, reason: 'SMTP 未配置 host/user/pass' };
  }

  const transporter = nodemailer.createTransport({
    host: smtpConfig.host,
    port: Number(smtpConfig.port) || 465,
    secure: Number(smtpConfig.port) === 465,
    auth: {
      user: smtpConfig.user,
      pass: smtpConfig.pass
    },
    tls: {
      rejectUnauthorized: false
    }
  });

  try {
    const info = await transporter.sendMail({
      from: smtpConfig.from || smtpConfig.user,
      to: toEmail,
      subject: `验证码 ${code}`,
      text: `你好 ${username}，\n\n你的“星际_服务器广场”账号验证码是：${code}\n\n验证码 10 分钟内有效，请勿泄露。\n\n-- 星际-小卖部`
    });

    return { ok: true, reason: info?.response || '' };
  } catch (error) {
    return { ok: false, reason: error?.response || error?.message || 'SMTP 发送失败' };
  }
}

async function sendAuthCodeEmail(scopeLabel, toEmail, code, username, exposeDevCode = false) {
  const smtpResult = await trySmtpSend(toEmail, code, username).catch((error) => ({ ok: false, reason: error.message || 'SMTP 发送失败' }));

  if (smtpResult.ok) {
    return {
      sent: true,
      message: `验证码已发送至 ${toEmail}，10 分钟内有效`,
      ...(exposeDevCode ? { devCode: code } : {})
    };
  }

  console.warn(`[${scopeLabel}] SMTP 发送失败 -> ${toEmail} (${username}): ${smtpResult.reason || 'unknown'}`);
  return {
    sent: false,
    message: smtpResult.reason ? `邮件发送失败：${smtpResult.reason}` : '邮件发送失败，已切换到调试验证码',
    devCode: code,
    smtpError: smtpResult.reason || ''
  };
}

function handlePlazaSendCode(request, response) {
  parseRequestBody(request)
    .then(async (body) => {
      const username = String(body.username || '').trim();
      const email = String(body.email || '').trim().toLowerCase();

      if (!isValidAuthUsername(username)) {
        sendJson(response, 400, { message: '用户名不能为空，且不超过 32 个字符' });
        return;
      }

      if (!isValidAuthEmail(email)) {
        sendJson(response, 400, { message: '请填写有效的邮箱地址' });
        return;
      }

      const account = getPlazaAccountByEmail(email);
      if (!account) {
        sendJson(response, 403, { message: '请先注册账户后再登录', code: 'REGISTRATION_REQUIRED' });
        return;
      }

      if (account.username !== username) {
        sendJson(response, 400, { message: '用户名与注册账户不一致' });
        return;
      }

      // 防频刷：60 秒内不能重发
      const existing = plazaVerifyCodes.get(email);
      if (existing && existing.expiresAt - plazaVerifyCodeLifetimeMs + 60000 > Date.now()) {
        sendJson(response, 429, { message: '发送太频繁，请 60 秒后重试' });
        return;
      }

      const code = String(Math.floor(100000 + Math.random() * 900000));
      plazaVerifyCodes.set(email, {
        code,
        username,
        expiresAt: Date.now() + plazaVerifyCodeLifetimeMs
      });



        const result = await sendAuthCodeEmail('Plaza', email, code, username, shouldExposeDevCode(request));
        sendJson(response, 200, result);
    })
    .catch((error) => {
      sendJson(response, 400, { message: error.message || '请求无效' });
    });
}

function handlePlazaDirectLogin(request, response) {
  parseRequestBody(request)
    .then((body) => {
      const username = String(body.username || '').trim();
      const email = String(body.email || '').trim().toLowerCase();

      if (!isValidAuthUsername(username)) {
        sendJson(response, 400, { message: '用户名不能为空，且不超过 32 个字符' });
        return;
      }

      if (!isValidAuthEmail(email)) {
        sendJson(response, 400, { message: '请填写有效的邮箱地址' });
        return;
      }

      const token = crypto.randomBytes(32).toString('hex');
      plazaSessions.set(token, {
        username,
        email,
        expiresAt: Date.now() + plazaSessionLifetimeMs
      });

      setScopedAuthCookie(response, 'mctools_plaza', '/api/plaza/', token, plazaSessionLifetimeMs);
      sendJson(response, 200, { message: '登录成功', username, email });
    })
    .catch((error) => {
      sendJson(response, 400, { message: error.message || '请求无效' });
    });
}

function handlePlazaRegister(request, response) {
  parseRequestBody(request)
    .then((body) => {
      const username = String(body.username || '').trim();
      const email = String(body.email || '').trim().toLowerCase();

      if (!isValidAuthUsername(username)) {
        sendJson(response, 400, { message: '用户名不能为空，且不超过 32 个字符' });
        return;
      }

      if (!isValidAuthEmail(email)) {
        sendJson(response, 400, { message: '请填写有效的邮箱地址' });
        return;
      }

      if (getPlazaAccountByUsername(username)) {
        sendJson(response, 409, { message: '该用户名已被注册，请换一个昵称' });
        return;
      }

      if (getPlazaAccountByEmail(email)) {
        sendJson(response, 409, { message: '该邮箱已注册，请直接登录' });
        return;
      }

      const account = createPlazaAccount(username, email);
      sendJson(response, 201, {
        message: '注册成功，请继续发送验证码登录',
        account
      });
    })
    .catch((error) => {
      sendJson(response, 400, { message: error.message || '请求无效' });
    });
}

function handlePlazaVerify(request, response) {
  parseRequestBody(request)
    .then((body) => {
      const email = String(body.email || '').trim().toLowerCase();
      const code = String(body.code || '').trim();

      const entry = plazaVerifyCodes.get(email);

      if (!entry || entry.expiresAt <= Date.now()) {
        sendJson(response, 400, { message: '验证码不存在或已过期，请重新获取' });
        return;
      }

      if (entry.code !== code) {
        sendJson(response, 400, { message: '验证码错误' });
        return;
      }

      plazaVerifyCodes.delete(email);
      markPlazaAccountLogin(email);

      const token = crypto.randomBytes(32).toString('hex');
      plazaSessions.set(token, {
        username: entry.username,
        email,
        expiresAt: Date.now() + plazaSessionLifetimeMs
      });

        setScopedAuthCookie(response, 'mctools_plaza', '/api/plaza/', token, plazaSessionLifetimeMs);
      sendJson(response, 200, { message: '登录成功', username: entry.username });
    })
    .catch((error) => {
      sendJson(response, 400, { message: error.message || '请求无效' });
    });
}

function handlePlazaMe(request, response) {
  const session = getPlazaSessionFromRequest(request);
  if (!session) {
    sendJson(response, 200, { loggedIn: false });
    return;
  }
  sendJson(response, 200, {
    loggedIn: true,
    username: session.username,
    email: session.email,
    registered: Boolean(getPlazaAccountByEmail(session.email)),
    ...getVipInfo(session.username)
  });
}

function handlePlazaLogout(request, response) {
  const cookieHeader = request.headers['cookie'] || '';
  const match = cookieHeader.match(/(?:^|;)\s*mctools_plaza=([^;]+)/);
  if (match) {
    const token = decodeURIComponent(match[1]);
    plazaSessions.delete(token);
  }
      clearScopedAuthCookie(response, 'mctools_plaza', '/api/plaza/');
  sendJson(response, 200, { message: '已退出登录' });
}

function handlePlazaVipPurchase(request, response) {
  const session = getPlazaSessionFromRequest(request);

  if (!session) {
    sendJson(response, 401, { message: '请先登录后再购买 VIP' });
    return;
  }

  if (vipSystemPaused) {
    sendJson(response, 503, {
      message: 'VIP 功能暂时关闭',
      vipPaused: true,
      username: session.username,
      version: appVersion,
      ...getVipInfo(session.username)
    });
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

function handlePlazaSvipPurchase(request, response) {
  const session = getPlazaSessionFromRequest(request);

  if (!session) {
    sendJson(response, 401, { message: '请先登录后再购买 SVIP' });
    return;
  }

  if (vipSystemPaused) {
    sendJson(response, 503, {
      message: 'VIP 功能暂时关闭',
      vipPaused: true,
      username: session.username,
      version: appVersion,
      ...getVipInfo(session.username)
    });
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

function handleServerListingCreate(request, response) {
  const plazaSession = getPlazaSessionFromRequest(request);

  if (!plazaSession) {
    sendJson(response, 401, { message: '请先登录后再投稿', code: 'LOGIN_REQUIRED' });
    return;
  }
  const vipInfo = getVipInfo(plazaSession.username);
  const canBypassLimit = Boolean(vipInfo && (vipInfo.vipPurchased || vipInfo.svipPurchased));

  parseRequestBody(request)
    .then((body) => {
      const serverName = String(body.server_name || '').trim();
      const ipAddress = String(body.ip_address || '').trim();
      const gameEdition = ['netease', 'international'].includes(String(body.game_edition || '').trim())
        ? String(body.game_edition || '').trim()
        : 'international';
      const description = String(body.description || '').trim().slice(0, 500);
      const serverType = ['survival', 'creative', 'minigames', 'adventure', 'skyblock', 'other'].includes(body.server_type)
        ? body.server_type
        : 'survival';
      const version = String(body.version || '').trim().slice(0, 32);
      const maxPlayers = Math.max(0, Math.min(10000, Number.parseInt(body.max_players, 10) || 0));
      const contact = String(body.contact || '').trim().slice(0, 128);
      const submitterName = String(body.submitter_name || '').trim().slice(0, 64);
      const imageData = String(body.avatarImageData || '').trim();

      const listingCount = db.prepare(
        'SELECT COUNT(*) AS count FROM server_listings WHERE submitter_name = ?'
      ).get(plazaSession.username)?.count || 0;

      if (!canBypassLimit && listingCount >= 2) {
        sendJson(response, 403, {
          message: '普通用户最多只能上传 2 个服务器，开通 VIP 后可继续投稿',
          code: 'SERVER_LIMIT_REACHED',
          limit: 2,
          current: listingCount,
          membershipLevel: 'NORMAL'
        });
        return;
      }

      if (!serverName || serverName.length > 64) {
        sendJson(response, 400, { message: '服务器名称不能为空，且不超过 64 个字符' });
        return;
      }

      if (!ipAddress || ipAddress.length > 128) {
        sendJson(response, 400, { message: 'IP 地址不能为空，且不超过 128 个字符' });
        return;
      }

      if (!description) {
        sendJson(response, 400, { message: '请填写服务器简介' });
        return;
      }

      const result = db.prepare(
        'INSERT INTO server_listings (server_name, ip_address, game_edition, description, server_type, version, max_players, contact, submitter_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ).run(serverName, ipAddress, gameEdition, description, serverType, version, maxPlayers, contact, plazaSession.username);

      if (imageData) {
        try {
          const avatarPath = saveServerListingAvatar(result.lastInsertRowid, imageData);
          if (avatarPath) {
            db.prepare('UPDATE server_listings SET avatar_path = ? WHERE id = ?').run(avatarPath, result.lastInsertRowid);
          }
        } catch (error) {
          db.prepare('DELETE FROM server_listings WHERE id = ?').run(result.lastInsertRowid);
          sendJson(response, 400, { message: error.message || '头像上传失败' });
          return;
        }
      }

      sendJson(response, 200, { message: '投稿已收到，等待开发者审核后会显示在列表中' });
    })
    .catch((error) => {
      const isJsonError = error.message === 'Invalid JSON';
      sendJson(response, isJsonError ? 400 : 500, { message: error.message || '提交失败' });
    });
}

function handleDeveloperServerListings(request, response) {
  const session = getSessionFromRequest(request);

  if (!requireDeveloperSession(request, response)) {
    return;
  }

  const rows = db.prepare(
    'SELECT * FROM server_listings ORDER BY CASE status WHEN \'PENDING\' THEN 0 WHEN \'APPROVED\' THEN 1 ELSE 2 END, created_at DESC'
  ).all();
  sendJson(response, 200, { servers: rows });
}

function handleDeveloperServerListingStatus(request, response) {
  if (!requireDeveloperSession(request, response)) {
    return;
  }

  parseRequestBody(request)
    .then((body) => {
      const id = Number.parseInt(body.id, 10);
      const status = body.status;

      if (!id || !['APPROVED', 'REJECTED', 'PENDING'].includes(status)) {
        sendJson(response, 400, { message: '参数错误' });
        return;
      }

      const existing = db.prepare('SELECT id FROM server_listings WHERE id = ?').get(id);

      if (!existing) {
        sendJson(response, 404, { message: '未找到该投稿' });
        return;
      }

      db.prepare('UPDATE server_listings SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, id);
      sendJson(response, 200, { message: '状态已更新' });
    })
    .catch((error) => {
      sendJson(response, 500, { message: error.message || '操作失败' });
    });
}

function handleDeveloperServerListingDelete(request, response) {
  if (!requireDeveloperSession(request, response)) {
    return;
  }

  parseRequestBody(request)
    .then((body) => {
      const id = Number.parseInt(body.id, 10);

      if (!id) {
        sendJson(response, 400, { message: '参数错误' });
        return;
      }

      const existing = db.prepare('SELECT id FROM server_listings WHERE id = ?').get(id);

      if (!existing) {
        sendJson(response, 404, { message: '未找到该投稿' });
        return;
      }

      deleteServerListingAvatarFiles(id);
      db.prepare('DELETE FROM server_listings WHERE id = ?').run(id);
      sendJson(response, 200, { message: '已删除' });
    })
    .catch((error) => {
      sendJson(response, 500, { message: error.message || '删除失败' });
    });
}

function sendPortClosedNotice(response, request) {
  const hostHeader = String(request.headers.host || '').trim();
  const hostname = hostHeader.includes(':') ? hostHeader.split(':')[0] : hostHeader || '127.0.0.1';
  const targetUrl = `http://${hostname}:3001/`;
  const html = `<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>服务器宣传页</title>
    <style>
      :root {
        color-scheme: dark;
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        min-height: 100vh;
        padding: 24px;
        font-family: "Microsoft YaHei", "PingFang SC", sans-serif;
        background:
          radial-gradient(circle at top left, rgba(103, 232, 249, 0.18), transparent 24%),
          radial-gradient(circle at top right, rgba(56, 189, 248, 0.18), transparent 30%),
          radial-gradient(circle at bottom, rgba(34, 197, 94, 0.16), transparent 34%),
          linear-gradient(160deg, #09111f, #10213d 54%, #0a1627);
        color: #eff6ff;
        display: grid;
        place-items: center;
      }

      .port-closed-card {
        width: min(760px, 100%);
        padding: 36px 32px;
        border-radius: 28px;
        border: 1px solid rgba(148, 163, 184, 0.24);
        background: rgba(15, 23, 42, 0.82);
        box-shadow: 0 30px 80px rgba(2, 6, 23, 0.48);
      }

      .promo-badge {
        display: inline-flex;
        align-items: center;
        padding: 8px 12px;
        border-radius: 999px;
        background: rgba(56, 189, 248, 0.14);
        border: 1px solid rgba(56, 189, 248, 0.32);
        color: #7dd3fc;
        font-size: 0.82rem;
        letter-spacing: 0.08em;
      }

      .promo-grid {
        display: grid;
        gap: 18px;
        grid-template-columns: minmax(0, 1.15fr) minmax(240px, 0.85fr);
        align-items: start;
      }

      h1 {
        margin: 16px 0 14px;
        font-size: clamp(1.8rem, 4vw, 2.4rem);
      }

      p {
        margin: 0;
        line-height: 1.8;
        color: #cbd5e1;
      }

      .promo-copy {
        display: grid;
        gap: 14px;
      }

      .promo-points {
        display: grid;
        gap: 12px;
      }

      .promo-point {
        padding: 14px 16px;
        border-radius: 18px;
        background: rgba(15, 23, 42, 0.54);
        border: 1px solid rgba(148, 163, 184, 0.16);
      }

      .promo-point strong {
        display: block;
        margin-bottom: 6px;
        color: #f8fafc;
      }

      .promo-side {
        padding: 18px;
        border-radius: 22px;
        background: linear-gradient(180deg, rgba(14, 165, 233, 0.12), rgba(34, 197, 94, 0.08));
        border: 1px solid rgba(125, 211, 252, 0.18);
        display: grid;
        gap: 12px;
      }

      .promo-side-title {
        margin: 0;
        font-size: 1rem;
        color: #f8fafc;
      }

      .promo-status {
        display: inline-flex;
        width: fit-content;
        padding: 8px 12px;
        border-radius: 999px;
        background: rgba(248, 113, 113, 0.14);
        border: 1px solid rgba(248, 113, 113, 0.28);
        color: #fecaca;
        font-weight: 700;
      }

      .promo-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        margin-top: 8px;
      }

      .port-closed-link {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 12px 18px;
        border-radius: 999px;
        background: linear-gradient(135deg, #38bdf8, #60a5fa);
        color: #031525;
        text-decoration: none;
        font-weight: 700;
      }

      .port-closed-link.secondary {
        background: transparent;
        color: #dbeafe;
        border: 1px solid rgba(191, 219, 254, 0.26);
      }

      @media (max-width: 720px) {
        .promo-grid {
          grid-template-columns: 1fr;
        }
      }
    </style>
  </head>
  <body>
    <main class="port-closed-card">
      <div class="promo-grid">
        <section class="promo-copy">
          <span class="promo-badge">MC TOOLS SERVER PREVIEW</span>
          <div>
            <h1>服务器宣传页</h1>
            <p>3000 端口当前只保留服务器宣传展示，用于预告玩法方向、房间氛围和后续开放计划，暂不开放实际访问与功能操作。</p>
          </div>
          <div class="promo-points">
            <article class="promo-point">
              <strong>多人联机主题</strong>
              <p>主打轻量生存、活动夜、多人分工和房间开场节奏，适合朋友局快速集合。</p>
            </article>
            <article class="promo-point">
              <strong>工具箱联动</strong>
              <p>后续会和开服中心、设备检测、Bug 门户联动，但当前宣传端口不提供登录、注册和扫码操作。</p>
            </article>
            <article class="promo-point">
              <strong>开放状态</strong>
              <p>目前仍在准备阶段。需要继续使用现有服务时，请直接前往 3001 端口。</p>
            </article>
          </div>
        </section>
        <aside class="promo-side">
          <p class="promo-side-title">当前状态</p>
          <span class="promo-status">暂不开放</span>
          <p>3000 端口现在不会提供正式登录、账号操作、扫码登录或工具页交互。</p>
          <div class="promo-actions">
            <a class="port-closed-link" href="${targetUrl}">前往 3001 正式入口</a>
            <a class="port-closed-link secondary" href="${targetUrl}server-hub.html">查看联机模块</a>
          </div>
        </aside>
      </div>
    </main>
  </body>
</html>`;

  sendHtml(response, 200, html);
}

function isOfficialPublicHost(request) {
  const hostHeader = String(request.headers.host || '').trim().toLowerCase();
  return hostHeader === '115.29.198.193:3000' || hostHeader === '115.29.198.193';
}

function isBugPortalHost(request) {
  const hostHeader = String(request.headers.host || '').trim().toLowerCase();
  return hostHeader.endsWith(':3002');
}

function isLocalNetworkAddress(address) {
  const normalizedAddress = String(address || '').trim().toLowerCase();

  if (!normalizedAddress) {
    return false;
  }

  if (normalizedAddress === 'localhost' || normalizedAddress === '127.0.0.1' || normalizedAddress === '::1') {
    return true;
  }

  if (normalizedAddress.startsWith('::ffff:')) {
    return isLocalNetworkAddress(normalizedAddress.slice(7));
  }

  if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(normalizedAddress)) {
    return true;
  }

  if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(normalizedAddress)) {
    return true;
  }

  if (/^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(normalizedAddress)) {
    return true;
  }

  return false;
}

function isLocalNetworkRequest(request) {
  const hostHeader = String(request.headers.host || '').trim();
  const hostName = hostHeader.includes(':') ? hostHeader.split(':')[0] : hostHeader;

  return isLocalNetworkAddress(hostName) || isLocalNetworkAddress(getRequestClientAddress(request));
}

function getRequestClientAddress(request) {
  const forwardedFor = String(request.headers['x-forwarded-for'] || '').trim();
  const candidate = forwardedFor ? forwardedFor.split(',')[0].trim() : String(request.socket.remoteAddress || '').trim();

  if (candidate.startsWith('::ffff:')) {
    return candidate.slice(7);
  }

  return candidate;
}

function canUseLocalDevQuickEntry(request) {
  return !isOfficialPublicHost(request) || isLocalNetworkRequest(request);
}

function canUseGeneralUserLogin(request) {
  return isOfficialPublicHost(request) || isBugPortalHost(request) || isLocalNetworkRequest(request);
}

function issueLocalDevQuickEntryToken(request) {
  cleanupExpiredLocalDevQuickEntryTokens();
  const token = generateDeveloperEntryCode();
  localDevQuickEntryTokens.set(token, {
    ip: getRequestClientAddress(request),
    expiresAt: Date.now() + localDevQuickEntryLifetimeMs
  });

  return token;
}

function consumeLocalDevQuickEntryToken(request, token) {
  const normalizedToken = String(token || '').trim().toUpperCase();

  if (!normalizedToken) {
    return false;
  }

  cleanupExpiredLocalDevQuickEntryTokens();
  const tokenInfo = localDevQuickEntryTokens.get(normalizedToken);

  if (!tokenInfo) {
    return false;
  }

  localDevQuickEntryTokens.delete(token);

  if (tokenInfo.expiresAt <= Date.now()) {
    return false;
  }

  return tokenInfo.ip === getRequestClientAddress(request);
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

function sanitizeAppVersion(value) {
  const nextVersion = String(value || '').trim();

  if (!nextVersion) {
    throw new Error('版本号不能为空');
  }

  if (nextVersion.length > 32) {
    throw new Error('版本号长度不能超过 32 个字符');
  }

  return nextVersion;
}

function isDeveloper(username) {
  if (!username) {
    return false;
  }

  const row = db.prepare('SELECT is_developer AS isDeveloper FROM users WHERE username = ?').get(username);
  return Boolean(row && row.isDeveloper);
}

function isPrivilegedUser(username) {
  return isDeveloper(username);
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

function ensureAppSettings() {
  const storedVersion = getSettingValue('app_version', '').trim();
  const storedSourceVersion = getSettingValue('app_version_source', '').trim();

  if (storedSourceVersion !== sourceAppVersion) {
    appVersion = sourceAppVersion;
    setSettingValue('app_version', appVersion);
    setSettingValue('app_version_source', sourceAppVersion);
    return;
  }

  if (storedVersion) {
    appVersion = storedVersion;
    return;
  }

  setSettingValue('app_version', appVersion);
  setSettingValue('app_version_source', sourceAppVersion);
}

ensureAppSettings();

function handleRegister(request, response) {
  parseRequestBody(request)
    .then((body) => {
      const username = String(body.username || '').trim();
      const password = String(body.password || '');
      const captchaId = String(body.captchaId || '').trim();
      const captchaCode = String(body.captchaCode || '').trim();
      const registerAsDeveloper =
        body.registerAsDeveloper === true ||
        body.registerAsDeveloper === 'true' ||
        body.registerAsDeveloper === 1 ||
        body.registerAsDeveloper === '1';
      const developerSecret = String(body.developerSecret || '').trim();

      if (username.length < 3 || username.length > 32) {
        sendJson(response, 400, { message: '用户名长度需为 3-32 个字符' });
        return;
      }

      if (password.length < 6) {
        sendJson(response, 400, { message: '密码长度至少 6 位' });
        return;
      }

      const captchaCheck = verifyLoginCaptcha(captchaId, captchaCode);

      if (!captchaCheck.ok) {
        sendJson(response, 400, { message: captchaCheck.message });
        return;
      }

      let usedLocalDevQuickEntry = false;

      if (registerAsDeveloper) {
        const secretMatched = developerSecret === developerRegistrationSecret;

        if (!secretMatched && canUseLocalDevQuickEntry(request)) {
          usedLocalDevQuickEntry = consumeLocalDevQuickEntryToken(request, developerSecret);
        }

        if (!secretMatched && !usedLocalDevQuickEntry) {
          sendJson(response, 403, { message: '开发者授权码错误或已过期' });
          return;
        }
      }

      const existingUser = db.prepare('SELECT id FROM users WHERE username = ?').get(username);

      if (existingUser) {
        sendJson(response, 409, { message: '用户名已存在' });
        return;
      }

      const passwordHash = hashPassword(password);
      db.prepare('INSERT INTO users (username, password_hash, is_developer) VALUES (?, ?, ?)').run(
        username,
        passwordHash,
        registerAsDeveloper ? 1 : 0
      );

      const sessionToken = createSession(username);
      setSessionCookie(response, sessionToken);
      sendJson(response, 201, {
        message: registerAsDeveloper
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

function handleDeveloperQuickEntryToken(request, response) {
  if (!canUseLocalDevQuickEntry(request)) {
    sendJson(response, 403, { message: '官方线上环境禁用快捷入口，请使用开发者授权码' });
    return;
  }

  const token = issueLocalDevQuickEntryToken(request);
  sendJson(response, 200, {
    enabled: true,
    code: token,
    expiresInMs: localDevQuickEntryLifetimeMs
  });
}

function handleLogin(request, response) {
  parseRequestBody(request)
    .then((body) => {
      const username = String(body.username || '').trim();
      const password = String(body.password || '');
      const bypassDeveloperRestriction = canUseGeneralUserLogin(request);

      if (!username || !password) {
        sendJson(response, 400, { message: '请输入用户名和密码' });
        return;
      }

      const user = db.prepare('SELECT username, password_hash, is_developer FROM users WHERE username = ?').get(username);

      if (!user || !verifyPassword(password, user.password_hash)) {
        sendJson(response, 401, { message: '用户名或密码错误' });
        return;
      }

      if (!bypassDeveloperRestriction && !Number(user.is_developer)) {
        sendJson(response, 403, { message: '当前仅允许开发者账号登录' });
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

function handleQrLoginTicketIssue(request, response) {
  const ticketToken = issueQrLoginTicket();
  sendJson(response, 200, {
    token: ticketToken,
    expiresInMs: qrLoginTicketLifetimeMs,
    version: appVersion
  });
}

function handleQrLoginStatus(request, response) {
  const url = new URL(request.url || '/', `http://${host}:${port}`);
  const ticket = getQrLoginTicket(url.searchParams.get('token'));

  if (!ticket) {
    sendJson(response, 404, { message: '扫码登录二维码已失效，请刷新后重试' });
    return;
  }

  if (ticket.status !== 'approved' || !ticket.username) {
    sendJson(response, 200, {
      status: ticket.status,
      expiresInMs: Math.max(0, ticket.expiresAt - Date.now())
    });
    return;
  }

  const sessionToken = createSession(ticket.username);
  setSessionCookie(response, sessionToken);
  qrLoginTickets.delete(ticket.token);
  sendJson(response, 200, {
    status: 'approved',
    username: ticket.username,
    version: appVersion
  });
}

function handleQrLoginApprove(request, response) {
  const session = getSessionFromRequest(request);

  if (!session) {
    sendJson(response, 401, { message: '请先在扫码设备登录账号' });
    return;
  }

  parseRequestBody(request)
    .then((body) => {
      const ticket = getQrLoginTicket(body.token || '');

      if (!ticket) {
        sendJson(response, 404, { message: '扫码登录二维码已失效，请返回原页面刷新' });
        return;
      }

      updateQrLoginTicket(ticket.token, {
        status: 'approved',
        username: session.username,
        createdAt: ticket.createdAt,
        expiresAt: ticket.expiresAt
      });

      sendJson(response, 200, {
        message: `已确认使用账号 ${session.username} 登录`,
        username: session.username,
        expiresInMs: Math.max(0, ticket.expiresAt - Date.now())
      });
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

function handlePasswordChange(request, response) {
  const session = getSessionFromRequest(request);

  if (!session) {
    sendJson(response, 401, { message: '未登录' });
    return;
  }

  parseRequestBody(request)
    .then((body) => {
      const currentPassword = String(body.currentPassword || '');
      const nextPassword = String(body.nextPassword || '');
      const confirmPassword = String(body.confirmPassword || '');

      if (!currentPassword || !nextPassword || !confirmPassword) {
        sendJson(response, 400, { message: '请完整填写当前密码、新密码和确认密码' });
        return;
      }

      if (nextPassword.length < 6) {
        sendJson(response, 400, { message: '新密码长度至少 6 位' });
        return;
      }

      if (nextPassword !== confirmPassword) {
        sendJson(response, 400, { message: '两次输入的新密码不一致' });
        return;
      }

      const user = db.prepare('SELECT password_hash FROM users WHERE username = ?').get(session.username);

      if (!user || !verifyPassword(currentPassword, user.password_hash)) {
        sendJson(response, 401, { message: '当前密码错误' });
        return;
      }

      if (verifyPassword(nextPassword, user.password_hash)) {
        sendJson(response, 400, { message: '新密码不能与当前密码相同' });
        return;
      }

      db.prepare('UPDATE users SET password_hash = ? WHERE username = ?').run(hashPassword(nextPassword), session.username);

      sendJson(response, 200, {
        message: '密码修改成功',
        username: session.username,
        version: appVersion
      });
    })
    .catch((error) => {
      const statusCode = error.message === 'Invalid JSON' ? 400 : 413;
      sendJson(response, statusCode, { message: error.message });
    });
}

function getVipInfo(username) {
  if (vipSystemPaused) {
    return {
      vipPaused: true,
      vipPurchased: false,
      vipAmount: 0,
      vipPurchasedAt: null,
      svipPurchased: false,
      svipAmount: 0,
      svipPurchasedAt: null,
      membershipLevel: 'NORMAL'
    };
  }

  const vipPurchase = db.prepare('SELECT amount, purchased_at FROM vip_purchases WHERE username = ?').get(username);
  const svipPurchase = db.prepare('SELECT amount, purchased_at FROM svip_purchases WHERE username = ?').get(username);
  const hasSvip = Boolean(svipPurchase);
  const hasVip = Boolean(vipPurchase) || hasSvip;

  return {
    vipPaused: false,
    vipPurchased: hasVip,
    vipAmount: vipPurchase ? vipPurchase.amount : 0,
    vipPurchasedAt: vipPurchase ? vipPurchase.purchased_at : hasSvip ? svipPurchase.purchased_at : null,
    svipPurchased: hasSvip,
    svipAmount: svipPurchase ? svipPurchase.amount : 0,
    svipPurchasedAt: svipPurchase ? svipPurchase.purchased_at : null,
    membershipLevel: hasSvip ? 'SVIP' : hasVip ? 'VIP' : 'NORMAL'
  };
}

function hasVipFeatureAccess(vipInfo) {
  return vipSystemPaused || Boolean(vipInfo && vipInfo.vipPurchased);
}

function hasSvipFeatureAccess(vipInfo) {
  return vipSystemPaused || Boolean(vipInfo && vipInfo.svipPurchased);
}

function getAiMaintenanceMessage() {
  return 'AI 助手已恢复可用';
}

function isAiUnderMaintenance() {
  return false;
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

function handleBugReportCreate(request, response) {
  const session = getSessionFromRequest(request);

  if (!session) {
    sendJson(response, 401, { message: '请先登录后再提交 bug 反馈' });
    return;
  }

  parseRequestBody(request)
    .then((body) => {
      const title = String(body.title || '').trim();
      const category = String(body.category || '其他').trim() || '其他';
      const description = String(body.description || '').trim();
      const contact = String(body.contact || '').trim();

      if (title.length < 4 || title.length > 80) {
        sendJson(response, 400, { message: '标题长度需为 4-80 个字符' });
        return;
      }

      if (description.length < 10 || description.length > 5000) {
        sendJson(response, 400, { message: '问题描述长度需为 10-5000 个字符' });
        return;
      }

      if (contact.length > 120) {
        sendJson(response, 400, { message: '联系方式长度不能超过 120 个字符' });
        return;
      }

      db.prepare(
        `INSERT INTO bug_reports (username, title, category, description, contact)
         VALUES (?, ?, ?, ?, ?)`
      ).run(session.username, title, category, description, contact);

      sendJson(response, 201, {
        message: 'Bug 反馈已提交，开发者稍后会查看。',
        username: session.username,
        version: appVersion
      });
    })
    .catch((error) => {
      const statusCode = error.message === 'Invalid JSON' ? 400 : 413;
      sendJson(response, statusCode, { message: error.message });
    });
}

function handleMyBugReports(request, response) {
  const session = getSessionFromRequest(request);

  if (!session) {
    sendJson(response, 401, { message: '未登录' });
    return;
  }

  const rows = db.prepare(
    `SELECT id, title, category, description, contact, status,
            created_at AS createdAt, updated_at AS updatedAt
     FROM bug_reports
     WHERE username = ?
     ORDER BY id DESC
     LIMIT 50`
  ).all(session.username);

  sendJson(response, 200, {
    items: rows,
    username: session.username,
    version: appVersion
  });
}

function handleDeveloperBugReports(request, response) {
  const session = requireDeveloperSession(request, response);

  if (!session) {
    return;
  }

  const url = new URL(request.url || '/', `http://${host}:${port}`);
  const statusFilter = String(url.searchParams.get('status') || '').trim().toUpperCase();
  const limitValue = Number(url.searchParams.get('limit') || 100);
  const limit = Number.isFinite(limitValue) ? Math.max(1, Math.min(200, Math.floor(limitValue))) : 100;
  let sql = `SELECT id, username, title, category, description, contact, status,
                    created_at AS createdAt, updated_at AS updatedAt
             FROM bug_reports`;
  const params = [];

  if (statusFilter) {
    sql += ' WHERE status = ?';
    params.push(statusFilter);
  }

  sql += ' ORDER BY id DESC LIMIT ?';
  params.push(limit);

  const rows = db.prepare(sql).all(...params);
  sendJson(response, 200, {
    items: rows,
    username: session.username,
    version: appVersion
  });
}

function handleDeveloperBugReportStatus(request, response) {
  const session = requireDeveloperSession(request, response);

  if (!session) {
    return;
  }

  parseRequestBody(request)
    .then((body) => {
      const id = Number(body.id);
      const status = String(body.status || '').trim().toUpperCase();
      const allowedStatus = new Set(['OPEN', 'TRIAGED', 'FIXED', 'CLOSED']);

      if (!Number.isInteger(id) || id <= 0) {
        sendJson(response, 400, { message: '缺少有效的反馈编号' });
        return;
      }

      if (!allowedStatus.has(status)) {
        sendJson(response, 400, { message: '状态无效' });
        return;
      }

      const result = db.prepare(
        `UPDATE bug_reports
         SET status = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`
      ).run(status, id);

      if (!result.changes) {
        sendJson(response, 404, { message: '未找到对应的 bug 反馈' });
        return;
      }

      sendJson(response, 200, {
        message: '反馈状态已更新',
        status,
        id,
        operator: session.username
      });
    })
    .catch((error) => {
      const statusCode = error.message === 'Invalid JSON' ? 400 : 413;
      sendJson(response, statusCode, { message: error.message });
    });
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

function handleDeveloperVersionRead(request, response) {
  const session = requireDeveloperSession(request, response);

  if (!session) {
    return;
  }

  sendJson(response, 200, {
    version: appVersion,
    username: session.username
  });
}

function handlePublicVersionRead(request, response) {
  sendJson(response, 200, {
    version: appVersion
  });
}

function handleDeveloperVersionSave(request, response) {
  const session = requireDeveloperSession(request, response);

  if (!session) {
    return;
  }

  parseRequestBody(request)
    .then((body) => {
      const nextVersion = sanitizeAppVersion(body.version || '');
      appVersion = nextVersion;
      setSettingValue('app_version', nextVersion);

      sendJson(response, 200, {
        message: '版本号已更新',
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

  if (vipSystemPaused) {
    sendJson(response, 503, {
      message: 'VIP 功能暂时关闭',
      vipPaused: true,
      username: session.username,
      version: appVersion,
      ...getVipInfo(session.username)
    });
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

  if (vipSystemPaused) {
    sendJson(response, 503, {
      message: 'VIP 功能暂时关闭',
      vipPaused: true,
      username: session.username,
      version: appVersion,
      ...getVipInfo(session.username)
    });
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

  if (isAiUnderMaintenance()) {
    sendJson(response, 503, {
      message: getAiMaintenanceMessage(),
      maintenanceEndsAt: aiMaintenanceEndsAt.toISOString()
    });
    return;
  }

  const vipInfo = getVipInfo(session.username);

  if (!hasVipFeatureAccess(vipInfo)) {
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
        aiTier: vipSystemPaused ? 'OPEN' : vipInfo.svipPurchased ? 'SVIP' : 'VIP',
        ...getVipInfo(session.username)
      });
    })
    .catch((error) => {
      const statusCode = error.message === 'Invalid JSON' ? 400 : 413;
      sendJson(response, statusCode, { message: error.message });
    });
}

async function callDeepSeekAnswer(question) {
  const apiKey = getConfiguredValue('DEEPSEEK_API_KEY', 'deepseekApiKey');

  if (!apiKey) {
    throw new Error('服务器未配置 DeepSeek API Key，请先填写 config/api-keys.json');
  }

  const requestedModel = getConfiguredValue('DEEPSEEK_MODEL', 'deepseekModel');
  const candidateModels = requestedModel
    ? [requestedModel]
    : ['deepseek-chat', 'deepseek-reasoner'];

  let lastError = null;

  for (const modelName of candidateModels) {
    try {
      const response = await fetch(
        'https://api.deepseek.com/chat/completions',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: modelName,
            messages: [
              {
                role: 'system',
                content: [
                  '你是"我的世界工具箱"的 SVIP AI 助手。',
                  '请始终使用简体中文回答。',
                  '优先回答 Minecraft 指令、玩法、红石、配方、坐标、服务器管理相关问题。',
                  '如果问题适合给步骤，请给简洁步骤；如果适合给命令，请给可直接复制的命令。'
                ].join('\n')
              },
              {
                role: 'user',
                content: question
              }
            ],
            stream: false
          })
        }
      );

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        const errorMessage = result && result.error && result.error.message
          ? result.error.message
          : `DeepSeek 请求失败（${response.status}）`;
        lastError = new Error(`${modelName}: ${errorMessage}`);
        continue;
      }

      const answer = ((result.choices || [])[0] || {}).message?.content?.trim() || '';

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

  throw lastError || new Error('DeepSeek 调用失败');
}

function handleAiChat(request, response) {
  const session = getSessionFromRequest(request);

  if (!session) {
    sendJson(response, 401, { message: '未登录' });
    return;
  }

  if (isAiUnderMaintenance()) {
    sendJson(response, 503, {
      message: getAiMaintenanceMessage(),
      maintenanceEndsAt: aiMaintenanceEndsAt.toISOString()
    });
    return;
  }

  const vipInfo = getVipInfo(session.username);

  if (!hasSvipFeatureAccess(vipInfo)) {
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

      const result = await callDeepSeekAnswer(question);
      sendJson(response, 200, {
        message: 'AI 回复成功',
        answer: result.answer,
        model: result.model,
        username: session.username,
        version: appVersion,
        aiTier: vipSystemPaused ? 'OPEN' : 'SVIP'
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

  if (isAiUnderMaintenance()) {
    sendJson(response, 503, {
      message: getAiMaintenanceMessage(),
      maintenanceEndsAt: aiMaintenanceEndsAt.toISOString()
    });
    return;
  }

  const vipInfo = getVipInfo(session.username);

  if (!hasSvipFeatureAccess(vipInfo)) {
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
        executorTier: vipSystemPaused ? 'OPEN' : 'SVIP',
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

      if (vipOnlyCommandNames.has(commandName) && !hasVipFeatureAccess(vipInfo)) {
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

function handleCommandCommunitySubmit(request, response) {
  parseRequestBody(request)
    .then((body) => {
      const submitterName = String(body.submitterName || '').trim();
      const commandText = String(body.commandText || '').trim();
      const description = String(body.description || '').trim();
      const category = String(body.category || '通用').trim() || '通用';

      if (!submitterName || !commandText) {
        sendJson(response, 400, { message: '投稿昵称和指令内容不能为空' });
        return;
      }

      const result = db.prepare(
        'INSERT INTO command_submissions (submitter_name, command_text, description, category) VALUES (?, ?, ?, ?)'
      ).run(submitterName, commandText, description, category);

      sendJson(response, 201, { message: '投稿已提交，等待后台审核', id: result.lastInsertRowid });
    })
    .catch((error) => {
      const statusCode = error.message === 'Invalid JSON' ? 400 : 413;
      sendJson(response, statusCode, { message: error.message });
    });
}

function handleCommandCommunityList(request, response) {
  const url = new URL(request.url || '/', `http://${host}:${port}`);
  const statusFilter = String(url.searchParams.get('status') || 'APPROVED').trim().toUpperCase();
  const limit = Math.min(Math.max(Number.parseInt(url.searchParams.get('limit') || '20', 10) || 20, 1), 100);
  const params = [];
  let sql = 'SELECT id, submitter_name AS submitterName, command_text AS commandText, description, category, status, reviewer_name AS reviewerName, review_note AS reviewNote, created_at AS createdAt, updated_at AS updatedAt FROM command_submissions';

  if (statusFilter && ['PENDING', 'APPROVED', 'REJECTED', 'ALL'].includes(statusFilter)) {
    if (statusFilter !== 'ALL') {
      sql += ' WHERE status = ?';
      params.push(statusFilter);
    }
  } else {
    sql += ' WHERE status = ?';
    params.push('APPROVED');
  }

  sql += ' ORDER BY id DESC LIMIT ?';
  params.push(limit);

  const rows = db.prepare(sql).all(...params);
  sendJson(response, 200, { items: rows, version: appVersion });
}

function handleCommandCommunityModerate(request, response) {
  const session = getSessionFromRequest(request);

  if (!session) {
    sendJson(response, 401, { message: '未登录' });
    return;
  }

  if (!isDeveloper(session.username)) {
    sendJson(response, 403, { message: '仅开发者可审核' });
    return;
  }

  parseRequestBody(request)
    .then((body) => {
      const id = Number.parseInt(body.id, 10);
      const status = String(body.status || '').trim().toUpperCase();
      const reviewNote = String(body.reviewNote || '').trim();

      if (!id || !['APPROVED', 'REJECTED', 'PENDING'].includes(status)) {
        sendJson(response, 400, { message: '参数无效' });
        return;
      }

      const item = db.prepare('SELECT id FROM command_submissions WHERE id = ?').get(id);

      if (!item) {
        sendJson(response, 404, { message: '投稿不存在' });
        return;
      }

      db.prepare(
        'UPDATE command_submissions SET status = ?, reviewer_name = ?, review_note = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
      ).run(status, session.username, reviewNote, id);

      sendJson(response, 200, { message: '审核状态已更新' });
    })
    .catch((error) => {
      const statusCode = error.message === 'Invalid JSON' ? 400 : 413;
      sendJson(response, statusCode, { message: error.message });
    });
}

function handleMe(request, response) {
  const session = getSessionFromRequest(request);

  if (!session) {
    sendJson(response, 200, { loggedIn: false, username: '' });
    return;
  }

  sendJson(response, 200, {
    loggedIn: true,
    ...getUserPayload(session.username)
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

function getPreviewTargetPath(requestUrl) {
  const rawUrl = String(requestUrl || '/');
  const queryIndex = rawUrl.indexOf('?');
  const search = queryIndex >= 0 ? rawUrl.slice(queryIndex + 1) : '';
  const params = new URLSearchParams(search);
  const page = String(params.get('page') || '').trim();

  if (!page) {
    return null;
  }

  const normalizedPath = page.startsWith('/') ? page : `/${page}`;
  return previewablePublicPages.has(normalizedPath) ? normalizedPath : null;
}

function getPreviewPageLink(pathname, hash = '') {
  return `/preview-page.html?page=${encodeURIComponent(pathname.replace(/^\//u, ''))}${hash || ''}`;
}

function rewritePreviewHref(rawHref) {
  const href = String(rawHref || '').trim();

  if (!href || href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:')) {
    return { href, locked: false };
  }

  const baseUrl = `http://${host}:${port}`;
  const parsed = new URL(href, baseUrl);

  if (parsed.origin !== baseUrl) {
    return { href, locked: false };
  }

  const normalizedPath = parsed.pathname === '/' ? '/index.html' : parsed.pathname;

  if (
    normalizedPath === '/login.html' ||
    normalizedPath === '/preview.html' ||
    normalizedPath === '/preview-page.html' ||
    /^\/preview-[a-z0-9-]+\.html$/iu.test(normalizedPath)
  ) {
    return { href: `${normalizedPath}${parsed.search}${parsed.hash}`, locked: false };
  }

  if (previewablePublicPages.has(normalizedPath)) {
    return { href: getPreviewPageLink(normalizedPath, parsed.hash), locked: false };
  }

  return { href: '#', locked: true };
}

function buildPreviewPageHtml(staticPath) {
  const filePath = resolvePublicFilePath(staticPath);

  if (!filePath) {
    return null;
  }

  let html = fs.readFileSync(filePath, 'utf8');
  const pageName = path.basename(staticPath, '.html');
  const displayName = pageName === 'index' ? '首页' : pageName;

  html = html.replace(/<script\b(?=[^>]*\bsrc=)[^>]*>\s*<\/script>/giu, '');
  html = html.replace(/<title>(.*?)<\/title>/iu, '<title>我的世界工具箱 - 公开预览</title>');

  if (!html.includes('/login.css')) {
    html = html.replace('</head>', '    <link rel="stylesheet" href="/login.css" />\n  </head>');
  }

  html = html.replace(/href=(['"])(.*?)\1/giu, (match, quote, href) => {
    const next = rewritePreviewHref(href);
    const lockedAttribute = next.locked ? ' data-preview-locked-link="true"' : '';
    return `href=${quote}${next.href}${quote}${lockedAttribute}`;
  });

  html = html.replace(/<form\b([^>]*)>/giu, '<form$1 data-preview-locked-form="true">');

  const previewBanner = `
      <section class="preview-lock-banner">
        <p class="panel-label">公开镜像</p>
        <h2>当前页是 ${displayName} 的公开预览复制页</h2>
        <p>页面结构和导航已开放浏览，但按钮、提交、下载与写入类操作都会提示先登录。你可以继续逛其他预览页，真正执行功能时再回登录页。</p>
      </section>
`;

  if (/<main\b[^>]*>/iu.test(html)) {
    html = html.replace(/<main\b([^>]*)>/iu, `<main$1>${previewBanner}`);
  }

  const previewOverlay = `
      <aside class="preview-fixed-tip" aria-label="登录提示">
        <strong>这是公开镜像页</strong>
        <p>你可以浏览页面结构和说明，但所有功能操作、提交、写入和下载都需要登录后使用。</p>
        <div class="preview-fixed-actions">
          <a class="preview-fixed-link preview-fixed-link-primary" href="/login.html">立即登录</a>
          <a class="preview-fixed-link" href="/preview.html">回到总览</a>
        </div>
      </aside>
      <div class="preview-login-modal" hidden data-preview-modal>
        <div class="preview-login-dialog">
          <p class="panel-label">需要登录</p>
          <h2>预览页不开放真实功能操作</h2>
          <p>当前公开镜像只复制页面结构。点击按钮、提交表单、下载资源或执行模块功能时，需要先登录正式界面。</p>
          <div class="preview-fixed-actions">
            <a class="preview-fixed-link preview-fixed-link-primary" href="/login.html" data-preview-allow="true">前往登录</a>
            <button type="button" class="preview-fixed-link" data-preview-modal-close data-preview-allow="true">继续浏览</button>
          </div>
        </div>
      </div>
      <script>
        (function () {
          const modal = document.querySelector('[data-preview-modal]');
          const closeModal = () => {
            if (modal) {
              modal.hidden = true;
            }
          };
          const openModal = () => {
            if (modal) {
              modal.hidden = false;
            }
          };

          document.addEventListener('click', (event) => {
            const closeButton = event.target.closest('[data-preview-modal-close]');
            if (closeButton) {
              event.preventDefault();
              closeModal();
              return;
            }

            if (event.target === modal) {
              closeModal();
              return;
            }

            const anchor = event.target.closest('a[href]');
            if (anchor && !anchor.dataset.previewAllow && anchor.dataset.previewLockedLink === 'true') {
              event.preventDefault();
              openModal();
              return;
            }

            const button = event.target.closest('button');
            if (button && !button.dataset.previewAllow) {
              event.preventDefault();
              openModal();
            }
          });

          document.addEventListener('submit', (event) => {
            if (event.target.matches('[data-preview-locked-form]')) {
              event.preventDefault();
              openModal();
            }
          });

          document.addEventListener('focusin', (event) => {
            const field = event.target.closest('input, textarea, select');
            if (!field || field.dataset.previewAllow || field.disabled || field.readOnly) {
              return;
            }

            if (field.form && field.form.matches('[data-preview-locked-form]')) {
              field.blur();
              openModal();
            }
          });

          document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
              closeModal();
            }
          });
        })();
      </script>
    </body>`;

  html = html.replace('</body>', previewOverlay);
  return html;
}

const server = http.createServer((request, response) => {
  cleanupExpiredSessions();
  cleanupExpiredCaptchas();
  cleanupExpiredSiteOnlineVisitors();
  cleanupExpiredLocalDevQuickEntryTokens();
  cleanupExpiredQrLoginTickets();
  cleanupExpiredPlazaCodes();
  cleanupExpiredCommunityCodes();

  const pathname = getPathname(request.url || '/');
  const session = getSessionFromRequest(request);

  // 允许服务器广场 (3000) 跨域访问 3001 的 API（携带 Cookie）
  const origin = request.headers['origin'] || '';
  if (Number(port) === 3001 && origin) {
    try {
      const parsedOrigin = new URL(origin);
      if (parsedOrigin.protocol === 'http:' && parsedOrigin.port === '3000') {
        response.setHeader('Access-Control-Allow-Origin', origin);
        response.setHeader('Access-Control-Allow-Credentials', 'true');
        response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        response.setHeader('Vary', 'Origin');
        if (request.method === 'OPTIONS') {
          response.writeHead(204);
          response.end();
          return;
        }
      }
    } catch {
      // Ignore malformed origins and continue with normal handling.
    }
  }

  if (Number(port) === 3000) {
    // 服务器广场公开 API
    if (request.method === 'GET' && pathname === '/api/servers') {
      handleServerListingsGet(request, response);
      return;
    }

    if (request.method === 'POST' && pathname === '/api/servers') {
      handleServerListingCreate(request, response);
      return;
    }

    // Plaza 认证
    if (request.method === 'POST' && pathname === '/api/plaza/login') {
      handlePlazaSendCode(request, response);
      return;
    }

    if (request.method === 'POST' && pathname === '/api/plaza/register') {
      handlePlazaRegister(request, response);
      return;
    }

    if (request.method === 'POST' && pathname === '/api/plaza/send-code') {
      handlePlazaSendCode(request, response);
      return;
    }

    if (request.method === 'POST' && pathname === '/api/plaza/verify') {
      handlePlazaVerify(request, response);
      return;
    }

    if (request.method === 'GET' && pathname === '/api/plaza/me') {
      handlePlazaMe(request, response);
      return;
    }

    if (request.method === 'POST' && pathname === '/api/plaza/logout') {
      handlePlazaLogout(request, response);
      return;
    }

    if (request.method === 'GET' && pathname === '/api/developer/servers') {
      handleDeveloperServerListings(request, response);
      return;
    }

    if (request.method === 'POST' && pathname === '/api/developer/servers/status') {
      handleDeveloperServerListingStatus(request, response);
      return;
    }

    if (request.method === 'POST' && pathname === '/api/developer/servers/delete') {
      handleDeveloperServerListingDelete(request, response);
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

    // 静态资源：样式和宣传页脚本
    if (request.method === 'GET' && (pathname === '/styles.css' || pathname === '/server-plaza.js' || pathname.startsWith('/assets/'))) {
      serveStatic(pathname, response);
      return;
    }

    // 根路径及宣传页本体
    if (request.method === 'GET' || request.method === 'HEAD') {
      const plazaPath = pathname === '/' ? '/server-plaza.html' : pathname;
      const staticFilePath = resolvePublicFilePath(plazaPath);

      if (staticFilePath) {
        serveStatic(plazaPath, response);
      } else {
        sendPortClosedNotice(response, request);
      }

      return;
    }

    sendJson(response, 405, { message: '方法不允许' });
    return;
  }

  if (Number(port) === 3003) {
    if (request.method === 'POST' && pathname === '/api/community/register') {
      handleCommunityRegister(request, response);
      return;
    }

    if (request.method === 'POST' && pathname === '/api/community/send-code') {
      handleCommunitySendCode(request, response);
      return;
    }

    if (request.method === 'POST' && pathname === '/api/community/verify') {
      handleCommunityVerify(request, response);
      return;
    }

    if (request.method === 'POST' && pathname === '/api/community/password-login') {
      handleCommunityPasswordLogin(request, response);
      return;
    }

    if (request.method === 'GET' && pathname === '/api/community/me') {
      handleCommunityMe(request, response);
      return;
    }

    if (request.method === 'POST' && pathname === '/api/community/logout') {
      handleCommunityLogout(request, response);
      return;
    }

    if (request.method === 'GET' && pathname === '/api/command-community') {
      handleCommandCommunityList(request, response);
      return;
    }

    if (request.method === 'POST' && pathname === '/api/command-community/submit') {
      handleCommandCommunitySubmit(request, response);
      return;
    }

    if (request.method === 'GET' && pathname === '/api/command-community/review') {
      handleCommandCommunityList(request, response);
      return;
    }

    if (request.method === 'POST' && pathname === '/api/command-community/review') {
      handleCommandCommunityModerate(request, response);
      return;
    }

    if (request.method === 'GET' && (pathname === '/styles.css' || pathname === '/app.js' || pathname.startsWith('/assets/'))) {
      serveStatic(pathname, response);
      return;
    }

    if (request.method === 'GET' || request.method === 'HEAD') {
      const communityPath = '/command-community.html';
      const communityFilePath = resolvePublicFilePath(communityPath);

      if (communityFilePath) {
        serveStatic(communityPath, response);
      } else {
        sendPortClosedNotice(response, request);
      }

      return;
    }

    sendJson(response, 405, { message: '方法不允许' });
    return;
  }

  if (Number(port) === 3004) {
    if (request.method === 'POST' && pathname === '/api/community/register') {
      handleCommunityRegister(request, response);
      return;
    }

    if (request.method === 'POST' && pathname === '/api/community/send-code') {
      handleCommunitySendCode(request, response);
      return;
    }

    if (request.method === 'POST' && pathname === '/api/community/verify') {
      handleCommunityVerify(request, response);
      return;
    }

    if (request.method === 'POST' && pathname === '/api/community/password-login') {
      handleCommunityPasswordLogin(request, response);
      return;
    }

    if (request.method === 'GET' && pathname === '/api/community/me') {
      handleCommunityMe(request, response);
      return;
    }

    if (request.method === 'POST' && pathname === '/api/community/logout') {
      handleCommunityLogout(request, response);
      return;
    }

    if (request.method === 'GET' && pathname === '/api/login/captcha') {
      handleLoginCaptcha(request, response);
      return;
    }

    if (request.method === 'GET' && pathname === '/api/me') {
      handleMe(request, response);
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

    if (request.method === 'GET' && pathname === '/api/store/wechat/meta') {
      const readiness = getStorePaymentReadiness();
      sendJson(response, 200, {
        ready: readiness.ready,
        provider: readiness.provider,
        missing: readiness.missing,
        providers: readiness.providers
      });
      return;
    }

    if (request.method === 'GET' && pathname === '/api/store/products') {
      handleStoreProducts(request, response);
      return;
    }

    if (request.method === 'GET' && pathname === '/api/site/online') {
      handleSiteOnlineStats(request, response);
      return;
    }

    if (request.method === 'POST' && pathname === '/api/site/online/ping') {
      handleSiteOnlinePing(request, response);
      return;
    }

    if (request.method === 'GET' && pathname === '/api/store/products/admin') {
      handleStoreProductsAdmin(request, response);
      return;
    }

    if (request.method === 'POST' && pathname === '/api/store/products') {
      handleStoreProductsCreate(request, response);
      return;
    }

    if (request.method === 'POST' && pathname === '/api/store/products/update') {
      handleStoreProductsUpdate(request, response);
      return;
    }

    if (request.method === 'POST' && pathname === '/api/store/products/toggle') {
      handleStoreProductsToggle(request, response);
      return;
    }

    if (request.method === 'POST' && pathname === '/api/store/wechat/native-order') {
      createWechatPayNativeOrder(request, response);
      return;
    }

    if (request.method === 'GET' && pathname === '/api/store/wechat/order-status') {
      handleStoreOrderStatus(request, response);
      return;
    }

    if (request.method === 'POST' && pathname === '/api/store/wechat/notify') {
      handleStoreWechatNotify(request, response);
      return;
    }

    // 快速创建测试开发者账号（仅用于测试）
    if (request.method === 'POST' && pathname === '/api/dev-test/create-dev-account') {
      const username = 'devtest' + Date.now().toString().slice(-6);
      const email = 'devtest' + Date.now().toString().slice(-6) + '@test.local';
      
      const account = createCommunityAccount(username, email, true);
      const token = crypto.randomBytes(32).toString('hex');
      const session = {
        username,
        email,
        isDeveloper: true,
        expiresAt: Date.now() + communitySessionLifetimeMs
      };
      
      communitySessions.set(token, session);
      
      // 直接处理响应，确保Set-Cookie在其他响应头之前
      response.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Set-Cookie': `mctools_community=${token}; Path=/; Max-Age=${Math.floor(communitySessionLifetimeMs / 1000)}`
      });
      response.end(JSON.stringify({
        message: '测试账号创建成功',
        username,
        email,
        token,
        isDeveloper: true
      }));
      return;
    }

    if (request.method === 'GET' && (pathname === '/styles.css' || pathname.startsWith('/assets/'))) {
      serveStatic(pathname, response);
      return;
    }

    if (request.method === 'GET' || request.method === 'HEAD') {
      const storePath = pathname === '/' ? '/store.html' : pathname;
      const staticFilePath = resolvePublicFilePath(storePath);

      if (staticFilePath) {
        serveStatic(storePath, response);
      } else {
        sendPortClosedNotice(response, request);
      }

      return;
    }

    sendJson(response, 405, { message: '方法不允许' });
    return;
  }

  if (request.method === 'GET' && pathname === '/api/login/captcha') {
    handleLoginCaptcha(request, response);
    return;
  }

  if (request.method === 'GET' && pathname === '/api/login/qr') {
    handleQrLoginTicketIssue(request, response);
    return;
  }

  if (request.method === 'GET' && pathname === '/api/login/qr/status') {
    handleQrLoginStatus(request, response);
    return;
  }

  const isMaintenancePort = false;
  const staticPath = pathname === '/' ? (isMaintenancePort ? '/maintenance.html' : '/index.html') : pathname;
  const isLoginAsset = pathname === '/login.html' || pathname === '/login.css' || pathname === '/login.js';
  const isPublicPageScript = pathname === '/fps-test.js';
  const isPublicPreviewPage =
    previewablePublicPages.has(pathname) ||
    previewablePublicPages.has(staticPath) ||
    pathname === '/preview.html' ||
    pathname === '/preview-page.html' ||
    /^\/preview-[a-z0-9-]+\.html$/iu.test(pathname);
  const isPublicLoginDependency = pathname.startsWith('/assets/') || pathname === '/styles.css' || isPublicPageScript;

  if (pathname.startsWith('/preview')) {
    console.log('[preview-debug]', JSON.stringify({
      pathname,
      method: request.method,
      isPublicPreviewPage,
      hasSession: Boolean(session)
    }));
  }

  if (request.method === 'POST' && pathname === '/api/register') {
    handleRegister(request, response);
    return;
  }

  if (request.method === 'GET' && pathname === '/api/developer/quick-entry-token') {
    handleDeveloperQuickEntryToken(request, response);
    return;
  }

  if (isMaintenancePort && pathname.startsWith('/api/')) {
    sendJson(response, 503, {
      message: '当前服务维护中，请稍后再试。',
      maintenance: true,
      port: Number(port)
    });
    return;
  }

  if (request.method === 'POST' && pathname === '/api/login') {
    handleLogin(request, response);
    return;
  }

  if (request.method === 'POST' && pathname === '/api/login/qr/approve') {
    handleQrLoginApprove(request, response);
    return;
  }

  if (request.method === 'POST' && pathname === '/api/logout') {
    handleLogout(request, response);
    return;
  }

  if (request.method === 'POST' && pathname === '/api/account/password') {
    handlePasswordChange(request, response);
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

  if (request.method === 'POST' && pathname === '/api/bugs') {
    handleBugReportCreate(request, response);
    return;
  }

  if (request.method === 'GET' && pathname === '/api/bugs/mine') {
    handleMyBugReports(request, response);
    return;
  }

  if (request.method === 'GET' && pathname === '/api/developer/servers') {
    handleDeveloperServerListings(request, response);
    return;
  }

  if (request.method === 'POST' && pathname === '/api/developer/servers/status') {
    handleDeveloperServerListingStatus(request, response);
    return;
  }

  if (request.method === 'POST' && pathname === '/api/developer/servers/delete') {
    handleDeveloperServerListingDelete(request, response);
    return;
  }

  if (request.method === 'GET' && pathname === '/api/developer/bugs') {
    handleDeveloperBugReports(request, response);
    return;
  }

  if (request.method === 'POST' && pathname === '/api/developer/bugs/status') {
    handleDeveloperBugReportStatus(request, response);
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

  if (request.method === 'GET' && pathname === '/api/developer/version') {
    handleDeveloperVersionRead(request, response);
    return;
  }

  if (request.method === 'GET' && pathname === '/api/app-version') {
    handlePublicVersionRead(request, response);
    return;
  }

  if (request.method === 'POST' && pathname === '/api/developer/version') {
    handleDeveloperVersionSave(request, response);
    return;
  }

  if (request.method === 'GET' && pathname === '/api/me') {
    handleMe(request, response);
    return;
  }

  if (
    request.method === 'GET' && (
      pathname === '/preview.html' ||
      pathname === '/preview-page.html' ||
      /^\/preview-[a-z0-9-]+\.html$/iu.test(pathname)
    )
  ) {
    redirectToLogin(response);
    return;
  }

  if (request.method === 'GET' && pathname === '/api/commands') {
    handleListCommands(request, response);
    return;
  }

  if (request.method === 'GET' && pathname === '/update-log.html') {
    redirectToSettings(response);
    return;
  }

  if (isMaintenancePort && pathname !== '/maintenance.html') {
    serveStatic('/maintenance.html', response);
    return;
  }

  const publicFilePath = resolvePublicFilePath(staticPath);

  if (pathname === '/extension-hub.html') {
    console.log('[extension-debug]', JSON.stringify({
      pathname,
      staticPath,
      publicFilePath,
      publicDir,
      safePath: resolveSafePublicPath(staticPath),
      hasSession: Boolean(session)
    }));
  }

  if (publicFilePath && !isLoginAsset && !isPublicPreviewPage && !isPublicLoginDependency) {
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

  if (isLoginAsset || isPublicPreviewPage || isPublicLoginDependency) {
    serveStatic(staticPath, response);
    return;
  }

  sendText(response, 404, '404 Not Found');
});

server.listen(port, host, () => {
  console.log(`Server is running at http://${host}:${port} (${appVersion})`);
});