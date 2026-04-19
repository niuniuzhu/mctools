const redstoneThemes = ['自动分类仓库', '隐藏活塞门', '甘蔗农场', '刷铁机周边控制', '村民交易提示灯', '陷阱机关入口'];
const redstoneTriggers = ['拉杆手动触发', '压力板瞬时触发', '侦测器更新触发', '绊线钩入侵触发', '比较器状态触发', '日夜传感器自动触发'];

function pickRedstone(items) { return items[Math.floor(Math.random() * items.length)]; }
function setRedstoneText(selector, text) { const element = document.querySelector(selector); if (element) { element.textContent = text; } }
function drawRedstoneTheme() { setRedstoneText('[data-redstone-theme-result]', `电路主题：${pickRedstone(redstoneThemes)}`); }
function drawRedstoneTrigger() { setRedstoneText('[data-redstone-trigger-result]', `触发方式：${pickRedstone(redstoneTriggers)}`); }
function drawRedstonePack() { setRedstoneText('[data-redstone-pack-result]', `方案建议：做一个${pickRedstone(redstoneThemes)}，核心触发使用${pickRedstone(redstoneTriggers)}，并预留检修通道。`); }
document.querySelector('[data-redstone-theme]')?.addEventListener('click', drawRedstoneTheme);
document.querySelector('[data-redstone-trigger]')?.addEventListener('click', drawRedstoneTrigger);
document.querySelector('[data-redstone-pack]')?.addEventListener('click', drawRedstonePack);