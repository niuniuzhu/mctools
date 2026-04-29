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
const treasureTargets = ['废弃传送门旁边', '雪原村庄后山', '下界玄武岩三角洲边缘', '海底神殿外圈', '丛林神庙附近', '沙漠神殿远处沙丘'];
const treasureReasons = ['听说那边昨天刚刷出稀有箱子', '地图角落总得有人先去踩点', '队友一致认为那里最像会埋好东西的地方', '今天的运气适合往那个方向走', '如果空手回来，至少能顺路开张地图'];
const villagerQuotes = ['这价已经很良心了，再砍价我就去睡觉', '你要的是稀有货，不是胡萝卜批发', '拿着绿宝石来，不要拿梦想来', '这是友情价，但友情也没便宜到哪去', '今天心情好，少坑你两颗绿宝石'];
const villagerPrices = ['24 个绿宝石', '1 本书加 18 个绿宝石', '32 个绿宝石外加一组纸', '3 个绿宝石块', '12 个绿宝石和一句谢谢老板'];
const bossOpenings = ['天空突然变暗，连火把都像在后退', '地面开始抖，连羊都决定暂时闭嘴', '所有人都意识到这不是普通血条该有的排场', 'BGM 还没响完，压力已经先到了', '你刚抬头，它已经默认这里归它管了'];
const bossFinishers = ['准备好把背包里的备用装备也一起献上吧', '这一次，跑图速度可能比输出更重要', '如果你能赢，今晚的聊天记录会很好看', '它不会讲道理，但会讲范围伤害', '欢迎进入今天最不和平的环节'];
const partyPunishments = ['接下来 10 分钟只能倒着走进家门', '下一次下矿必须把第一颗钻石送给队友', '你要负责给全队讲一段极其离谱的战前演讲', '下一场遭遇战前只能拿鱼当主武器开局', '接下来一轮探索里禁止说“我没事”', '你必须把今天的临时基地命名成最土的名字'];
const buildThemes = ['山体瀑布基地', '下界风锻造大厅', '漂浮农场小镇', '海边灯塔仓库', '雪原温室营地', '沙漠集市前哨站'];
const buildConstraints = ['只准用两种主材料', '必须带一个会发光的屋顶', '入口必须藏起来', '正门前要有一片小花园', '至少加一个很没必要但很好看的平台', '必须留出宠物活动区'];
const redstoneFailures = ['比较器方向全反了', '中继器延迟调成了灾难级别', '观察者盯错面，整套机器在看空气', '活塞顺序反了，机器把自己卡死了', '漏了一格红石粉，系统从头到尾都没通电', '分类器被多余物品彻底打乱了'];
const redstoneImpacts = ['结果仓库开始随机吐物品', '结果刷怪塔像下班一样彻底停工', '结果自动门决定永远保持打开', '结果熔炉阵列只剩装饰意义', '结果整套装置在你面前发出非常自信但毫无作用的声响', '结果你花 40 分钟确认问题其实就在第一格'];
const starterRoles = ['矿洞先锋', '村庄外交官', '食物总管', '建材搬运王', '下界侦察员', '临时红石工', '地图开荒员', '宠物与坐骑管理员'];
const starterRoleTasks = ['开局先保证全队铁器供应', '第一目标是摸清附近村庄和遗迹', '优先把食物线稳定下来', '今天必须搭出第一版公共仓库', '负责收集接下来最缺的关键材料', '你要负责把所有人的杂物整理得像能住人'];
const biomeTargets = ['樱花树林', '恶地', '蘑菇岛', '雪原', '红树林沼泽', '针叶林', '繁茂洞穴', '灵魂沙峡谷'];
const biomeTasks = ['带回一种当地特色方块', '现场搭一个临时补给点', '拍一张适合做封面的截图', '在那里解决一次敌对生物遭遇战', '留下一个写着今日日期的路标', '顺手找一条最适合修路的路径'];

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

function drawTreasureSpot() {
  const x = Math.floor(Math.random() * 5000) - 2500;
  const z = Math.floor(Math.random() * 5000) - 2500;
  const y = randomPick([64, 72, 80, 96, 118]);
  setFunText('[data-fun-treasure-result]', `今日盲盒坐标：X ${x} / Y ${y} / Z ${z}，目标在${randomPick(treasureTargets)}，理由是：${randomPick(treasureReasons)}。`);
}

function generateVillagerDeal() {
  const item = String(document.querySelector('[data-fun-villager-item]')?.value || '').trim() || '附魔书';
  setFunText('[data-fun-villager-result]', `村民看了看你的 ${item}，开口就是："${randomPick(villagerQuotes)}"。最终报价：${randomPick(villagerPrices)}。`);
}

function generateBossLine() {
  const bossName = String(document.querySelector('[data-fun-boss-name]')?.value || '').trim() || '末影龙';
  setFunText('[data-fun-boss-result]', `${bossName} 登场：${randomPick(bossOpenings)}。${randomPick(bossFinishers)}。`);
}

function drawPartyPunishment() {
  setFunText('[data-fun-party-result]', `联机惩罚签：${randomPick(partyPunishments)}。`);
}

function drawBuildTheme() {
  setFunText('[data-fun-build-result]', `今日建筑主题：${randomPick(buildThemes)}。附加要求：${randomPick(buildConstraints)}。`);
}

function generateRedstoneAlarm() {
  setFunText('[data-fun-redstone-result]', `翻车警报：${randomPick(redstoneFailures)}，${randomPick(redstoneImpacts)}。`);
}

function drawStarterRole() {
  setFunText('[data-fun-role-result]', `你的开荒职业：${randomPick(starterRoles)}。当前任务：${randomPick(starterRoleTasks)}。`);
}

function drawBiomeMission() {
  const result = `群系任务书：前往${randomPick(biomeTargets)}，并且${randomPick(biomeTasks)}。`;
  setFunText('[data-fun-biome-result]', result);
  return result;
}

const luckyButton = document.querySelector('[data-fun-lucky]');
const duelButton = document.querySelector('[data-fun-duel]');
const nameButton = document.querySelector('[data-fun-name]');
const lootButton = document.querySelector('[data-fun-loot]');
const challengeButton = document.querySelector('[data-fun-challenge]');
const challengeCopyButton = document.querySelector('[data-fun-challenge-copy]');
const funPackButton = document.querySelector('[data-fun-pack]');
const treasureButton = document.querySelector('[data-fun-treasure]');
const villagerButton = document.querySelector('[data-fun-villager]');
const bossButton = document.querySelector('[data-fun-boss]');
const partyButton = document.querySelector('[data-fun-party]');
const buildButton = document.querySelector('[data-fun-build]');
const redstoneButton = document.querySelector('[data-fun-redstone]');
const roleButton = document.querySelector('[data-fun-role]');
const biomeButton = document.querySelector('[data-fun-biome]');
const biomeCopyButton = document.querySelector('[data-fun-biome-copy]');

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

if (treasureButton) {
  treasureButton.addEventListener('click', drawTreasureSpot);
}

if (villagerButton) {
  villagerButton.addEventListener('click', generateVillagerDeal);
}

if (bossButton) {
  bossButton.addEventListener('click', generateBossLine);
}

if (partyButton) {
  partyButton.addEventListener('click', drawPartyPunishment);
}

if (buildButton) {
  buildButton.addEventListener('click', drawBuildTheme);
}

if (redstoneButton) {
  redstoneButton.addEventListener('click', generateRedstoneAlarm);
}

if (roleButton) {
  roleButton.addEventListener('click', drawStarterRole);
}

if (biomeButton) {
  biomeButton.addEventListener('click', drawBiomeMission);
}

if (biomeCopyButton) {
  biomeCopyButton.addEventListener('click', async () => {
    const current = String(document.querySelector('[data-fun-biome-result]')?.textContent || '').trim();
    await copyFunText(current && current !== '群系任务会显示在这里。' ? current : drawBiomeMission());
  });
}