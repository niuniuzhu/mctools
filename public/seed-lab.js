const seedThemes = ['冰原孤岛开局', '樱花山谷定居', '村庄商贸流', '下界速通流', '海边灯塔建筑档', '丛林遗迹探险档'];
const seedStories = ['你醒来时旁边只有一棵树和半截沉船。', '出生点远处传来村庄钟声，但四周全是迷雾森林。', '你站在樱花山谷中央，脚下已经决定了这档必须建主城。', '出生点资源普通，但北边地平线上有一座奇怪的高山。'];
const seedRoutes = ['先找村庄，再摸铁、下矿、做地狱门。', '先沿河跑图找平原，再决定永久基地。', '先生存三天，随后直接去找下界要塞。', '先攒建筑材料，第一天只做定居点。'];
const seedGoals = ['三天内做出附魔台。', '第一周目必须找到要塞。', '开局不许睡觉，先打出一套铁装。', '必须在第一次下界前完成自动农田。'];

function pick(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function setSeedText(selector, text) {
  const element = document.querySelector(selector);
  if (element) {
    element.textContent = text;
  }
}

function drawSeedTheme() {
  setSeedText('[data-seed-theme-result]', `世界主题：${pick(seedThemes)}`);
}

function drawSeedStory() {
  setSeedText('[data-seed-story-result]', `出生点故事：${pick(seedStories)}`);
}

function drawSeedRoute() {
  setSeedText('[data-seed-pack-result]', `探索路线：${pick(seedRoutes)}`);
}

function drawSeedGoal() {
  setSeedText('[data-seed-pack-result]', `阶段目标：${pick(seedGoals)}`);
}

function drawSeedPack() {
  setSeedText('[data-seed-pack-result]', `开局组合：${pick(seedThemes)}；${pick(seedRoutes)}；${pick(seedGoals)}`);
}

const seedThemeButton = document.querySelector('[data-seed-theme]');
const seedStoryButton = document.querySelector('[data-seed-story]');
const seedRouteButton = document.querySelector('[data-seed-route]');
const seedGoalButton = document.querySelector('[data-seed-goal]');
const seedPackButton = document.querySelector('[data-seed-pack]');

if (seedThemeButton) seedThemeButton.addEventListener('click', drawSeedTheme);
if (seedStoryButton) seedStoryButton.addEventListener('click', drawSeedStory);
if (seedRouteButton) seedRouteButton.addEventListener('click', drawSeedRoute);
if (seedGoalButton) seedGoalButton.addEventListener('click', drawSeedGoal);
if (seedPackButton) seedPackButton.addEventListener('click', drawSeedPack);