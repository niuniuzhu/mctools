const luckyEvents = [
  '你开出了满配钻石套，但脚下同时生成了一只已经点燃的苦力怕。',
  '你获得了 16 个绿宝石，代价是所有村民开始对你涨价。',
  '你得到一把附魔弓，同时被随机传送到村庄钟楼顶端。',
  '你开出了一只命名羊，名字叫“今天别下矿”。',
  '你获得了鞘翅和烟花，但只给你 30 秒试飞。',
  '你得到一桶岩浆，系统提示：祝你建筑顺利。'
];

const duelReasons = [
  '靠更强的正面压制把对方打崩了',
  '利用机动性把战斗拖成了自己的节奏',
  '凭借血量和抗性笑到了最后',
  '在地形和判定上占了便宜',
  '虽然开局不顺，但后面突然翻盘',
  '完全靠气势赢下了这场对决'
];

const namePrefixes = ['末地', '红石', '苦力怕', '村民', '下界', '像素', '方块', '史莱姆', '潜影', '烈焰'];
const nameSuffixes = ['旅人', '矿工', '法师', '整活怪', '刺客', '领主', '工程师', '驯龙师', '跑图王', '守卫'];
const lootPool = [
  '1 个不死图腾',
  '32 个钻石',
  '1 把带击退的木剑',
  '64 个面包',
  '8 个末影珍珠',
  '一套锁链甲',
  '3 个金苹果',
  '1 个随机唱片',
  '一桶水和一句“冷静一点”',
  '16 个 TNT'
];
const dailyChallenges = [
  '今天只准用弓箭解决第一只敌对生物。',
  '今天下矿时禁止带盾牌。',
  '今天必须在天黑前做出一张床。',
  '今天只允许吃自己种出来的食物。',
  '今天至少完成一个自动化小装置。',
  '今天去下界前必须准备一套备用装备。',
  '今天必须带一桶水出门。',
  '今天找到一个新村庄或遗迹再下线。'
];

function randomPick(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function setFunText(selector, text) {
  const element = document.querySelector(selector);

  if (element) {
    element.textContent = text;
  }
}

async function copyFunText(text) {
  if (!text) {
    return;
  }

  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const helper = document.createElement('textarea');
    helper.value = text;
    document.body.appendChild(helper);
    helper.select();
    document.execCommand('copy');
    helper.remove();
  }
}

function runLuckyBlock() {
  setFunText('[data-fun-lucky-result]', randomPick(luckyEvents));
}

function runMobDuel() {
  const mobA = String(document.querySelector('[data-fun-mob-a]')?.value || '').trim() || '末影人';
  const mobB = String(document.querySelector('[data-fun-mob-b]')?.value || '').trim() || '铁傀儡';
  const winner = Math.random() > 0.5 ? mobA : mobB;
  setFunText('[data-fun-duel-result]', `预测结果：${winner} 获胜，因为它 ${randomPick(duelReasons)}。`);
}

function generateNickname() {
  const nickname = `${randomPick(namePrefixes)}${randomPick(nameSuffixes)}`;
  setFunText('[data-fun-name-result]', `你的随机昵称：${nickname}`);
}

function rollLoot() {
  setFunText('[data-fun-loot-result]', `本次轮盘掉落：${randomPick(lootPool)}`);
}

function drawDailyChallenge() {
  const result = `今日挑战：${randomPick(dailyChallenges)}`;
  setFunText('[data-fun-challenge-result]', result);
  return result;
}

function generateFunPack() {
  const container = document.querySelector('[data-fun-pack-result]');

  if (!container) {
    return;
  }

  const mobA = String(document.querySelector('[data-fun-mob-a]')?.value || '').trim() || '末影人';
  const mobB = String(document.querySelector('[data-fun-mob-b]')?.value || '').trim() || '铁傀儡';
  const pack = [
    `幸运事件：${randomPick(luckyEvents)}`,
    `对决主题：今晚让 ${mobA} 对战 ${mobB}`,
    `掉落奖励：${randomPick(lootPool)}`,
    `生存挑战：${randomPick(dailyChallenges)}`
  ];

  container.innerHTML = pack.map((item) => `<div class="history-tag fun-pack-item">${item}</div>`).join('');
}

const luckyButton = document.querySelector('[data-fun-lucky]');
const duelButton = document.querySelector('[data-fun-duel]');
const nameButton = document.querySelector('[data-fun-name]');
const lootButton = document.querySelector('[data-fun-loot]');
const challengeButton = document.querySelector('[data-fun-challenge]');
const challengeCopyButton = document.querySelector('[data-fun-challenge-copy]');
const funPackButton = document.querySelector('[data-fun-pack]');

if (luckyButton) {
  luckyButton.addEventListener('click', runLuckyBlock);
}

if (duelButton) {
  duelButton.addEventListener('click', runMobDuel);
}

if (nameButton) {
  nameButton.addEventListener('click', generateNickname);
}

if (lootButton) {
  lootButton.addEventListener('click', rollLoot);
}

if (challengeButton) {
  challengeButton.addEventListener('click', drawDailyChallenge);
}

if (challengeCopyButton) {
  challengeCopyButton.addEventListener('click', async () => {
    const current = String(document.querySelector('[data-fun-challenge-result]')?.textContent || '').trim();
    await copyFunText(current && current !== '挑战结果会显示在这里。' ? current : drawDailyChallenge());
  });
}

if (funPackButton) {
  funPackButton.addEventListener('click', generateFunPack);
}