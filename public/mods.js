const modThemes = ['科技自动化路线：Create / Mekanism 风格', '冒险探索路线：地牢、Boss 和更多维度', '建筑装饰路线：家具、细节方块和照明', '生存强化路线：食物、农业、生态扩展', '联机友好路线：小体量 QoL + 性能优化'];
const modPerformance = ['性能优先：Sodium / Lithium / FerriteCore 这类轻量优化思路', '画面优先：性能优化 + 光影兼容思路', '整合包优先：先稳定核心玩法，再补装饰和画面', '服务器优先：少客户端特化，多同步型与 QoL 型'];
function pickMod(items) { return items[Math.floor(Math.random() * items.length)]; }
function setModText(selector, text) { const element = document.querySelector(selector); if (element) { element.textContent = text; } }
document.querySelector('[data-mod-theme]')?.addEventListener('click', () => setModText('[data-mod-theme-result]', `模组方向：${pickMod(modThemes)}`));
document.querySelector('[data-mod-performance]')?.addEventListener('click', () => setModText('[data-mod-performance-result]', `性能组合：${pickMod(modPerformance)}`));
document.querySelector('[data-mod-pack]')?.addEventListener('click', () => setModText('[data-mod-pack-result]', `整合包思路：${pickMod(modThemes)}；${pickMod(modPerformance)}。`));