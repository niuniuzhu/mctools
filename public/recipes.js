const RECIPE_DATA = [
  { name: '工作台', category: '基础', type: '合成', materials: '4 木板', result: '1 工作台', notes: '前期必做，解锁 3x3 合成。' },
  { name: '木棍', category: '基础', type: '合成', materials: '2 木板', result: '4 木棍', notes: '大量工具和火把都会用到。' },
  { name: '火把', category: '基础', type: '合成', materials: '1 木棍 + 1 煤炭/木炭', result: '4 火把', notes: '照明、防刷怪。' },
  { name: '箱子', category: '基础', type: '合成', materials: '8 木板', result: '1 箱子', notes: '最基础的存储方块。' },
  { name: '熔炉', category: '基础', type: '合成', materials: '8 圆石', result: '1 熔炉', notes: '用于熔炼、烧食物。' },
  { name: '床', category: '基础', type: '合成', materials: '3 羊毛 + 3 木板', result: '1 床', notes: '跳过夜晚并设置重生点。' },
  { name: '木镐', category: '工具', type: '合成', materials: '3 木板 + 2 木棍', result: '1 木镐', notes: '最初级采矿工具。' },
  { name: '石镐', category: '工具', type: '合成', materials: '3 圆石 + 2 木棍', result: '1 石镐', notes: '可采铁矿。' },
  { name: '铁镐', category: '工具', type: '合成', materials: '3 铁锭 + 2 木棍', result: '1 铁镐', notes: '常用中期工具。' },
  { name: '钻石镐', category: '工具', type: '合成', materials: '3 钻石 + 2 木棍', result: '1 钻石镐', notes: '可采黑曜石。' },
  { name: '下界合金镐', category: '工具', type: '锻造', materials: '1 钻石镐 + 1 下界合金锭', result: '1 下界合金镐', notes: '需锻造模板与锻造台。' },
  { name: '木斧', category: '工具', type: '合成', materials: '3 木板 + 2 木棍', result: '1 木斧', notes: '采木更快。' },
  { name: '铁斧', category: '工具', type: '合成', materials: '3 铁锭 + 2 木棍', result: '1 铁斧', notes: '兼顾采集与战斗。' },
  { name: '铁锹', category: '工具', type: '合成', materials: '1 铁锭 + 2 木棍', result: '1 铁锹', notes: '挖沙土雪更快。' },
  { name: '铁锄', category: '工具', type: '合成', materials: '2 铁锭 + 2 木棍', result: '1 铁锄', notes: '耕地和部分方块加速。' },
  { name: '剪刀', category: '工具', type: '合成', materials: '2 铁锭', result: '1 剪刀', notes: '采树叶、羊毛和蜂巢。' },
  { name: '打火石', category: '工具', type: '合成', materials: '1 铁锭 + 1 燧石', result: '1 打火石', notes: '点火和激活下界传送门。' },
  { name: '钓鱼竿', category: '工具', type: '合成', materials: '3 木棍 + 2 线', result: '1 钓鱼竿', notes: '钓鱼和拉怪。' },
  { name: '指南针', category: '工具', type: '合成', materials: '4 铁锭 + 1 红石粉', result: '1 指南针', notes: '部分地图与定位合成需要。' },
  { name: '时钟', category: '工具', type: '合成', materials: '4 金锭 + 1 红石粉', result: '1 时钟', notes: '显示昼夜。' },
  { name: '地图', category: '工具', type: '合成', materials: '8 纸 + 1 指南针', result: '1 空地图', notes: '探索和定位。' },
  { name: '弓', category: '战斗', type: '合成', materials: '3 木棍 + 3 线', result: '1 弓', notes: '基础远程武器。' },
  { name: '弩', category: '战斗', type: '合成', materials: '3 木棍 + 2 线 + 1 铁锭 + 1 铁钩', result: '1 弩', notes: '蓄力式远程武器。' },
  { name: '盾牌', category: '战斗', type: '合成', materials: '6 木板 + 1 铁锭', result: '1 盾牌', notes: '生存核心防具。' },
  { name: '箭', category: '战斗', type: '合成', materials: '1 燧石 + 1 木棍 + 1 羽毛', result: '4 箭', notes: '弓弩弹药。' },
  { name: '铁剑', category: '战斗', type: '合成', materials: '2 铁锭 + 1 木棍', result: '1 铁剑', notes: '中期通用武器。' },
  { name: '钻石剑', category: '战斗', type: '合成', materials: '2 钻石 + 1 木棍', result: '1 钻石剑', notes: '高伤害近战武器。' },
  { name: '铁头盔', category: '护甲', type: '合成', materials: '5 铁锭', result: '1 铁头盔', notes: '铁套之一。' },
  { name: '铁胸甲', category: '护甲', type: '合成', materials: '8 铁锭', result: '1 铁胸甲', notes: '护甲值较高。' },
  { name: '铁护腿', category: '护甲', type: '合成', materials: '7 铁锭', result: '1 铁护腿', notes: '铁套之一。' },
  { name: '铁靴子', category: '护甲', type: '合成', materials: '4 铁锭', result: '1 铁靴子', notes: '铁套之一。' },
  { name: '钻石头盔', category: '护甲', type: '合成', materials: '5 钻石', result: '1 钻石头盔', notes: '高阶防具。' },
  { name: '下界合金胸甲', category: '护甲', type: '锻造', materials: '1 钻石胸甲 + 1 下界合金锭', result: '1 下界合金胸甲', notes: '需锻造模板。' },
  { name: '桶', category: '功能', type: '合成', materials: '3 铁锭', result: '1 桶', notes: '装水、岩浆、奶。' },
  { name: '漏斗', category: '功能', type: '合成', materials: '5 铁锭 + 1 箱子', result: '1 漏斗', notes: '自动化核心。' },
  { name: '高炉', category: '功能', type: '合成', materials: '5 铁锭 + 1 熔炉 + 3 平滑石', result: '1 高炉', notes: '矿物熔炼更快。' },
  { name: '烟熏炉', category: '功能', type: '合成', materials: '1 熔炉 + 4 原木/去皮原木', result: '1 烟熏炉', notes: '食物烹饪更快。' },
  { name: '切石机', category: '功能', type: '合成', materials: '3 石头 + 1 铁锭', result: '1 切石机', notes: '建筑块批量切割。' },
  { name: '砂轮', category: '功能', type: '合成', materials: '2 木棍 + 1 石台阶 + 2 木板', result: '1 砂轮', notes: '修复与移除附魔。' },
  { name: '锻造台', category: '功能', type: '合成', materials: '2 铁锭 + 4 木板', result: '1 锻造台', notes: '升级下界合金装备。' },
  { name: '制图台', category: '功能', type: '合成', materials: '2 纸 + 4 木板', result: '1 制图台', notes: '放大和复制地图。' },
  { name: '织布机', category: '功能', type: '合成', materials: '2 线 + 2 木板', result: '1 织布机', notes: '旗帜图案管理。' },
  { name: '酿造台', category: '功能', type: '合成', materials: '1 烈焰棒 + 3 圆石', result: '1 酿造台', notes: '药水制作入口。' },
  { name: '铁砧', category: '功能', type: '合成', materials: '3 铁块 + 4 铁锭', result: '1 铁砧', notes: '重命名与修复。' },
  { name: '附魔台', category: '功能', type: '合成', materials: '4 黑曜石 + 2 钻石 + 1 书', result: '1 附魔台', notes: '装备附魔。' },
  { name: '末影箱', category: '功能', type: '合成', materials: '8 黑曜石 + 1 末影之眼', result: '1 末影箱', notes: '跨地点共享存储。' },
  { name: '活塞', category: '红石', type: '合成', materials: '3 木板 + 4 圆石 + 1 铁锭 + 1 红石粉', result: '1 活塞', notes: '推动方块。' },
  { name: '粘性活塞', category: '红石', type: '合成', materials: '1 活塞 + 1 黏液球', result: '1 粘性活塞', notes: '拉回方块。' },
  { name: '侦测器', category: '红石', type: '合成', materials: '6 圆石 + 2 红石粉 + 1 下界石英', result: '1 侦测器', notes: '检测方块更新。' },
  { name: '发射器', category: '红石', type: '合成', materials: '7 圆石 + 1 弓 + 1 红石粉', result: '1 发射器', notes: '发射物品与箭。' },
  { name: '投掷器', category: '红石', type: '合成', materials: '7 圆石 + 1 红石粉', result: '1 投掷器', notes: '吐出物品实体。' },
  { name: '红石中继器', category: '红石', type: '合成', materials: '2 红石火把 + 1 红石粉 + 3 石头', result: '1 中继器', notes: '延时和信号整流。' },
  { name: '红石比较器', category: '红石', type: '合成', materials: '3 红石火把 + 1 下界石英 + 3 石头', result: '1 比较器', notes: '读取容器信号。' },
  { name: '铁轨', category: '运输', type: '合成', materials: '6 铁锭 + 1 木棍', result: '16 铁轨', notes: '基础轨道。' },
  { name: '动力铁轨', category: '运输', type: '合成', materials: '6 金锭 + 1 红石粉 + 1 木棍', result: '6 动力铁轨', notes: '矿车加速。' },
  { name: '探测铁轨', category: '运输', type: '合成', materials: '6 铁锭 + 1 石质压力板 + 1 红石粉', result: '6 探测铁轨', notes: '检测矿车经过。' },
  { name: '激活铁轨', category: '运输', type: '合成', materials: '6 铁锭 + 2 木棍 + 1 红石火把', result: '6 激活铁轨', notes: '激活 TNT 矿车和漏斗矿车。' },
  { name: '矿车', category: '运输', type: '合成', materials: '5 铁锭', result: '1 矿车', notes: '运输基础。' },
  { name: '箱子矿车', category: '运输', type: '合成', materials: '1 矿车 + 1 箱子', result: '1 箱子矿车', notes: '可运输物品。' },
  { name: '漏斗矿车', category: '运输', type: '合成', materials: '1 矿车 + 1 漏斗', result: '1 漏斗矿车', notes: '自动吸取物品。' },
  { name: '船', category: '运输', type: '合成', materials: '5 木板', result: '1 船', notes: '水上移动。' },
  { name: '拴绳', category: '功能', type: '合成', materials: '4 线 + 1 黏液球', result: '2 拴绳', notes: '牵引动物。' },
  { name: '书', category: '材料', type: '合成', materials: '3 纸 + 1 皮革', result: '1 书', notes: '附魔和书架材料。' },
  { name: '书架', category: '材料', type: '合成', materials: '3 书 + 6 木板', result: '1 书架', notes: '提升附魔等级。' },
  { name: '纸', category: '材料', type: '合成', materials: '3 甘蔗', result: '3 纸', notes: '地图和书所需。' },
  { name: '玻璃', category: '熔炼', type: '熔炼', materials: '1 沙子', result: '1 玻璃', notes: '熔炉熔炼获得。' },
  { name: '木炭', category: '熔炼', type: '熔炼', materials: '1 原木', result: '1 木炭', notes: '替代煤炭做火把。' },
  { name: '铁锭', category: '熔炼', type: '熔炼', materials: '1 粗铁', result: '1 铁锭', notes: '基础金属材料。' },
  { name: '金锭', category: '熔炼', type: '熔炼', materials: '1 粗金', result: '1 金锭', notes: '金制工具与钟表材料。' },
  { name: '熟牛排', category: '熔炼', type: '烹饪', materials: '1 生牛肉', result: '1 熟牛排', notes: '高性价比食物。' },
  { name: '烤马铃薯', category: '熔炼', type: '烹饪', materials: '1 马铃薯', result: '1 烤马铃薯', notes: '常见稳定食物。' },
  { name: '粗制药水', category: '酿造', type: '药水', materials: '1 水瓶 + 1 地狱疣', result: '1 粗制药水', notes: '多数药水基础。' },
  { name: '力量药水', category: '酿造', type: '药水', materials: '1 粗制药水 + 1 烈焰粉', result: '1 力量药水', notes: '提升近战伤害。' },
  { name: '迅捷药水', category: '酿造', type: '药水', materials: '1 粗制药水 + 1 糖', result: '1 迅捷药水', notes: '提升移动速度。' },
  { name: '治疗药水', category: '酿造', type: '药水', materials: '1 粗制药水 + 1 闪烁的西瓜片', result: '1 治疗药水', notes: '立即回复生命值。' },
  { name: '抗火药水', category: '酿造', type: '药水', materials: '1 粗制药水 + 1 岩浆膏', result: '1 抗火药水', notes: '下界探索核心。' },
  { name: '夜视药水', category: '酿造', type: '药水', materials: '1 粗制药水 + 1 金胡萝卜', result: '1 夜视药水', notes: '洞穴和水下探索实用。' },
  { name: '末影之眼', category: '下界末地', type: '合成', materials: '1 烈焰粉 + 1 末影珍珠', result: '1 末影之眼', notes: '定位要塞并激活末地传送门。' },
  { name: '烈焰粉', category: '下界末地', type: '合成', materials: '1 烈焰棒', result: '2 烈焰粉', notes: '酿造和末影之眼材料。' },
  { name: '烟花火箭', category: '下界末地', type: '合成', materials: '1 纸 + 1~3 火药', result: '3 烟花火箭', notes: '鞘翅飞行推进。' },
  { name: '潜影盒', category: '下界末地', type: '合成', materials: '2 潜影壳 + 1 箱子', result: '1 潜影盒', notes: '高阶便携存储。' },
  { name: '信标', category: '下界末地', type: '合成', materials: '5 玻璃 + 3 黑曜石 + 1 下界之星', result: '1 信标', notes: '区域增益核心。' }
];

function renderRecipeList() {
  const searchInput = document.querySelector('[data-recipe-search]');
  const categorySelect = document.querySelector('[data-recipe-category]');
  const list = document.querySelector('[data-recipe-list]');
  const count = document.querySelector('[data-recipe-count]');

  if (!list) {
    return;
  }

  const keyword = searchInput ? searchInput.value.trim().toLowerCase() : '';
  const category = categorySelect ? categorySelect.value : '全部';

  const filtered = RECIPE_DATA.filter((recipe) => {
    const categoryMatch = category === '全部' || recipe.category === category;
    const searchText = `${recipe.name} ${recipe.materials} ${recipe.result} ${recipe.notes} ${recipe.type}`.toLowerCase();
    const keywordMatch = !keyword || searchText.includes(keyword);
    return categoryMatch && keywordMatch;
  });

  if (count) {
    count.textContent = `当前显示 ${filtered.length} 条配方`;
  }

  if (!filtered.length) {
    list.innerHTML = '<p class="empty-state">没有匹配的配方，请尝试更换关键词或分类。</p>';
    return;
  }

  list.innerHTML = filtered.map((recipe) => `
    <article class="recipe-list-card">
      <div class="recipe-list-head">
        <div>
          <p class="panel-label">${recipe.category}</p>
          <h2>${recipe.name}</h2>
        </div>
        <span class="recipe-type-pill">${recipe.type}</span>
      </div>
      <p><strong>材料：</strong>${recipe.materials}</p>
      <p><strong>产物：</strong>${recipe.result}</p>
      <p class="recipe-note">${recipe.notes}</p>
    </article>
  `).join('');
}

const recipeSearchInput = document.querySelector('[data-recipe-search]');
const recipeCategorySelect = document.querySelector('[data-recipe-category]');

if (recipeSearchInput) {
  recipeSearchInput.addEventListener('input', renderRecipeList);
}

if (recipeCategorySelect) {
  recipeCategorySelect.addEventListener('change', renderRecipeList);
}

renderRecipeList();