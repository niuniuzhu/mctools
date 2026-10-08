const http = require('http');
const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');
const os = require('os');
const nodemailer = require('nodemailer');
const QRCode = require('qrcode');
const { DatabaseSync } = require('node:sqlite');

const host = process.env.HOST || '0.0.0.0';
const port = process.env.PORT || 3001;
const publicDir = path.join(__dirname, 'public');
const configDir = path.join(__dirname, 'config');
const dataDir = path.join(__dirname, 'data');
const avatarsDir = path.join(dataDir, 'avatars');
const productImagesDir = path.join(dataDir, 'product-images');
const databasePath = path.join(dataDir, 'users.db');
const apiKeysConfigPath = path.join(configDir, 'api-keys.json');
const sourceAppVersion = '正式版1.4';
let appVersion = sourceAppVersion;
const vipSystemPaused = true;
const aiMaintenanceEndsAt = new Date('2026-05-17T17:40:00+08:00');
const sessionLifetimeMs = 1000 * 60 * 60 * 24 * 7;
const rememberedSessionLifetimeMs = 1000 * 60 * 60 * 24 * 30;
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

if (!fs.existsSync(productImagesDir)) {
  fs.mkdirSync(productImagesDir, { recursive: true });
}

function canUseDirectory(dirPath) {
  try {
    fs.mkdirSync(dirPath, { recursive: true });
    fs.accessSync(dirPath, fs.constants.W_OK);
    const probePath = path.join(dirPath, `.probe-${process.pid}-${Date.now()}`);
    fs.writeFileSync(probePath, 'ok');
    try {
      fs.unlinkSync(probePath);
    } catch {
      // 探测文件删除失败（例如被系统回收站/安全策略拦截）不影响目录可写性判断，
      // 写入已成功即代表该目录可用，残留的探测文件是可忽略的临时文件。
    }
    return true;
  } catch {
    return false;
  }
}

function resolveWritableDatabasePath() {
  const fallbackRoots = [
    process.env.MCTOOLS_DATA_DIR,
    process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'mctools'),
    process.env.APPDATA && path.join(process.env.APPDATA, 'mctools'),
    path.join(os.homedir(), '.mctools-data'),
    path.join(os.tmpdir(), 'mctools-data')
  ].filter(Boolean);

  const sourceDatabasePath = databasePath;
  const preferFallbacks = String(process.env.MCTOOLS_FORCE_TEMP_DB || process.env.MCTOOLS_REMOTE || '').trim() === '1';
  const candidatePaths = preferFallbacks ? [] : [sourceDatabasePath];

  for (const rootDir of fallbackRoots) {
    candidatePaths.push(path.join(rootDir, 'users.db'));
  }

  if (preferFallbacks) {
    candidatePaths.push(sourceDatabasePath);
  }

  for (const candidatePath of candidatePaths) {
    const candidateDir = path.dirname(candidatePath);

    if (!canUseDirectory(candidateDir)) {
      continue;
    }

    try {
      if (candidatePath !== sourceDatabasePath && fs.existsSync(sourceDatabasePath) && !fs.existsSync(candidatePath)) {
        fs.copyFileSync(sourceDatabasePath, candidatePath);
      }
      const testDb = new DatabaseSync(candidatePath);
      testDb.exec('BEGIN IMMEDIATE');
      testDb.exec('CREATE TABLE IF NOT EXISTS __mctools_write_probe (id INTEGER PRIMARY KEY)');
      testDb.exec('DROP TABLE IF EXISTS __mctools_write_probe');
      testDb.exec('COMMIT');
      testDb.close();
      return candidatePath;
    } catch (error) {
      try {
        const rollbackDb = new DatabaseSync(candidatePath);
        rollbackDb.exec('ROLLBACK');
        rollbackDb.close();
      } catch {
        // Ignore rollback probe errors.
      }
      if (String(error?.message || '').toLowerCase().includes('readonly')) {
        continue;
      }
      if (String(error?.message || '').toLowerCase().includes('permission')) {
        continue;
      }
      throw error;
    }
  }

  throw new Error(`Unable to open a writable database file. Checked: ${candidatePaths.join(', ')}`);
}

const resolvedDatabasePath = resolveWritableDatabasePath();
console.log(`SQLite database path: ${resolvedDatabasePath}`);
const db = new DatabaseSync(resolvedDatabasePath);

try {
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA synchronous = NORMAL');
  db.exec('PRAGMA busy_timeout = 5000');
} catch {
  // Keep startup resilient if a pragma is unsupported in the current runtime.
}

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
    category TEXT NOT NULL DEFAULT 'ͨ��',
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
    hide_online_status INTEGER NOT NULL DEFAULT 0,
    store_discount_tier TEXT NOT NULL DEFAULT '',
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
  if (!communityColumns.includes('google_id')) {
    db.exec('ALTER TABLE community_accounts ADD COLUMN google_id TEXT');
  }
  if (!communityColumns.includes('hide_online_status')) {
    db.exec('ALTER TABLE community_accounts ADD COLUMN hide_online_status INTEGER NOT NULL DEFAULT 0');
  }
  if (!communityColumns.includes('store_discount_tier')) {
    db.exec("ALTER TABLE community_accounts ADD COLUMN store_discount_tier TEXT NOT NULL DEFAULT ''");
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
  CREATE TABLE IF NOT EXISTS auth_sessions (
    token TEXT PRIMARY KEY,
    scope TEXT NOT NULL,
    username TEXT NOT NULL,
    email TEXT NOT NULL DEFAULT '',
    is_developer INTEGER NOT NULL DEFAULT 0,
    expires_at INTEGER NOT NULL,
    last_seen_at INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
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
    payment_method TEXT NOT NULL DEFAULT '',
    contact TEXT NOT NULL DEFAULT '',
    buyer_note TEXT NOT NULL DEFAULT '',
    buyer_username TEXT NOT NULL DEFAULT '',
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

db.exec(`
  CREATE TABLE IF NOT EXISTS store_discount_coupons (
    code TEXT PRIMARY KEY,
    discount_type TEXT NOT NULL,
    discount_value INTEGER NOT NULL,
    minimum_amount_fen INTEGER NOT NULL DEFAULT 0,
    starts_at TEXT NOT NULL DEFAULT '',
    expires_at TEXT NOT NULL DEFAULT '',
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`);

try {
  const storeOrderColumns = db.prepare('PRAGMA table_info(store_orders)').all().map((column) => column.name);
  if (!storeOrderColumns.includes('payment_method')) {
    db.exec('ALTER TABLE store_orders ADD COLUMN payment_method TEXT NOT NULL DEFAULT ""');
  }
  if (!storeOrderColumns.includes('contact')) {
    db.exec('ALTER TABLE store_orders ADD COLUMN contact TEXT NOT NULL DEFAULT ""');
  }
  if (!storeOrderColumns.includes('buyer_note')) {
    db.exec('ALTER TABLE store_orders ADD COLUMN buyer_note TEXT NOT NULL DEFAULT ""');
  }
  if (!storeOrderColumns.includes('buyer_username')) {
    db.exec('ALTER TABLE store_orders ADD COLUMN buyer_username TEXT NOT NULL DEFAULT ""');
  }
  if (!storeOrderColumns.includes('coupon_code')) {
    db.exec('ALTER TABLE store_orders ADD COLUMN coupon_code TEXT NOT NULL DEFAULT ""');
  }
  if (!storeOrderColumns.includes('coupon_discount_fen')) {
    db.exec('ALTER TABLE store_orders ADD COLUMN coupon_discount_fen INTEGER NOT NULL DEFAULT 0');
  }
  if (!storeOrderColumns.includes('quantity')) {
    db.exec('ALTER TABLE store_orders ADD COLUMN quantity INTEGER NOT NULL DEFAULT 1');
  }
  if (!storeOrderColumns.includes('card_secret')) {
    db.exec('ALTER TABLE store_orders ADD COLUMN card_secret TEXT NOT NULL DEFAULT \"\"');
  }
} catch {
  // Keep startup resilient if migration fails unexpectedly.
}

try {
  let addedStockColumn = false;
  const storeProductColumns = db.prepare('PRAGMA table_info(store_products)').all().map((column) => column.name);
  if (!storeProductColumns.includes('image_url')) {
    db.exec('ALTER TABLE store_products ADD COLUMN image_url TEXT NOT NULL DEFAULT ""');
  }
  if (!storeProductColumns.includes('stock')) {
    db.exec('ALTER TABLE store_products ADD COLUMN stock INTEGER NOT NULL DEFAULT 0');
    addedStockColumn = true;
  }
  if (addedStockColumn) {
    db.exec('UPDATE store_products SET stock = 0');
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
    image_url TEXT NOT NULL DEFAULT '',
    original_price_fen INTEGER NOT NULL DEFAULT 100,
    sale_price_fen INTEGER NOT NULL DEFAULT 100,
    stock INTEGER NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'CNY',
    is_active INTEGER NOT NULL DEFAULT 1,
    sort_order INTEGER NOT NULL DEFAULT 100,
    tags_json TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS store_card_secrets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_code TEXT NOT NULL DEFAULT '',
    secret_code TEXT NOT NULL UNIQUE,
    label TEXT NOT NULL DEFAULT '',
    is_used INTEGER NOT NULL DEFAULT 0,
    used_order_no TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS store_product_reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_code TEXT NOT NULL,
    username TEXT NOT NULL,
    rating INTEGER NOT NULL,
    content TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    moderator_username TEXT NOT NULL DEFAULT '',
    moderation_note TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(product_code, username)
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS store_product_questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_code TEXT NOT NULL,
    username TEXT NOT NULL,
    question TEXT NOT NULL,
    answer TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'pending',
    responder_username TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(product_code, username, question)
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS store_support_tickets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_no TEXT NOT NULL,
    username TEXT NOT NULL,
    contact TEXT NOT NULL DEFAULT '',
    order_no TEXT NOT NULL DEFAULT '',
    category TEXT NOT NULL DEFAULT '其他',
    content TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    reply TEXT NOT NULL DEFAULT '',
    replier_username TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS store_user_points (
    username TEXT PRIMARY KEY,
    points INTEGER NOT NULL DEFAULT 0,
    total_earned INTEGER NOT NULL DEFAULT 0,
    checkin_streak INTEGER NOT NULL DEFAULT 0,
    last_checkin_date TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS store_checkin_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    checkin_date TEXT NOT NULL,
    gained INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (username, checkin_date)
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS store_mall_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    icon TEXT NOT NULL DEFAULT '',
    cost_points INTEGER NOT NULL DEFAULT 0,
    stock INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active',
    sort_order INTEGER NOT NULL DEFAULT 100,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS store_mall_redemptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    item_id INTEGER NOT NULL,
    item_name TEXT NOT NULL DEFAULT '',
    cost_points INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`);

(function seedStoreMallItems() {
  const count = db.prepare('SELECT COUNT(*) AS c FROM store_mall_items').get().c;
  if (count > 0) return;
  const defaults = [
    ['商店满减券 ¥5', '全店通用满 ¥30 减 ¥5', '🎫', 80, 100],
    ['定制头像框', '专属社区头像边框一枚', '🖼️', 200, 30],
    ['优先客服工单', '工单插队优先处理一次', '⚡', 150, 40],
    ['幸运抽奖券 ×3', '额外获得 3 次抽奖机会', '🎰', 60, 200]
  ];
  const stmt = db.prepare(
    'INSERT INTO store_mall_items (name, description, icon, cost_points, stock, status, sort_order) VALUES (?, ?, ?, ?, ?, \'active\', ?)'
  );
  defaults.forEach((item, index) => stmt.run(item[0], item[1], item[2], item[3], item[4], index + 1));
})();

(function backfillStoreCheckinLog() {
  try {
    const rows = db.prepare("SELECT username, checkin_streak, last_checkin_date FROM store_user_points WHERE checkin_streak > 0 AND last_checkin_date <> ''").all();
    const stmt = db.prepare('INSERT INTO store_checkin_log (username, checkin_date, gained) VALUES (?, ?, 0) ON CONFLICT(username, checkin_date) DO NOTHING');
    for (const r of rows) {
      const end = new Date(r.last_checkin_date + 'T00:00:00');
      if (isNaN(end.getTime())) continue;
      for (let i = Number(r.checkin_streak) - 1; i >= 0; i--) {
        const d = new Date(end);
        d.setDate(end.getDate() - i);
        const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        stmt.run(r.username, ds);
      }
    }
  } catch (e) {
    console.warn('签到日志回填失败（可忽略）:', e.message);
  }
})();

db.exec(`
  CREATE TABLE IF NOT EXISTS lottery_prizes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    reward_tier TEXT NOT NULL DEFAULT '',
    stock INTEGER NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 100,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`);

const lotteryPrizeColumns = db.prepare('PRAGMA table_info(lottery_prizes)').all().map((column) => column.name);
if (!lotteryPrizeColumns.includes('reward_tier')) {
  db.exec(`ALTER TABLE lottery_prizes ADD COLUMN reward_tier TEXT NOT NULL DEFAULT ''`);
}

db.exec(`
  CREATE TABLE IF NOT EXISTS lottery_draw_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    email TEXT NOT NULL DEFAULT '',
    prize_id INTEGER NOT NULL,
    prize_name TEXT NOT NULL,
    price_fen INTEGER NOT NULL DEFAULT 5000,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`);

const lotteryDrawRecordColumns = db.prepare('PRAGMA table_info(lottery_draw_records)').all().map((column) => column.name);
if (!lotteryDrawRecordColumns.includes('order_no')) {
  db.exec(`ALTER TABLE lottery_draw_records ADD COLUMN order_no TEXT NOT NULL DEFAULT ''`);
}
db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_lottery_draw_records_order_no ON lottery_draw_records(order_no) WHERE order_no <> ''`);

db.exec(`
  CREATE TABLE IF NOT EXISTS server_listings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    server_name TEXT NOT NULL,
    ip_address TEXT NOT NULL,
    avatar_path TEXT,
    '/ai-shop.html',
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
const communityQrLoginTickets = new Map();
const plazaVerifyCodes = new Map(); // email -> {code, username, expiresAt}
const plazaSessions = new Map();    // token -> {username, email, expiresAt}
const communityVerifyCodes = new Map(); // email -> {code, username, expiresAt}
const communitySessions = new Map(); // token -> {username, email, expiresAt}
const siteOnlineVisitors = new Map(); // visitorKey -> {lastSeenAt, pathname, userAgent}
const captchaLifetimeMs = 1000 * 60 * 5;
const qrLoginTicketLifetimeMs = 1000 * 60 * 3;
const communityQrLoginTicketLifetimeMs = 1000 * 60 * 3;
const plazaVerifyCodeLifetimeMs = 1000 * 60 * 10;
const plazaSessionLifetimeMs = 1000 * 60 * 60 * 24 * 3;
const communityVerifyCodeLifetimeMs = 1000 * 60 * 10;
const communitySessionLifetimeMs = 1000 * 60 * 60 * 24 * 3;
const rememberedCommunitySessionLifetimeMs = 1000 * 60 * 60 * 24 * 30;
const sessionScopePublic = 'public';
const sessionScopeCommunity = 'community';
const siteOnlineVisitorLifetimeMs = 1000 * 75;
const watchedCommunityEmails = ['naicha638104@163.com', '3805506653@qq.com'];
const defaultStoreWhitelistUsernames = ['管理员'];
const defaultStoreAnnouncement = '欢迎来到星际无限资源服商店，购买前请先确认联系方式与支付方式。';
const defaultStoreMaintenanceMessage = '当前服务维护中，请稍后再试。';
const authEmailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;

const defaultStoreProducts = [
  {
    productCode: '65997548',
    name: '星际无限资源服官方管理员',
    description: '官方认证管理员权限，适合服主及运营管理。',
    originalPriceFen: 1500,
    salePriceFen: 100,
    stock: 0,
    currency: 'CNY',
    isActive: 1,
    sortOrder: 10,
    tags: ['资源服', '官方', '管理']
  },
  {
    productCode: 'CMD-20CB-IN',
    name: '指令生成 / 20cb 内部',
    description: '适合 20cb 内部使用的指令生成服务。',
    originalPriceFen: 2000,
    salePriceFen: 100,
    stock: 0,
    currency: 'CNY',
    isActive: 1,
    sortOrder: 20,
    tags: ['指令生成', '20cb内部']
  },
  {
    productCode: 'CMD-20CB-PLUS',
    name: '指令生成 / 20cb 上层',
    description: '适合 20cb 上层用户的高级指令生成服务。',
    originalPriceFen: 4000,
    salePriceFen: 100,
    stock: 0,
    currency: 'CNY',
    isActive: 1,
    sortOrder: 30,
    tags: ['指令生成', '20cb上层']
  },
  {
    productCode: 'BUILD-IMPORT-ONCE',
    name: '建筑导入一次',
    description: '一次性为服务器导入建筑方案。',
    originalPriceFen: 2000,
    salePriceFen: 100,
    stock: 0,
    currency: 'CNY',
    isActive: 1,
    sortOrder: 40,
    tags: ['建筑导入', '一次']
  },
  {
    productCode: 'LVIP-30',
    name: 'LVIP 永久七折',
    description: '购买后本人账号永久享受全店商品七折优惠。',
    originalPriceFen: 10000,
    salePriceFen: 10000,
    stock: 999,
    currency: 'CNY',
    isActive: 1,
    sortOrder: 2,
    tags: ['会员权益', 'LVIP', '永久七折']
  },
  {
    productCode: 'VIP-45',
    name: 'VIP 永久 4.5 折',
    description: '购买后本人账号永久享受全店 4.5 折优惠。',
    originalPriceFen: 23000,
    salePriceFen: 23000,
    stock: 999,
    currency: 'CNY',
    isActive: 1,
    sortOrder: 3,
    tags: ['会员权益', 'VIP', '永久4.5折']
  },
  {
    productCode: 'SVIP-15',
    name: 'SVIP 永久 1.5 折',
    description: '购买后本人账号永久享受全店 1.5 折优惠。',
    originalPriceFen: 50000,
    salePriceFen: 50000,
    stock: 999,
    currency: 'CNY',
    isActive: 1,
    sortOrder: 4,
    tags: ['会员权益', 'SVIP', '永久1.5折']
  },
];

const lotteryDrawPriceFen = 27000;
const lotteryDrawProductCode = 'LOTTERY-ENTRY';
const lotteryDailyDrawLimit = 2;
const lotteryDisabledMessage = '抽奖活动暂时关闭，敬请关注后续通知。';
function getLotteryFeatureEnabled() {
  return normalizeStoreBoolean(getSettingValue('lottery_feature_enabled', '0'), false);
}

function validateLotteryCheckout(productCode, buyerSession, body) {
  if (String(productCode || '').trim().toUpperCase() !== lotteryDrawProductCode) {
    return null;
  }
  if (!getLotteryFeatureEnabled()) {
    return { status: 503, message: lotteryDisabledMessage };
  }
  if (!buyerSession) {
    return { status: 401, message: '购买抽奖机会前请先登录账号。' };
  }
  if (countTodayLotteryDraws(buyerSession.username) >= lotteryDailyDrawLimit) {
    return { status: 409, message: '今日抽奖次数已用完，请明天再来。' };
  }
  if (Number(body?.quantity ?? 1) !== 1) {
    return { status: 400, message: '抽奖订单一次只能购买一次抽奖机会。' };
  }
  if (String(body?.couponCode || '').trim()) {
    return { status: 400, message: '抽奖订单不能使用折扣券。' };
  }
  if (!listLotteryPrizes(true).some((prize) => prize.stock > 0)) {
    return { status: 409, message: '当前奖池暂无可抽奖品，暂时不能购买抽奖机会。' };
  }
  return null;
}

const defaultLotteryPrizes = [
  {
    name: 'LVIP 永久七折',
    description: '中奖后自动获得永久店铺七折权益。',
    rewardTier: 'lvip',
    stock: 1,
    sortOrder: 10,
    isActive: 1
  },
  {
    name: 'VIP 永久 4.5 折',
    description: '中奖后自动获得永久店铺 4.5 折权益。',
    rewardTier: 'vip',
    stock: 1,
    sortOrder: 20,
    isActive: 1
  },
  {
    name: 'SVIP 永久 1.5 折',
    description: '中奖后自动获得永久店铺 1.5 折权益。',
    rewardTier: 'svip',
    stock: 1,
    sortOrder: 30,
    isActive: 1
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
      product_code, name, description, image_url, original_price_fen, sale_price_fen, stock, currency, is_active, sort_order, tags_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  for (const product of defaultStoreProducts) {
    insert.run(
      product.productCode,
      product.name,
      product.description,
      '',
      product.originalPriceFen,
      product.salePriceFen,
      Math.max(0, Number(product.stock || 0)),
      product.currency,
      product.isActive,
      product.sortOrder,
      JSON.stringify(product.tags || [])
    );
  }
}

seedStoreProductsIfEmpty();

function ensureRequiredStoreProducts() {
  const existingCodes = new Set(
    db.prepare('SELECT product_code FROM store_products').all().map((row) => String(row.product_code || '').trim()).filter(Boolean)
  );

  const missingProducts = defaultStoreProducts.filter((product) => !existingCodes.has(String(product.productCode || '').trim()));

  if (missingProducts.length === 0) {
    return;
  }

  const insert = db.prepare(
    `INSERT INTO store_products (
      product_code, name, description, image_url, original_price_fen, sale_price_fen, stock, currency, is_active, sort_order, tags_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  for (const product of missingProducts) {
    insert.run(
      product.productCode,
      product.name,
      product.description,
      '',
      Number(product.originalPriceFen || 0),
      Number(product.salePriceFen || 0),
      Math.max(0, Number(product.stock || 0)),
      product.currency || 'CNY',
      Number(product.isActive ? 1 : 0),
      Number(product.sortOrder || 100),
      JSON.stringify(product.tags || [])
    );
  }
}

ensureRequiredStoreProducts();

function seedLotteryPrizesIfEmpty() {
  const row = db.prepare('SELECT COUNT(1) AS count FROM lottery_prizes').get();
  const count = Number(row?.count || 0);

  if (count > 0) {
    return;
  }

  const insert = db.prepare(
    `INSERT INTO lottery_prizes (
      name, description, reward_tier, stock, sort_order, is_active
    ) VALUES (?, ?, ?, ?, ?, ?)`
  );

  for (const prize of defaultLotteryPrizes) {
    insert.run(
      prize.name,
      prize.description,
      String(prize.rewardTier || ''),
      Number(prize.stock || 0),
      Number(prize.sortOrder || 100),
      Number(prize.isActive ? 1 : 0)
    );
  }
}

seedLotteryPrizesIfEmpty();

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
  '.webp': 'image/webp',
  '.gif': 'image/gif',
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

function injectGlobalPreferencesScript(html) {
  const scriptTag = '<script defer src="/mctools-global-preferences.js"></script>';

  if (typeof html !== 'string' || html.includes('/mctools-global-preferences.js')) {
    return html;
  }

  if (html.includes('</head>')) {
    return html.replace('</head>', `    ${scriptTag}\n  </head>`);
  }

  if (html.includes('<body')) {
    return html.replace(/<body([^>]*)>/iu, `<body$1>\n${scriptTag}`);
  }

  return `${scriptTag}${html}`;
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

    if (extension === '.html') {
      sendHtml(response, 200, injectGlobalPreferencesScript(content.toString('utf8')));
      return;
    }

    response.writeHead(200, { 'Content-Type': contentType });
    response.end(content);
  });
}

function handleStoreBackgroundImage(request, response) {
  const remoteUrl = 'https://api.yppp.net/api.php';
  const visited = new Set();

  const forwardRequest = (targetUrl, depth = 0) => {
    if (depth > 6 || visited.has(targetUrl)) {
      if (!response.headersSent) {
        sendText(response, 502, 'Bad Gateway');
      }
      return;
    }

    visited.add(targetUrl);

    https.get(targetUrl, (proxyResponse) => {
      const statusCode = proxyResponse.statusCode || 200;
      if (statusCode >= 300 && statusCode < 400 && proxyResponse.headers.location) {
        const nextUrl = new URL(proxyResponse.headers.location, targetUrl).toString();
        proxyResponse.resume();
        forwardRequest(nextUrl, depth + 1);
        return;
      }

      response.writeHead(statusCode, {
        'Content-Type': proxyResponse.headers['content-type'] || 'image/jpeg',
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0'
      });

      proxyResponse.on('data', (chunk) => response.write(chunk));
      proxyResponse.on('end', () => response.end());
      proxyResponse.on('error', () => {
        if (!response.headersSent) {
          sendText(response, 502, 'Bad Gateway');
        } else {
          response.end();
        }
      });
    }).on('error', () => {
      if (!response.headersSent) {
        sendText(response, 502, 'Bad Gateway');
      }
    });
  };

  forwardRequest(remoteUrl);
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
    privateKeyPem,
    backupUrl: getConfiguredValue('WECHATPAY_BACKUP_URL', 'wechatPayBackupUrl'),
    backupMerchantId: getConfiguredValue('WECHATPAY_BACKUP_MERCHANT_ID', 'wechatPayBackupMerchantId'),
    backupApiKey: getConfiguredValue('WECHATPAY_BACKUP_API_KEY', 'wechatPayBackupApiKey')
  };
}

function getWechatPayReadiness() {
  const config = getWechatPayConfig();
  const missing = [];

  const hasPrimaryWechatConfig = Boolean(config.appId && config.mchId && config.serialNo && config.apiV3Key && config.notifyUrl && config.privateKeyPem);
  const hasBackupWechatConfig = Boolean(config.backupUrl && config.backupMerchantId && config.backupApiKey);

  if (!hasPrimaryWechatConfig && !hasBackupWechatConfig) {
    if (!config.appId) missing.push('appId');
    if (!config.mchId) missing.push('mchId');
    if (!config.serialNo) missing.push('serialNo');
    if (!config.apiV3Key) missing.push('apiV3Key');
    if (!config.notifyUrl) missing.push('notifyUrl');
    if (!config.privateKeyPem) missing.push('privateKey');
    if (!config.backupUrl) missing.push('backupUrl');
    if (!config.backupMerchantId) missing.push('backupMerchantId');
    if (!config.backupApiKey) missing.push('backupApiKey');
  }

  return {
    ready: hasPrimaryWechatConfig || hasBackupWechatConfig,
    missing,
    hasPrimaryWechatConfig,
    hasBackupWechatConfig
  };
}

function getWechatBackupPayConfig() {
  const createUrl = getConfiguredValue('WECHATPAY_BACKUP_URL', 'wechatPayBackupUrl');
  const merchantId = getConfiguredValue('WECHATPAY_BACKUP_MERCHANT_ID', 'wechatPayBackupMerchantId');
  const apiKey = getConfiguredValue('WECHATPAY_BACKUP_API_KEY', 'wechatPayBackupApiKey');

  return {
    createUrl: createUrl || '',
    queryUrl: createUrl || '',
    apiKey: apiKey || '',
    merchantId: merchantId || '',
    payType: 'wxpay',
    signType: 'MD5',
    notifyUrl: '',
    returnUrl: '',
    createMethod: 'POST',
    queryMethod: 'POST'
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
    const wechat = getWechatPayReadiness();
    return {
      ready: true,
      provider: 'hongxing',
      defaultPaymentMethod: normalizeStorePaymentMethod(getHongxingPayConfig().payType, 'wechat'),
      missing: [],
      providers: {
        hongxing,
        wechat
      }
    };
  }

  const wechat = getWechatPayReadiness();
  return {
    ready: wechat.ready,
    provider: wechat.ready ? 'wechat' : '',
    defaultPaymentMethod: wechat.ready ? 'wechat' : '',
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
    imageUrl: String(row.imageUrl || ''),
    originalPriceFen,
    salePriceFen,
    stock: Math.max(0, Number(row.stock || 0)),
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
  const normalizedCode = String(productCode || '').trim().toUpperCase();

  if (!normalizedCode) {
    return null;
  }

  if (normalizedCode === lotteryDrawProductCode) {
    return {
      productCode: lotteryDrawProductCode,
      name: '抽奖机会',
      description: '抽奖中心单次抽奖机会',
      imageUrl: '',
      originalPriceFen: lotteryDrawPriceFen,
      salePriceFen: lotteryDrawPriceFen,
      stock: 999999,
      currency: 'CNY',
      isActive: true,
      sortOrder: 0,
      tags: ['抽奖']
    };
  }

  const row = includeInactive
    ? db.prepare(
      `SELECT id, product_code AS productCode, name, description,
        image_url AS imageUrl,
        original_price_fen AS originalPriceFen,
        sale_price_fen AS salePriceFen,
        stock,
        currency, is_active AS isActive, sort_order AS sortOrder,
        tags_json AS tagsJson, created_at AS createdAt, updated_at AS updatedAt
      FROM store_products WHERE product_code = ?`
    ).get(normalizedCode)
    : db.prepare(
      `SELECT id, product_code AS productCode, name, description,
        image_url AS imageUrl,
        original_price_fen AS originalPriceFen,
        sale_price_fen AS salePriceFen,
        stock,
        currency, is_active AS isActive, sort_order AS sortOrder,
        tags_json AS tagsJson, created_at AS createdAt, updated_at AS updatedAt
      FROM store_products WHERE product_code = ? AND is_active = 1`
    ).get(normalizedCode);

  return normalizeStoreProductRow(row);
}

function normalizeStoreReviewRow(row) {
  return {
    id: Number(row.id || 0),
    productCode: String(row.productCode || ''),
    username: String(row.username || ''),
    rating: Number(row.rating || 0),
    content: String(row.content || ''),
    status: String(row.status || ''),
    createdAt: String(row.createdAt || ''),
    updatedAt: String(row.updatedAt || '')
  };
}

function getStoreReviewSummary(productCode) {
  const row = db.prepare(
    `SELECT COUNT(1) AS count, COALESCE(AVG(rating), 0) AS averageRating
     FROM store_product_reviews
     WHERE product_code = ? AND status = 'approved'`
  ).get(String(productCode || '').trim().toUpperCase());

  return {
    count: Number(row?.count || 0),
    averageRating: Number(Number(row?.averageRating || 0).toFixed(1))
  };
}

function listStoreProductReviews(productCode, includeUnapproved = false) {
  const normalizedCode = String(productCode || '').trim().toUpperCase();
  if (!normalizedCode) {
    return [];
  }

  const rows = db.prepare(
    `SELECT id, product_code AS productCode, username, rating, content, status,
      created_at AS createdAt, updated_at AS updatedAt
     FROM store_product_reviews
     WHERE product_code = ? ${includeUnapproved ? '' : "AND status = 'approved'"}
     ORDER BY id DESC
     LIMIT 100`
  ).all(normalizedCode);

  return rows.map(normalizeStoreReviewRow);
}

function normalizeStoreQuestionRow(row) {
  return {
    id: Number(row.id || 0),
    productCode: String(row.productCode || ''),
    username: String(row.username || ''),
    question: String(row.question || ''),
    answer: String(row.answer || ''),
    status: String(row.status || ''),
    createdAt: String(row.createdAt || ''),
    updatedAt: String(row.updatedAt || '')
  };
}

function listStoreProductQuestions(productCode, includeUnanswered = false) {
  const normalizedCode = String(productCode || '').trim().toUpperCase();
  if (!normalizedCode) {
    return [];
  }

  const rows = db.prepare(
    `SELECT id, product_code AS productCode, username, question, answer, status,
      created_at AS createdAt, updated_at AS updatedAt
     FROM store_product_questions
     WHERE product_code = ? ${includeUnanswered ? '' : "AND status = 'answered'"}
     ORDER BY id DESC
     LIMIT 100`
  ).all(normalizedCode);

  return rows.map(normalizeStoreQuestionRow);
}

function getStoreDiscountedSalePriceFen(product, username) {
  const salePriceFen = Number(product?.salePriceFen || 0);
  const productCode = String(product?.productCode || '').trim().toUpperCase();
  if (productCode === lotteryDrawProductCode || ['LVIP-30', 'VIP-45', 'SVIP-15'].includes(productCode)) {
    return salePriceFen;
  }
  const account = username ? getCommunityAccountByUsername(username) : null;
  const discountRate = account?.storeDiscountTier === 'svip' ? 0.15 : account?.storeDiscountTier === 'vip' ? 0.45 : account?.storeDiscountTier === 'lvip' ? 0.7 : 1;
  return discountRate < 1 ? Math.max(1, Math.round(salePriceFen * discountRate)) : salePriceFen;
}

function normalizeStoreCouponRow(row) {
  if (!row) return null;
  return {
    code: String(row.code || ''),
    discountType: String(row.discountType || ''),
    discountValue: Number(row.discountValue || 0),
    minimumAmountFen: Number(row.minimumAmountFen || 0),
    startsAt: String(row.startsAt || ''),
    expiresAt: String(row.expiresAt || ''),
    isActive: Boolean(Number(row.isActive || 0)),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

function getStoreCouponByCode(code, includeInactive = false) {
  const normalizedCode = String(code || '').trim().toUpperCase();
  if (!normalizedCode) return null;
  const row = db.prepare(`
    SELECT code, discount_type AS discountType, discount_value AS discountValue,
      minimum_amount_fen AS minimumAmountFen, starts_at AS startsAt, expires_at AS expiresAt,
      is_active AS isActive, created_at AS createdAt, updated_at AS updatedAt
    FROM store_discount_coupons WHERE code = ? ${includeInactive ? '' : 'AND is_active = 1'}
  `).get(normalizedCode);
  return normalizeStoreCouponRow(row);
}

function listStoreCoupons(includeInactive = false) {
  const rows = db.prepare(`
    SELECT code, discount_type AS discountType, discount_value AS discountValue,
      minimum_amount_fen AS minimumAmountFen, starts_at AS startsAt, expires_at AS expiresAt,
      is_active AS isActive, created_at AS createdAt, updated_at AS updatedAt
    FROM store_discount_coupons ${includeInactive ? '' : 'WHERE is_active = 1'}
    ORDER BY created_at DESC, code ASC
  `).all();
  return rows.map(normalizeStoreCouponRow);
}

function calculateStoreOrderPricing(product, quantity, username, couponCode = '') {
  const normalizedQuantity = Math.max(1, Math.min(99, Number.parseInt(String(quantity || '1'), 10) || 1));
  const subtotalFen = getStoreDiscountedSalePriceFen(product, username) * normalizedQuantity;
  const normalizedCode = String(couponCode || '').trim().toUpperCase();
  if (!normalizedCode) {
    return { subtotalFen, couponCode: '', couponDiscountFen: 0, amountFen: subtotalFen };
  }

  const coupon = getStoreCouponByCode(normalizedCode);
  if (!coupon) return { error: '折扣券不存在或已停用。' };
  const now = Date.now();
  const startsAt = coupon.startsAt ? Date.parse(coupon.startsAt) : NaN;
  const expiresAt = coupon.expiresAt ? Date.parse(coupon.expiresAt) : NaN;
  if (Number.isFinite(startsAt) && now < startsAt) return { error: '折扣券尚未生效。' };
  if (Number.isFinite(expiresAt) && now > expiresAt) return { error: '折扣券已过期。' };
  if (subtotalFen < coupon.minimumAmountFen) return { error: '订单金额未达到折扣券使用门槛。' };

  const rawDiscountFen = coupon.discountType === 'percent'
    ? Math.round(subtotalFen * coupon.discountValue / 100)
    : coupon.discountValue;
  const couponDiscountFen = Math.min(Math.max(0, subtotalFen - 1), rawDiscountFen);
  if (couponDiscountFen <= 0) return { error: '折扣券不适用于当前订单金额。' };

  return {
    subtotalFen,
    couponCode: normalizedCode,
    couponDiscountFen,
    amountFen: subtotalFen - couponDiscountFen
  };
}

function grantStoreEntitlementForPaidOrder(order) {
  if (
    !order ||
    !normalizePaymentSuccess(order.status) ||
    !['LVIP-30', 'VIP-45', 'SVIP-15'].includes(String(order.productCode || '').trim().toUpperCase()) ||
    !String(order.buyerUsername || '').trim()
  ) {
    return;
  }

  const tierByProduct = { 'LVIP-30': 'lvip', 'VIP-45': 'vip', 'SVIP-15': 'svip' };
  const tier = tierByProduct[String(order.productCode || '').trim().toUpperCase()];
  grantStoreDiscountTier(String(order.buyerUsername).trim(), tier);
}

function grantStoreDiscountTier(username, tier) {
  if (!['lvip', 'vip', 'svip'].includes(String(tier || ''))) {
    return false;
  }

  const result = db.prepare(`
    UPDATE community_accounts
    SET store_discount_tier = CASE
      WHEN store_discount_tier = 'svip' THEN 'svip'
      WHEN ? = 'svip' THEN 'svip'
      WHEN store_discount_tier = 'vip' THEN 'vip'
      WHEN ? = 'vip' THEN 'vip'
      ELSE 'lvip'
    END
    WHERE username = ?
  `).run(tier, tier, String(username || '').trim());
  return Number(result?.changes || 0) > 0;
}

function listStoreProducts(includeInactive = false) {
  const rows = includeInactive
    ? db.prepare(
      `SELECT id, product_code AS productCode, name, description,
        image_url AS imageUrl,
        original_price_fen AS originalPriceFen,
        sale_price_fen AS salePriceFen,
        stock,
        currency, is_active AS isActive, sort_order AS sortOrder,
        tags_json AS tagsJson, created_at AS createdAt, updated_at AS updatedAt
      FROM store_products
      ORDER BY sort_order ASC, id ASC`
    ).all()
    : db.prepare(
      `SELECT id, product_code AS productCode, name, description,
        image_url AS imageUrl,
        original_price_fen AS originalPriceFen,
        sale_price_fen AS salePriceFen,
        stock,
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
    .split(/[,��]/)
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 8);
}

function sanitizeStoreProductImageUrl(imageUrl) {
  const normalized = String(imageUrl || '').trim();
  if (!normalized) {
    return '';
  }

  if (normalized.startsWith('/product-images/') || normalized.startsWith('/assets/')) {
    return normalized;
  }

  if (/^https?:\/\//iu.test(normalized)) {
    return normalized;
  }

  return '';
}

function deleteStoreProductImageFiles(productCode) {
  if (!fs.existsSync(productImagesDir)) {
    return;
  }

  const normalizedCode = String(productCode || '').trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '_');
  const prefix = `product-${normalizedCode}-`;

  fs.readdirSync(productImagesDir)
    .filter((name) => name.startsWith(prefix))
    .forEach((name) => {
      const filePath = path.join(productImagesDir, name);
      try {
        fs.unlinkSync(filePath);
      } catch {
        // ignore cleanup failures
      }
    });
}

function saveStoreProductImageFromDataUrl(productCode, imageData) {
  const match = /^data:image\/(png|jpeg|jpg|webp|gif);base64,([a-z0-9+/=\r\n]+)$/iu.exec(String(imageData || '').trim());
  if (!match) {
    throw new Error('ͼƬ��ʽ��Ч����֧�� png/jpeg/jpg/webp/gif �� Data URL');
  }

  const extension = match[1].toLowerCase() === 'jpeg' ? '.jpg' : `.${match[1].toLowerCase()}`;
  const buffer = Buffer.from(match[2], 'base64');

  if (buffer.length === 0) {
    throw new Error('ͼƬ����Ϊ��');
  }

  if (buffer.length > 1024 * 1024 * 4) {
    throw new Error('��ƷͼƬ���ܳ��� 4MB');
  }

  const normalizedCode = String(productCode || '').trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '_');
  const fileName = `product-${normalizedCode}-${Date.now()}${extension}`;
  const absolutePath = path.join(productImagesDir, fileName);

  deleteStoreProductImageFiles(productCode);
  fs.writeFileSync(absolutePath, buffer);

  return `/product-images/${fileName}`;
}

function requireCommunityDeveloper(request, response) {
  const session = getCommunitySessionFromRequest(request);

  if (!session) {
    sendJson(response, 401, { message: '���ȵ�¼�����˺�' });
    return null;
  }

  const account = getCommunityAccountByEmail(session.email);
  const isCommunityDeveloper = Boolean(session.isDeveloper || account?.isDeveloper || isDeveloper(session.username));

  if (!isCommunityDeveloper) {
    sendJson(response, 403, { message: '��Ȩ�޿ɲ�����Ʒ����' });
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

function handleStoreProductReviews(request, response) {
  const url = new URL(request.url || '/', `http://${host}:${port}`);
  const productCode = String(url.searchParams.get('productCode') || '').trim().toUpperCase();
  const product = getStoreProductByCode(productCode);

  if (!product) {
    sendJson(response, 404, { message: '商品不存在或已下架。' });
    return;
  }

  sendJson(response, 200, {
    productCode,
    summary: getStoreReviewSummary(productCode),
    reviews: listStoreProductReviews(productCode)
  });
}

function handleStoreProductReviewCreate(request, response) {
  const session = getCommunitySessionFromRequest(request);
  if (!session) {
    sendJson(response, 401, { message: '请先登录社区账号后再提交评价。' });
    return;
  }

  parseRequestBody(request)
    .then((body) => {
      const productCode = String(body.productCode || '').trim().toUpperCase();
      const rating = Number(body.rating);
      const content = String(body.content || '').trim();

      if (!getStoreProductByCode(productCode)) {
        sendJson(response, 404, { message: '商品不存在或已下架。' });
        return;
      }
      if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
        sendJson(response, 400, { message: '评分必须是 1 到 5 之间的整数。' });
        return;
      }
      if (content.length < 5 || content.length > 600) {
        sendJson(response, 400, { message: '评价内容需为 5 到 600 个字符。' });
        return;
      }

      db.prepare(
        `INSERT INTO store_product_reviews (
          product_code, username, rating, content, status, moderator_username, moderation_note
        ) VALUES (?, ?, ?, ?, 'pending', '', '')
        ON CONFLICT(product_code, username) DO UPDATE SET
          rating = excluded.rating,
          content = excluded.content,
          status = 'pending',
          moderator_username = '',
          moderation_note = '',
          updated_at = CURRENT_TIMESTAMP`
      ).run(productCode, session.username, rating, content);

      sendJson(response, 201, { message: '评价已提交，审核通过后会在商品页公开展示。' });
    })
    .catch((error) => {
      sendJson(response, 400, { message: error.message || '请求无效。' });
    });
}

function handleStoreProductReviewsAdmin(request, response) {
  const session = requireCommunityDeveloper(request, response);
  if (!session) return;

  const url = new URL(request.url || '/', `http://${host}:${port}`);
  const productCode = String(url.searchParams.get('productCode') || '').trim().toUpperCase();
  if (!getStoreProductByCode(productCode, true)) {
    sendJson(response, 404, { message: '商品不存在。' });
    return;
  }

  sendJson(response, 200, {
    productCode,
    reviews: listStoreProductReviews(productCode, true)
  });
}

function handleStoreProductReviewModerate(request, response) {
  const session = requireCommunityDeveloper(request, response);
  if (!session) return;

  parseRequestBody(request)
    .then((body) => {
      const id = Number(body.id);
      const status = String(body.status || '').trim().toLowerCase();
      const moderationNote = String(body.moderationNote || '').trim().slice(0, 300);

      if (!Number.isInteger(id) || id <= 0 || !['approved', 'hidden'].includes(status)) {
        sendJson(response, 400, { message: '评价审核参数无效。' });
        return;
      }

      const result = db.prepare(
        `UPDATE store_product_reviews
         SET status = ?, moderator_username = ?, moderation_note = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`
      ).run(status, session.username, moderationNote, id);

      if (Number(result.changes || 0) === 0) {
        sendJson(response, 404, { message: '评价不存在。' });
        return;
      }

      sendJson(response, 200, { message: status === 'approved' ? '评价已通过。' : '评价已隐藏。' });
    })
    .catch((error) => {
      sendJson(response, 400, { message: error.message || '请求无效。' });
    });
}

function handleStoreProductQuestions(request, response) {
  const url = new URL(request.url || '/', `http://${host}:${port}`);
  const productCode = String(url.searchParams.get('productCode') || '').trim().toUpperCase();
  const product = getStoreProductByCode(productCode);

  if (!product) {
    sendJson(response, 404, { message: '商品不存在或已下架。' });
    return;
  }

  sendJson(response, 200, {
    productCode,
    questions: listStoreProductQuestions(productCode)
  });
}

function handleStoreProductQuestionCreate(request, response) {
  const session = getCommunitySessionFromRequest(request);
  if (!session) {
    sendJson(response, 401, { message: '请先登录社区账号后再提问。' });
    return;
  }

  parseRequestBody(request)
    .then((body) => {
      const productCode = String(body.productCode || '').trim().toUpperCase();
      const question = String(body.question || '').trim();

      if (!getStoreProductByCode(productCode)) {
        sendJson(response, 404, { message: '商品不存在或已下架。' });
        return;
      }
      if (question.length < 5 || question.length > 400) {
        sendJson(response, 400, { message: '问题需为 5 到 400 个字符。' });
        return;
      }

      db.prepare(
        `INSERT INTO store_product_questions (product_code, username, question, status)
         VALUES (?, ?, ?, 'pending')
         ON CONFLICT(product_code, username, question) DO UPDATE SET
           status = 'pending',
           answer = '',
           responder_username = '',
           updated_at = CURRENT_TIMESTAMP`
      ).run(productCode, session.username, question);

      sendJson(response, 201, { message: '问题已提交，管理员回复后会在商品详情页公开展示。' });
    })
    .catch((error) => {
      sendJson(response, 400, { message: error.message || '请求无效。' });
    });
}

function handleStoreProductQuestionsAdmin(request, response) {
  const session = requireCommunityDeveloper(request, response);
  if (!session) return;

  const url = new URL(request.url || '/', `http://${host}:${port}`);
  const productCode = String(url.searchParams.get('productCode') || '').trim().toUpperCase();
  if (!getStoreProductByCode(productCode, true)) {
    sendJson(response, 404, { message: '商品不存在。' });
    return;
  }

  sendJson(response, 200, {
    productCode,
    questions: listStoreProductQuestions(productCode, true)
  });
}

function handleStoreProductQuestionAnswer(request, response) {
  const session = requireCommunityDeveloper(request, response);
  if (!session) return;

  parseRequestBody(request)
    .then((body) => {
      const id = Number(body.id);
      const answer = String(body.answer || '').trim();
      const status = String(body.status || 'answered').trim().toLowerCase();

      if (!Number.isInteger(id) || id <= 0 || !['answered', 'hidden'].includes(status)) {
        sendJson(response, 400, { message: '问题审核参数无效。' });
        return;
      }
      if (status === 'answered' && (answer.length < 2 || answer.length > 600)) {
        sendJson(response, 400, { message: '回复需为 2 到 600 个字符。' });
        return;
      }

      const result = db.prepare(
        `UPDATE store_product_questions
         SET answer = ?, status = ?, responder_username = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`
      ).run(status === 'answered' ? answer : '', status, session.username, id);

      if (Number(result.changes || 0) === 0) {
        sendJson(response, 404, { message: '问题不存在。' });
        return;
      }

      sendJson(response, 200, { message: status === 'answered' ? '问题已回复。' : '问题已隐藏。' });
    })
    .catch((error) => {
      sendJson(response, 400, { message: error.message || '请求无效。' });
    });
}

const SUPPORT_TICKET_CATEGORIES = ['付款问题', '发货/卡密', '退款', '账号问题', '商品咨询', '其他'];
const DAILY_CHECKIN_BASE_POINTS = 10;
const DAILY_CHECKIN_STREAK_BONUS = 2;
const DAILY_CHECKIN_STREAK_BONUS_CAP = 12;

function getTodayDateText() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function createTicketNo() {
  return `T${getTodayDateText().replace(/-/g, '')}${String(Math.floor(Math.random() * 9000) + 1000)}`;
}

function normalizeTicket(row) {
  return {
    id: row.id,
    ticketNo: row.ticket_no,
    username: row.username,
    contact: row.contact,
    orderNo: row.order_no,
    category: row.category,
    content: row.content,
    status: row.status,
    reply: row.reply,
    replierUsername: row.replier_username,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function getStoreAccountSession(request) {
  return getCommunitySessionFromRequest(request) || getSessionFromRequest(request);
}

function handleStoreSupportTicketCreate(request, response) {
  const session = getStoreAccountSession(request);
  if (!session) {
    sendJson(response, 401, { message: '请先登录账号后再提交工单。' });
    return;
  }

  parseRequestBody(request)
    .then((body) => {
      const category = String(body.category || '').trim() || '其他';
      const content = String(body.content || '').trim();
      const contact = String(body.contact || '').trim();
      const orderNo = String(body.orderNo || '').trim();

      if (!SUPPORT_TICKET_CATEGORIES.includes(category)) {
        sendJson(response, 400, { message: '问题类型无效。' });
        return;
      }
      if (content.length < 5 || content.length > 600) {
        sendJson(response, 400, { message: '问题描述需为 5 到 600 个字符。' });
        return;
      }
      if (contact.length > 60) {
        sendJson(response, 400, { message: '联系方式过长。' });
        return;
      }
      if (orderNo.length > 60) {
        sendJson(response, 400, { message: '订单号过长。' });
        return;
      }

      const ticketNo = createTicketNo();
      const result = db.prepare(
        `INSERT INTO store_support_tickets (ticket_no, username, contact, order_no, category, content)
         VALUES (?, ?, ?, ?, ?, ?)`
      ).run(ticketNo, session.username, contact, orderNo, category, content);

      sendJson(response, 201, {
        message: '工单已提交，客服会尽快处理。',
        ticketNo,
        id: Number(result.lastInsertRowid)
      });
    })
    .catch((error) => {
      sendJson(response, 400, { message: error.message || '请求无效。' });
    });
}

function handleStoreSupportTickets(request, response) {
  const session = getStoreAccountSession(request);
  if (!session) {
    sendJson(response, 401, { message: '请先登录账号。' });
    return;
  }

  const rows = db.prepare(
    `SELECT * FROM store_support_tickets WHERE username = ? ORDER BY id DESC LIMIT 50`
  ).all(session.username);

  sendJson(response, 200, { tickets: rows.map(normalizeTicket) });
}

function handleStoreSupportTicketsAdmin(request, response) {
  const session = requireCommunityDeveloper(request, response);
  if (!session) return;

  const rows = db.prepare(
    `SELECT * FROM store_support_tickets ORDER BY id DESC LIMIT 200`
  ).all();

  sendJson(response, 200, { tickets: rows.map(normalizeTicket) });
}

function handleStoreSupportTicketReply(request, response) {
  const session = requireCommunityDeveloper(request, response);
  if (!session) return;

  parseRequestBody(request)
    .then((body) => {
      const id = Number(body.id);
      const reply = String(body.reply || '').trim();
      const status = String(body.status || 'answered').trim().toLowerCase();

      if (!Number.isInteger(id) || id <= 0 || !['answered', 'closed', 'pending'].includes(status)) {
        sendJson(response, 400, { message: '工单处理参数无效。' });
        return;
      }
      if (status === 'answered' && (reply.length < 2 || reply.length > 600)) {
        sendJson(response, 400, { message: '回复需为 2 到 600 个字符。' });
        return;
      }

      const result = db.prepare(
        `UPDATE store_support_tickets
         SET reply = ?, status = ?, replier_username = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`
      ).run(status === 'answered' ? reply : '', status, session.username, id);

      if (Number(result.changes || 0) === 0) {
        sendJson(response, 404, { message: '工单不存在。' });
        return;
      }

      sendJson(response, 200, { message: status === 'closed' ? '工单已关闭。' : '回复已保存。' });
    })
    .catch((error) => {
      sendJson(response, 400, { message: error.message || '请求无效。' });
    });
}

function readUserPoints(username) {
  const row = db.prepare('SELECT * FROM store_user_points WHERE username = ?').get(username);
  const today = getTodayDateText();
  return {
    username,
    points: Number(row?.points || 0),
    totalEarned: Number(row?.total_earned || 0),
    streak: Number(row?.checkin_streak || 0),
    lastCheckinDate: String(row?.last_checkin_date || ''),
    checkedToday: String(row?.last_checkin_date || '') === today
  };
}

function handleStorePoints(request, response) {
  const session = getStoreAccountSession(request);
  if (!session) {
    sendJson(response, 401, { message: '请先登录账号。' });
    return;
  }

  sendJson(response, 200, {
    loggedIn: true,
    username: session.username,
    today: getTodayDateText(),
    basePoints: DAILY_CHECKIN_BASE_POINTS,
    ...readUserPoints(session.username)
  });
}

function handleStorePointsCheckin(request, response) {
  const session = getStoreAccountSession(request);
  if (!session) {
    sendJson(response, 401, { message: '请先登录账号后再签到。' });
    return;
  }

  const today = getTodayDateText();
  const current = readUserPoints(session.username);
  if (current.checkedToday) {
    sendJson(response, 200, {
      message: '今天已经签到过了，明天再来。',
      alreadyChecked: true,
      ...current
    });
    return;
  }

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayText = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
  const streak = current.lastCheckinDate === yesterdayText ? current.streak + 1 : 1;
  const bonus = Math.min((streak - 1) * DAILY_CHECKIN_STREAK_BONUS, DAILY_CHECKIN_STREAK_BONUS_CAP);
  const gained = DAILY_CHECKIN_BASE_POINTS + bonus;

  db.prepare(
    `INSERT INTO store_user_points (username, points, total_earned, checkin_streak, last_checkin_date)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(username) DO UPDATE SET
       points = points + ?,
       total_earned = total_earned + ?,
       checkin_streak = ?,
       last_checkin_date = ?,
       updated_at = CURRENT_TIMESTAMP`
  ).run(
    session.username, gained, gained, streak, today,
    gained, gained, streak, today
  );

  try {
    db.prepare(
      'INSERT INTO store_checkin_log (username, checkin_date, gained) VALUES (?, ?, ?) ON CONFLICT(username, checkin_date) DO NOTHING'
    ).run(session.username, today, gained);
  } catch (logError) {
    console.warn('记录签到日志失败（不影响签到）:', logError.message);
  }

  const next = readUserPoints(session.username);
  sendJson(response, 200, {
    message: `签到成功，获得 ${gained} 积分${bonus > 0 ? `（含连续签到奖励 ${bonus}）` : ''}。`,
    gained,
    bonus,
    ...next
  });
}

function handleStorePointsCalendar(request, response) {
  const session = getStoreAccountSession(request);
  if (!session) {
    sendJson(response, 401, { message: '请先登录账号。' });
    return;
  }
  const url = new URL(request.url, 'http://localhost');
  const param = String(url.searchParams.get('month') || '').trim();
  const now = new Date();
  const year = param ? Number(param.slice(0, 4)) : now.getFullYear();
  const month = param ? Number(param.slice(5, 7)) : (now.getMonth() + 1);
  const prefix = `${year}-${String(month).padStart(2, '0')}`;
  const rows = db.prepare(
    'SELECT checkin_date FROM store_checkin_log WHERE username = ? AND checkin_date LIKE ?'
  ).all(session.username, `${prefix}-%`);
  const checkedDates = rows.map((r) => r.checkin_date);
  sendJson(response, 200, { month: prefix, checkedDates });
}

function handleStoreCheckinReset(request, response) {
  const session = requireCommunityDeveloper(request, response);
  if (!session) {
    return;
  }

  const today = getTodayDateText();
  let clearedUsers = 0;
  let clearedLogRows = 0;

  db.exec('BEGIN');
  try {
    // 把所有用户的今日签到状态清空，让所有人今天可以重新签到一次
    const resetPoints = db.prepare(
      `UPDATE store_user_points
       SET checkin_streak = 0, last_checkin_date = '', updated_at = CURRENT_TIMESTAMP
       WHERE checkin_streak > 0 OR last_checkin_date <> ''`
    );
    clearedUsers = Number(resetPoints.run().changes || 0);

    // 同时清掉今天的签到日历记录
    const clearTodayLog = db.prepare('DELETE FROM store_checkin_log WHERE checkin_date = ?');
    clearedLogRows = Number(clearTodayLog.run(today).changes || 0);

    db.exec('COMMIT');
  } catch (resetError) {
    try {
      db.exec('ROLLBACK');
    } catch (rollbackError) {
      // ignore rollback failure
    }
    sendJson(response, 500, { message: `刷新签到失败：${resetError.message}` });
    return;
  }

  sendJson(response, 200, {
    message: `已刷新签到：重置 ${clearedUsers} 个用户的今日签到状态，${clearedLogRows} 条今日签到记录已清除，所有人现在可以重新签到。`,
    today,
    clearedUsers,
    clearedLogRows,
  });
}

function listStoreMallItems(activeOnly) {
  const rows = db.prepare(
    'SELECT id, name, description, icon, cost_points AS costPoints, stock, status FROM store_mall_items ' +
    (activeOnly ? "WHERE status = 'active' " : '') +
    'ORDER BY sort_order ASC, id ASC'
  ).all();
  return rows.map((r) => ({
    id: Number(r.id),
    name: r.name,
    description: r.description,
    icon: r.icon,
    costPoints: Number(r.costPoints),
    stock: Number(r.stock),
    status: r.status,
    outOfStock: Number(r.stock) <= 0
  }));
}

function handleStoreMallItems(request, response) {
  const session = getStoreAccountSession(request);
  const items = listStoreMallItems(true);
  sendJson(response, 200, {
    loggedIn: Boolean(session),
    username: session ? session.username : '',
    items
  });
}

function handleStoreMallRedeem(request, response) {
  const session = getStoreAccountSession(request);
  if (!session) {
    sendJson(response, 401, { message: '请先登录账号后再兑换。' });
    return;
  }
  parseRequestBody(request)
    .then((body) => {
      const itemId = Number(body.itemId);
      if (!itemId) {
        sendJson(response, 400, { message: '商品不存在。' });
        return;
      }
      const item = db.prepare('SELECT * FROM store_mall_items WHERE id = ?').get(itemId);
      if (!item || item.status !== 'active') {
        sendJson(response, 400, { message: '该商品已下架。' });
        return;
      }
      if (Number(item.stock) <= 0) {
        sendJson(response, 400, { message: '该商品已兑罄。' });
        return;
      }
      const current = readUserPoints(session.username);
      if (current.points < Number(item.cost_points)) {
        sendJson(response, 400, { message: `积分不足，还差 ${Number(item.cost_points) - current.points} 积分。` });
        return;
      }
      const tx = db.transaction(() => {
        db.prepare('UPDATE store_user_points SET points = points - ?, updated_at = CURRENT_TIMESTAMP WHERE username = ?')
          .run(Number(item.cost_points), session.username);
        db.prepare('UPDATE store_mall_items SET stock = stock - 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
          .run(item.id);
        db.prepare(
          'INSERT INTO store_mall_redemptions (username, item_id, item_name, cost_points) VALUES (?, ?, ?, ?)'
        ).run(session.username, item.id, item.name, Number(item.cost_points));
      });
      tx();
      const next = readUserPoints(session.username);
      sendJson(response, 200, {
        message: `兑换成功：${item.name}`,
        itemName: item.name,
        remainingPoints: next.points,
        points: next.points,
        totalEarned: next.totalEarned,
        streak: next.streak,
        lastCheckinDate: next.lastCheckinDate,
        checkedToday: next.checkedToday
      });
    })
    .catch((error) => {
      sendJson(response, 400, { message: error.message || '兑换失败。' });
    });
}

function handleStoreMallMy(request, response) {
  const session = getStoreAccountSession(request);
  if (!session) {
    sendJson(response, 401, { message: '请先登录账号。' });
    return;
  }
  const rows = db.prepare(
    'SELECT id, item_name AS itemName, cost_points AS costPoints, created_at AS createdAt FROM store_mall_redemptions WHERE username = ? ORDER BY id DESC LIMIT 50'
  ).all(session.username);
  sendJson(response, 200, { records: rows });
}

function handleStoreCouponsAdmin(request, response) {
  const session = requireCommunityDeveloper(request, response);
  if (!session) return;
  sendJson(response, 200, { coupons: listStoreCoupons(true), operator: session.username });
}

function handleStoreCouponCreate(request, response) {
  const session = requireCommunityDeveloper(request, response);
  if (!session) return;

  parseRequestBody(request)
    .then((body) => {
      const code = String(body.code || '').trim().toUpperCase();
      const discountType = String(body.discountType || '').trim().toLowerCase();
      const discountValue = Number(body.discountValue);
      const minimumAmountFen = Number(body.minimumAmountFen || 0);
      const startsAt = String(body.startsAt || '').trim();
      const expiresAt = String(body.expiresAt || '').trim();
      const isActive = body.isActive === false || body.isActive === 0 ? 0 : 1;

      if (!/^[A-Z0-9_-]{3,32}$/.test(code)) {
        sendJson(response, 400, { message: '折扣券编码需为 3-32 位大写字母、数字、下划线或连字符。' });
        return;
      }
      if (!['percent', 'fixed'].includes(discountType)) {
        sendJson(response, 400, { message: '请选择有效的折扣类型。' });
        return;
      }
      if (!Number.isInteger(discountValue) || discountValue <= 0 || (discountType === 'percent' && discountValue > 99)) {
        sendJson(response, 400, { message: discountType === 'percent' ? '折扣比例需为 1-99 的整数。' : '减免金额需为大于 0 的整数分。' });
        return;
      }
      if (!Number.isInteger(minimumAmountFen) || minimumAmountFen < 0) {
        sendJson(response, 400, { message: '最低消费金额无效。' });
        return;
      }
      const startTime = startsAt ? Date.parse(startsAt) : NaN;
      const expiryTime = expiresAt ? Date.parse(expiresAt) : NaN;
      if ((startsAt && !Number.isFinite(startTime)) || (expiresAt && !Number.isFinite(expiryTime)) || (Number.isFinite(startTime) && Number.isFinite(expiryTime) && expiryTime <= startTime)) {
        sendJson(response, 400, { message: '折扣券有效时间无效，结束时间必须晚于开始时间。' });
        return;
      }

      db.prepare(`
        INSERT INTO store_discount_coupons (
          code, discount_type, discount_value, minimum_amount_fen, starts_at, expires_at, is_active, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `).run(code, discountType, discountValue, minimumAmountFen, startsAt, expiresAt, isActive);
      sendJson(response, 201, { message: '折扣券已创建。', coupon: getStoreCouponByCode(code, true) });
    })
    .catch((error) => {
      const message = String(error?.message || '创建折扣券失败');
      sendJson(response, message.includes('UNIQUE') ? 409 : 400, {
        message: message.includes('UNIQUE') ? '折扣券编码已存在。' : message
      });
    });
}

function handleStoreCouponToggle(request, response) {
  const session = requireCommunityDeveloper(request, response);
  if (!session) return;

  parseRequestBody(request)
    .then((body) => {
      const code = String(body.code || '').trim().toUpperCase();
      const isActive = body.isActive ? 1 : 0;
      const result = db.prepare('UPDATE store_discount_coupons SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE code = ?').run(isActive, code);
      if (Number(result.changes || 0) === 0) {
        sendJson(response, 404, { message: '未找到该折扣券。' });
        return;
      }
      sendJson(response, 200, { message: isActive ? '折扣券已启用。' : '折扣券已停用。', coupon: getStoreCouponByCode(code, true) });
    })
    .catch((error) => sendJson(response, 400, { message: error.message || '更新折扣券失败' }));
}

function handleStoreCouponDelete(request, response) {
  const session = requireCommunityDeveloper(request, response);
  if (!session) return;

  parseRequestBody(request)
    .then((body) => {
      const code = String(body.code || '').trim().toUpperCase();
      const result = db.prepare('DELETE FROM store_discount_coupons WHERE code = ?').run(code);
      if (Number(result.changes || 0) === 0) {
        sendJson(response, 404, { message: '未找到该折扣券。' });
        return;
      }
      sendJson(response, 200, { message: `折扣券 ${code} 已删除。` });
    })
    .catch((error) => sendJson(response, 400, { message: error.message || '删除折扣券失败' }));
}

function handleStoreCouponQuote(request, response) {
  const session = getCommunitySessionFromRequest(request);
  if (!session) {
    sendJson(response, 401, { message: '请先登录后再使用折扣券。' });
    return;
  }

  parseRequestBody(request)
    .then((body) => {
      const product = getStoreProductByCode(body.productCode, false);
      if (!product) {
        sendJson(response, 404, { message: '商品不存在或已下架。' });
        return;
      }
      const quantity = Math.max(1, Math.min(99, Number.parseInt(String(body.quantity || '1'), 10) || 1));
      const pricing = calculateStoreOrderPricing(product, quantity, session.username, body.couponCode);
      if (pricing.error) {
        sendJson(response, 400, { message: pricing.error });
        return;
      }
      sendJson(response, 200, { ...pricing, currency: product.currency || 'CNY' });
    })
    .catch((error) => sendJson(response, 400, { message: error.message || '折扣券校验失败' }));
}

function handleStoreOrdersAdmin(request, response) {
  const session = getCommunitySessionFromRequest(request);

  if (!session) {
    sendJson(response, 401, { message: '���ȵ�¼�����˺�' });
    return;
  }

  const role = getStorePermissionRole(session.username);
  const isCommunityDeveloper = Boolean(session.isDeveloper || isDeveloper(session.username));

  if (!isCommunityDeveloper && role !== 'order-viewer') {
    sendJson(response, 403, { message: '��Ȩ�޻򶩵��鿴Ա�ɲ鿴����' });
    return;
  }

  const url = new URL(request.url || '/', `http://${host}:${port}`);
  const limit = Number(url.searchParams.get('limit') || 50);
  const status = String(url.searchParams.get('status') || '').trim().toUpperCase();
  const paymentMethod = String(url.searchParams.get('paymentMethod') || '').trim().toLowerCase();
  const query = String(url.searchParams.get('query') || '').trim();
  const exportFormat = String(url.searchParams.get('export') || '').trim().toLowerCase();

  const orders = listStoreOrdersAdmin({
    limit,
    status,
    paymentMethod,
    query
  });

  if (exportFormat === 'csv') {
    const header = ['orderNo', 'productCode', 'productName', 'amountFen', 'couponCode', 'couponDiscountFen', 'currency', 'status', 'paymentMethod', 'contact', 'buyerNote', 'cardSecret', 'createdAt', 'updatedAt'];
    const csv = [
      header.join(','),
      ...orders.map((order) => header.map((key) => csvEscapeValue(order[key])).join(','))
    ].join('\r\n');

    response.writeHead(200, {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="store-orders-${new Date().toISOString().slice(0, 10)}.csv"`
    });
    response.end(`\uFEFF${csv}`);
    return;
  }

  sendJson(response, 200, {
    operator: session.username,
    role: isCommunityDeveloper ? 'developer' : role,
    filters: {
      limit: Math.max(1, Math.min(200, Number(limit) || 50)),
      status: status || 'ALL',
      paymentMethod: paymentMethod || 'ALL',
      query
    },
    orders
  });
}

function listStoreOrdersByContact(contact, limit = 20) {
  const normalizedContact = String(contact || '').trim();
  const safeLimit = Math.max(1, Math.min(100, Number(limit) || 20));
  if (!normalizedContact) {
    return [];
  }

  return db.prepare(
    `SELECT order_no AS orderNo, product_code AS productCode, product_name AS productName, amount_fen AS amountFen, currency, status, payment_method AS paymentMethod, contact, buyer_note AS buyerNote, quantity, coupon_code AS couponCode, coupon_discount_fen AS couponDiscountFen, card_secret AS cardSecret, created_at AS createdAt, updated_at AS updatedAt
     FROM store_orders
     WHERE contact = ?
     ORDER BY id DESC
     LIMIT ?`
  ).all(normalizedContact, safeLimit);
}

function handleStoreOrdersByContact(request, response) {
  const url = new URL(request.url || '/', `http://${host}:${port}`);
  const contact = String(url.searchParams.get('contact') || '').trim();
  const limit = Number(url.searchParams.get('limit') || 20);

  if (!contact || contact.length < 4) {
    sendJson(response, 400, { message: '��ϵ��ʽ�������� 4 λ' });
    return;
  }

  const orders = listStoreOrdersByContact(contact, limit);
  sendJson(response, 200, {
    contact,
    count: orders.length,
    orders
  });
}

function listStoreOrdersByUsername(username, limit = 50) {
  const normalizedUsername = String(username || '').trim();
  const safeLimit = Math.max(1, Math.min(100, Number(limit) || 50));
  if (!normalizedUsername) {
    return [];
  }

  return db.prepare(
    `SELECT order_no AS orderNo, product_code AS productCode, product_name AS productName,
      amount_fen AS amountFen, currency, status, payment_method AS paymentMethod, quantity,
      coupon_code AS couponCode, coupon_discount_fen AS couponDiscountFen, card_secret AS cardSecret,
      created_at AS createdAt, updated_at AS updatedAt
     FROM store_orders
     WHERE buyer_username = ?
     ORDER BY id DESC
     LIMIT ?`
  ).all(normalizedUsername, safeLimit);
}

function handleStoreMyOrders(request, response) {
  const session = getCommunitySessionFromRequest(request);
  if (!session) {
    sendJson(response, 401, { message: '请先登录社区账号。' });
    return;
  }

  const url = new URL(request.url || '/', `http://${host}:${port}`);
  const limit = Number(url.searchParams.get('limit') || 50);
  let orders;
  try {
    orders = listStoreOrdersByUsername(session.username, limit);
  } catch (error) {
    sendJson(response, 500, { message: '订单暂时无法加载，请稍后刷新。' });
    return;
  }
  const paidOrders = orders.filter((order) => normalizePaymentSuccess(order.status));

  sendJson(response, 200, {
    username: session.username,
    orders,
    summary: {
      orderCount: orders.length,
      paidCount: paidOrders.length,
      paidAmountFen: paidOrders.reduce((total, order) => total + Math.max(0, Number(order.amountFen || 0)), 0)
    }
  });
}

function csvEscapeValue(value) {
  const text = String(value == null ? '' : value);
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function normalizeStoreOrderStatus(value) {
  const normalized = String(value || '').trim().toUpperCase();
  if (!normalized) {
    return '';
  }

  if (['PENDING', 'SUCCESS', 'TRADE_SUCCESS', 'PAID', 'COMPLETED', 'CANCELLED', 'REFUNDED', 'FAILED', 'SHIPPED', 'DELIVERED'].includes(normalized)) {
    return normalized;
  }

  throw new Error('��֧�ֵĶ���״̬');
}

function handleStoreOrderUpdate(request, response) {
  const session = getCommunitySessionFromRequest(request);

  if (!session) {
    sendJson(response, 401, { message: '���ȵ�¼�����˺�' });
    return;
  }

  const role = getStorePermissionRole(session.username);
  const isCommunityDeveloper = Boolean(session.isDeveloper || isDeveloper(session.username));

  if (!isCommunityDeveloper && role !== 'order-viewer') {
    sendJson(response, 403, { message: '��Ȩ�޻򶩵��鿴Ա�ɲ�������' });
    return;
  }

  if (!isCommunityDeveloper) {
    sendJson(response, 403, { message: '�����鿴Ա��֧�ֲ鿴�������޸Ķ���' });
    return;
  }

  parseRequestBody(request)
    .then((body) => {
      const orderNo = String(body.orderNo || '').trim();
      if (!orderNo) {
        sendJson(response, 400, { message: 'ȱ�ٶ�����' });
        return;
      }

      const current = getStoreOrderByNo(orderNo);
      if (!current) {
        sendJson(response, 404, { message: '����������' });
        return;
      }

      const updates = {};

      if (Object.prototype.hasOwnProperty.call(body, 'status')) {
        updates.status = normalizeStoreOrderStatus(body.status);
      }

      if (Object.prototype.hasOwnProperty.call(body, 'contact')) {
        updates.contact = String(body.contact || '').trim();
      }

      if (Object.prototype.hasOwnProperty.call(body, 'buyerNote')) {
        updates.buyerNote = String(body.buyerNote || '').trim();
      }

      if (Object.prototype.hasOwnProperty.call(body, 'cardSecret')) {
        updates.cardSecret = String(body.cardSecret || '').trim();
      }

      const next = updateStoreOrder(orderNo, updates);
      sendJson(response, 200, {
        message: '�����Ѹ���',
        order: next
      });
    })
    .catch((error) => {
      const statusCode = error.message === 'Invalid JSON' ? 400 : 400;
      sendJson(response, statusCode, { message: error.message || '����ʧ��' });
    });
}

function handleStoreOrderRefund(request, response) {
  const session = requireCommunityDeveloper(request, response);
  if (!session) {
    return;
  }

  parseRequestBody(request)
    .then((body) => {
      const orderNo = String(body.orderNo || '').trim();
      const reason = String(body.reason || '��̨�˿�').trim();

      if (!orderNo) {
        sendJson(response, 400, { message: 'ȱ�ٶ�����' });
        return;
      }

      const order = getStoreOrderByNo(orderNo);
      if (!order) {
        sendJson(response, 404, { message: '����������' });
        return;
      }

      const previousResponse = parseMaybeJson(order.responseJson);
      const next = updateStoreOrder(orderNo, {
        status: 'REFUNDED',
        responseJson: JSON.stringify({
          ...previousResponse,
          adminActions: [
            ...Array.isArray(previousResponse?.adminActions) ? previousResponse.adminActions : [],
            {
              action: 'refund',
              operator: session.username,
              reason,
              at: new Date().toISOString()
            }
          ]
        })
      });

      sendJson(response, 200, {
        message: '�������˿�',
        order: next
      });
    })
    .catch((error) => {
      sendJson(response, 400, { message: error.message || '�˿�ʧ��' });
    });
}

function handleStoreOrderReissue(request, response) {
  const session = requireCommunityDeveloper(request, response);
  if (!session) {
    return;
  }

  parseRequestBody(request)
    .then((body) => {
      const orderNo = String(body.orderNo || '').trim();
      if (!orderNo) {
        sendJson(response, 400, { message: 'ȱ�ٶ�����' });
        return;
      }

      const order = getStoreOrderByNo(orderNo);
      if (!order) {
        sendJson(response, 404, { message: '订单不存在' });
        return;
      }

      // 允许为已支付/已发货/已标记支付的订单补发；未支付订单由管理员在确认收款后手动补发。
      // 已取消或已退款的订单不允许补发。
      const orderStatus = String(order.status || '').trim().toUpperCase();
      if (['CANCELLED', 'REFUNDED'].includes(orderStatus)) {
        sendJson(response, 400, { message: '已取消或已退款的订单无法补发卡密' });
        return;
      }

      const newCardSecret = createStoreCardSecret(orderNo, String(order.productCode || '').trim().toUpperCase());
      const previousResponse = parseMaybeJson(order.responseJson);
      const next = updateStoreOrder(orderNo, {
        cardSecret: newCardSecret,
        responseJson: JSON.stringify({
          ...previousResponse,
          adminActions: [
            ...Array.isArray(previousResponse?.adminActions) ? previousResponse.adminActions : [],
            {
              action: 'reissue-card-secret',
              operator: session.username,
              previousCardSecret: String(order.cardSecret || ''),
              nextCardSecret: newCardSecret,
              at: new Date().toISOString()
            }
          ]
        })
      });

      sendJson(response, 200, {
        message: '补发成功',
        order: next,
        cardSecret: newCardSecret
      });
    })
    .catch((error) => {
      sendJson(response, 400, { message: error.message || '补发失败' });
    });
}

function handleStoreOrderReissueAll(request, response) {
  const session = requireCommunityDeveloper(request, response);
  if (!session) {
    return;
  }

  parseRequestBody(request)
    .then((body) => {
      const onlyMissing = body.onlyMissing !== false;
      const orders = listStoreOrdersAdmin({ limit: 1000, status: 'ALL' }) || [];
      const details = [];
      let reissued = 0;
      let skipped = 0;

      for (const order of orders) {
        const orderNo = String(order.orderNo || '').trim();
        const status = String(order.status || '').trim().toUpperCase();
        if (!orderNo || !normalizePaymentSuccess(status)) {
          skipped += 1;
          continue;
        }

        const currentSecret = String(order.cardSecret || '').trim();
        if (onlyMissing && currentSecret) {
          skipped += 1;
          continue;
        }

        const newCardSecret = createStoreCardSecret(orderNo, String(order.productCode || '').trim().toUpperCase());
        if (!newCardSecret) {
          skipped += 1;
          continue;
        }

        const previousResponse = parseMaybeJson(order.responseJson);
        updateStoreOrder(orderNo, {
          cardSecret: newCardSecret,
          responseJson: JSON.stringify({
            ...previousResponse,
            adminActions: [
              ...Array.isArray(previousResponse?.adminActions) ? previousResponse.adminActions : [],
              {
                action: 'reissue-card-secret-all',
                operator: session.username,
                previousCardSecret: currentSecret,
                nextCardSecret: newCardSecret,
                at: new Date().toISOString()
              }
            ]
          })
        });

        reissued += 1;
        details.push({ orderNo, cardSecret: newCardSecret });
      }

      sendJson(response, 200, {
        message: `已补发 ${reissued} 笔订单，跳过 ${skipped} 笔`,
        reissued,
        skipped,
        details
      });
    })
    .catch((error) => {
      sendJson(response, 400, { message: error.message || '批量补发失败' });
    });
}

function handleStoreCardSecretsRead(request, response) {
  const session = requireCommunityDeveloper(request, response);
  if (!session) {
    return;
  }

  const url = new URL(request.url || '/', `http://${host}:${port}`);
  const productCode = String(url.searchParams.get('productCode') || '').trim().toUpperCase();
  const secrets = listStoreCardSecrets(productCode);

  sendJson(response, 200, {
    productCode,
    total: secrets.length,
    available: secrets.filter((item) => !item.isUsed).length,
    used: secrets.filter((item) => item.isUsed).length,
    secrets
  });
}

function parseStoreCardSecretInputs(value) {
  return Array.from(new Set(String(value || '')
    .split(/[\r\n,，]+/)
    .map((item) => String(item || '').trim())
    .filter(Boolean)));
}

function appendStoreCardSecrets(productCode, secretCodes, label = '') {
  const normalizedProductCode = String(productCode || '').trim().toUpperCase();
  const secretList = parseStoreCardSecretInputs(secretCodes);

  if (!normalizedProductCode) {
    throw new Error('请填写商品编码');
  }

  if (secretList.length === 0) {
    throw new Error('至少填写一条卡密');
  }

  const insert = db.prepare(
    `INSERT OR IGNORE INTO store_card_secrets (product_code, secret_code, label, is_used, used_order_no)
     VALUES (?, ?, ?, 0, '')`
  );

  let count = 0;
  for (const secretCode of secretList) {
    const normalizedSecret = String(secretCode || '').trim();
    if (!normalizedSecret) {
      continue;
    }
    insert.run(normalizedProductCode, normalizedSecret, label || '');
    count += 1;
  }

  return count;
}

function generateStoreCardSecrets(productCode, count, label = '') {
  const normalizedProductCode = String(productCode || '').trim().toUpperCase();
  const safeCount = Math.max(0, Math.min(500, Number(count) || 0));

  if (!normalizedProductCode) {
    throw new Error('请填写商品编码');
  }

  if (safeCount <= 0) {
    throw new Error('生成数量必须大于 0');
  }

  const insert = db.prepare(
    `INSERT OR IGNORE INTO store_card_secrets (product_code, secret_code, label, is_used, used_order_no)
     VALUES (?, ?, ?, 0, '')`
  );

  const generated = [];
  const seen = new Set();
  for (let index = 0; index < safeCount; index += 1) {
    let secretCode = generateStoreCardSecretCode(normalizedProductCode, 'MC');
    while (seen.has(secretCode) || db.prepare('SELECT 1 FROM store_card_secrets WHERE secret_code = ?').get(secretCode)) {
      secretCode = generateStoreCardSecretCode(normalizedProductCode, 'MC');
    }
    seen.add(secretCode);
    generated.push(secretCode);
    insert.run(normalizedProductCode, secretCode, label || '');
  }

  return generated;
}

function handleStoreCardSecretsGenerate(request, response) {
  const session = requireCommunityDeveloper(request, response);
  if (!session) {
    return;
  }

  parseRequestBody(request)
    .then((body) => {
      const productCode = String(body.productCode || '').trim().toUpperCase();
      const count = Number(body.count || 0);
      const label = String(body.label || '').trim();
      const bulkSecrets = Array.isArray(body.secrets) ? body.secrets : parseStoreCardSecretInputs(body.secretText || body.secrets || '');

      if (Array.isArray(body.secrets) || body.secretText || body.secrets) {
        const added = appendStoreCardSecrets(productCode, bulkSecrets, label);
        sendJson(response, 200, {
          message: `已追加 ${added} 条卡密`,
          total: listStoreCardSecrets(productCode).length,
          available: listStoreCardSecrets(productCode).filter((item) => !item.isUsed).length,
          secrets: listStoreCardSecrets(productCode)
        });
        return;
      }

      const generated = generateStoreCardSecrets(productCode, count, label);
      sendJson(response, 200, {
        message: `已生成 ${generated.length} 条卡密`,
        total: listStoreCardSecrets(productCode).length,
        available: listStoreCardSecrets(productCode).filter((item) => !item.isUsed).length,
        secrets: listStoreCardSecrets(productCode)
      });
    })
    .catch((error) => {
      sendJson(response, 400, { message: error.message || '卡密生成失败' });
    });
}

function handleStoreCardSecretsDelete(request, response) {
  const session = requireCommunityDeveloper(request, response);
  if (!session) {
    return;
  }

  parseRequestBody(request)
    .then((body) => {
      const secretCode = String(body.secretCode || '').trim();
      const productCode = String(body.productCode || '').trim().toUpperCase();

      if (!secretCode) {
        sendJson(response, 400, { message: '缺少卡密' });
        return;
      }

      const removed = db.prepare(
        `DELETE FROM store_card_secrets WHERE secret_code = ? ${productCode ? 'AND product_code = ?' : ''}`
      ).run(...(productCode ? [secretCode, productCode] : [secretCode]));

      sendJson(response, 200, {
        message: `已删除卡密 ${secretCode}`,
        deleted: Number(removed.changes || 0),
        total: listStoreCardSecrets(productCode).length,
        available: listStoreCardSecrets(productCode).filter((item) => !item.isUsed).length
      });
    })
    .catch((error) => {
      sendJson(response, 400, { message: error.message || '删除卡密失败' });
    });
}

function listLotteryPrizes(activeOnly = true) {
  const rows = activeOnly
    ? db.prepare('SELECT id, name, description, reward_tier AS rewardTier, stock, sort_order AS sortOrder, is_active AS isActive FROM lottery_prizes WHERE is_active = 1 ORDER BY sort_order ASC, id ASC').all()
    : db.prepare('SELECT id, name, description, reward_tier AS rewardTier, stock, sort_order AS sortOrder, is_active AS isActive FROM lottery_prizes ORDER BY sort_order ASC, id ASC').all();

  return rows.map((row) => ({
    id: Number(row.id || 0),
    name: String(row.name || ''),
    description: String(row.description || ''),
    rewardTier: String(row.rewardTier || ''),
    stock: Math.max(0, Number(row.stock || 0)),
    sortOrder: Number(row.sortOrder || 100),
    isActive: Boolean(row.isActive)
  }));
}

function listLotteryRecordsByUsername(username, limit = 50) {
  const safeLimit = Math.max(1, Math.min(200, Number(limit) || 50));
  return db.prepare(
    `SELECT id, username, email, prize_id AS prizeId, prize_name AS prizeName, price_fen AS priceFen, created_at AS createdAt
     FROM lottery_draw_records
     WHERE username = ?
     ORDER BY id DESC
     LIMIT ?`
  ).all(String(username || '').trim(), safeLimit);
}

function countTodayLotteryDraws(username) {
  const today = new Date().toISOString().slice(0, 10);
  const row = db.prepare(
    `SELECT COUNT(1) AS count
     FROM lottery_draw_records
     WHERE username = ? AND substr(created_at, 1, 10) = ?`
  ).get(String(username || '').trim(), today);
  return Number(row?.count || 0);
}

function drawLotteryPrize(username, email, orderNo) {
  const normalizedUsername = String(username || '').trim();
  const normalizedOrderNo = String(orderNo || '').trim();
  db.exec('BEGIN IMMEDIATE');

  try {
    const existing = db.prepare(
      'SELECT prize_id AS prizeId, prize_name AS prizeName FROM lottery_draw_records WHERE order_no = ?'
    ).get(normalizedOrderNo);
    if (existing) {
      db.exec('COMMIT');
      const todayCount = countTodayLotteryDraws(normalizedUsername);
      return {
        prize: { id: Number(existing.prizeId || 0), name: String(existing.prizeName || '') },
        todayDrawCount: todayCount,
        remainingTodayDraws: Math.max(0, lotteryDailyDrawLimit - todayCount)
      };
    }

    const todayCount = countTodayLotteryDraws(normalizedUsername);
    if (todayCount >= lotteryDailyDrawLimit) {
      db.exec('ROLLBACK');
      return { error: '���ճ齱����������' };
    }

    const prizes = listLotteryPrizes(true).filter((item) => item.stock > 0);
    if (prizes.length === 0) {
      db.exec('ROLLBACK');
      return { error: '��ǰ�����ѿգ����Ժ�����' };
    }

    const weightedPool = prizes.flatMap((prize) => Array.from({ length: Math.max(1, prize.stock) }, () => prize));
    const selected = weightedPool[Math.floor(Math.random() * weightedPool.length)];
    if (!selected) {
      db.exec('ROLLBACK');
      return { error: '�齱ʧ�ܣ����Ժ�����' };
    }

    const result = db.prepare('UPDATE lottery_prizes SET stock = stock - 1, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND stock > 0').run(selected.id);
    if (!result || Number(result.changes || 0) <= 0) {
      db.exec('ROLLBACK');
      return { error: '��Ʒ��治�㣬������' };
    }

    if (selected.rewardTier && !grantStoreDiscountTier(normalizedUsername, selected.rewardTier)) {
      db.exec('ROLLBACK');
      return { error: '会员权益发放失败，请联系管理员。' };
    }

    db.prepare('INSERT INTO lottery_draw_records (username, email, prize_id, prize_name, price_fen, order_no) VALUES (?, ?, ?, ?, ?, ?)').run(
      normalizedUsername,
      String(email || '').trim(),
      selected.id,
      selected.name,
      lotteryDrawPriceFen,
      normalizedOrderNo
    );

    db.exec('COMMIT');

    return {
      prize: selected,
      todayDrawCount: todayCount + 1,
      remainingTodayDraws: Math.max(0, lotteryDailyDrawLimit - (todayCount + 1))
    };
  } catch (error) {
    try {
      db.exec('ROLLBACK');
    } catch {
      // ignore rollback errors
    }
    return { error: error.message || '�齱ʧ��' };
  }
}

function handleLotteryConfig(request, response) {
  const enabled = getLotteryFeatureEnabled();
  sendJson(response, 200, {
    enabled,
    message: enabled ? '' : lotteryDisabledMessage,
    priceFen: lotteryDrawPriceFen,
    dailyLimit: lotteryDailyDrawLimit,
    prizeCount: listLotteryPrizes(true).length,
    prizes: listLotteryPrizes(true)
  });
}

function handleLotteryRecords(request, response) {
  const enabled = getLotteryFeatureEnabled();
  const session = getCommunitySessionFromRequest(request);
  if (!session) {
    sendJson(response, 200, {
      enabled,
      message: enabled ? '' : lotteryDisabledMessage,
      loggedIn: false,
      records: [],
      todayDrawCount: 0,
      remainingTodayDraws: enabled ? lotteryDailyDrawLimit : 0
    });
    return;
  }

  const records = listLotteryRecordsByUsername(session.username, 30);
  const todayDrawCount = countTodayLotteryDraws(session.username);
  sendJson(response, 200, {
    enabled,
    message: enabled ? '' : lotteryDisabledMessage,
    loggedIn: true,
    username: session.username,
    records,
    todayDrawCount,
    remainingTodayDraws: enabled ? Math.max(0, lotteryDailyDrawLimit - todayDrawCount) : 0
  });
}

async function handleLotteryDraw(request, response) {
  if (!getLotteryFeatureEnabled()) {
    sendJson(response, 503, { message: lotteryDisabledMessage, enabled: false });
    return;
  }

  const session = getCommunitySessionFromRequest(request);
  if (!session) {
    sendJson(response, 401, { message: '���ȵ�¼�˺ź��ٳ齱' });
    return;
  }

  try {
    const body = await parseRequestBody(request);
    const orderNo = String(body.orderNo || '').trim();
    if (!orderNo) {
      sendJson(response, 400, { message: '请先完成抽奖订单支付。' });
      return;
    }

    let order = getStoreOrderByNo(orderNo);
    if (!order || String(order.productCode || '').trim().toUpperCase() !== lotteryDrawProductCode) {
      sendJson(response, 404, { message: '未找到对应的抽奖支付订单。' });
      return;
    }
    if (String(order.buyerUsername || '').trim() !== String(session.username || '').trim()) {
      sendJson(response, 403, { message: '该抽奖订单不属于当前账号。' });
      return;
    }
    if (Number(order.amountFen || 0) !== lotteryDrawPriceFen || Number(order.quantity || 0) !== 1 || Number(order.couponDiscountFen || 0) !== 0) {
      sendJson(response, 400, { message: '抽奖订单金额或数量无效。' });
      return;
    }

    try {
      await trySyncStoreOrderFromHongxing(order);
    } catch {
      // The order remains pending when the payment provider cannot be reached.
    }
    order = getStoreOrderByNo(orderNo) || order;
    if (!normalizePaymentSuccess(order.status)) {
      sendJson(response, 409, { message: '尚未确认支付成功；完成支付后再次点击即可开奖。', pending: true });
      return;
    }

    const result = drawLotteryPrize(session.username, session.email, orderNo);
    if (result.error) {
      sendJson(response, 400, { message: result.error });
      return;
    }

    sendJson(response, 200, {
      message: '�齱�ɹ�',
      ...result,
      records: listLotteryRecordsByUsername(session.username, 10)
    });
  } catch (error) {
    sendJson(response, 400, { message: error.message || '抽奖失败' });
  }
}

function handleStoreSettingsRead(request, response) {
  sendJson(response, 200, getStorePublicSettings());
}

function handleStoreSettingsSave(request, response) {
  const session = requireCommunityDeveloper(request, response);

  if (!session) {
    return;
  }

  parseRequestBody(request)
    .then((body) => {
      const announcement = String(body.announcement || '').trim();
      const whitelistUsernames = normalizeStoreWhitelistUsernames(body.whitelistUsernames || body.whitelist || []);
      const maintenanceEnabled = normalizeStoreBoolean(body.maintenanceEnabled ?? body.siteMaintenanceEnabled ?? body.maintenance, false);
      const paymentsEnabled = normalizeStoreBoolean(body.paymentsEnabled ?? body.storePaymentsEnabled ?? body.paymentEnabled, true);
      const maintenanceMessage = String(body.maintenanceMessage || body.siteMaintenanceMessage || '').trim();
      const maintenanceReason = String(body.maintenanceReason || '').trim();
      const maintenanceUntil = String(body.maintenanceUntil || '').trim();
      const orderViewerUsernames = normalizeStoreWhitelistUsernames(body.orderViewerUsernames || body.orderViewers || []);

      const nextSettings = {
        announcement,
        whitelistUsernames,
        maintenanceEnabled,
        paymentsEnabled,
        maintenanceMessage,
        maintenanceReason,
        maintenanceUntil,
        orderViewerUsernames
      };
      if (Object.prototype.hasOwnProperty.call(body, 'lotteryEnabled')) {
        nextSettings.lotteryEnabled = normalizeStoreBoolean(body.lotteryEnabled, false);
      }
      saveStorePublicSettings(nextSettings);

      sendJson(response, 200, {
        message: '���桢��������ά�������Ѹ���',
        ...getStorePublicSettings(),
        operator: session.username
      });
    })
    .catch((error) => {
      const statusCode = error.message === 'Invalid JSON' ? 400 : 413;
      sendJson(response, statusCode, { message: error.message });
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
      const imageUrl = sanitizeStoreProductImageUrl(body.imageUrl);
      const originalPriceFen = Number(body.originalPriceFen);
      const salePriceFen = Number(body.salePriceFen);
      const stock = body.stock === undefined ? 0 : Number(body.stock);
      const sortOrder = Number(body.sortOrder ?? 100);
      const isActive = body.isActive === false || body.isActive === 0 || body.isActive === '0' ? 0 : 1;
      const tags = sanitizeStoreTags(body.tags);

      if (!/^[A-Z0-9_-]{3,48}$/.test(productCode)) {
        sendJson(response, 400, { message: '��Ʒ�����֧�� 3-48 λ��д��ĸ�����֡��»��߻��л���' });
        return;
      }

      if (!name || name.length > 60) {
        sendJson(response, 400, { message: '��Ʒ���Ʋ���Ϊ�գ��Ҳ��ܳ��� 60 ���ַ�' });
        return;
      }

      if (!Number.isInteger(originalPriceFen) || originalPriceFen <= 0) {
        sendJson(response, 400, { message: 'ԭ�۱���Ϊ���� 0 ��������' });
        return;
      }

      if (!Number.isInteger(salePriceFen) || salePriceFen <= 0) {
        sendJson(response, 400, { message: '�Żݼ۱���Ϊ���� 0 ��������' });
        return;
      }

      if (salePriceFen > originalPriceFen) {
        sendJson(response, 400, { message: '�Żݼ۲��ܸ���ԭ��' });
        return;
      }

      if (!Number.isInteger(stock) || stock < 0) {
        sendJson(response, 400, { message: '������Ϊ���ڵ��� 0 ������' });
        return;
      }

      db.prepare(
        `INSERT INTO store_products (
          product_code, name, description, image_url, original_price_fen, sale_price_fen, stock,
          currency, is_active, sort_order, tags_json, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'CNY', ?, ?, ?, CURRENT_TIMESTAMP)`
      ).run(
        productCode,
        name,
        description,
        imageUrl,
        originalPriceFen,
        salePriceFen,
        stock,
        isActive,
        sortOrder,
        JSON.stringify(tags)
      );

      sendJson(response, 200, {
        message: '��Ʒ�����ɹ�',
        product: getStoreProductByCode(productCode, true)
      });
    })
    .catch((error) => {
      const message = String(error?.message || '������Ʒʧ��');
      if (message.includes('UNIQUE')) {
        sendJson(response, 409, { message: '��Ʒ�����Ѵ���' });
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
        sendJson(response, 404, { message: '��Ʒ������' });
        return;
      }

      const name = body.name === undefined ? existing.name : String(body.name || '').trim();
      const description = body.description === undefined ? existing.description : String(body.description || '').trim();
      const imageUrl = body.imageUrl === undefined ? String(existing.imageUrl || '') : sanitizeStoreProductImageUrl(body.imageUrl);
      const originalPriceFen = body.originalPriceFen === undefined ? existing.originalPriceFen : Number(body.originalPriceFen);
      const salePriceFen = body.salePriceFen === undefined ? existing.salePriceFen : Number(body.salePriceFen);
      const stock = body.stock === undefined ? existing.stock : Number(body.stock);
      const sortOrder = body.sortOrder === undefined ? existing.sortOrder : Number(body.sortOrder);
      const tags = body.tags === undefined ? existing.tags : sanitizeStoreTags(body.tags);

      if (!name || name.length > 60) {
        sendJson(response, 400, { message: '��Ʒ���Ʋ���Ϊ�գ��Ҳ��ܳ��� 60 ���ַ�' });
        return;
      }

      if (!Number.isInteger(originalPriceFen) || originalPriceFen <= 0) {
        sendJson(response, 400, { message: 'ԭ�۱���Ϊ���� 0 ��������' });
        return;
      }

      if (!Number.isInteger(salePriceFen) || salePriceFen <= 0) {
        sendJson(response, 400, { message: '�Żݼ۱���Ϊ���� 0 ��������' });
        return;
      }

      if (salePriceFen > originalPriceFen) {
        sendJson(response, 400, { message: '�Żݼ۲��ܸ���ԭ��' });
        return;
      }

      if (!Number.isInteger(stock) || stock < 0) {
        sendJson(response, 400, { message: '������Ϊ���ڵ��� 0 ������' });
        return;
      }

      db.prepare(
        `UPDATE store_products SET
          name = ?,
          description = ?,
          image_url = ?,
          original_price_fen = ?,
          sale_price_fen = ?,
          stock = ?,
          sort_order = ?,
          tags_json = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE product_code = ?`
      ).run(
        name,
        description,
        imageUrl,
        originalPriceFen,
        salePriceFen,
        stock,
        Number.isFinite(sortOrder) ? Math.round(sortOrder) : existing.sortOrder,
        JSON.stringify(tags),
        productCode
      );

      sendJson(response, 200, {
        message: '��Ʒ���³ɹ�',
        product: getStoreProductByCode(productCode, true)
      });
    })
    .catch((error) => {
      sendJson(response, 400, { message: error.message || '������Ʒʧ��' });
    });
}

function handleStoreProductImageUpload(request, response) {
  const session = requireCommunityDeveloper(request, response);

  if (!session) {
    return;
  }

  parseRequestBody(request)
    .then((body) => {
      const productCode = String(body.productCode || '').trim().toUpperCase();
      const imageData = String(body.imageData || '').trim();
      const existing = getStoreProductByCode(productCode, true);

      if (!existing) {
        sendJson(response, 404, { message: '��Ʒ������' });
        return;
      }

      if (!imageData) {
        sendJson(response, 400, { message: '���ṩͼƬ����' });
        return;
      }

      const imageUrl = saveStoreProductImageFromDataUrl(productCode, imageData);
      db.prepare('UPDATE store_products SET image_url = ?, updated_at = CURRENT_TIMESTAMP WHERE product_code = ?').run(imageUrl, productCode);

      sendJson(response, 200, {
        message: '��ƷͼƬ�ϴ��ɹ�',
        imageUrl,
        product: getStoreProductByCode(productCode, true)
      });
    })
    .catch((error) => {
      sendJson(response, 400, { message: error.message || '�ϴ���ƷͼƬʧ��' });
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
        sendJson(response, 404, { message: '��Ʒ������' });
        return;
      }

      db.prepare('UPDATE store_products SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE product_code = ?').run(
        nextActive ? 1 : 0,
        productCode
      );

      sendJson(response, 200, {
        message: nextActive ? '��Ʒ���ϼ�' : '��Ʒ���¼�',
        product: getStoreProductByCode(productCode, true)
      });
    })
    .catch((error) => {
      sendJson(response, 400, { message: error.message || '�л�״̬ʧ��' });
    });
}

function handleStoreProductsDelete(request, response) {
  const session = requireCommunityDeveloper(request, response);

  if (!session) {
    return;
  }

  parseRequestBody(request)
    .then((body) => {
      const productCode = String(body.productCode || '').trim().toUpperCase();
      const existing = getStoreProductByCode(productCode, true);

      if (!existing) {
        sendJson(response, 404, { message: '��Ʒ������' });
        return;
      }

      const cardRemoval = db.prepare('DELETE FROM store_card_secrets WHERE product_code = ?').run(productCode);
      const productRemoval = db.prepare('DELETE FROM store_products WHERE product_code = ?').run(productCode);
      deleteStoreProductImageFiles(productCode);

      sendJson(response, 200, {
        message: `��Ʒ ${productCode} �ѱ�ɾ��`,
        productCode,
        deleted: Number(productRemoval.changes || 0),
        cardSecretCount: Number(cardRemoval.changes || 0)
      });
    })
    .catch((error) => {
      sendJson(response, 400, { message: error.message || 'ɾ��ʧ��' });
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
  return ['SUCCESS', 'TRADE_SUCCESS', 'PAID', 'PAY_SUCCESS', 'PAYED', 'SUCCESSFUL', 'DONE', '1', 'TRUE', 'Y', 'YES', 'COMPLETED', 'OK'].includes(normalized);
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
    'trade_state',
    'tradeState',
    'result.status',
    'result.tradeStatus',
    'result.trade_status',
    'data.status',
    'data.status',
    'data.tradeStatus',
    'data.trade_status',
    'data.trade_state',
    'data.tradeState',
    'data.payStatus',
    'data.pay_status',
    'data.result.status',
    'data.result.tradeStatus',
    'data.result.trade_status',
    'data.result.trade_state'
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

function normalizeStorePaymentMethod(method, fallback = 'wechat') {
  const normalized = String(method || fallback || '').trim().toLowerCase();
  if (normalized === 'alipay' || normalized === 'ali' || normalized === 'zfb' || normalized === 'alipay_hk' || normalized === 'alipayhk' || normalized === 'hk' || normalized === 'hongkong') {
    return 'alipay';
  }
  if (normalized === 'wechat_backup' || normalized === 'wechat-backup' || normalized === 'backupwechat' || normalized === 'backup-wechat') {
    return 'wechat_backup';
  }
  return 'wechat';
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
  const cardSecretReady = String(order.cardSecret || '').trim();
  if (currentStatus === 'SUCCESS' || currentStatus === 'TRADE_SUCCESS') {
    if (!cardSecretReady && String(order.productCode || '').trim().toUpperCase() !== lotteryDrawProductCode) {
      const generated = ensureStoreOrderCardSecret(order.orderNo, String(order.productCode || '').trim().toUpperCase());
      if (generated) {
        return true;
      }
    }
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
    pickFirstDefined(parsed, [
      'paid',
      'isPaid',
      'success',
      'tradeSuccess',
      'status',
      'tradeStatus',
      'trade_status',
      'payStatus',
      'pay_status',
      'result.status',
      'result.tradeStatus',
      'result.trade_status',
      'result.payStatus',
      'result.pay_status',
      'data.status',
      'data.tradeStatus',
      'data.trade_status',
      'data.payStatus',
      'data.pay_status',
      'data.result.status',
      'data.result.tradeStatus',
      'data.result.trade_status',
      'data.result.payStatus',
      'data.result.pay_status'
    ])
  );

  if (!paid) {
    return false;
  }

  const rawNextStatus = extractPaymentStatus(parsed, 'SUCCESS') || 'SUCCESS';
  const nextStatus = normalizePaymentSuccess(rawNextStatus) ? 'SUCCESS' : rawNextStatus;
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
    'SELECT order_no AS orderNo, product_code AS productCode, product_name AS productName, amount_fen AS amountFen, currency, status, payment_method AS paymentMethod, contact, buyer_note AS buyerNote, quantity, buyer_username AS buyerUsername, coupon_code AS couponCode, coupon_discount_fen AS couponDiscountFen, card_secret AS cardSecret, mch_id AS mchId, app_id AS appId, code_url AS codeUrl, wechat_prepay_id AS prepayId, wechat_transaction_id AS transactionId, request_json AS requestJson, response_json AS responseJson, notify_json AS notifyJson, created_at AS createdAt, updated_at AS updatedAt FROM store_orders WHERE order_no = ?'
  ).get(orderNo) || null;
}

function generateStoreCardSecretCode(productCode = '', fallbackPrefix = 'MC') {
  const productSegment = String(productCode || '').trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 4);
  const prefix = productSegment ? `${fallbackPrefix}-${productSegment}` : fallbackPrefix;
  const randomPart = crypto.randomBytes(3).toString('hex').toUpperCase();
  const suffix = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `${prefix}-${randomPart}-${suffix}`;
}

function listStoreCardSecrets(productCode = '') {
  const normalizedProductCode = String(productCode || '').trim().toUpperCase();
  const rows = normalizedProductCode
    ? db.prepare(
        `SELECT id, product_code AS productCode, secret_code AS secretCode, label, is_used AS isUsed, used_order_no AS usedOrderNo,
          created_at AS createdAt, updated_at AS updatedAt
         FROM store_card_secrets WHERE product_code = ? ORDER BY id DESC`
      ).all(normalizedProductCode)
    : db.prepare(
        `SELECT id, product_code AS productCode, secret_code AS secretCode, label, is_used AS isUsed, used_order_no AS usedOrderNo,
          created_at AS createdAt, updated_at AS updatedAt
         FROM store_card_secrets ORDER BY id DESC`
      ).all();

  return rows.map((row) => ({
    id: Number(row.id || 0),
    productCode: String(row.productCode || ''),
    secretCode: String(row.secretCode || ''),
    label: String(row.label || ''),
    isUsed: Boolean(Number(row.isUsed || 0)),
    usedOrderNo: String(row.usedOrderNo || ''),
    createdAt: String(row.createdAt || ''),
    updatedAt: String(row.updatedAt || '')
  }));
}

function getNextAvailableStoreCardSecret(productCode = '') {
  const normalizedProductCode = String(productCode || '').trim().toUpperCase();
  const row = normalizedProductCode
    ? db.prepare(
        `SELECT secret_code AS secretCode FROM store_card_secrets
         WHERE product_code = ? AND is_used = 0
         ORDER BY id ASC LIMIT 1`
      ).get(normalizedProductCode)
    : db.prepare(
        `SELECT secret_code AS secretCode FROM store_card_secrets
         WHERE is_used = 0
         ORDER BY id ASC LIMIT 1`
      ).get();

  return row ? String(row.secretCode || '').trim() : '';
}

function allocateStoreCardSecret(orderNo, productCode = '') {
  const normalizedOrderNo = String(orderNo || '').trim().toUpperCase();
  const normalizedProductCode = String(productCode || '').trim().toUpperCase();
  const candidate = getNextAvailableStoreCardSecret(normalizedProductCode);

  if (candidate) {
    const updated = db.prepare(
      `UPDATE store_card_secrets
       SET is_used = 1,
           used_order_no = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE secret_code = ? AND is_used = 0`
    ).run(normalizedOrderNo, candidate);

    if (updated.changes > 0) {
      return candidate;
    }
  }

  return generateStoreCardSecretCode(normalizedProductCode, 'MC');
}

function createStoreCardSecret(orderNo, productCode = '') {
  return allocateStoreCardSecret(orderNo, productCode);
}

function ensureStoreOrderCardSecret(orderNo, productCode = '') {
  const order = getStoreOrderByNo(orderNo);

  if (!order) {
    return '';
  }

  if (String(order.cardSecret || '').trim()) {
    return String(order.cardSecret).trim();
  }

  const cardSecret = createStoreCardSecret(orderNo, productCode || order.productCode || '');
  db.prepare('UPDATE store_orders SET card_secret = ?, updated_at = CURRENT_TIMESTAMP WHERE order_no = ?').run(cardSecret, orderNo);
  return cardSecret;
}

function createStoreOrder(record) {
  const realizedProductCode = String(record.productCode || '').trim().toUpperCase();
  const cardSecret = realizedProductCode !== lotteryDrawProductCode && normalizePaymentSuccess(record.status) && !String(record.cardSecret || '').trim()
    ? createStoreCardSecret(record.orderNo, realizedProductCode)
    : String(record.cardSecret || '').trim();

  db.prepare(
    `INSERT INTO store_orders (
      order_no, product_code, product_name, amount_fen, currency, status, payment_method, contact, buyer_note, quantity, buyer_username, coupon_code, coupon_discount_fen,
      card_secret, mch_id, app_id, code_url, wechat_prepay_id, wechat_transaction_id,
      request_json, response_json, notify_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    record.orderNo,
    record.productCode,
    record.productName,
    record.amountFen,
    record.currency,
    record.status,
    record.paymentMethod || '',
    record.contact || '',
    record.buyerNote || '',
    Math.max(1, Math.min(99, Number.parseInt(String(record.quantity || '1'), 10) || 1)),
    record.buyerUsername || '',
    record.couponCode || '',
    Math.max(0, Number(record.couponDiscountFen) || 0),
    cardSecret,
    record.mchId || '',
    record.appId || '',
    record.codeUrl || '',
    record.prepayId || '',
    record.transactionId || '',
    record.requestJson || '',
    record.responseJson || '',
    record.notifyJson || ''
  );

  if (normalizePaymentSuccess(record.status) && realizedProductCode !== lotteryDrawProductCode) {
    ensureStoreOrderCardSecret(record.orderNo);
    grantStoreEntitlementForPaidOrder(getStoreOrderByNo(record.orderNo));
  }
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

  const nextStatus = nextOrder.status || current.status;
  const nextPaymentMethod = nextOrder.paymentMethod || current.paymentMethod || '';
  const nextContact = nextOrder.contact || current.contact || '';
  const nextBuyerNote = nextOrder.buyerNote || current.buyerNote || '';
  const nextQuantity = Math.max(1, Math.min(99, Number.parseInt(String(nextOrder.quantity ?? current.quantity ?? '1'), 10) || 1));
  const nextProductCode = String(nextOrder.productCode || current.productCode || '').trim().toUpperCase();
  const nextCardSecret = nextProductCode !== lotteryDrawProductCode && normalizePaymentSuccess(nextStatus) && !String(nextOrder.cardSecret || '').trim()
    ? ensureStoreOrderCardSecret(orderNo, nextProductCode)
    : (nextOrder.cardSecret || current.cardSecret || '');
  const nextCodeUrl = nextOrder.codeUrl || current.codeUrl || '';
  const nextPrepayId = nextOrder.prepayId || current.prepayId || '';
  const nextTransactionId = nextOrder.transactionId || current.transactionId || '';
  const nextResponseJson = nextOrder.responseJson || current.responseJson || '';
  const nextNotifyJson = nextOrder.notifyJson || current.notifyJson || '';

  db.prepare(
    `UPDATE store_orders SET
      status = ?,
      payment_method = ?,
      contact = ?,
      buyer_note = ?,
      quantity = ?,
      card_secret = ?,
      code_url = ?,
      wechat_prepay_id = ?,
      wechat_transaction_id = ?,
      response_json = ?,
      notify_json = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE order_no = ?`
  ).run(
    nextStatus,
    nextPaymentMethod,
    nextContact,
    nextBuyerNote,
    nextQuantity,
    nextCardSecret,
    nextCodeUrl,
    nextPrepayId,
    nextTransactionId,
    nextResponseJson,
    nextNotifyJson,
    orderNo
  );

  const reloadedOrder = getStoreOrderByNo(orderNo);

  if (reloadedOrder && String(reloadedOrder.productCode || '').trim().toUpperCase() !== lotteryDrawProductCode && normalizePaymentSuccess(reloadedOrder.status) && !String(reloadedOrder.cardSecret || '').trim()) {
    ensureStoreOrderCardSecret(orderNo, String(reloadedOrder.productCode || '').trim().toUpperCase());
  }

  grantStoreEntitlementForPaidOrder(reloadedOrder);

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
    const normalizedPaymentMethod = normalizeStorePaymentMethod(body.paymentMethod, 'wechat');

    if (normalizedPaymentMethod === 'wechat_backup') {
      const backupConfig = getWechatBackupPayConfig();
      if (!backupConfig.createUrl || !backupConfig.merchantId || !backupConfig.apiKey) {
        sendJson(response, 500, { message: '备用微信支付未配置，请先补充备用支付地址、商户 ID 和密钥。' });
        return;
      }
      const backupBody = { ...body, paymentMethod: 'wechat_backup' };
      await createHongxingNativeOrder(request, backupBody, response);
      return;
    }

    const hongxingReadiness = getHongxingPayReadiness();
    if (hongxingReadiness.ready) {
      await createHongxingNativeOrder(request, body, response);
      return;
    }

    const config = getWechatPayConfig();
    const productCode = String(body.productCode || '').trim().toUpperCase();
    const product = getStoreProductByCode(productCode, false);
    const buyerSession = getCommunitySessionFromRequest(request);
    const quantity = Math.max(1, Math.min(99, Number.parseInt(String(body.quantity || '1'), 10) || 1));
    const lotteryCheckoutError = validateLotteryCheckout(productCode, buyerSession, body);

    if (lotteryCheckoutError) {
      sendJson(response, lotteryCheckoutError.status, { message: lotteryCheckoutError.message });
      return;
    }

    if (!config.appId || !config.mchId || !config.serialNo || !config.apiV3Key || !config.notifyUrl || !config.privateKeyPem) {
      sendJson(response, 500, {
        message: '΢��֧�����ò��������벹ȫ appId��mchId��serialNo��privateKey��apiV3Key �� notifyUrl'
      });
      return;
    }

    if (!product) {
      sendJson(response, 404, { message: '��Ʒ�����ڻ����¼�' });
      return;
    }

    if (['LVIP-30', 'VIP-45', 'SVIP-15'].includes(productCode) && !buyerSession) {
      sendJson(response, 401, { message: '购买会员折扣权益前请先登录账号。' });
      return;
    }

    if (Number(product.stock || 0) < quantity) {
      sendJson(response, 400, { message: '当前库存不足，当前可购买数量为 ' + Number(product.stock || 0) + '。' });
      return;
    }

    const couponCode = String(body.couponCode || '').trim().toUpperCase();
    const pricing = calculateStoreOrderPricing(product, quantity, buyerSession?.username, couponCode);
    if (pricing.error) {
      sendJson(response, 400, { message: pricing.error });
      return;
    }

    const orderNo = createStoreOrderNo();
    const amountFen = pricing.amountFen;
    const productName = String(product.name || '').trim();
    const paymentMethod = normalizeStorePaymentMethod(body.paymentMethod, config.payType);
    const contact = String(body.contact || '').trim();
    const buyerNote = String(body.buyerNote || '').trim();

    if (!Number.isFinite(amountFen) || amountFen <= 0) {
      sendJson(response, 400, { message: '���������Ч' });
      return;
    }

    if (paymentMethod === 'alipay') {
      sendJson(response, 400, { message: '当前微信支付通道不支持支付宝支付，请选择微信或 QQ 支付。' });
      return;
    }

    const orderBody = {
      appid: config.appId,
      mchid: config.mchId,
      description: `${productName} �� �ٷ��̵궩��`,
      out_trade_no: orderNo,
      notify_url: config.notifyUrl,
      amount: {
        total: amountFen,
        currency: product.currency || 'CNY'
      },
      attach: JSON.stringify({
        productCode,
        productName,
        paymentMethod,
        contact,
        buyerNote,
        quantity,
        couponCode: pricing.couponCode,
        couponDiscountFen: pricing.couponDiscountFen
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
        message: '΢��֧���µ�ʧ��',
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
        message: '΢��֧��δ���� code_url',
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
      paymentMethod,
      contact,
      buyerNote,
      quantity,
      buyerUsername: buyerSession?.username || '',
      couponCode: pricing.couponCode,
      couponDiscountFen: pricing.couponDiscountFen,
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
      message: '΢��֧�������Ѵ���',
      orderNo,
      productCode,
      productName,
      amountFen,
      subtotalFen: pricing.subtotalFen,
      couponCode: pricing.couponCode,
      couponDiscountFen: pricing.couponDiscountFen,
      currency: product.currency || 'CNY',
      paymentMethod,
      contact,
      buyerNote,
      quantity,
      codeUrl,
      qrDataUrl,
      prepayId: parsedResponse.prepay_id || ''
    });
  } catch (error) {
    sendJson(response, 500, {
      message: error.message || '����΢��֧������ʧ��'
    });
  }
}

function buildHongxingReturnPageUrl(request, orderNo, productCode = '') {
  const host = String(request?.headers?.host || '').trim();

  if (!host) {
    return '';
  }

  const lotteryOrder = String(productCode || '').trim().toUpperCase() === lotteryDrawProductCode;
  const url = new URL(`http://${host}/${lotteryOrder ? 'lottery.html' : 'store.html'}`);
  url.searchParams.set(lotteryOrder ? 'lotteryOrderNo' : 'hongxingOrderNo', orderNo);
  return url.toString();
}

async function createHongxingNativeOrder(request, body, response) {
  const config = getHongxingPayConfig();
  const normalizedPaymentMethod = normalizeStorePaymentMethod(body?.paymentMethod, config.payType);

  if (normalizedPaymentMethod === 'wechat_backup') {
    const backupConfig = getWechatBackupPayConfig();
    if (backupConfig.createUrl && backupConfig.merchantId && backupConfig.apiKey) {
      config.createUrl = backupConfig.createUrl;
      config.queryUrl = backupConfig.queryUrl || backupConfig.createUrl;
      config.merchantId = backupConfig.merchantId;
      config.apiKey = backupConfig.apiKey;
      config.payType = 'wxpay';
      config.signType = 'MD5';
      config.notifyUrl = backupConfig.notifyUrl || config.notifyUrl;
      config.returnUrl = backupConfig.returnUrl || config.returnUrl;
      config.createMethod = backupConfig.createMethod;
      config.queryMethod = backupConfig.queryMethod;
    }
  }

  if (!config.createUrl) {
    sendJson(response, 500, {
      message: '����֧�����ò��������벹ȫ createUrl'
    });
    return;
  }

  const productCode = String(body?.productCode || '').trim().toUpperCase();
  const product = getStoreProductByCode(productCode, false);
  const buyerSession = getCommunitySessionFromRequest(request);
  const quantity = Math.max(1, Math.min(99, Number.parseInt(String(body?.quantity || '1'), 10) || 1));
  const lotteryCheckoutError = validateLotteryCheckout(productCode, buyerSession, body);

  if (lotteryCheckoutError) {
    sendJson(response, lotteryCheckoutError.status, { message: lotteryCheckoutError.message });
    return;
  }

  if (!product) {
    sendJson(response, 404, { message: '��Ʒ�����ڻ����¼�' });
    return;
  }

  if (['LVIP-30', 'VIP-45', 'SVIP-15'].includes(productCode) && !buyerSession) {
    sendJson(response, 401, { message: '购买会员折扣权益前请先登录账号。' });
    return;
  }

  if (Number(product.stock || 0) < quantity) {
    sendJson(response, 400, { message: '当前库存不足，当前可购买数量为 ' + Number(product.stock || 0) + '。' });
    return;
  }

  const couponCode = String(body?.couponCode || '').trim().toUpperCase();
  const pricing = calculateStoreOrderPricing(product, quantity, buyerSession?.username, couponCode);
  if (pricing.error) {
    sendJson(response, 400, { message: pricing.error });
    return;
  }

  const orderNo = createStoreOrderNo();
  const amountFen = pricing.amountFen;
  const productName = String(product.name || '').trim();
  const paymentMethod = normalizeStorePaymentMethod(body?.paymentMethod, config.payType);
  const contact = String(body?.contact || '').trim();
  const buyerNote = String(body?.buyerNote || '').trim();

  if (!Number.isFinite(amountFen) || amountFen <= 0) {
    sendJson(response, 400, { message: '���������Ч' });
    return;
  }

  if (isRootPathUrl(config.createUrl)) {
    if (!config.merchantId || !config.apiKey) {
      sendJson(response, 500, { message: '����ֱ��ģʽȱ�� merchantId �� apiKey' });
      return;
    }

    const baseUrl = new URL(String(config.createUrl));
    const returnUrl = String(config.returnUrl || buildHongxingReturnPageUrl(request, orderNo, productCode) || `${baseUrl.protocol}//${baseUrl.host}/index/payTest`).trim();
    const notifyUrl = String(config.notifyUrl || `${baseUrl.protocol}//${baseUrl.host}/Payment/UserRechargeNotify?out_trade_no=${encodeURIComponent(orderNo)}`).trim();
    const payUrl = buildHongxingSubmitPayUrl({
      pid: String(config.merchantId),
      type: paymentMethod === 'alipay' ? 'alipay' : paymentMethod === 'qq' ? 'qq' : paymentMethod === 'alipay_hk' ? 'alipay_hk' : 'wxpay',
      outTradeNo: orderNo,
      notifyUrl,
      returnUrl,
      name: productName || '�̵궩��',
      money: (amountFen / 100).toFixed(2),
      couponCode: pricing.couponCode,
      couponDiscountFen: pricing.couponDiscountFen,
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
      paymentMethod,
      contact,
      buyerNote,
      quantity,
      buyerUsername: buyerSession?.username || '',
      couponCode: pricing.couponCode,
      couponDiscountFen: pricing.couponDiscountFen,
      status: 'PENDING',
      cardSecret: '',
      mchId: String(config.merchantId),
      appId: 'hongxing',
      codeUrl: payUrl,
      prepayId: '',
      transactionId: '',
      requestJson: JSON.stringify({
        mode: 'hongxing-direct-submit',
        payType: paymentMethod,
        signType: config.signType,
        notifyUrl,
        returnUrl,
        contact,
        couponCode: pricing.couponCode,
        couponDiscountFen: pricing.couponDiscountFen
      }),
      responseJson: JSON.stringify({ payUrl }),
      notifyJson: ''
    });

    sendJson(response, 200, {
      message: '����֧�������Ѵ���',
      provider: 'hongxing',
      orderNo,
      productCode,
      productName,
      amountFen,
      subtotalFen: pricing.subtotalFen,
      couponCode: pricing.couponCode,
      couponDiscountFen: pricing.couponDiscountFen,
      currency: product.currency || 'CNY',
      paymentMethod,
      contact,
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
    paymentMethod: normalizeStorePaymentMethod(body.paymentMethod, config.payType),
    contact: String(body.contact || '').trim(),
    couponCode: pricing.couponCode,
    couponDiscountFen: pricing.couponDiscountFen,
      buyerNote,
    attach: {
      productCode,
      productName,
      paymentMethod: normalizeStorePaymentMethod(body.paymentMethod, config.payType),
      contact: String(body.contact || '').trim(),
      buyerNote,
      quantity,
      couponCode: pricing.couponCode,
      couponDiscountFen: pricing.couponDiscountFen
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
      message: '����֧���µ�ʧ��',
      statusCode: hongxingResponse.statusCode,
      detail: hongxingResponse.body || ''
    });
    return;
  }

  const parsedResponse = parseMaybeJson(hongxingResponse.body);
  const initialPaidFlag = pickFirstDefined(parsedResponse, [
    'paid',
    'isPaid',
    'success',
    'tradeSuccess',
    'status',
    'tradeStatus',
    'trade_status',
    'payStatus',
    'pay_status',
    'result.status',
    'result.tradeStatus',
    'result.trade_status',
    'result.payStatus',
    'result.pay_status',
    'data.status',
    'data.tradeStatus',
    'data.trade_status',
    'data.payStatus',
    'data.pay_status',
    'data.result.status',
    'data.result.tradeStatus',
    'data.result.trade_status',
    'data.result.payStatus',
    'data.result.pay_status'
  ]);
  const qrText = extractPaymentQrText(parsedResponse);

  if (!qrText) {
    sendJson(response, 502, {
      message: '����֧��δ���ض�ά���ַ',
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
    paymentMethod: normalizeStorePaymentMethod(payload.paymentMethod, config.payType),
    contact: String(payload.contact || '').trim(),
    buyerNote: String(payload.buyerNote || '').trim(),
    quantity,
    buyerUsername: buyerSession?.username || '',
    couponCode: pricing.couponCode,
    couponDiscountFen: pricing.couponDiscountFen,
    status: normalizePaymentSuccess(initialPaidFlag) ? 'SUCCESS' : 'PENDING',
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
    message: '����֧�������Ѵ���',
    provider: 'hongxing',
    orderNo,
    productCode,
    productName,
    amountFen,
    subtotalFen: pricing.subtotalFen,
    couponCode: pricing.couponCode,
    couponDiscountFen: pricing.couponDiscountFen,
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
    sendJson(response, 400, { message: 'ȱ�ٶ�����' });
    return;
  }

  let order = getStoreOrderByNo(orderNo);

  if (!order) {
    sendJson(response, 404, { message: '����������' });
    return;
  }

  try {
    await trySyncStoreOrderFromHongxing(order);
    order = getStoreOrderByNo(orderNo) || order;
  } catch {
    // Keep order-status endpoint resilient even if Hongxing query fails.
  }

  const status = String(order.status || '').toUpperCase();
  const paid = normalizePaymentSuccess(status);
  const cardSecret = paid && String(order.productCode || '').trim().toUpperCase() !== lotteryDrawProductCode
    ? ensureStoreOrderCardSecret(orderNo)
    : '';

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

function listStoreOrdersAdmin(filters = {}) {
  const safeLimit = Math.max(1, Math.min(5000, Number(filters.limit) || 50));
  const conditions = [];
  const params = [];

  if (filters.status && filters.status !== 'ALL') {
    conditions.push('UPPER(status) = ?');
    params.push(String(filters.status).trim().toUpperCase());
  }

  if (filters.paymentMethod && filters.paymentMethod !== 'all') {
    conditions.push('LOWER(payment_method) = ?');
    params.push(String(filters.paymentMethod).trim().toLowerCase());
  }

  if (filters.query) {
    const keyword = `%${String(filters.query).trim()}%`;
    conditions.push('(order_no LIKE ? OR product_code LIKE ? OR product_name LIKE ? OR contact LIKE ? OR buyer_note LIKE ? OR card_secret LIKE ?)');
    params.push(keyword, keyword, keyword, keyword, keyword, keyword);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  params.push(safeLimit);

  return db.prepare(
    `SELECT order_no AS orderNo, product_code AS productCode, product_name AS productName, amount_fen AS amountFen, currency, status, payment_method AS paymentMethod, contact, buyer_note AS buyerNote, quantity, coupon_code AS couponCode, coupon_discount_fen AS couponDiscountFen, card_secret AS cardSecret, mch_id AS mchId, app_id AS appId, code_url AS codeUrl, wechat_prepay_id AS prepayId, wechat_transaction_id AS transactionId, created_at AS createdAt, updated_at AS updatedAt
     FROM store_orders
     ${whereClause}
     ORDER BY id DESC
     LIMIT ?`
  ).all(...params);
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
    response.end(JSON.stringify({ code: 'SUCCESS', message: '�ɹ�' }));
  } catch (error) {
    response.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    response.end(JSON.stringify({ code: 'SUCCESS', message: error.message || '�ɹ�' }));
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

function setSessionCookie(response, sessionToken, lifetimeMs = sessionLifetimeMs) {
  response.setHeader('Set-Cookie', [
    `mctools_session=${encodeURIComponent(sessionToken)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${Math.floor(lifetimeMs / 1000)}`
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

function createSession(username, lifetimeMs = sessionLifetimeMs) {
  const sessionToken = crypto.randomBytes(32).toString('hex');
  const session = {
    username,
    expiresAt: Date.now() + lifetimeMs
  };
  sessions.set(sessionToken, session);
  persistAuthSession(sessionToken, sessionScopePublic, session);
  return sessionToken;
}

function persistAuthSession(token, scope, session) {
  db.prepare(
    `INSERT INTO auth_sessions (token, scope, username, email, is_developer, expires_at, last_seen_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(token) DO UPDATE SET
       scope = excluded.scope,
       username = excluded.username,
       email = excluded.email,
       is_developer = excluded.is_developer,
       expires_at = excluded.expires_at,
       last_seen_at = excluded.last_seen_at`
  ).run(
    String(token || '').trim(),
    String(scope || '').trim() || sessionScopePublic,
    String(session?.username || '').trim(),
    String(session?.email || '').trim(),
    session?.isDeveloper ? 1 : 0,
    Number(session?.expiresAt || 0),
    Number(session?.lastSeenAt || Date.now())
  );
}

function loadAuthSession(token, scope) {
  const normalizedToken = String(token || '').trim();
  const normalizedScope = String(scope || '').trim();

  if (!normalizedToken || !normalizedScope) {
    return null;
  }

  const row = db.prepare(
    `SELECT token, scope, username, email, is_developer AS isDeveloper, expires_at AS expiresAt, last_seen_at AS lastSeenAt
     FROM auth_sessions
     WHERE token = ? AND scope = ?`
  ).get(normalizedToken, normalizedScope);

  if (!row) {
    return null;
  }

  const expiresAt = Number(row.expiresAt || 0);
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
    db.prepare('DELETE FROM auth_sessions WHERE token = ?').run(normalizedToken);
    return null;
  }

  return {
    username: String(row.username || '').trim(),
    email: String(row.email || '').trim(),
    isDeveloper: Boolean(row.isDeveloper),
    expiresAt,
    lastSeenAt: Number(row.lastSeenAt || Date.now())
  };
}

function deleteAuthSession(token) {
  const normalizedToken = String(token || '').trim();
  if (!normalizedToken) {
    return;
  }
  db.prepare('DELETE FROM auth_sessions WHERE token = ?').run(normalizedToken);
}

function cleanupExpiredAuthSessions() {
  db.prepare('DELETE FROM auth_sessions WHERE expires_at <= ?').run(Date.now());
}

function cleanupExpiredSessions() {
  const now = Date.now();

  cleanupExpiredAuthSessions();

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

function touchSiteOnlineVisitor(request, pathnameOverride = '') {
  cleanupExpiredSiteOnlineVisitors();

  const visitorKey = resolveSiteVisitorKey(request);
  siteOnlineVisitors.set(visitorKey, {
    lastSeenAt: Date.now(),
    pathname: String(pathnameOverride || getPathname(request.url || '/')).trim() || '/',
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

function getCommunityOnlineLeaderboard() {
  cleanupExpiredCommunityCodes();
  const now = Date.now();
  const latestByUsername = new Map();

  for (const [token, session] of communitySessions.entries()) {
    if (!session || session.expiresAt <= now) {
      continue;
    }

    const username = String(session.username || '').trim();
    if (!username) {
      continue;
    }

    const account = getCommunityAccountByEmail(String(session.email || '').trim().toLowerCase());
    if (account?.hideOnlineStatus) {
      continue;
    }

    const lastSeenAt = Number(session.lastSeenAt || 0) || session.expiresAt - communitySessionLifetimeMs;
    const existing = latestByUsername.get(username);
    if (!existing || lastSeenAt > existing.lastSeenAt || (lastSeenAt === existing.lastSeenAt && token.localeCompare(existing.token) > 0)) {
      latestByUsername.set(username, {
        token,
        username,
        email: String(session.email || '').trim().toLowerCase(),
        isDeveloper: Boolean(session.isDeveloper),
        lastSeenAt,
        expiresAt: Number(session.expiresAt || 0)
      });
    }
  }

  return Array.from(latestByUsername.values())
    .sort((left, right) => right.lastSeenAt - left.lastSeenAt || left.username.localeCompare(right.username, 'zh-CN'))
    .slice(0, 8)
    .map((entry, index) => ({
      rank: index + 1,
      username: entry.username,
      email: entry.email,
      isDeveloper: entry.isDeveloper,
      activeSeconds: Math.max(1, Math.round((now - entry.lastSeenAt) / 1000)),
      lastSeenAt: new Date(entry.lastSeenAt).toISOString(),
      expiresAt: new Date(entry.expiresAt).toISOString()
    }));
}

function getSiteOnlinePageLabel(pathname) {
  const normalizedPath = String(pathname || '/').trim() || '/';

  if (normalizedPath === '/' || normalizedPath === '/index.html') {
    return '��ҳ';
  }

  if (normalizedPath === '/store.html') {
    return '�̵�ҳ';
  }

  if (normalizedPath === '/store-admin.html') {
    return 'Ȩ�޺�̨';
  }

  if (normalizedPath === '/server-hub.html') {
    return '����������';
  }

  const baseName = path.basename(normalizedPath, path.extname(normalizedPath));
  return baseName ? baseName.replace(/[-_]/g, ' ') : normalizedPath;
}

function getSiteOnlineLeaderboard() {
  cleanupExpiredSiteOnlineVisitors();
  const now = Date.now();

  return Array.from(siteOnlineVisitors.entries())
    .map(([visitorKey, visitor]) => ({
      visitorKey,
      pathname: String(visitor?.pathname || '/').trim() || '/',
      userAgent: String(visitor?.userAgent || '').trim(),
      lastSeenAt: Number(visitor?.lastSeenAt || 0)
    }))
    .filter((entry) => entry.lastSeenAt > 0)
    .sort((left, right) => right.lastSeenAt - left.lastSeenAt || left.visitorKey.localeCompare(right.visitorKey))
    .slice(0, 8)
    .map((entry, index) => ({
      rank: index + 1,
      label: getSiteOnlinePageLabel(entry.pathname),
      pathname: entry.pathname,
      activeSeconds: Math.max(1, Math.round((now - entry.lastSeenAt) / 1000)),
      lastSeenAt: new Date(entry.lastSeenAt).toISOString(),
      visitorHint: entry.visitorKey.slice(-6).toUpperCase()
    }));
}

async function handleSiteOnlinePing(request, response) {
  let pathname = '';

  try {
    const body = await parseRequestBody(request);
    pathname = String(body?.pathname || '').trim();
  } catch {
    pathname = '';
  }

  touchSiteOnlineVisitor(request, pathname);

  sendJson(response, 200, {
    success: true,
    online: siteOnlineVisitors.size,
    todayVisits: getTodaySiteVisitCount(),
    ttlSeconds: Math.round(siteOnlineVisitorLifetimeMs / 1000)
  });
}

function handleSiteOnlineStats(request, response) {
  sendJson(response, 200, {
    online: siteOnlineVisitors.size,
    todayVisits: getTodaySiteVisitCount(),
    watchedAccounts: getWatchedCommunityAccountStatuses(),
    onlineAccounts: getCommunityOnlineLeaderboard(),
    onlineLeaderboard: getCommunityOnlineLeaderboard(),
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

function cleanupExpiredCommunityQrLoginTickets() {
  const now = Date.now();

  for (const [ticketToken, ticket] of communityQrLoginTickets.entries()) {
    if (ticket.expiresAt <= now) {
      communityQrLoginTickets.delete(ticketToken);
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

function issueCommunityQrLoginTicket() {
  cleanupExpiredCommunityQrLoginTickets();
  const ticketToken = crypto.randomBytes(24).toString('hex');
  communityQrLoginTickets.set(ticketToken, {
    status: 'pending',
    username: '',
    email: '',
    isDeveloper: false,
    createdAt: Date.now(),
    expiresAt: Date.now() + communityQrLoginTicketLifetimeMs
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

function getCommunityQrLoginTicket(ticketToken) {
  cleanupExpiredCommunityQrLoginTickets();
  const normalizedToken = String(ticketToken || '').trim();

  if (!normalizedToken) {
    return null;
  }

  const ticket = communityQrLoginTickets.get(normalizedToken);

  if (!ticket) {
    return null;
  }

  if (ticket.expiresAt <= Date.now()) {
    communityQrLoginTickets.delete(normalizedToken);
    return null;
  }

  return { token: normalizedToken, ...ticket };
}

function updateQrLoginTicket(ticketToken, nextTicket) {
  qrLoginTickets.set(ticketToken, nextTicket);
}

function updateCommunityQrLoginTicket(ticketToken, nextTicket) {
  communityQrLoginTickets.set(ticketToken, nextTicket);
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
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 44" width="140" height="44" role="img" aria-label="��¼��֤��">
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
    return { ok: false, message: '��֤���ѹ��ڣ���ˢ�º�����' };
  }

  const normalizedCode = String(captchaCode || '').trim().toUpperCase();

  if (!normalizedCode) {
    return { ok: false, message: '��������֤��' };
  }

  if (normalizedCode !== captcha.answer) {
    return { ok: false, message: '��֤���������������' };
  }

  return { ok: true };
}

function getSessionFromRequest(request) {
  const cookies = parseCookies(request.headers.cookie);
  const sessionToken = cookies.mctools_session;

  if (!sessionToken) {
    return null;
  }

  let session = sessions.get(sessionToken);

  if (!session) {
    const storedSession = loadAuthSession(sessionToken, sessionScopePublic);
    if (!storedSession) {
      return null;
    }
    session = {
      username: storedSession.username,
      expiresAt: storedSession.expiresAt
    };
    sessions.set(sessionToken, session);
  }

  if (session.expiresAt <= Date.now()) {
    sessions.delete(sessionToken);
    deleteAuthSession(sessionToken);
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

// ���� Plaza ������֤ ��������������������������������������������������������������������������������������������������������������������

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
    if (session.expiresAt <= now) {
      communitySessions.delete(token);
      deleteAuthSession(token);
    }
  }
}

function getCommunityAccountByUsername(username) {
  return db.prepare('SELECT id, username, email, is_developer AS isDeveloper, hide_online_status AS hideOnlineStatus, store_discount_tier AS storeDiscountTier, created_at AS createdAt, last_login_at AS lastLoginAt FROM community_accounts WHERE username = ?').get(username) || null;
}

function getCommunityAccountByEmail(email) {
  return db.prepare('SELECT id, username, email, is_developer AS isDeveloper, hide_online_status AS hideOnlineStatus, store_discount_tier AS storeDiscountTier, created_at AS createdAt, last_login_at AS lastLoginAt FROM community_accounts WHERE email = ?').get(email) || null;
}

function getCommunityAccountAuthByUsername(username) {
  return db.prepare('SELECT id, username, email, password_hash AS passwordHash, is_developer AS isDeveloper, hide_online_status AS hideOnlineStatus, created_at AS createdAt, last_login_at AS lastLoginAt FROM community_accounts WHERE username = ?').get(username) || null;
}

function getCommunityAccountAuthByEmail(email) {
  return db.prepare('SELECT id, username, email, password_hash AS passwordHash, is_developer AS isDeveloper, hide_online_status AS hideOnlineStatus, created_at AS createdAt, last_login_at AS lastLoginAt FROM community_accounts WHERE email = ?').get(email) || null;
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

function updateCommunityAccountPreferences(email, nextPreferences = {}) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!normalizedEmail) {
    return;
  }

  if (Object.prototype.hasOwnProperty.call(nextPreferences, 'hideOnlineStatus')) {
    db.prepare('UPDATE community_accounts SET hide_online_status = ? WHERE email = ?').run(
      nextPreferences.hideOnlineStatus ? 1 : 0,
      normalizedEmail
    );
  }
}

function getCommunitySessionFromRequest(request) {
  function resolveCommunitySessionByToken(token) {
    if (!token) {
      return null;
    }

    let session = communitySessions.get(token);
    if (!session) {
      const storedSession = loadAuthSession(token, sessionScopeCommunity);
      if (!storedSession) {
        return null;
      }
      session = {
        username: storedSession.username,
        email: storedSession.email,
        isDeveloper: Boolean(storedSession.isDeveloper),
        lastSeenAt: Number(storedSession.lastSeenAt || Date.now()),
        expiresAt: storedSession.expiresAt
      };
      communitySessions.set(token, session);
    }

    if (session.expiresAt <= Date.now()) {
      communitySessions.delete(token);
      deleteAuthSession(token);
      return null;
    }

    session.lastSeenAt = Date.now();
    return session;
  }

  // ����1����Authorization header�л�ȡ token
  const authHeader = request.headers['authorization'] || '';
  if (authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const session = resolveCommunitySessionByToken(token);
    if (session) {
      return session;
    }
  }
  
  // ����2����Cookie header�л�ȡ token
  const cookieHeader = request.headers['cookie'] || '';
  const match = cookieHeader.match(/(?:^|;)\s*mctools_community=([^;]+)/);
  if (match) {
    const token = decodeURIComponent(match[1]);
    const session = resolveCommunitySessionByToken(token);
    if (session) {
      return session;
    }
  }
  
  return null;
}

function getCommunityAdminSessionFromRequest(request) {
  const cookieHeader = request.headers['cookie'] || '';
  const match = cookieHeader.match(/(?:^|;)\s*mctools_community_admin=([^;]+)/);

  if (!match) {
    return null;
  }

  const token = decodeURIComponent(match[1]);
  let session = communitySessions.get(token);

  if (!session) {
    const storedSession = loadAuthSession(token, sessionScopeCommunity);
    if (!storedSession) {
      return null;
    }
    session = {
      username: storedSession.username,
      email: storedSession.email,
      isDeveloper: Boolean(storedSession.isDeveloper),
      lastSeenAt: Number(storedSession.lastSeenAt || Date.now()),
      expiresAt: storedSession.expiresAt
    };
    communitySessions.set(token, session);
  }

  if (session && session.expiresAt > Date.now() && session.isDeveloper) {
    session.lastSeenAt = Date.now();
    return session;
  }

  if (session && session.expiresAt <= Date.now()) {
    communitySessions.delete(token);
    deleteAuthSession(token);
  }

  return null;
}

function issueCommunitySession(response, username, email, isCommunityDeveloper, lifetimeMs = communitySessionLifetimeMs) {
  const token = crypto.randomBytes(32).toString('hex');
  const sessionLifetime = Math.max(60 * 1000, Number(lifetimeMs) || communitySessionLifetimeMs);
  const session = {
    username,
    email,
    isDeveloper: Boolean(isCommunityDeveloper),
    lastSeenAt: Date.now(),
    expiresAt: Date.now() + sessionLifetime
  };
  communitySessions.set(token, session);
  persistAuthSession(token, sessionScopeCommunity, session);

  setScopedAuthCookie(response, 'mctools_community', '/api/community/', token, sessionLifetime);
  if (isCommunityDeveloper) {
    response.setHeader('Set-Cookie', [
      `${'mctools_community_admin'}=${token}; HttpOnly; Path=/; Max-Age=${Math.floor(sessionLifetime / 1000)}; SameSite=Lax`,
      ...(Array.isArray(response.getHeader('Set-Cookie')) ? response.getHeader('Set-Cookie') : [response.getHeader('Set-Cookie')]).filter(Boolean)
    ]);
  }
  return token;
}

function handleCommunityRegister(request, response) {
  parseRequestBody(request)
    .then(async (body) => {
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
        sendJson(response, 400, { message: '�û�������Ϊ�գ��Ҳ����� 32 ���ַ�' });
        return;
      }

      if (!isValidAuthEmail(email)) {
        sendJson(response, 400, { message: '����д��Ч�������ַ' });
        return;
      }

      if (password.length < 6 || password.length > 64) {
        sendJson(response, 400, { message: '���볤������ 6-64 λ֮��' });
        return;
      }

      if (getCommunityAccountByUsername(username)) {
        sendJson(response, 409, { message: '���û����ѱ�����ռ�ã��뻻һ���ǳ�' });
        return;
      }

      if (getCommunityAccountByEmail(email)) {
        sendJson(response, 409, { message: '��������ע�������˺ţ���ֱ�ӵ�¼' });
        return;
      }

      let isCommunityDeveloper = Boolean(isDeveloper(username));

      if (registerAsDeveloper) {
        if (developerSecret !== developerRegistrationSecret) {
          sendJson(response, 403, { message: 'Ȩ�޿�������޷�����Ȩ���˺�' });
          return;
        }

        isCommunityDeveloper = true;
      }

      const account = createCommunityAccount(username, email, isCommunityDeveloper, hashPassword(password));
      sendJson(response, 201, { message: '�����˺�ע��ɹ��������������֤���¼', account });
    })
    .catch((error) => {
      sendJson(response, 400, { message: error.message || '������Ч' });
    });
}

function handleCommunityPasswordLogin(request, response) {
  parseRequestBody(request)
    .then(async (body) => {
      const username = String(body.username || '').trim();
      const email = String(body.email || '').trim().toLowerCase();
      const password = String(body.password || '');
      const rememberLogin = body.rememberLogin === true || body.rememberLogin === 'true' || body.rememberLogin === 1 || body.rememberLogin === '1';

      if (!password) {
        sendJson(response, 400, { message: '����������' });
        return;
      }

      let accountAuth = null;
      if (username) {
        accountAuth = getCommunityAccountAuthByUsername(username);
      } else if (email) {
        accountAuth = getCommunityAccountAuthByEmail(email);
      }

      if (!accountAuth) {
        sendJson(response, 401, { message: '�˺Ż��������' });
        return;
      }

      if (!accountAuth.passwordHash || !verifyPassword(password, accountAuth.passwordHash)) {
        sendJson(response, 401, { message: '�˺Ż��������' });
        return;
      }

      markCommunityAccountLogin(accountAuth.email);
      const isCommunityDeveloper = Boolean(accountAuth?.isDeveloper || isDeveloper(accountAuth.username));
      const token = issueCommunitySession(
        response,
        accountAuth.username,
        accountAuth.email,
        isCommunityDeveloper,
        rememberLogin ? rememberedCommunitySessionLifetimeMs : communitySessionLifetimeMs
      );

      sendJson(response, 200, {
        message: '�����¼�ɹ�',
        username: accountAuth.username,
        email: accountAuth.email,
        isDeveloper: isCommunityDeveloper,
        token
      });
    })
    .catch((error) => {
      sendJson(response, 400, { message: error.message || '������Ч' });
    });
}

function handleCommunitySendCode(request, response) {
  parseRequestBody(request)
    .then(async (body) => {
      const username = String(body.username || '').trim();
      const email = String(body.email || '').trim().toLowerCase();

      if (!isValidAuthUsername(username)) {
        sendJson(response, 400, { message: '�û�������Ϊ�գ��Ҳ����� 32 ���ַ�' });
        return;
      }

      if (!isValidAuthEmail(email)) {
        sendJson(response, 400, { message: '����д��Ч�������ַ' });
        return;
      }

      const account = getCommunityAccountByEmail(email);
      if (!account) {
        sendJson(response, 403, { message: '����ע���˻����ٵ�¼', code: 'REGISTRATION_REQUIRED' });
        return;
      }

      if (account.username !== username) {
        sendJson(response, 400, { message: '�û�����ע���˻���һ��' });
        return;
      }

      const existing = communityVerifyCodes.get(email);
      if (existing && existing.expiresAt - communityVerifyCodeLifetimeMs + 60000 > Date.now()) {
        sendJson(response, 429, { message: '����̫Ƶ������ 60 �������' });
        return;
      }

      const code = String(Math.floor(100000 + Math.random() * 900000));
      communityVerifyCodes.set(email, { code, username, expiresAt: Date.now() + communityVerifyCodeLifetimeMs });

      const result = await sendAuthCodeEmail('Community', email, code, username, shouldExposeDevCode(request));
      sendJson(response, 200, result);
    })
    .catch((error) => {
      sendJson(response, 400, { message: error.message || '������Ч' });
    });
}

function handleCommunityVerify(request, response) {
  parseRequestBody(request)
    .then((body) => {
      const email = String(body.email || '').trim().toLowerCase();
      const code = String(body.code || '').trim();
      const rememberLogin = body.rememberLogin === true || body.rememberLogin === 'true' || body.rememberLogin === 1 || body.rememberLogin === '1';

      const entry = communityVerifyCodes.get(email);
      if (!entry || entry.expiresAt <= Date.now()) {
        sendJson(response, 400, { message: '��֤�벻���ڻ��ѹ��ڣ������»�ȡ' });
        return;
      }

      if (entry.code !== code) {
        sendJson(response, 400, { message: '��֤�����' });
        return;
      }

      communityVerifyCodes.delete(email);
      markCommunityAccountLogin(email);

      const account = getCommunityAccountByEmail(email);
      const isCommunityDeveloper = Boolean(account?.isDeveloper || isDeveloper(entry.username));
      const token = issueCommunitySession(
        response,
        entry.username,
        email,
        isCommunityDeveloper,
        rememberLogin ? rememberedCommunitySessionLifetimeMs : communitySessionLifetimeMs
      );
      sendJson(response, 200, {
        message: '������¼�ɹ�',
        username: entry.username,
        isDeveloper: isCommunityDeveloper,
        token
      });
    })
    .catch((error) => {
      sendJson(response, 400, { message: error.message || '������Ч' });
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
  const permissionRole = isCommunityDeveloper ? 'developer' : getStorePermissionRole(session.username);
  sendJson(response, 200, {
    loggedIn: true,
    username: session.username,
    email: session.email,
    registered: Boolean(account),
    isDeveloper: isCommunityDeveloper,
    hideOnlineStatus: Boolean(account?.hideOnlineStatus),
    storeDiscountTier: String(account?.storeDiscountTier || ''),
    permissionRole,
    canViewOrders: permissionRole === 'developer' || permissionRole === 'order-viewer',
    canEditStore: permissionRole === 'developer'
  });
}

function handleCommunityPreferencesUpdate(request, response) {
  const session = getCommunitySessionFromRequest(request);
  if (!session) {
    sendJson(response, 401, { message: '未登录' });
    return;
  }

  parseRequestBody(request)
    .then((body) => {
      const hideOnlineStatus = body.hideOnlineStatus === true || body.hideOnlineStatus === 'true' || body.hideOnlineStatus === 1 || body.hideOnlineStatus === '1';
      updateCommunityAccountPreferences(session.email, { hideOnlineStatus });
      sendJson(response, 200, {
        message: '设置已保存',
        hideOnlineStatus
      });
    })
    .catch((error) => {
      sendJson(response, 400, { message: error.message || '请求无效' });
    });
}

function handleCommunityLogout(request, response) {
  const cookieHeader = request.headers['cookie'] || '';
  const match = cookieHeader.match(/(?:^|;)\s*mctools_community=([^;]+)/);
  const adminMatch = cookieHeader.match(/(?:^|;)\s*mctools_community_admin=([^;]+)/);
  if (match) {
    const token = decodeURIComponent(match[1]);
    communitySessions.delete(token);
    deleteAuthSession(token);
  }
  if (adminMatch) {
    const token = decodeURIComponent(adminMatch[1]);
    communitySessions.delete(token);
    deleteAuthSession(token);
  }
      clearScopedAuthCookie(response, 'mctools_community', '/api/community/');
      clearScopedAuthCookie(response, 'mctools_community_admin', '/');
  sendJson(response, 200, { message: '���˳������˺�' });
}

const DEFAULT_GOOGLE_CLIENT_ID = '366119935405-4nb8n3e89tr48lea7db90ct6sgd66h43.apps.googleusercontent.com';
const DEFAULT_GOOGLE_CLIENT_SECRET = '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';

function getGoogleClientId() {
  return getConfiguredValue('GOOGLE_CLIENT_ID', 'googleClientId', DEFAULT_GOOGLE_CLIENT_ID);
}

function getGoogleClientSecret() {
  return getConfiguredValue('GOOGLE_CLIENT_SECRET', 'googleClientSecret', DEFAULT_GOOGLE_CLIENT_SECRET);
}

function getCommunityAccountByGoogleId(googleId) {
  if (!googleId) return null;
  return db.prepare('SELECT id, username, email, is_developer AS isDeveloper, hide_online_status AS hideOnlineStatus, google_id AS googleId, created_at AS createdAt, last_login_at AS lastLoginAt FROM community_accounts WHERE google_id = ?').get(String(googleId)) || null;
}

function updateCommunityAccountGoogleId(email, googleId) {
  if (!email || !googleId) return;
  db.prepare('UPDATE community_accounts SET google_id = ? WHERE email = ?').run(String(googleId), email);
}

function findOrCreateGoogleCommunityAccount({ email, name, sub }) {
  const cleanEmail = String(email || '').trim().toLowerCase();
  const cleanSub = String(sub || '').trim();
  if (!cleanEmail) {
    throw new Error('Google 账号缺少有效邮箱地址');
  }

  // 1. 先通过 google_id 查找
  let account = getCommunityAccountByGoogleId(cleanSub);
  if (account) {
    markCommunityAccountLogin(account.email);
    return account;
  }

  // 2. 查找是否有相同邮箱的账号
  account = getCommunityAccountByEmail(cleanEmail);
  if (account) {
    if (cleanSub) {
      updateCommunityAccountGoogleId(cleanEmail, cleanSub);
      account.googleId = cleanSub;
    }
    markCommunityAccountLogin(cleanEmail);
    return account;
  }

  // 3. 自动创建新账号
  let baseUsername = String(name || '').trim().replace(/[^\w\u4e00-\u9fa5_-]/g, '');
  if (!baseUsername) {
    baseUsername = cleanEmail.split('@')[0].replace(/[^\w\u4e00-\u9fa5_-]/g, '') || 'google_user';
  }
  if (baseUsername.length > 20) {
    baseUsername = baseUsername.slice(0, 20);
  }

  let username = baseUsername;
  let counter = 1;
  while (getCommunityAccountByUsername(username)) {
    username = `${baseUsername}_${counter}`;
    if (username.length > 32) {
      username = `${baseUsername.slice(0, 26)}_${counter}`;
    }
    counter++;
  }

  const randomPassword = crypto.randomBytes(16).toString('hex');
  const passwordHash = hashPassword(randomPassword);
  const isCommunityDev = Boolean(isDeveloper(username));

  db.prepare('INSERT INTO community_accounts (username, email, password_hash, is_developer, google_id, last_login_at) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)').run(
    username,
    cleanEmail,
    passwordHash,
    isCommunityDev ? 1 : 0,
    cleanSub || null
  );

  return getCommunityAccountByUsername(username);
}

function parseJwtPayload(token) {
  try {
    const parts = String(token).split('.');
    if (parts.length < 2) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = Buffer.from(base64, 'base64').toString('utf8');
    return JSON.parse(json);
  } catch {
    return null;
  }
}

async function verifyGoogleIdToken(idToken) {
  const clientId = getGoogleClientId();
  const payload = parseJwtPayload(idToken);
  if (!payload) {
    throw new Error('无效的 Google 凭证数据');
  }

  let remoteVerified = null;
  try {
    const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`, {
      signal: AbortSignal.timeout(6000)
    });
    if (res.ok) {
      remoteVerified = await res.json();
    }
  } catch (err) {
    console.warn('[Google Auth] tokeninfo check skipped/failed:', err.message);
  }

  const target = remoteVerified || payload;
  if (target.aud !== clientId && target.azp !== clientId) {
    throw new Error('Google 凭证 Client ID 不匹配');
  }

  const expMs = Number(target.exp) * 1000;
  if (expMs && expMs < Date.now() - 30000) {
    throw new Error('Google 登录凭证已过期');
  }

  if (!target.email) {
    throw new Error('未能从 Google 账号获取邮箱');
  }

  return target;
}

async function exchangeGoogleCodeForUserInfo(code, redirectUri) {
  const clientId = getGoogleClientId();
  const clientSecret = getGoogleClientSecret();

  const bodyParams = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code'
  });

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: bodyParams.toString(),
    signal: AbortSignal.timeout(8000)
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Google 授权码换取令牌失败: ${errText}`);
  }

  const tokenData = await res.json();
  if (tokenData.id_token) {
    const payload = parseJwtPayload(tokenData.id_token);
    if (payload && payload.email) {
      return payload;
    }
  }

  if (tokenData.access_token) {
    const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
      signal: AbortSignal.timeout(6000)
    });
    if (userRes.ok) {
      return await userRes.json();
    }
  }

  throw new Error('未能从 Google 获取账号信息');
}

function handleCommunityGoogleClientId(request, response) {
  sendJson(response, 200, {
    clientId: getGoogleClientId()
  });
}

function getRequestOrigin(request) {
  const host = request.headers['x-forwarded-host'] || request.headers['host'] || 'localhost:3004';
  const proto = request.headers['x-forwarded-proto'] || (request.socket && request.socket.encrypted ? 'https' : 'http');
  return `${proto}://${host}`;
}

function handleCommunityGoogleAuthorize(request, response) {
  const origin = getRequestOrigin(request);
  const urlObj = new URL(request.url, origin);
  const rememberLogin = urlObj.searchParams.get('rememberLogin') === '1' || urlObj.searchParams.get('rememberLogin') === 'true';
  const from = urlObj.searchParams.get('from') || '/store-account.html';
  const redirectUri = `${origin}/api/community/google/callback`;

  const statePayload = Buffer.from(JSON.stringify({
    rememberLogin,
    from,
    ts: Date.now()
  })).toString('base64url');

  const clientId = getGoogleClientId();
  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', 'openid email profile');
  authUrl.searchParams.set('access_type', 'offline');
  authUrl.searchParams.set('prompt', 'select_account');
  authUrl.searchParams.set('state', statePayload);

  response.statusCode = 302;
  response.setHeader('Location', authUrl.toString());
  response.end();
}

async function handleCommunityGoogleCallback(request, response) {
  const origin = getRequestOrigin(request);
  const urlObj = new URL(request.url, origin);
  const code = urlObj.searchParams.get('code');
  const error = urlObj.searchParams.get('error');
  const stateStr = urlObj.searchParams.get('state');

  let state = {};
  try {
    if (stateStr) {
      state = JSON.parse(Buffer.from(stateStr, 'base64url').toString('utf8'));
    }
  } catch {}

  const rememberLogin = Boolean(state.rememberLogin);
  const returnBase = state.from || '/store-account.html';

  if (error || !code) {
    const errorMsg = error || '用户取消了 Google 登录授权';
    const redirectUrl = new URL(returnBase, origin);
    redirectUrl.searchParams.set('auth', 'google_error');
    redirectUrl.searchParams.set('message', errorMsg);
    response.statusCode = 302;
    response.setHeader('Location', redirectUrl.toString());
    response.end();
    return;
  }

  try {
    const redirectUri = `${origin}/api/community/google/callback`;
    const googleUser = await exchangeGoogleCodeForUserInfo(code, redirectUri);
    const account = findOrCreateGoogleCommunityAccount({
      email: googleUser.email,
      name: googleUser.name,
      sub: googleUser.sub
    });

    const isCommunityDev = Boolean(account.isDeveloper || isDeveloper(account.username));
    const token = issueCommunitySession(
      response,
      account.username,
      account.email,
      isCommunityDev,
      rememberLogin ? rememberedCommunitySessionLifetimeMs : communitySessionLifetimeMs
    );

    const redirectUrl = new URL(returnBase, origin);
    redirectUrl.searchParams.set('auth', 'google_success');
    redirectUrl.searchParams.set('token', token);
    redirectUrl.searchParams.set('username', account.username);
    response.statusCode = 302;
    response.setHeader('Location', redirectUrl.toString());
    response.end();
  } catch (err) {
    console.error('[Google Callback Error]', err);
    const redirectUrl = new URL(returnBase, origin);
    redirectUrl.searchParams.set('auth', 'google_error');
    redirectUrl.searchParams.set('message', err.message || 'Google 登录处理失败');
    response.statusCode = 302;
    response.setHeader('Location', redirectUrl.toString());
    response.end();
  }
}

async function handleCommunityGoogleLogin(request, response) {
  try {
    const body = await parseRequestBody(request);
    const rememberLogin = body.rememberLogin === true || body.rememberLogin === 'true' || body.rememberLogin === 1 || body.rememberLogin === '1';

    let googleUser = null;
    if (body.credential) {
      // GSI ID Token
      googleUser = await verifyGoogleIdToken(body.credential);
    } else if (body.code) {
      // Authorization Code
      const origin = getRequestOrigin(request);
      const redirectUri = body.redirectUri || `${origin}/api/community/google/callback`;
      googleUser = await exchangeGoogleCodeForUserInfo(body.code, redirectUri);
    } else {
      sendJson(response, 400, { message: '缺少 Google 登录凭据' });
      return;
    }

    const account = findOrCreateGoogleCommunityAccount({
      email: googleUser.email,
      name: googleUser.name,
      sub: googleUser.sub
    });

    const isCommunityDev = Boolean(account.isDeveloper || isDeveloper(account.username));
    const token = issueCommunitySession(
      response,
      account.username,
      account.email,
      isCommunityDev,
      rememberLogin ? rememberedCommunitySessionLifetimeMs : communitySessionLifetimeMs
    );

    sendJson(response, 200, {
      message: 'Google 账号登录成功',
      username: account.username,
      email: account.email,
      isDeveloper: isCommunityDev,
      token
    });
  } catch (error) {
    console.error('[Google Login Error]', error);
    sendJson(response, 400, { message: error.message || 'Google 登录失败' });
  }
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
    throw new Error('ͷ��ͼƬ���ܳ��� 2MB');
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
    return { ok: false, reason: 'SMTP δ���� host/user/pass' };
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
      subject: `��֤�� ${code}`,
      text: `��� ${username}��\n\n��ġ��Ǽ�_С�������˺���֤���ǣ�${code}\n\n��֤�� 10 ��������Ч������й¶��\n\n-- �Ǽ�-С����`
    });

    return { ok: true, reason: info?.response || '' };
  } catch (error) {
    return { ok: false, reason: error?.response || error?.message || 'SMTP ����ʧ��' };
  }
}

async function sendAuthCodeEmail(scopeLabel, toEmail, code, username, exposeDevCode = false) {
  const smtpResult = await trySmtpSend(toEmail, code, username).catch((error) => ({ ok: false, reason: error.message || 'SMTP ����ʧ��' }));

  if (smtpResult.ok) {
    return {
      sent: true,
      message: `��֤���ѷ����� ${toEmail}��10 ��������Ч`,
      ...(exposeDevCode ? { devCode: code } : {})
    };
  }

  console.warn(`[${scopeLabel}] SMTP ����ʧ�� -> ${toEmail} (${username}): ${smtpResult.reason || 'unknown'}`);
  const fallbackCodeMessage = exposeDevCode ? `��������֤�룺${code}��` : '';
  return {
    sent: false,
    message: smtpResult.reason
      ? `�ʼ�����ʧ�ܣ�${smtpResult.reason}${fallbackCodeMessage}`
      : `�ʼ�����ʧ�ܣ����л���������֤��${fallbackCodeMessage}`,
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
        sendJson(response, 400, { message: '�û�������Ϊ�գ��Ҳ����� 32 ���ַ�' });
        return;
      }

      if (!isValidAuthEmail(email)) {
        sendJson(response, 400, { message: '����д��Ч�������ַ' });
        return;
      }

      const account = getPlazaAccountByEmail(email);
      if (!account) {
        sendJson(response, 403, { message: '����ע���˻����ٵ�¼', code: 'REGISTRATION_REQUIRED' });
        return;
      }

      if (account.username !== username) {
        sendJson(response, 400, { message: '�û�����ע���˻���һ��' });
        return;
      }

      // ��Ƶˢ��60 ���ڲ����ط�
      const existing = plazaVerifyCodes.get(email);
      if (existing && existing.expiresAt - plazaVerifyCodeLifetimeMs + 60000 > Date.now()) {
        sendJson(response, 429, { message: '����̫Ƶ������ 60 �������' });
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
      sendJson(response, 400, { message: error.message || '������Ч' });
    });
}

function handlePlazaDirectLogin(request, response) {
  parseRequestBody(request)
    .then((body) => {
      const username = String(body.username || '').trim();
      const email = String(body.email || '').trim().toLowerCase();

      if (!isValidAuthUsername(username)) {
        sendJson(response, 400, { message: '�û�������Ϊ�գ��Ҳ����� 32 ���ַ�' });
        return;
      }

      if (!isValidAuthEmail(email)) {
        sendJson(response, 400, { message: '����д��Ч�������ַ' });
        return;
      }

      const token = crypto.randomBytes(32).toString('hex');
      plazaSessions.set(token, {
        username,
        email,
        expiresAt: Date.now() + plazaSessionLifetimeMs
      });

      setScopedAuthCookie(response, 'mctools_plaza', '/api/plaza/', token, plazaSessionLifetimeMs);
      sendJson(response, 200, { message: '��¼�ɹ�', username, email });
    })
    .catch((error) => {
      sendJson(response, 400, { message: error.message || '������Ч' });
    });
}

function handlePlazaRegister(request, response) {
  parseRequestBody(request)
    .then((body) => {
      const username = String(body.username || '').trim();
      const email = String(body.email || '').trim().toLowerCase();

      if (!isValidAuthUsername(username)) {
        sendJson(response, 400, { message: '�û�������Ϊ�գ��Ҳ����� 32 ���ַ�' });
        return;
      }

      if (!isValidAuthEmail(email)) {
        sendJson(response, 400, { message: '����д��Ч�������ַ' });
        return;
      }

      if (getPlazaAccountByUsername(username)) {
        sendJson(response, 409, { message: '���û����ѱ�ע�ᣬ�뻻һ���ǳ�' });
        return;
      }

      if (getPlazaAccountByEmail(email)) {
        sendJson(response, 409, { message: '��������ע�ᣬ��ֱ�ӵ�¼' });
        return;
      }

      const account = createPlazaAccount(username, email);
      sendJson(response, 201, {
        message: 'ע��ɹ��������������֤���¼',
        account
      });
    })
    .catch((error) => {
      sendJson(response, 400, { message: error.message || '������Ч' });
    });
}

function handlePlazaVerify(request, response) {
  parseRequestBody(request)
    .then((body) => {
      const email = String(body.email || '').trim().toLowerCase();
      const code = String(body.code || '').trim();

      const entry = plazaVerifyCodes.get(email);

      if (!entry || entry.expiresAt <= Date.now()) {
        sendJson(response, 400, { message: '��֤�벻���ڻ��ѹ��ڣ������»�ȡ' });
        return;
      }

      if (entry.code !== code) {
        sendJson(response, 400, { message: '��֤�����' });
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
      sendJson(response, 200, { message: '��¼�ɹ�', username: entry.username });
    })
    .catch((error) => {
      sendJson(response, 400, { message: error.message || '������Ч' });
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
  sendJson(response, 200, { message: '���˳���¼' });
}

function handlePlazaVipPurchase(request, response) {
  const session = getPlazaSessionFromRequest(request);

  if (!session) {
    sendJson(response, 401, { message: '���ȵ�¼���ٹ��� VIP' });
    return;
  }

  if (vipSystemPaused) {
    sendJson(response, 503, {
      message: 'VIP ������ʱ�ر�',
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
      message: 'VIP �ѿ�ͨ',
      username: session.username,
      version: appVersion,
      price: 10,
      ...getVipInfo(session.username)
    });
    return;
  }

  db.prepare('INSERT INTO vip_purchases (username, amount) VALUES (?, ?)').run(session.username, 10);

  sendJson(response, 201, {
    message: 'VIP ��ͨ�ɹ�',
    username: session.username,
    version: appVersion,
    price: 10,
    ...getVipInfo(session.username)
  });
}

function handlePlazaSvipPurchase(request, response) {
  const session = getPlazaSessionFromRequest(request);

  if (!session) {
    sendJson(response, 401, { message: '���ȵ�¼���ٹ��� SVIP' });
    return;
  }

  if (vipSystemPaused) {
    sendJson(response, 503, {
      message: 'VIP ������ʱ�ر�',
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
      message: 'SVIP �ѿ�ͨ',
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
    message: 'SVIP ��ͨ�ɹ�',
    username: session.username,
    version: appVersion,
    price: upgradePrice,
    ...getVipInfo(session.username)
  });
}

function handleServerListingCreate(request, response) {
  const plazaSession = getPlazaSessionFromRequest(request);

  if (!plazaSession) {
    sendJson(response, 401, { message: '���ȵ�¼����Ͷ��', code: 'LOGIN_REQUIRED' });
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
          message: '��ͨ�û����ֻ���ϴ� 2 ������������ͨ VIP ��ɼ���Ͷ��',
          code: 'SERVER_LIMIT_REACHED',
          limit: 2,
          current: listingCount,
          membershipLevel: 'NORMAL'
        });
        return;
      }

      if (!serverName || serverName.length > 64) {
        sendJson(response, 400, { message: '���������Ʋ���Ϊ�գ��Ҳ����� 64 ���ַ�' });
        return;
      }

      if (!ipAddress || ipAddress.length > 128) {
        sendJson(response, 400, { message: 'IP ��ַ����Ϊ�գ��Ҳ����� 128 ���ַ�' });
        return;
      }

      if (!description) {
        sendJson(response, 400, { message: '����д���������' });
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
          sendJson(response, 400, { message: error.message || 'ͷ���ϴ�ʧ��' });
          return;
        }
      }

      sendJson(response, 200, { message: 'Ͷ�����յ����ȴ�Ȩ����˺����ʾ���б���' });
    })
    .catch((error) => {
      const isJsonError = error.message === 'Invalid JSON';
      sendJson(response, isJsonError ? 400 : 500, { message: error.message || '�ύʧ��' });
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
        sendJson(response, 400, { message: '��������' });
        return;
      }

      const existing = db.prepare('SELECT id FROM server_listings WHERE id = ?').get(id);

      if (!existing) {
        sendJson(response, 404, { message: 'δ�ҵ���Ͷ��' });
        return;
      }

      db.prepare('UPDATE server_listings SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, id);
      sendJson(response, 200, { message: '״̬�Ѹ���' });
    })
    .catch((error) => {
      sendJson(response, 500, { message: error.message || '����ʧ��' });
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
        sendJson(response, 400, { message: '��������' });
        return;
      }

      const existing = db.prepare('SELECT id FROM server_listings WHERE id = ?').get(id);

      if (!existing) {
        sendJson(response, 404, { message: 'δ�ҵ���Ͷ��' });
        return;
      }

      deleteServerListingAvatarFiles(id);
      db.prepare('DELETE FROM server_listings WHERE id = ?').run(id);
      sendJson(response, 200, { message: '��ɾ��' });
    })
    .catch((error) => {
      sendJson(response, 500, { message: error.message || 'ɾ��ʧ��' });
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
    <title>����������ҳ</title>
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
            <h1>����������ҳ</h1>
            <p>3000 �˿ڵ�ǰֻ��������������չʾ������Ԥ���淨���򡢷����Χ�ͺ������żƻ����ݲ�����ʵ�ʷ����빦�ܲ�����</p>
          </div>
          <div class="promo-points">
            <article class="promo-point">
              <strong>������������</strong>
              <p>�����������桢�ҹ�����˷ֹ��ͷ��俪�����࣬�ʺ����Ѿֿ��ټ��ϡ�</p>
            </article>
            <article class="promo-point">
              <strong>����������</strong>
              <p>������Ϳ������ġ��豸��⡢Bug �Ż�����������ǰ�����˿ڲ��ṩ��¼��ע���ɨ�������</p>
            </article>
            <article class="promo-point">
              <strong>����״̬</strong>
              <p>Ŀǰ����׼���׶Ρ���Ҫ����ʹ�����з���ʱ����ֱ��ǰ�� 3001 �˿ڡ�</p>
            </article>
          </div>
        </section>
        <aside class="promo-side">
          <p class="promo-side-title">��ǰ״̬</p>
          <span class="promo-status">�ݲ�����</span>
          <p>3000 �˿����ڲ����ṩ��ʽ��¼���˺Ų�����ɨ���¼�򹤾�ҳ������</p>
          <div class="promo-actions">
            <a class="port-closed-link" href="${targetUrl}">ǰ�� 3001 ��ʽ���</a>
            <a class="port-closed-link secondary" href="${targetUrl}server-hub.html">�鿴����ģ��</a>
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

function normalizeStoreWhitelistUsernames(value) {
  if (Array.isArray(value)) {
    return Array.from(new Set(value.map((item) => String(item || '').trim()).filter(Boolean)));
  }

  const normalized = String(value || '')
    .split(/[,\n\r]+/)
    .map((item) => String(item || '').trim())
    .filter(Boolean);

  return Array.from(new Set(normalized));
}

function normalizeStoreBoolean(value, fallback = false) {
  if (value === true || value === 1) {
    return true;
  }

  if (value === false || value === 0) {
    return false;
  }

  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) {
    return Boolean(fallback);
  }

  return ['1', 'true', 'yes', 'on', 'y'].includes(normalized);
}

function normalizeStoreDateTime(value) {
  const normalized = String(value || '').trim();
  if (!normalized) {
    return '';
  }

  const timestamp = Date.parse(normalized);
  if (Number.isNaN(timestamp)) {
    return '';
  }

  return new Date(timestamp).toISOString();
}

function getStoreMaintenanceEnabled() {
  return normalizeStoreBoolean(getSettingValue('site_maintenance_enabled', '0'), false);
}

function getStoreMaintenanceMessage() {
  const value = String(getSettingValue('site_maintenance_message', defaultStoreMaintenanceMessage) || '').trim();
  return value || defaultStoreMaintenanceMessage;
}

function getStoreMaintenanceReason() {
  return String(getSettingValue('site_maintenance_reason', '') || '').trim();
}

function getStoreMaintenanceUntil() {
  return String(getSettingValue('site_maintenance_until', '') || '').trim();
}

function getStorePaymentsEnabled() {
  return normalizeStoreBoolean(getSettingValue('store_payments_enabled', '1'), true);
}

function getStoreWhitelistUsernames() {
  try {
    return normalizeStoreWhitelistUsernames(
      JSON.parse(getSettingValue('store_whitelist_usernames', JSON.stringify(defaultStoreWhitelistUsernames)))
    );
  } catch {
    return [...defaultStoreWhitelistUsernames];
  }
}

function getStoreAnnouncementText() {
  const value = String(getSettingValue('store_announcement', defaultStoreAnnouncement) || '').trim();
  return value || defaultStoreAnnouncement;
}

function getStorePublicSettings() {
  return {
    announcement: getStoreAnnouncementText(),
    whitelistUsernames: getStoreWhitelistUsernames(),
    maintenanceEnabled: getStoreMaintenanceEnabled(),
    maintenanceMessage: getStoreMaintenanceMessage(),
    maintenanceReason: getStoreMaintenanceReason(),
    maintenanceUntil: getStoreMaintenanceUntil(),
    paymentsEnabled: getStorePaymentsEnabled(),
    lotteryEnabled: getLotteryFeatureEnabled(),
    orderViewerUsernames: getStoreOrderViewerUsernames()
  };
}

function saveStorePublicSettings(nextSettings) {
  if (Object.prototype.hasOwnProperty.call(nextSettings, 'announcement')) {
    setSettingValue('store_announcement', String(nextSettings.announcement || '').trim() || defaultStoreAnnouncement);
  }

  if (Object.prototype.hasOwnProperty.call(nextSettings, 'whitelistUsernames')) {
    setSettingValue('store_whitelist_usernames', JSON.stringify(normalizeStoreWhitelistUsernames(nextSettings.whitelistUsernames)));
  }

  if (Object.prototype.hasOwnProperty.call(nextSettings, 'maintenanceEnabled')) {
    setSettingValue('site_maintenance_enabled', normalizeStoreBoolean(nextSettings.maintenanceEnabled) ? '1' : '0');
  }

  if (Object.prototype.hasOwnProperty.call(nextSettings, 'paymentsEnabled')) {
    setSettingValue('store_payments_enabled', normalizeStoreBoolean(nextSettings.paymentsEnabled, true) ? '1' : '0');
  }

  if (Object.prototype.hasOwnProperty.call(nextSettings, 'lotteryEnabled')) {
    setSettingValue('lottery_feature_enabled', normalizeStoreBoolean(nextSettings.lotteryEnabled, false) ? '1' : '0');
  }

  if (Object.prototype.hasOwnProperty.call(nextSettings, 'maintenanceMessage')) {
    setSettingValue('site_maintenance_message', String(nextSettings.maintenanceMessage || '').trim() || defaultStoreMaintenanceMessage);
  }

  if (Object.prototype.hasOwnProperty.call(nextSettings, 'maintenanceReason')) {
    setSettingValue('site_maintenance_reason', String(nextSettings.maintenanceReason || '').trim());
  }

  if (Object.prototype.hasOwnProperty.call(nextSettings, 'maintenanceUntil')) {
    setSettingValue('site_maintenance_until', normalizeStoreDateTime(nextSettings.maintenanceUntil));
  }

  if (Object.prototype.hasOwnProperty.call(nextSettings, 'orderViewerUsernames')) {
    setSettingValue('store_order_viewer_usernames', JSON.stringify(normalizeStoreWhitelistUsernames(nextSettings.orderViewerUsernames)));
  }
}

function sanitizeAppVersion(value) {
  const nextVersion = String(value || '').trim();

  if (!nextVersion) {
    throw new Error('�汾�Ų���Ϊ��');
  }

  if (nextVersion.length > 32) {
    throw new Error('�汾�ų��Ȳ��ܳ��� 32 ���ַ�');
  }

  return nextVersion;
}

function isDeveloper(username) {
  if (!username) {
    return false;
  }

  const row = db.prepare('SELECT is_developer AS isDeveloper FROM users WHERE username = ?').get(username);
  if (row && row.isDeveloper) {
    return true;
  }

  return getStoreWhitelistUsernames().includes(String(username || '').trim());
}

function getStoreOrderViewerUsernames() {
  try {
    return normalizeStoreWhitelistUsernames(
      JSON.parse(getSettingValue('store_order_viewer_usernames', '[]'))
    );
  } catch {
    return [];
  }
}

function isStoreOrderViewer(username) {
  const normalizedUsername = String(username || '').trim();
  return Boolean(normalizedUsername) && getStoreOrderViewerUsernames().includes(normalizedUsername);
}

function getStorePermissionRole(username) {
  if (!username) {
    return 'none';
  }

  if (isDeveloper(username)) {
    return 'developer';
  }

  if (isStoreOrderViewer(username)) {
    return 'order-viewer';
  }

  return 'none';
}

function isPrivilegedUser(username) {
  return isDeveloper(username);
}

function hasMaintenanceBypass(request) {
  const publicSession = getSessionFromRequest(request);
  if (publicSession?.username && isDeveloper(publicSession.username)) {
    return true;
  }

  const communityAdminSession = getCommunityAdminSessionFromRequest(request);
  if (communityAdminSession && (communityAdminSession.isDeveloper || (communityAdminSession.username && isDeveloper(communityAdminSession.username)))) {
    return true;
  }

  const communitySession = getCommunitySessionFromRequest(request);
  if (communitySession?.username && (communitySession.isDeveloper || isDeveloper(communitySession.username) || isStoreOrderViewer(communitySession.username))) {
    return true;
  }

  return false;
}

function isMaintenanceFriendlyPath(pathname) {
  return (
    pathname === '/maintenance.html' ||
    pathname === '/store-admin.html' ||
    pathname === '/login.html' ||
    pathname === '/login.css' ||
    pathname === '/login.js' ||
    pathname === '/styles.css' ||
    pathname.startsWith('/assets/')
  );
}

function isMaintenanceAllowedApi(pathname) {
  return (
    pathname.startsWith('/api/community/') ||
    pathname.startsWith('/api/login') ||
    pathname === '/api/me' ||
    pathname === '/api/developer/quick-entry-token' ||
    pathname === '/api/app-version'
  );
}

function isTextLikeFile(filePath) {
  return developerEditableExtensions.has(path.extname(filePath).toLowerCase());
}

function getSafeDeveloperFilePath(relativeFilePath) {
  const normalizedRelativePath = String(relativeFilePath || '').replace(/\\/g, '/').replace(/^\/+/, '');

  if (!normalizedRelativePath) {
    throw new Error('ȱ���ļ�·��');
  }

  if (normalizedRelativePath.startsWith('data/') || normalizedRelativePath === 'data') {
    throw new Error('��·�����ɷ���');
  }

  const absolutePath = path.resolve(__dirname, normalizedRelativePath);

  if (!absolutePath.startsWith(__dirname)) {
    throw new Error('�Ƿ��ļ�·��');
  }

  if (!isTextLikeFile(absolutePath)) {
    throw new Error('��ǰ��֧�ֲ鿴���޸��ı������ļ�');
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

function ensureStoreSettings() {
  const storedAnnouncement = String(getSettingValue('store_announcement', '') || '').trim();
  if (!storedAnnouncement) {
    setSettingValue('store_announcement', defaultStoreAnnouncement);
  }

  const storedWhitelist = String(getSettingValue('store_whitelist_usernames', '') || '').trim();
  if (!storedWhitelist) {
    setSettingValue('store_whitelist_usernames', JSON.stringify(defaultStoreWhitelistUsernames));
  }

  const storedMaintenanceMessage = String(getSettingValue('site_maintenance_message', '') || '').trim();
  if (!storedMaintenanceMessage) {
    setSettingValue('site_maintenance_message', defaultStoreMaintenanceMessage);
  }

  const storedMaintenanceReason = String(getSettingValue('site_maintenance_reason', '') || '').trim();
  if (!storedMaintenanceReason) {
    setSettingValue('site_maintenance_reason', '');
  }

  const storedMaintenanceUntil = String(getSettingValue('site_maintenance_until', '') || '').trim();
  if (!storedMaintenanceUntil) {
    setSettingValue('site_maintenance_until', '');
  }

  const storedMaintenanceEnabled = String(getSettingValue('site_maintenance_enabled', '') || '').trim();
  if (!storedMaintenanceEnabled) {
    setSettingValue('site_maintenance_enabled', '0');
  }

  const storedPaymentsEnabled = String(getSettingValue('store_payments_enabled', '') || '').trim();
  if (!storedPaymentsEnabled) {
    setSettingValue('store_payments_enabled', '1');
  }

  const storedLotteryEnabled = String(getSettingValue('lottery_feature_enabled', '') || '').trim();
  if (!storedLotteryEnabled) {
    setSettingValue('lottery_feature_enabled', '0');
  }

  const storedOrderViewers = String(getSettingValue('store_order_viewer_usernames', '') || '').trim();
  if (!storedOrderViewers) {
    setSettingValue('store_order_viewer_usernames', '[]');
  }
}

ensureStoreSettings();

function repairLegacyStoreData() {
  const fixedAnnouncement = '欢迎来到星际无限资源服商店，购买前请先确认联系方式与支付方式。';
  const fixedProducts = [
    {
      productCode: '65997548',
      name: '星际无限资源服官方管理员',
      description: '官方认证管理员权限，适合服主及运营管理。',
      originalPriceFen: 1500,
      salePriceFen: 100,
      stock: 0,
      currency: 'CNY',
      isActive: 1,
      sortOrder: 10,
      tags: ['资源服', '官方', '管理']
    },
    {
      productCode: 'CMD-20CB-IN',
      name: '指令生成 / 20cb 内部',
      description: '适合 20cb 内部使用的指令生成服务。',
      originalPriceFen: 2000,
      salePriceFen: 100,
      stock: 0,
      currency: 'CNY',
      isActive: 1,
      sortOrder: 20,
      tags: ['指令生成', '20cb内部']
    },
    {
      productCode: 'CMD-20CB-PLUS',
      name: '指令生成 / 20cb 上层',
      description: '适合 20cb 上层用户的高级指令生成服务。',
      originalPriceFen: 4000,
      salePriceFen: 100,
      stock: 0,
      currency: 'CNY',
      isActive: 1,
      sortOrder: 30,
      tags: ['指令生成', '20cb上层']
    },
    {
      productCode: 'BUILD-IMPORT-ONCE',
      name: '建筑导入一次',
      description: '一次性为服务器导入建筑方案。',
      originalPriceFen: 2000,
      salePriceFen: 100,
      stock: 0,
      currency: 'CNY',
      isActive: 1,
      sortOrder: 40,
      tags: ['建筑导入', '一次']
    },
  ];

  setSettingValue('store_announcement', fixedAnnouncement);

  for (const product of fixedProducts) {
    db.prepare(
      `UPDATE store_products SET
        name = ?,
        description = ?,
        image_url = '',
        original_price_fen = ?,
        sale_price_fen = ?,
        stock = ?,
        currency = ?,
        is_active = ?,
        sort_order = ?,
        tags_json = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE product_code = ?`
    ).run(
      product.name,
      product.description,
      Number(product.originalPriceFen || 0),
      Number(product.salePriceFen || 0),
      Math.max(0, Number(product.stock || 0)),
      product.currency || 'CNY',
      Number(product.isActive ? 1 : 0),
      Number(product.sortOrder || 100),
      JSON.stringify(product.tags || []),
      product.productCode
    );
  }

  db.prepare(`
    UPDATE store_products
    SET is_active = 0, updated_at = CURRENT_TIMESTAMP
    WHERE product_code IN ('LOW-AGENT-30', 'MID-AGENT-100')
       OR name IN ('低级代理', '高级代理', '中级代理')
  `).run();
}

repairLegacyStoreData();

function handleRegister(request, response) {
  parseRequestBody(request)
    .then(async (body) => {
      const username = String(body.username || '').trim();
      const password = String(body.password || '');
      const rememberLogin = body.rememberLogin === true || body.rememberLogin === 'true' || body.rememberLogin === 1 || body.rememberLogin === '1';
      const registerAsDeveloper =
        body.registerAsDeveloper === true ||
        body.registerAsDeveloper === 'true' ||
        body.registerAsDeveloper === 1 ||
        body.registerAsDeveloper === '1';
      const developerSecret = String(body.developerSecret || '').trim();

      if (username.length < 3 || username.length > 32) {
        sendJson(response, 400, { message: '�û���������Ϊ 3-32 ���ַ�' });
        return;
      }

      if (password.length < 6) {
        sendJson(response, 400, { message: '���볤������ 6 λ' });
        return;
      }

      let usedLocalDevQuickEntry = false;

      if (registerAsDeveloper) {
        const secretMatched = developerSecret === developerRegistrationSecret;

        if (!secretMatched && canUseLocalDevQuickEntry(request)) {
          usedLocalDevQuickEntry = consumeLocalDevQuickEntryToken(request, developerSecret);
        }

        if (!secretMatched && !usedLocalDevQuickEntry) {
          sendJson(response, 403, { message: 'Ȩ����Ȩ�������ѹ���' });
          return;
        }
      }

      const existingUser = db.prepare('SELECT id FROM users WHERE username = ?').get(username);

      if (existingUser) {
        sendJson(response, 409, { message: '�û����Ѵ���' });
        return;
      }

      const passwordHash = hashPassword(password);
      db.prepare('INSERT INTO users (username, password_hash, is_developer) VALUES (?, ?, ?)').run(
        username,
        passwordHash,
        registerAsDeveloper ? 1 : 0
      );

      const sessionLifetime = rememberLogin ? rememberedSessionLifetimeMs : sessionLifetimeMs;
      const sessionToken = createSession(username, sessionLifetime);
      setSessionCookie(response, sessionToken, sessionLifetime);
      sendJson(response, 201, {
        message: registerAsDeveloper
          ? 'Ȩ���˺�ע��ɹ�'
          : 'ע��ɹ�',
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
    sendJson(response, 403, { message: '�ٷ����ϻ������ÿ����ڣ���ʹ��Ȩ����Ȩ��' });
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
    .then(async (body) => {
      const username = String(body.username || '').trim();
      const password = String(body.password || '');
      const rememberLogin = body.rememberLogin === true || body.rememberLogin === 'true' || body.rememberLogin === 1 || body.rememberLogin === '1';
      const bypassDeveloperRestriction = canUseGeneralUserLogin(request);

      if (!username || !password) {
        sendJson(response, 400, { message: '�������û���������' });
        return;
      }

      const user = db.prepare('SELECT username, password_hash, is_developer FROM users WHERE username = ?').get(username);

      if (!user || !verifyPassword(password, user.password_hash)) {
        sendJson(response, 401, { message: '�û������������' });
        return;
      }

      if (!bypassDeveloperRestriction && !Number(user.is_developer)) {
        sendJson(response, 403, { message: '��ǰ������Ȩ���˺ŵ�¼' });
        return;
      }

      const sessionLifetime = rememberLogin ? rememberedSessionLifetimeMs : sessionLifetimeMs;
      const sessionToken = createSession(user.username, sessionLifetime);
      setSessionCookie(response, sessionToken, sessionLifetime);
      sendJson(response, 200, { message: '��¼�ɹ�', username: user.username, version: appVersion });
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
  const rememberLogin = ['1', 'true', 'yes', 'on'].includes(String(url.searchParams.get('rememberLogin') || '').trim().toLowerCase());

  if (!ticket) {
    sendJson(response, 404, { message: 'ɨ���¼��ά����ʧЧ����ˢ�º�����' });
    return;
  }

  if (ticket.status !== 'approved' || !ticket.username) {
    sendJson(response, 200, {
      status: ticket.status,
      expiresInMs: Math.max(0, ticket.expiresAt - Date.now())
    });
    return;
  }

  const sessionLifetime = rememberLogin ? rememberedSessionLifetimeMs : sessionLifetimeMs;
  const sessionToken = createSession(ticket.username, sessionLifetime);
  setSessionCookie(response, sessionToken, sessionLifetime);
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
    sendJson(response, 401, { message: '������ɨ���豸��¼�˺�' });
    return;
  }

  parseRequestBody(request)
    .then((body) => {
      const ticket = getQrLoginTicket(body.token || '');

      if (!ticket) {
        sendJson(response, 404, { message: 'ɨ���¼��ά����ʧЧ���뷵��ԭҳ��ˢ��' });
        return;
      }

      updateQrLoginTicket(ticket.token, {
        status: 'approved',
        username: session.username,
        createdAt: ticket.createdAt,
        expiresAt: ticket.expiresAt
      });

      sendJson(response, 200, {
        message: `��ȷ��ʹ���˺� ${session.username} ��¼`,
        username: session.username,
        expiresInMs: Math.max(0, ticket.expiresAt - Date.now())
      });
    })
    .catch((error) => {
      const statusCode = error.message === 'Invalid JSON' ? 400 : 413;
      sendJson(response, statusCode, { message: error.message });
    });
}

function handleCommunityQrLoginTicketIssue(request, response) {
  const ticketToken = issueCommunityQrLoginTicket();
  sendJson(response, 200, {
    token: ticketToken,
    expiresInMs: communityQrLoginTicketLifetimeMs,
    version: appVersion
  });
}

function handleCommunityQrLoginStatus(request, response) {
  const url = new URL(request.url || '/', `http://${host}:${port}`);
  const ticket = getCommunityQrLoginTicket(url.searchParams.get('token'));
  const rememberLogin = ['1', 'true', 'yes', 'on'].includes(String(url.searchParams.get('rememberLogin') || '').trim().toLowerCase());

  if (!ticket) {
    sendJson(response, 404, { message: '扫码登录二维码已失效，请刷新后重试' });
    return;
  }

  if (ticket.status !== 'approved' || !ticket.username || !ticket.email) {
    sendJson(response, 200, {
      status: ticket.status,
      expiresInMs: Math.max(0, ticket.expiresAt - Date.now())
    });
    return;
  }

  const token = issueCommunitySession(
    response,
    ticket.username,
    ticket.email,
    Boolean(ticket.isDeveloper),
    rememberLogin ? rememberedCommunitySessionLifetimeMs : communitySessionLifetimeMs
  );
  communityQrLoginTickets.delete(ticket.token);
  sendJson(response, 200, {
    status: 'approved',
    username: ticket.username,
    email: ticket.email,
    isDeveloper: Boolean(ticket.isDeveloper),
    token,
    version: appVersion
  });
}

function handleCommunityQrLoginApprove(request, response) {
  const session = getCommunitySessionFromRequest(request);

  if (!session) {
    sendJson(response, 401, { message: '请先在扫码设备登录商店账号' });
    return;
  }

  parseRequestBody(request)
    .then((body) => {
      const ticket = getCommunityQrLoginTicket(body.token || '');

      if (!ticket) {
        sendJson(response, 404, { message: '扫码登录二维码已失效，请返回原设备刷新' });
        return;
      }

      markCommunityAccountLogin(session.email);
      updateCommunityQrLoginTicket(ticket.token, {
        status: 'approved',
        username: session.username,
        email: session.email,
        isDeveloper: Boolean(session.isDeveloper),
        createdAt: ticket.createdAt,
        expiresAt: ticket.expiresAt
      });

      sendJson(response, 200, {
        message: `已确认使用账号 ${session.username} 登录`,
        username: session.username,
        email: session.email,
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
    deleteAuthSession(session.sessionToken);
  }

  clearSessionCookie(response);
  sendJson(response, 200, { message: '���˳���¼' });
}

function handlePasswordChange(request, response) {
  const session = getSessionFromRequest(request);

  if (!session) {
    sendJson(response, 401, { message: 'δ��¼' });
    return;
  }

  parseRequestBody(request)
    .then((body) => {
      const currentPassword = String(body.currentPassword || '');
      const nextPassword = String(body.nextPassword || '');
      const confirmPassword = String(body.confirmPassword || '');

      if (!currentPassword || !nextPassword || !confirmPassword) {
        sendJson(response, 400, { message: '��������д��ǰ���롢�������ȷ������' });
        return;
      }

      if (nextPassword.length < 6) {
        sendJson(response, 400, { message: '�����볤������ 6 λ' });
        return;
      }

      if (nextPassword !== confirmPassword) {
        sendJson(response, 400, { message: '��������������벻һ��' });
        return;
      }

      const user = db.prepare('SELECT password_hash FROM users WHERE username = ?').get(session.username);

      if (!user || !verifyPassword(currentPassword, user.password_hash)) {
        sendJson(response, 401, { message: '��ǰ�������' });
        return;
      }

      if (verifyPassword(nextPassword, user.password_hash)) {
        sendJson(response, 400, { message: '�����벻���뵱ǰ������ͬ' });
        return;
      }

      db.prepare('UPDATE users SET password_hash = ? WHERE username = ?').run(hashPassword(nextPassword), session.username);

      sendJson(response, 200, {
        message: '�����޸ĳɹ�',
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
  return 'AI �����ѻָ�����';
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
    sendJson(response, 401, { message: 'δ��¼' });
    return null;
  }

  if (!isDeveloper(session.username)) {
    sendJson(response, 403, { message: '��Ȩ���˺ſɷ���' });
    return null;
  }

  return session;
}

function handleBugReportCreate(request, response) {
  const session = getSessionFromRequest(request);

  if (!session) {
    sendJson(response, 401, { message: '���ȵ�¼�����ύ bug ����' });
    return;
  }

  parseRequestBody(request)
    .then((body) => {
      const title = String(body.title || '').trim();
      const category = String(body.category || '����').trim() || '����';
      const description = String(body.description || '').trim();
      const contact = String(body.contact || '').trim();

      if (title.length < 4 || title.length > 80) {
        sendJson(response, 400, { message: '���ⳤ����Ϊ 4-80 ���ַ�' });
        return;
      }

      if (description.length < 10 || description.length > 5000) {
        sendJson(response, 400, { message: '��������������Ϊ 10-5000 ���ַ�' });
        return;
      }

      if (contact.length > 120) {
        sendJson(response, 400, { message: '��ϵ��ʽ���Ȳ��ܳ��� 120 ���ַ�' });
        return;
      }

      db.prepare(
        `INSERT INTO bug_reports (username, title, category, description, contact)
         VALUES (?, ?, ?, ?, ?)`
      ).run(session.username, title, category, description, contact);

      sendJson(response, 201, {
        message: 'Bug �������ύ��Ȩ���Ժ��鿴��',
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
    sendJson(response, 401, { message: 'δ��¼' });
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
        sendJson(response, 400, { message: 'ȱ����Ч�ķ������' });
        return;
      }

      if (!allowedStatus.has(status)) {
        sendJson(response, 400, { message: '״̬��Ч' });
        return;
      }

      const result = db.prepare(
        `UPDATE bug_reports
         SET status = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`
      ).run(status, id);

      if (!result.changes) {
        sendJson(response, 404, { message: 'δ�ҵ���Ӧ�� bug ����' });
        return;
      }

      sendJson(response, 200, {
        message: '����״̬�Ѹ���',
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
      sendJson(response, 404, { message: '�ļ�������' });
      return;
    }

    const stat = fs.statSync(absolutePath);

    if (stat.size > 1024 * 512) {
      sendJson(response, 400, { message: '�ļ������ݲ�֧�����߱༭' });
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
    sendJson(response, 400, { message: error.message || '��ȡ�ļ�ʧ��' });
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
        sendJson(response, 404, { message: '�ļ�������' });
        return;
      }

      if (Buffer.byteLength(content, 'utf8') > 1024 * 512) {
        sendJson(response, 400, { message: '�ļ����ݹ��󣬱���ʧ��' });
        return;
      }

      fs.writeFileSync(absolutePath, content, 'utf8');
      sendJson(response, 200, {
        message: '�ļ��ѱ���',
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
        message: '�汾���Ѹ���',
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

  if (normalizedPrompt.includes('����') || normalizedPrompt.includes('tp')) {
    const coordinateMatch = normalizedPrompt.match(/(-?\d+)\s+(-?\d+)\s+(-?\d+)/);
    const destination = coordinateMatch ? coordinateMatch.slice(1).join(' ') : '@s';
    return {
      commandName: 'ai-tp',
      commandText: `tp @p ${destination}`,
      confidence: 0.88,
      label: 'AI ���ͽ���'
    };
  }

  if (normalizedPrompt.includes('��') || normalizedPrompt.includes('��Ʒ') || normalizedPrompt.includes('give')) {
    const countMatch = normalizedPrompt.match(/(\d+)\s*(��|��|����Ʒ)?/);
    const count = countMatch ? Math.max(1, Number.parseInt(countMatch[1], 10)) : 1;
    const item = normalizedPrompt.includes('��ʯ') ? 'minecraft:diamond' : 'minecraft:stone';
    return {
      commandName: 'ai-give',
      commandText: `give @p ${item} ${count}`,
      confidence: 0.86,
      label: 'AI ���轨��'
    };
  }

  if (normalizedPrompt.includes('�ٻ�') || normalizedPrompt.includes('summon')) {
    const entity = normalizedPrompt.includes('��ʬ') ? 'minecraft:zombie' : 'minecraft:pig';
    return {
      commandName: 'ai-summon',
      commandText: `summon ${entity} ~ ~ ~`,
      confidence: 0.84,
      label: 'AI �ٻ�����'
    };
  }

  if (normalizedPrompt.includes('Ч��') || normalizedPrompt.includes('�ٶ�') || normalizedPrompt.includes('effect')) {
    return {
      commandName: 'ai-effect',
      commandText: 'effect give @p minecraft:speed 30 1 true',
      confidence: 0.82,
      label: 'AI Ч������'
    };
  }

  if (normalizedPrompt.includes('ʱ��') || normalizedPrompt.includes('����') || normalizedPrompt.includes('ҹ��') || normalizedPrompt.includes('time')) {
    const value = normalizedPrompt.includes('ҹ') ? '13000' : '1000';
    return {
      commandName: 'ai-time',
      commandText: `time set ${value}`,
      confidence: 0.8,
      label: 'AI ʱ�佨��'
    };
  }

  if (normalizedPrompt.includes('���') || normalizedPrompt.includes('����') || normalizedPrompt.includes('clear')) {
    return {
      commandName: 'ai-clear',
      commandText: 'clear @p',
      confidence: 0.81,
      label: 'AI ��ս���'
    };
  }

  if (normalizedPrompt.includes('�Ѷ�') || normalizedPrompt.includes('����') || normalizedPrompt.includes('��ƽ') || normalizedPrompt.includes('difficulty')) {
    const level = normalizedPrompt.includes('��ƽ') ? 'peaceful' : normalizedPrompt.includes('����') ? 'hard' : 'normal';
    return {
      commandName: 'ai-difficulty',
      commandText: `difficulty ${level}`,
      confidence: 0.79,
      label: 'AI �ѶȽ���'
    };
  }

  if (normalizedPrompt.includes('����') || normalizedPrompt.includes('����������') || normalizedPrompt.includes('gamerule')) {
    const rule = normalizedPrompt.includes('����������') ? 'keepInventory' : 'doDaylightCycle';
    const value = normalizedPrompt.includes('��') || normalizedPrompt.includes('false') ? 'false' : 'true';
    return {
      commandName: 'ai-gamerule',
      commandText: `gamerule ${rule} ${value}`,
      confidence: 0.78,
      label: 'AI ������'
    };
  }

  if (normalizedPrompt.includes('��λ') || normalizedPrompt.includes('��ׯ') || normalizedPrompt.includes('locate')) {
    const target = normalizedPrompt.includes('��ׯ') ? 'minecraft:village' : 'minecraft:trial_chambers';
    return {
      commandName: 'ai-locate',
      commandText: `locate structure ${target}`,
      confidence: 0.77,
      label: 'AI ��λ����'
    };
  }

  if (normalizedPrompt.includes('����') || normalizedPrompt.includes('����') || normalizedPrompt.includes('title')) {
    return {
      commandName: 'ai-title',
      commandText: 'title @a title {"text":"��ӭ����������"}',
      confidence: 0.76,
      label: 'AI ���⽨��'
    };
  }

  return {
    commandName: 'ai-general',
    commandText: '������������һЩ�����硰���� 3 ����ʯ���򡰴��͵� 0 64 0��',
    confidence: 0.4,
    label: 'AI ��ʾ'
  };
}

function generateSvipAiCommand(prompt) {
  const normalizedPrompt = normalizePrompt(prompt);

  if (!normalizedPrompt) {
    return null;
  }

  if (normalizedPrompt.includes('��ʯ') || normalizedPrompt.includes('diamond')) {
    const countMatch = normalizedPrompt.match(/(\d+)/);
    const count = countMatch ? Math.max(1, Number.parseInt(countMatch[1], 10)) : 3;
    return {
      commandName: 'svip-ai-give',
      commandText: `give @p minecraft:diamond ${count}`,
      confidence: 0.96,
      label: 'SVIP AI �߽���Ʒ����',
      reasoning: '��⵽��ʯ��������ʹ�ø���ȷ����Ʒ ID ��������'
    };
  }

  if (normalizedPrompt.includes('����') || normalizedPrompt.includes('tp')) {
    const coordinateMatch = normalizedPrompt.match(/(-?\d+)\s+(-?\d+)\s+(-?\d+)/);
    const destination = coordinateMatch ? coordinateMatch.slice(1).join(' ') : '0 64 0';
    return {
      commandName: 'svip-ai-tp',
      commandText: `tp @p ${destination}`,
      confidence: 0.95,
      label: 'SVIP AI �߽״��ͽ���',
      reasoning: '���ȳ�ȡ��ά���꣬����ȱʧʱ��Ĭ�ϰ�ȫ���ꡣ'
    };
  }

  if (normalizedPrompt.includes('��ʬ') || normalizedPrompt.includes('zombie') || normalizedPrompt.includes('�ٻ�')) {
    return {
      commandName: 'svip-ai-summon',
      commandText: 'summon minecraft:zombie ~ ~ ~ {CustomName:"\"Boss\"",Health:40f,PersistenceRequired:1b}',
      confidence: 0.93,
      label: 'SVIP AI �߽��ٻ�����',
      reasoning: '�����ٻ���ͼ�����˸����ӵ�ʵ�� NBT ʾ����'
    };
  }

  if (normalizedPrompt.includes('ҹ��') || normalizedPrompt.includes('�ٶ�') || normalizedPrompt.includes('Ч��')) {
    const effectId = normalizedPrompt.includes('ҹ��') ? 'minecraft:night_vision' : 'minecraft:speed';
    return {
      commandName: 'svip-ai-effect',
      commandText: `effect give @p ${effectId} 120 1 true`,
      confidence: 0.92,
      label: 'SVIP AI �߽�Ч������',
      reasoning: 'ʶ��״̬Ч�������Զ���������ʱ�䲢�������ӡ�'
    };
  }

  if (normalizedPrompt.includes('����') || normalizedPrompt.includes('particle')) {
    return {
      commandName: 'svip-ai-particle',
      commandText: 'particle minecraft:flame ~ ~1 ~ 0.5 0.5 0.5 0 20 force @a',
      confidence: 0.91,
      label: 'SVIP AI �߽����ӽ���',
      reasoning: 'ʶ���Ӿ�Ч�������Զ���ȫ���ӷ�Χ�������Ϳɼ�Ŀ�ꡣ'
    };
  }

  if (normalizedPrompt.includes('����') || normalizedPrompt.includes('��Ч') || normalizedPrompt.includes('playsound')) {
    return {
      commandName: 'svip-ai-playsound',
      commandText: 'playsound minecraft:entity.player.levelup master @a ~ ~ ~ 1 1 0',
      confidence: 0.9,
      label: 'SVIP AI �߽���Ч����',
      reasoning: 'ʶ����Ч������ͼ���Զ���������Դ�����������������'
    };
  }

  const fallback = generateAiCommand(prompt);

  return fallback
    ? {
        ...fallback,
        commandName: `svip-${fallback.commandName}`,
        confidence: Math.min(0.99, fallback.confidence + 0.08),
        label: `SVIP ��ǿ �� ${fallback.label}`,
        reasoning: 'ʹ���� SVIP ��ǿ��ʾ���ԣ��Ի�����������˲�ǿ��'
      }
    : null;
}

function handleVipPurchase(request, response) {
  const session = getSessionFromRequest(request);

  if (!session) {
    sendJson(response, 401, { message: 'δ��¼' });
    return;
  }

  if (vipSystemPaused) {
    sendJson(response, 503, {
      message: 'VIP ������ʱ�ر�',
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
      message: 'VIP �ѿ�ͨ',
      username: session.username,
      version: appVersion,
      price: 10,
      ...getVipInfo(session.username)
    });
    return;
  }

  db.prepare('INSERT INTO vip_purchases (username, amount) VALUES (?, ?)').run(session.username, 10);

  sendJson(response, 201, {
    message: 'VIP ��ͨ�ɹ�',
    username: session.username,
    version: appVersion,
    price: 10,
    ...getVipInfo(session.username)
  });
}

function handleSvipPurchase(request, response) {
  const session = getSessionFromRequest(request);

  if (!session) {
    sendJson(response, 401, { message: 'δ��¼' });
    return;
  }

  if (vipSystemPaused) {
    sendJson(response, 503, {
      message: 'VIP ������ʱ�ر�',
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
      message: 'SVIP �ѿ�ͨ',
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
    message: 'SVIP ��ͨ�ɹ�',
    username: session.username,
    version: appVersion,
    price: upgradePrice,
    ...getVipInfo(session.username)
  });
}

function handleAvatarUpload(request, response) {
  const session = getSessionFromRequest(request);

  if (!session) {
    sendJson(response, 401, { message: 'δ��¼' });
    return;
  }

  parseRequestBody(request)
    .then((body) => {
      const imageData = String(body.imageData || '');
      const match = imageData.match(/^data:(image\/(png|jpeg|jpg|webp));base64,(.+)$/);

      if (!match) {
        sendJson(response, 400, { message: '��֧�� PNG��JPG��WEBP ͼƬ' });
        return;
      }

      const extension = match[2] === 'jpeg' || match[2] === 'jpg' ? '.jpg' : match[2] === 'png' ? '.png' : '.webp';
      const fileName = `${session.username}${extension}`;
      const absolutePath = path.join(avatarsDir, fileName);
      const buffer = Buffer.from(match[3], 'base64');

      if (buffer.length > 1024 * 1024 * 2) {
        sendJson(response, 400, { message: 'ͷ��ͼƬ���ܳ��� 2MB' });
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
        message: 'ͷ���ϴ��ɹ�',
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
    sendJson(response, 401, { message: 'δ��¼' });
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
    message: 'ͷ����ɾ��',
    ...getUserPayload(session.username)
  });
}

function handleAiGenerate(request, response) {
  const session = getSessionFromRequest(request);

  if (!session) {
    sendJson(response, 401, { message: 'δ��¼' });
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
    sendJson(response, 403, { message: 'AI ���ܽ��� VIP ʹ��' });
    return;
  }

  parseRequestBody(request)
    .then((body) => {
      const prompt = String(body.prompt || '').trim();
      const result = vipInfo.svipPurchased ? generateSvipAiCommand(prompt) : generateAiCommand(prompt);

      if (!result) {
        sendJson(response, 400, { message: '������Ҫ���ɵ�����' });
        return;
      }

      if (result.commandText && !result.commandText.startsWith('������������һЩ')) {
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
    throw new Error('������δ���� DeepSeek API Key��������д config/api-keys.json');
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
                  '����"�ҵ����繤����"�� SVIP AI ���֡�',
                  '��ʼ��ʹ�ü������Ļش�',
                  '���Ȼش� Minecraft ָ��淨����ʯ���䷽�����ꡢ����������������⡣',
                  '��������ʺϸ����裬�����ಽ�裻����ʺϸ���������ֱ�Ӹ��Ƶ����'
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
          : `DeepSeek ����ʧ�ܣ�${response.status}��`;
        lastError = new Error(`${modelName}: ${errorMessage}`);
        continue;
      }

      const answer = ((result.choices || [])[0] || {}).message?.content?.trim() || '';

      if (!answer) {
        lastError = new Error(`${modelName}: ģ��δ�����ı�����`);
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

  throw lastError || new Error('DeepSeek ����ʧ��');
}

function handleAiChat(request, response) {
  const session = getSessionFromRequest(request);

  if (!session) {
    sendJson(response, 401, { message: 'δ��¼' });
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
    sendJson(response, 403, { message: 'AI �ʴ���� SVIP ʹ��' });
    return;
  }

  parseRequestBody(request)
    .then(async (body) => {
      const question = String(body.question || '').trim();

      if (!question) {
        sendJson(response, 400, { message: '������Ҫ���ʵ�����' });
        return;
      }

      const result = await callDeepSeekAnswer(question);
      sendJson(response, 200, {
        message: 'AI �ظ��ɹ�',
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
      sendJson(response, statusCode, { message: error.message || 'AI �ʴ�ʧ��' });
    });
}

function handleExecutorRun(request, response) {
  const session = getSessionFromRequest(request);

  if (!session) {
    sendJson(response, 401, { message: 'δ��¼' });
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
    sendJson(response, 403, { message: 'ָ��ִ�������� SVIP ʹ��' });
    return;
  }

  parseRequestBody(request)
    .then((body) => {
      const commandText = String(body.commandText || '').trim();

      if (!commandText) {
        sendJson(response, 400, { message: '������Ҫִ�е�ָ��' });
        return;
      }

      const normalized = commandText.replace(/^\//, '');
      let summary = 'ָ���ѽ���ģ��ִ������';

      if (normalized.startsWith('give ')) {
        summary = 'ģ��ִ����ɣ���ʶ��Ϊ������ָ��';
      } else if (normalized.startsWith('tp ')) {
        summary = 'ģ��ִ����ɣ���ʶ��Ϊ������ָ��';
      } else if (normalized.startsWith('summon ')) {
        summary = 'ģ��ִ����ɣ���ʶ��Ϊ�ٻ���ָ��';
      } else if (normalized.startsWith('effect ')) {
        summary = 'ģ��ִ����ɣ���ʶ��Ϊ״̬Ч����ָ��';
      }

      db.prepare(
        'INSERT INTO command_history (username, command_name, command_text, input_json) VALUES (?, ?, ?, ?)'
      ).run(session.username, 'executor', commandText, JSON.stringify({ source: 'executor' }));

      sendJson(response, 200, {
        message: 'ִ�����',
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
    sendJson(response, 401, { message: 'δ��¼' });
    return;
  }

  parseRequestBody(request)
    .then((body) => {
      const commandName = String(body.commandName || '').trim();
      const commandText = String(body.commandText || '').trim();
      const inputJson = JSON.stringify(body.inputs || {});
      const vipInfo = getVipInfo(session.username);

      if (!commandName || !commandText) {
        sendJson(response, 400, { message: 'ָ�����ݲ���Ϊ��' });
        return;
      }

      if (vipOnlyCommandNames.has(commandName) && !hasVipFeatureAccess(vipInfo)) {
        sendJson(response, 403, { message: '��������ָ����� VIP ʹ��' });
        return;
      }

      db.prepare(
        'INSERT INTO command_history (username, command_name, command_text, input_json) VALUES (?, ?, ?, ?)'
      ).run(session.username, commandName, commandText, inputJson);

      sendJson(response, 201, { message: 'ָ���ѱ���' });
    })
    .catch((error) => {
      const statusCode = error.message === 'Invalid JSON' ? 400 : 413;
      sendJson(response, statusCode, { message: error.message });
    });
}

function handleDeleteCommand(request, response) {
  const session = getSessionFromRequest(request);

  if (!session) {
    sendJson(response, 401, { message: 'δ��¼' });
    return;
  }

  parseRequestBody(request)
    .then((body) => {
      const id = Number.parseInt(body.id, 10);

      if (!id) {
        sendJson(response, 400, { message: 'ȱ����ʷ��¼ ID' });
        return;
      }

      const command = db.prepare('SELECT id FROM command_history WHERE id = ? AND username = ?').get(id, session.username);

      if (!command) {
        sendJson(response, 404, { message: '��ʷ��¼������' });
        return;
      }

      db.prepare('DELETE FROM command_history WHERE id = ? AND username = ?').run(id, session.username);
      sendJson(response, 200, { message: '��ʷ��¼��ɾ��' });
    })
    .catch((error) => {
      const statusCode = error.message === 'Invalid JSON' ? 400 : 413;
      sendJson(response, statusCode, { message: error.message });
    });
}

function handleClearCommands(request, response) {
  const session = getSessionFromRequest(request);

  if (!session) {
    sendJson(response, 401, { message: 'δ��¼' });
    return;
  }

  db.prepare('DELETE FROM command_history WHERE username = ?').run(session.username);
  sendJson(response, 200, { message: '��ʷ��¼��ȫ�����' });
}

function handleListCommands(request, response) {
  const session = getSessionFromRequest(request);

  if (!session) {
    sendJson(response, 401, { message: 'δ��¼' });
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
      const category = String(body.category || 'ͨ��').trim() || 'ͨ��';

      if (!submitterName || !commandText) {
        sendJson(response, 400, { message: 'Ͷ���ǳƺ�ָ�����ݲ���Ϊ��' });
        return;
      }

      const result = db.prepare(
        'INSERT INTO command_submissions (submitter_name, command_text, description, category) VALUES (?, ?, ?, ?)'
      ).run(submitterName, commandText, description, category);

      sendJson(response, 201, { message: 'Ͷ�����ύ���ȴ���̨���', id: result.lastInsertRowid });
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
    sendJson(response, 401, { message: 'δ��¼' });
    return;
  }

  if (!isDeveloper(session.username)) {
    sendJson(response, 403, { message: '��Ȩ�޿����' });
    return;
  }

  parseRequestBody(request)
    .then((body) => {
      const id = Number.parseInt(body.id, 10);
      const status = String(body.status || '').trim().toUpperCase();
      const reviewNote = String(body.reviewNote || '').trim();

      if (!id || !['APPROVED', 'REJECTED', 'PENDING'].includes(status)) {
        sendJson(response, 400, { message: '������Ч' });
        return;
      }

      const item = db.prepare('SELECT id FROM command_submissions WHERE id = ?').get(id);

      if (!item) {
        sendJson(response, 404, { message: 'Ͷ�岻����' });
        return;
      }

      db.prepare(
        'UPDATE command_submissions SET status = ?, reviewer_name = ?, review_note = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
      ).run(status, session.username, reviewNote, id);

      sendJson(response, 200, { message: '���״̬�Ѹ���' });
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
  const displayName = pageName === 'index' ? '��ҳ' : pageName;

  html = html.replace(/<script\b(?=[^>]*\bsrc=)[^>]*>\s*<\/script>/giu, '');
  html = html.replace(/<title>(.*?)<\/title>/iu, '<title>�ҵ����繤���� - ����Ԥ��</title>');

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
        <p class="panel-label">��������</p>
        <h2>��ǰҳ�� ${displayName} �Ĺ���Ԥ������ҳ</h2>
        <p>ҳ��ṹ�͵����ѿ������������ť���ύ��������д�������������ʾ�ȵ�¼������Լ���������Ԥ��ҳ������ִ�й���ʱ�ٻص�¼ҳ��</p>
      </section>
`;

  if (/<main\b[^>]*>/iu.test(html)) {
    html = html.replace(/<main\b([^>]*)>/iu, `<main$1>${previewBanner}`);
  }

  html = injectGlobalPreferencesScript(html);

  const previewOverlay = `
      <aside class="preview-fixed-tip" aria-label="��¼��ʾ">
        <strong>���ǹ�������ҳ</strong>
        <p>��������ҳ��ṹ��˵���������й��ܲ������ύ��д������ض���Ҫ��¼��ʹ�á�</p>
        <div class="preview-fixed-actions">
          <a class="preview-fixed-link preview-fixed-link-primary" href="/login.html">������¼</a>
          <a class="preview-fixed-link" href="/preview.html">�ص�����</a>
        </div>
      </aside>
      <div class="preview-login-modal" hidden data-preview-modal>
        <div class="preview-login-dialog">
          <p class="panel-label">��Ҫ��¼</p>
          <h2>Ԥ��ҳ��������ʵ���ܲ���</h2>
          <p>��ǰ��������ֻ����ҳ��ṹ�������ť���ύ������������Դ��ִ��ģ�鹦��ʱ����Ҫ�ȵ�¼��ʽ���档</p>
          <div class="preview-fixed-actions">
            <a class="preview-fixed-link preview-fixed-link-primary" href="/login.html" data-preview-allow="true">ǰ����¼</a>
            <button type="button" class="preview-fixed-link" data-preview-modal-close data-preview-allow="true">�������</button>
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
  const siteMaintenanceEnabled = getStoreMaintenanceEnabled();
  const maintenanceBypass = siteMaintenanceEnabled && hasMaintenanceBypass(request);
  const isMaintenanceActive = siteMaintenanceEnabled && !maintenanceBypass;

  // �����������㳡 (3000) ������� 3001 �� API��Я�� Cookie��
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
    // �������㳡���� API
    if (request.method === 'GET' && pathname === '/api/servers') {
      handleServerListingsGet(request, response);
      return;
    }

    if (request.method === 'POST' && pathname === '/api/servers') {
      handleServerListingCreate(request, response);
      return;
    }

    // Plaza ��֤
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

    // ��̬��Դ����ʽ������ҳ�ű�
    if (request.method === 'GET' && (pathname === '/styles.css' || pathname === '/server-plaza.js' || pathname.startsWith('/assets/'))) {
      serveStatic(pathname, response);
      return;
    }

    // ��·��������ҳ����
    if (request.method === 'GET' || request.method === 'HEAD') {
      const mainPath = pathname === '/' ? '/index.html' : pathname;
      const staticFilePath = resolvePublicFilePath(mainPath);

      if (staticFilePath) {
        serveStatic(mainPath, response);
      } else {
        sendPortClosedNotice(response, request);
      }

      return;
    }

    sendJson(response, 405, { message: '����������' });
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

    if (request.method === 'POST' && pathname === '/api/community/preferences') {
      handleCommunityPreferencesUpdate(request, response);
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

    sendJson(response, 405, { message: '����������' });
    return;
  }

  if (Number(port) === 3005) {
    if (request.method === 'GET' || request.method === 'HEAD') {
      const transferPath = pathname === '/' ? '/transfer.html' : pathname;
      const staticFilePath = resolvePublicFilePath(transferPath);

      if (staticFilePath) {
        serveStatic(transferPath, response);
      } else {
        sendPortClosedNotice(response, request);
      }
      return;
    }

    sendJson(response, 405, { message: '����������' });
    return;
  }

  if (Number(port) === 3004) {
    if (request.method === 'POST' && pathname === '/api/community/register') {
      handleCommunityRegister(request, response);
      return;
    }

    if (request.method === 'GET' && pathname === '/api/community/qr') {
      handleCommunityQrLoginTicketIssue(request, response);
      return;
    }

    if (request.method === 'GET' && pathname === '/api/community/qr/status') {
      handleCommunityQrLoginStatus(request, response);
      return;
    }

    if (request.method === 'POST' && pathname === '/api/community/qr/approve') {
      handleCommunityQrLoginApprove(request, response);
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

    if (request.method === 'GET' && pathname === '/api/community/google/client-id') {
      handleCommunityGoogleClientId(request, response);
      return;
    }

    if (request.method === 'GET' && pathname === '/api/community/google/authorize') {
      handleCommunityGoogleAuthorize(request, response);
      return;
    }

    if (request.method === 'GET' && pathname === '/api/community/google/callback') {
      handleCommunityGoogleCallback(request, response);
      return;
    }

    if (request.method === 'POST' && pathname === '/api/community/google-login') {
      handleCommunityGoogleLogin(request, response);
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
        defaultPaymentMethod: readiness.defaultPaymentMethod,
        missing: readiness.missing,
        providers: readiness.providers
      });
      return;
    }

    if (request.method === 'GET' && pathname === '/api/store/background-image') {
      handleStoreBackgroundImage(request, response);
      return;
    }

    if (request.method === 'GET' && pathname === '/api/store/products') {
      handleStoreProducts(request, response);
      return;
    }

    if (request.method === 'GET' && pathname === '/api/store/reviews') {
      handleStoreProductReviews(request, response);
      return;
    }

    if (request.method === 'POST' && pathname === '/api/store/reviews') {
      handleStoreProductReviewCreate(request, response);
      return;
    }

    if (request.method === 'GET' && pathname === '/api/store/reviews/admin') {
      handleStoreProductReviewsAdmin(request, response);
      return;
    }

    if (request.method === 'POST' && pathname === '/api/store/reviews/admin/moderate') {
      handleStoreProductReviewModerate(request, response);
      return;
    }

    if (request.method === 'GET' && pathname === '/api/store/questions') {
      handleStoreProductQuestions(request, response);
      return;
    }

    if (request.method === 'POST' && pathname === '/api/store/questions') {
      handleStoreProductQuestionCreate(request, response);
      return;
    }

    if (request.method === 'GET' && pathname === '/api/store/questions/admin') {
      handleStoreProductQuestionsAdmin(request, response);
      return;
    }

    if (request.method === 'POST' && pathname === '/api/store/questions/admin/answer') {
      handleStoreProductQuestionAnswer(request, response);
      return;
    }

    if (request.method === 'GET' && pathname === '/api/store/tickets') {
      handleStoreSupportTickets(request, response);
      return;
    }

    if (request.method === 'POST' && pathname === '/api/store/tickets') {
      handleStoreSupportTicketCreate(request, response);
      return;
    }

    if (request.method === 'GET' && pathname === '/api/store/tickets/admin') {
      handleStoreSupportTicketsAdmin(request, response);
      return;
    }

    if (request.method === 'POST' && pathname === '/api/store/tickets/admin/reply') {
      handleStoreSupportTicketReply(request, response);
      return;
    }

    if (request.method === 'GET' && pathname === '/api/store/points') {
      handleStorePoints(request, response);
      return;
    }

    if (request.method === 'POST' && pathname === '/api/store/points/checkin') {
      handleStorePointsCheckin(request, response);
      return;
    }

    if (request.method === 'GET' && pathname === '/api/store/points/calendar') {
      handleStorePointsCalendar(request, response);
      return;
    }

    if (request.method === 'POST' && pathname === '/api/store/checkin/reset') {
      handleStoreCheckinReset(request, response);
      return;
    }

    if (request.method === 'GET' && pathname === '/api/store/mall/items') {
      handleStoreMallItems(request, response);
      return;
    }

    if (request.method === 'POST' && pathname === '/api/store/mall/redeem') {
      handleStoreMallRedeem(request, response);
      return;
    }

    if (request.method === 'GET' && pathname === '/api/store/mall/my') {
      handleStoreMallMy(request, response);
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

    if (request.method === 'GET' && pathname === '/api/store/coupons/admin') {
      handleStoreCouponsAdmin(request, response);
      return;
    }

    if (request.method === 'POST' && pathname === '/api/store/coupons/admin/create') {
      handleStoreCouponCreate(request, response);
      return;
    }

    if (request.method === 'POST' && pathname === '/api/store/coupons/admin/toggle') {
      handleStoreCouponToggle(request, response);
      return;
    }

    if (request.method === 'POST' && pathname === '/api/store/coupons/admin/delete') {
      handleStoreCouponDelete(request, response);
      return;
    }

    if (request.method === 'POST' && pathname === '/api/store/coupons/quote') {
      handleStoreCouponQuote(request, response);
      return;
    }

    if (request.method === 'GET' && pathname === '/api/store/orders/admin') {
      handleStoreOrdersAdmin(request, response);
      return;
    }

    if (request.method === 'GET' && pathname === '/api/store/card-secrets') {
      handleStoreCardSecretsRead(request, response);
      return;
    }

    if (request.method === 'POST' && pathname === '/api/store/card-secrets/generate') {
      handleStoreCardSecretsGenerate(request, response);
      return;
    }

    if (request.method === 'POST' && pathname === '/api/store/card-secrets/delete') {
      handleStoreCardSecretsDelete(request, response);
      return;
    }

    if (request.method === 'GET' && pathname === '/api/store/orders/by-contact') {
      handleStoreOrdersByContact(request, response);
      return;
    }

    if (request.method === 'GET' && pathname === '/api/store/orders/mine') {
      handleStoreMyOrders(request, response);
      return;
    }

    if (request.method === 'POST' && pathname === '/api/store/orders/admin/update') {
      handleStoreOrderUpdate(request, response);
      return;
    }

    if (request.method === 'POST' && pathname === '/api/store/orders/admin/refund') {
      handleStoreOrderRefund(request, response);
      return;
    }

    if (request.method === 'POST' && pathname === '/api/store/orders/admin/reissue') {
      handleStoreOrderReissue(request, response);
      return;
    }

    if (request.method === 'POST' && pathname === '/api/store/orders/admin/reissue-all') {
      handleStoreOrderReissueAll(request, response);
      return;
    }

    if (request.method === 'GET' && pathname === '/api/lottery/config') {
      handleLotteryConfig(request, response);
      return;
    }

    if (request.method === 'GET' && pathname === '/api/lottery/records') {
      handleLotteryRecords(request, response);
      return;
    }

    if (request.method === 'POST' && pathname === '/api/lottery/draw') {
      handleLotteryDraw(request, response);
      return;
    }

    if (request.method === 'GET' && pathname === '/api/store/settings') {
      handleStoreSettingsRead(request, response);
      return;
    }

    if (request.method === 'POST' && pathname === '/api/store/settings') {
      handleStoreSettingsSave(request, response);
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

    if (request.method === 'POST' && pathname === '/api/store/products/delete') {
      handleStoreProductsDelete(request, response);
      return;
    }

    if (request.method === 'POST' && pathname === '/api/store/products/upload-image') {
      handleStoreProductImageUpload(request, response);
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

    if (request.method === 'GET' && pathname === '/api/app-version') {
      handlePublicVersionRead(request, response);
      return;
    }

    // ���ٴ�������Ȩ���˺ţ������ڲ��ԣ�
    if (request.method === 'POST' && pathname === '/api/dev-test/create-dev-account') {
      const username = 'devtest' + Date.now().toString().slice(-6);
      const email = 'devtest' + Date.now().toString().slice(-6) + '@test.local';
      
      const account = createCommunityAccount(username, email, true);
      const token = crypto.randomBytes(32).toString('hex');
      const session = {
        username,
        email,
        isDeveloper: true,
        lastSeenAt: Date.now(),
        expiresAt: Date.now() + communitySessionLifetimeMs
      };
      
      communitySessions.set(token, session);
      persistAuthSession(token, sessionScopeCommunity, session);
      
      // ֱ�Ӵ�����Ӧ��ȷ��Set-Cookie��������Ӧͷ֮ǰ
      response.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Set-Cookie': [
          `mctools_community=${token}; Path=/; Max-Age=${Math.floor(communitySessionLifetimeMs / 1000)}`,
          `mctools_community_admin=${token}; Path=/; Max-Age=${Math.floor(communitySessionLifetimeMs / 1000)}`
        ]
      });
      response.end(JSON.stringify({
        message: '�����˺Ŵ����ɹ�',
        username,
        email,
        token,
        isDeveloper: true
      }));
      return;
    }

    if (isMaintenanceActive && request.method === 'GET') {
      const allowedPage = (
        pathname === '/maintenance.html' ||
        pathname === '/store-admin.html' ||
        pathname === '/login.html' ||
        pathname === '/login.css' ||
        pathname === '/login.js' ||
        pathname.startsWith('/assets/')
      );

      if (!allowedPage) {
        serveStatic('/maintenance.html', response);
        return;
      }
    }

    if (request.method === 'GET' && (pathname === '/styles.css' || pathname.startsWith('/assets/'))) {
      serveStatic(pathname, response);
      return;
    }

    if (request.method === 'GET' && pathname.startsWith('/product-images/')) {
      const imagePath = path.normalize(path.join(productImagesDir, pathname.replace('/product-images/', '')));

      if (!imagePath.startsWith(productImagesDir)) {
        sendText(response, 403, '403 Forbidden');
        return;
      }

      fs.readFile(imagePath, (error, content) => {
        if (error) {
          sendText(response, 404, '404 Not Found');
          return;
        }

        const extension = path.extname(imagePath).toLowerCase();
        response.writeHead(200, { 'Content-Type': getMimeTypeFromExtension(extension) });
        response.end(content);
      });
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

    sendJson(response, 405, { message: '����������' });
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

  if (isMaintenanceActive && pathname.startsWith('/api/') && !isMaintenanceAllowedApi(pathname)) {
    sendJson(response, 503, {
      message: getStoreMaintenanceMessage(),
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

  if (pathname.startsWith('/product-images/')) {
    const imagePath = path.normalize(path.join(productImagesDir, pathname.replace('/product-images/', '')));

    if (!imagePath.startsWith(productImagesDir)) {
      sendText(response, 403, '403 Forbidden');
      return;
    }

    fs.readFile(imagePath, (error, content) => {
      if (error) {
        sendText(response, 404, '404 Not Found');
        return;
      }

      const extension = path.extname(imagePath).toLowerCase();
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