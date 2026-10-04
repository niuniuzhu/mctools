const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const db = new DatabaseSync(path.join('data', 'users.db'));
const orderNo = 'FIXRULE' + Date.now();
const now = new Date().toISOString();

db.prepare(`INSERT INTO store_orders (
  order_no, product_code, product_name, amount_fen, currency, status, payment_method,
  contact, buyer_note, quantity, card_secret, mch_id, app_id, code_url,
  wechat_prepay_id, wechat_transaction_id, request_json, response_json, notify_json,
  created_at, updated_at
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
  .run(
    orderNo,
    'TEST-001',
    '测试商品',
    100,
    'CNY',
    'SUCCESS',
    'wechat',
    'test',
    '',
    1,
    '',
    'mch',
    'app',
    '',
    '',
    '',
    '{}',
    '{}',
    '',
    now,
    now
  );

const row = db.prepare('SELECT order_no AS orderNo, status, card_secret AS cardSecret, product_code AS productCode FROM store_orders WHERE order_no = ?').get(orderNo);
console.log(JSON.stringify(row));

db.close();
console.log(orderNo);
