const roomThemes = [
	'生存冲刺夜：90 分钟内拿到下界门并完成第一轮补给',
	'轻建筑夜：今晚只做基地门面、仓库和主路，不碰大工程',
	'探索跑图夜：分队找村庄、废弃矿井和下界要塞线索',
	'整活挑战夜：每个人都带一条小限制推进主线',
	'资源清仓夜：优先整理箱子、补铁、补食物、修工具'
];

const roomRoles = [
	'1 人采矿，1 人种田，1 人跑图，1 人留守基地整理补给。',
	'2 人主线推进，1 人后勤熔炼，1 人建筑补环境。',
	'1 人带队定目标，其他人分成探索组和物资组。',
	'1 人专做交易与村民，1 人刷资源，剩下的人负责外出。',
	'新手跟队推进，熟手负责路线、节奏和风险提醒。'
];

const roomRules = [
	'前 20 分钟不准单飞，所有人都要先把基础物资线搭起来。',
	'今晚不熬大工程，每完成一个目标就回基地集合一次。',
	'谁先乱跑导致掉线或迷路，下一轮负责全队食物补给。',
	'开局先说目标，不允许“随便看看”拖满前 30 分钟。',
	'今晚优先做可共享成果，不做只对个人有效的小事。'
];

const roomVibes = ['轻松局', '效率局', '建筑局', '跑图局', '整活局'];
const roomOpeners = ['先定目标再开房。', '先分工再出门。', '先补给再推进。', '先集合再分头行动。'];

function pickRoom(items) {
	return items[Math.floor(Math.random() * items.length)];
}

function setRoomText(selector, text) {
	const element = document.querySelector(selector);

	if (element) {
		element.textContent = text;
	}
}

document.querySelector('[data-room-theme]')?.addEventListener('click', () => {
	setRoomText('[data-room-theme-result]', `今晚主题：${pickRoom(roomThemes)}`);
});

document.querySelector('[data-room-role]')?.addEventListener('click', () => {
	setRoomText('[data-room-role-result]', `推荐分工：${pickRoom(roomRoles)}`);
});

document.querySelector('[data-room-rule]')?.addEventListener('click', () => {
	setRoomText('[data-room-rule-result]', `开场房规：${pickRoom(roomRules)}`);
});

document.querySelector('[data-room-brief]')?.addEventListener('click', () => {
	const vibe = pickRoom(roomVibes);
	const opener = pickRoom(roomOpeners);
	const theme = pickRoom(roomThemes);
	const role = pickRoom(roomRoles);
	setRoomText('[data-room-brief-result]', `今晚建议走 ${vibe}。${opener} 主方向：${theme} 分工建议：${role}`);
});