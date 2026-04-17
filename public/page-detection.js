function scoreMinecraftRelevance(text) {
  const normalized = String(text || '').toLowerCase();
  const keywords = [
    'minecraft', '我的世界', 'mojang', 'bedrock', 'java edition', 'forge', 'fabric',
    'spigot', 'paper', 'bukkit', '末影龙', '下界', 'creeper', 'redstone', '指令',
    '服务器', '方块', '生物群系', 'modrinth', 'curseforge'
  ];
  return keywords.reduce((score, keyword) => score + (normalized.includes(keyword) ? 1 : 0), 0);
}

function detectMinecraftPage() {
  const url = String(document.querySelector('[data-page-url]')?.value || '').trim();
  const title = String(document.querySelector('[data-page-title]')?.value || '').trim();
  const content = String(document.querySelector('[data-page-content]')?.value || '').trim();
  const combined = [url, title, content].join('\n');
  const score = scoreMinecraftRelevance(combined);

  let level = '低相关';
  let summary = '当前内容和 Minecraft 关联度较低。';

  if (score >= 6) {
    level = '高相关';
    summary = '这很可能是 Minecraft 官方、Wiki、模组站或服务器页面。';
  } else if (score >= 3) {
    level = '中相关';
    summary = '内容中包含较多 Minecraft 相关关键词，建议进一步人工确认。';
  }

  const typeHints = [];

  if (/minecraft\.net|mojang/i.test(url)) {
    typeHints.push('疑似官方站');
  }
  if (/wiki|fandom/i.test(url) || /wiki/i.test(title)) {
    typeHints.push('疑似 Wiki 页面');
  }
  if (/modrinth|curseforge|forge|fabric/i.test(combined)) {
    typeHints.push('疑似模组/插件页面');
  }
  if (/server|服务器|spigot|paper|bukkit/i.test(combined)) {
    typeHints.push('疑似服务器相关页面');
  }

  const extra = typeHints.length ? ` 页面类型判断：${typeHints.join('、')}。` : '';
  const result = document.querySelector('[data-page-detect-result]');
  if (result) {
    result.textContent = `检测结果：${level}。关键词命中 ${score} 项。${summary}${extra}`;
  }
}

function fillCurrentPage() {
  const urlInput = document.querySelector('[data-page-url]');
  const titleInput = document.querySelector('[data-page-title]');
  const contentInput = document.querySelector('[data-page-content]');

  if (urlInput) urlInput.value = window.location.href;
  if (titleInput) titleInput.value = document.title;
  if (contentInput) contentInput.value = document.body ? document.body.innerText.slice(0, 800) : '';

  detectMinecraftPage();
}

document.querySelector('[data-page-detect]')?.addEventListener('click', detectMinecraftPage);
document.querySelector('[data-page-fill-current]')?.addEventListener('click', fillCurrentPage);