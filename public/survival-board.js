const survivalDaily = ['今天先做全套铁装', '今天必须完成一块农田', '今天找一个村庄并设置临时基地', '今天收集至少 3 颗钻石'];
const survivalMid = ['开始准备附魔台和书架', '先做药水间和地狱门', '优先搞定村民繁殖与交易', '开始建一个正式主基地'];
const survivalNether = ['带一套金装', '准备抗火思路', '多带食物和圆石', '提前留好回程传送门坐标'];
function pickSurvival(items) { return items[Math.floor(Math.random() * items.length)]; }
function setSurvivalText(selector, text) { const element = document.querySelector(selector); if (element) { element.textContent = text; } }
document.querySelector('[data-survival-daily]')?.addEventListener('click', () => setSurvivalText('[data-survival-daily-result]', `今日任务：${pickSurvival(survivalDaily)}`));
document.querySelector('[data-survival-mid]')?.addEventListener('click', () => setSurvivalText('[data-survival-mid-result]', `推进目标：${pickSurvival(survivalMid)}`));
document.querySelector('[data-survival-nether]')?.addEventListener('click', () => setSurvivalText('[data-survival-nether-result]', `下界前清单：${survivalNether.join('、')}。`));