const serverChecks = ['白名单/权限组是否正确', '核心插件和备份任务是否在线', 'TPS 与内存占用是否稳定', '公告和活动规则是否同步'];
const serverEvents = ['末地远征夜', '建筑比赛周末', '红石机关挑战赛', '村民经济交易日', 'PVE Boss 连战'];
const serverPatrols = ['重点检查刷怪塔和刷铁机是否异常', '巡查主城公共区域是否被破坏', '检查经济系统和商店价格是否失衡', '确认新玩家出生点和引导牌是否正常'];
function pickServer(items) { return items[Math.floor(Math.random() * items.length)]; }
function setServerText(selector, text) { const element = document.querySelector(selector); if (element) { element.textContent = text; } }
document.querySelector('[data-server-check]')?.addEventListener('click', () => setServerText('[data-server-check-result]', `开服检查：${pickServer(serverChecks)}`));
document.querySelector('[data-server-event]')?.addEventListener('click', () => setServerText('[data-server-event-result]', `活动主题：${pickServer(serverEvents)}`));
document.querySelector('[data-server-patrol]')?.addEventListener('click', () => setServerText('[data-server-patrol-result]', `巡检重点：${pickServer(serverPatrols)}`));