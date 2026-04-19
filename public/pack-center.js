const packStyles = ['原版增强清晰风', '写实光影电影风', '低像素复古风', '卡通高饱和风', '黑暗生存氛围风'];
const packSpecs = ['低配设备建议轻量资源包 + 无光影', '中配设备建议 16x 资源包 + 轻量光影', '高配设备建议高清材质 + 中高档光影', '直播设备建议优先稳定帧率再拉画面'];
function pickPack(items) { return items[Math.floor(Math.random() * items.length)]; }
function setPackText(selector, text) { const element = document.querySelector(selector); if (element) { element.textContent = text; } }
document.querySelector('[data-pack-style]')?.addEventListener('click', () => setPackText('[data-pack-style-result]', `视觉风格：${pickPack(packStyles)}`));
document.querySelector('[data-pack-spec]')?.addEventListener('click', () => setPackText('[data-pack-spec-result]', `设备建议：${pickPack(packSpecs)}`));
document.querySelector('[data-pack-plan]')?.addEventListener('click', () => setPackText('[data-pack-plan-result]', `方案建议：${pickPack(packStyles)}；${pickPack(packSpecs)}。`));