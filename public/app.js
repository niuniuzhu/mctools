const COMMANDS = {
  tp: ({ target, destination }) => {
    const safeTarget = target.trim() || '@p';
    const safeDestination = destination.trim() || '@s';
    return `tp ${safeTarget} ${safeDestination}`;
  },
  give: ({ target, item, count }) => {
    const safeTarget = target.trim() || '@p';
    const safeItem = item.trim() || 'minecraft:stone';
    const safeCount = Math.max(1, Number.parseInt(count, 10) || 1);
    return `give ${safeTarget} ${safeItem} ${safeCount}`;
  },
  summon: ({ entity, pos, extra }) => {
    const safeEntity = entity.trim() || 'minecraft:zombie';
    const safePos = pos.trim() || '~ ~ ~';
    const safeExtra = extra.trim();
    return safeExtra
      ? `summon ${safeEntity} ${safePos} ${safeExtra}`
      : `summon ${safeEntity} ${safePos}`;
  },
  effect: ({ target, effect, duration, amplifier, hideParticles }) => {
    const safeTarget = target.trim() || '@p';
    const safeEffect = effect.trim() || 'minecraft:speed';
    const safeDuration = Math.max(1, Number.parseInt(duration, 10) || 30);
    const safeAmplifier = Math.max(0, Number.parseInt(amplifier, 10) || 0);
    return `effect give ${safeTarget} ${safeEffect} ${safeDuration} ${safeAmplifier} ${hideParticles ? 'true' : 'false'}`;
  },
  time: ({ preset, customValue }) => {
    const presets = {
      day: '1000',
      noon: '6000',
      night: '13000',
      midnight: '18000'
    };
    const value = preset === 'custom'
      ? Math.max(0, Number.parseInt(customValue, 10) || 0)
      : presets[preset] || '1000';
    return `time set ${value}`;
  }
};

const COMMAND_TEMPLATES = {
  tp: {
    title: 'tp 传送',
    description: '生成玩家传送指令',
    fields: `
      <div class="fields two-col">
        <label>
          目标玩家
          <input type="text" data-field="target" placeholder="@p" value="@p" />
        </label>
        <label>
          目标玩家 / 坐标目标
          <input type="text" data-field="destination" placeholder="@s 或 x y z" value="@s" />
        </label>
      </div>
    `
  },
  give: {
    title: 'give 给予物品',
    description: '生成给玩家发放物品的指令',
    fields: `
      <div class="fields two-col">
        <label>
          目标玩家
          <input type="text" data-field="target" placeholder="@p" value="@p" />
        </label>
        <label>
          物品 ID
          <input type="text" data-field="item" placeholder="minecraft:diamond" value="minecraft:diamond" />
        </label>
      </div>
      <label>
        数量
        <input type="number" min="1" data-field="count" value="1" />
      </label>
    `
  },
  summon: {
    title: 'summon 召唤实体',
    description: '生成指定实体的召唤指令',
    fields: `
      <div class="fields two-col">
        <label>
          实体 ID
          <input type="text" data-field="entity" placeholder="minecraft:zombie" value="minecraft:zombie" />
        </label>
        <label>
          坐标
          <input type="text" data-field="pos" placeholder="~ ~ ~" value="~ ~ ~" />
        </label>
      </div>
      <label>
        额外 NBT / 参数
        <input type="text" data-field="extra" placeholder="可留空" />
      </label>
    `
  },
  effect: {
    title: 'effect 状态效果',
    description: '生成药水效果指令',
    fields: `
      <div class="fields two-col">
        <label>
          目标玩家
          <input type="text" data-field="target" placeholder="@p" value="@p" />
        </label>
        <label>
          效果 ID
          <input type="text" data-field="effect" placeholder="minecraft:speed" value="minecraft:speed" />
        </label>
      </div>
      <div class="fields two-col">
        <label>
          持续时间（秒）
          <input type="number" min="1" data-field="duration" value="30" />
        </label>
        <label>
          等级
          <input type="number" min="0" data-field="amplifier" value="1" />
        </label>
      </div>
      <label class="inline-check">
        <input type="checkbox" data-field="hideParticles" checked />
        隐藏粒子效果
      </label>
    `
  },
  time: {
    title: 'time set 设置时间',
    description: '生成世界时间指令',
    fields: `
      <label>
        时间预设
        <select data-field="preset">
          <option value="day">白天</option>
          <option value="noon">正午</option>
          <option value="night">夜晚</option>
          <option value="midnight">午夜</option>
          <option value="custom">自定义数值</option>
        </select>
      </label>
      <label>
        自定义时间值
        <input type="number" min="0" data-field="customValue" value="1000" />
      </label>
    `
  }
};

function getCardValues(card) {
  const values = {};

  card.querySelectorAll('[data-field]').forEach((element) => {
    const key = element.getAttribute('data-field');

    if (!key) {
      return;
    }

    if (element.type === 'checkbox') {
      values[key] = element.checked;
      return;
    }

    values[key] = element.value;
  });

  return values;
}

function buildCommandTemplate(commandName) {
  const template = COMMAND_TEMPLATES[commandName];

  if (!template) {
    return '';
  }

  return `
    <article class="command-card" data-command="${commandName}">
      <div class="card-head">
        <h2>${template.title}</h2>
        <span>${template.description}</span>
      </div>
      ${template.fields}
      <label>
        生成结果
        <textarea data-output readonly rows="2"></textarea>
      </label>
      <div class="button-row">
        <button type="button" class="copy-btn" data-generate>生成指令</button>
        <button type="button" class="copy-btn secondary" data-copy>复制结果</button>
      </div>
    </article>
  `;
}

function updateCard(card) {
  const commandName = card.getAttribute('data-command');
  const output = card.querySelector('[data-output]');

  if (!commandName || !output) {
    return;
  }

  output.value = COMMANDS[commandName](getCardValues(card));
}

function setupCard(card) {
  const output = card.querySelector('[data-output]');
  const generateButton = card.querySelector('[data-generate]');
  const copyButton = card.querySelector('[data-copy]');

  if (generateButton) {
    generateButton.addEventListener('click', () => updateCard(card));
  }

  if (copyButton && output) {
    copyButton.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(output.value);
        copyButton.textContent = '已复制';
        window.setTimeout(() => {
          copyButton.textContent = '复制指令';
        }, 1200);
      } catch {
        output.select();
        document.execCommand('copy');
        copyButton.textContent = '已复制';
        window.setTimeout(() => {
          copyButton.textContent = '复制指令';
        }, 1200);
      }
    });
  }

  updateCard(card);
}

function renderSelectedCommand(commandName, host) {
  host.innerHTML = buildCommandTemplate(commandName);
  const card = host.querySelector('.command-card');

  if (card) {
    setupCard(card);
  }
}

const commandPicker = document.querySelector('[data-command-picker]');
const commandHost = document.querySelector('[data-command-host]');

if (commandPicker && commandHost) {
  renderSelectedCommand(commandPicker.value, commandHost);

  commandPicker.addEventListener('change', () => {
    renderSelectedCommand(commandPicker.value, commandHost);
  });
}