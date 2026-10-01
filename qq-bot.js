const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');

const configPath = path.join(__dirname, 'config', 'qq-bot.json');
const defaultConfig = {
  apiBaseUrl: process.env.QQ_BOT_API_BASE_URL || 'http://127.0.0.1:5700',
  wsUrl: process.env.QQ_BOT_WS_URL || 'ws://127.0.0.1:6700',
  commandPrefix: process.env.QQ_BOT_COMMAND_PREFIX || '/',
  adminId: Number(process.env.QQ_BOT_ADMIN_ID || 0),
  autoReplyEnabled: process.env.QQ_BOT_AUTO_REPLY !== 'false'
};

const config = loadConfig();
const state = {
  reconnectTimer: null,
  startedAt: Date.now()
};

function loadConfig() {
  let merged = { ...defaultConfig };

  try {
    if (fs.existsSync(configPath)) {
      const fileContent = fs.readFileSync(configPath, 'utf8');
      const parsed = JSON.parse(fileContent);
      merged = { ...merged, ...parsed };
    }
  } catch (error) {
    console.warn('[QQ-BOT] 配置读取失败，使用默认设置:', error.message);
  }

  return merged;
}

function safeJsonParse(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function extractMessageText(message) {
  if (!message) {
    return '';
  }

  if (typeof message === 'string') {
    return message;
  }

  if (Array.isArray(message)) {
    return message
      .map((item) => {
        if (typeof item === 'string') {
          return item;
        }

        if (item && item.type === 'text') {
          return item.data || '';
        }

        return '';
      })
      .join('')
      .trim();
  }

  return '';
}

async function postJson(url, payload) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const text = await response.text();
  return {
    ok: response.ok,
    status: response.status,
    text
  };
}

async function sendMessage(targetType, targetId, content) {
  const target = targetType === 'group' ? 'send_group_msg' : 'send_private_msg';
  const payload = targetType === 'group'
    ? { group_id: Number(targetId), message: content }
    : { user_id: Number(targetId), message: content };

  const res = await postJson(`${config.apiBaseUrl}/${target}`, payload);

  if (!res.ok) {
    console.error(`[QQ-BOT] 发送消息失败 [${targetType}:${targetId}]`, res.status, res.text);
  }

  return res;
}

function buildReplyText(type, userId, content) {
  const now = new Date();
  const timeText = now.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });

  switch (content) {
    case 'help':
      return `机器人帮助\n\n可用命令：\n${config.commandPrefix}help 查看帮助\n${config.commandPrefix}status 查看状态\n${config.commandPrefix}echo 你好 说一段话\n${config.commandPrefix}time 查看当前时间\n${config.commandPrefix}about 查看说明`; 
    case 'status':
      return `机器人在线中\n运行时间：${Math.floor((Date.now() - state.startedAt) / 1000)} 秒\n当前时间：${timeText}`;
    case 'time':
      return `当前时间：${timeText}`;
    case 'about':
      return `这是一个基于 OneBot 的 QQ 机器人示例\n当前连接地址：${config.apiBaseUrl}\n命令前缀：${config.commandPrefix}`;
    default:
      return `收到消息：${content}\n发送者：${userId}\n类型：${type}`;
  }
}

async function handleCommand(rawText, messageType, userId, groupId) {
  const text = String(rawText || '').trim();
  if (!text) {
    return;
  }

  const pref = config.commandPrefix || '/';
  const normalized = text.startsWith(pref) ? text.slice(pref.length).trim() : text;

  if (!normalized) {
    return;
  }

  const parts = normalized.split(/\s+/);
  const command = parts[0].toLowerCase();
  const args = parts.slice(1);

  if (command === 'help') {
    await reply(messageType, userId, groupId, buildReplyText(messageType, userId, 'help'));
    return;
  }

  if (command === 'status') {
    await reply(messageType, userId, groupId, buildReplyText(messageType, userId, 'status'));
    return;
  }

  if (command === 'time') {
    await reply(messageType, userId, groupId, buildReplyText(messageType, userId, 'time'));
    return;
  }

  if (command === 'about') {
    await reply(messageType, userId, groupId, buildReplyText(messageType, userId, 'about'));
    return;
  }

  if (command === 'echo') {
    const echoed = args.join(' ') || '你好，世界！';
    await reply(messageType, userId, groupId, `回声：${echoed}`);
    return;
  }

  if (command === 'admin' && config.adminId && Number(userId) === Number(config.adminId)) {
    await reply(messageType, userId, groupId, '管理员命令已接收，机器人正在运作。');
    return;
  }

  if (config.autoReplyEnabled && !text.startsWith(pref)) {
    await reply(messageType, userId, groupId, `你说了：${text}`);
  }
}

async function reply(messageType, userId, groupId, content) {
  if (messageType === 'group') {
    await sendMessage('group', groupId, content);
    return;
  }

  await sendMessage('private', userId, content);
}

function handleEvent(event) {
  if (!event || event.post_type !== 'message') {
    return;
  }

  const messageRaw = event.message || '';
  const text = extractMessageText(messageRaw);
  const messageType = event.message_type || 'private';
  const userId = event.user_id || event.sender?.user_id || 0;
  const groupId = event.group_id || 0;

  if (!text) {
    return;
  }

  console.log('[QQ-BOT] 收到消息:', { messageType, userId, groupId, text });

  handleCommand(text, messageType, userId, groupId).catch((error) => {
    console.error('[QQ-BOT] 处理消息失败:', error);
  });
}

function connectToOneBot() {
  const ws = new WebSocket(config.wsUrl, {
    handshakeTimeout: 15000
  });

  ws.on('open', () => {
    console.log(`[QQ-BOT] 已连接到 OneBot WebSocket: ${config.wsUrl}`);
  });

  ws.on('message', (rawData) => {
    const text = rawData.toString();
    const payload = safeJsonParse(text);

    if (!payload) {
      return;
    }

    handleEvent(payload);
  });

  ws.on('error', (error) => {
    console.error('[QQ-BOT] WebSocket 错误:', error.message);
  });

  ws.on('close', () => {
    console.warn('[QQ-BOT] WebSocket 已断开，5 秒后重连...');
    clearTimeout(state.reconnectTimer);
    state.reconnectTimer = setTimeout(() => {
      connectToOneBot();
    }, 5000);
  });

  return ws;
}

(async () => {
  try {
    const healthCheck = await fetch(`${config.apiBaseUrl}/get_version_info`, {
      method: 'GET'
    });

    if (!healthCheck.ok) {
      console.warn('[QQ-BOT] OneBot 接口未就绪，仍将尝试连接 WebSocket，但请先确认 NapCat/Go-CqHttp 已启动。');
    } else {
      const infoText = await healthCheck.text();
      console.log('[QQ-BOT] OneBot 接口健康检查成功:', infoText.slice(0, 200));
    }
  } catch (error) {
    console.warn('[QQ-BOT] OneBot 接口未就绪:', error.message);
  }

  connectToOneBot();
})();

process.on('SIGINT', () => {
  console.log('[QQ-BOT] 机器人正在退出...');
  process.exit(0);
});
