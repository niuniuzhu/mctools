function setCloudText(selector, text) {
  const element = document.querySelector(selector);

  if (element) {
    element.textContent = text;
  }
}

function evaluateLatency() {
  const latency = Number.parseInt(document.querySelector('[data-cloud-latency]')?.value || '0', 10);

  if (latency <= 50) {
    setCloudText('[data-cloud-latency-result]', `延迟 ${latency}ms：体验很好，适合做动作、跑酷和 PvP。`);
    return;
  }

  if (latency <= 90) {
    setCloudText('[data-cloud-latency-result]', `延迟 ${latency}ms：可以接受，适合生存、建筑和大部分普通玩法。`);
    return;
  }

  setCloudText('[data-cloud-latency-result]', `延迟 ${latency}ms：偏高，建议优先换更近节点或降低画质码率。`);
}

function estimateBudget() {
  const users = Number.parseInt(document.querySelector('[data-cloud-users]')?.value || '0', 10);
  const cost = Number.parseInt(document.querySelector('[data-cloud-cost]')?.value || '0', 10);
  const total = users * cost;
  setCloudText('[data-cloud-budget-result]', `按 ${users} 个在线实例计算，月成本约 ${total} 元。若还要算带宽和存储，通常再额外预留 20% 到 35%。`);
}

function generatePlan() {
  const edition = document.querySelector('[data-cloud-edition]')?.value || 'java';
  const mode = document.querySelector('[data-cloud-mode]')?.value || 'desktop';
  const editionText = edition === 'java' ? 'Java 版' : '基岩版';
  const modeText = mode === 'desktop' ? '远程桌面式' : '网页串流式';
  const base = mode === 'desktop'
    ? '建议先上 Windows GPU 云主机，串流用 Sunshine/Parsec，先跑通会话再做网页整合。'
    : '建议先做 WebRTC 串流和调度骨架，再接真实云主机，不要一开始就追求完整平台。';
  setCloudText('[data-cloud-plan-result]', `${editionText} + ${modeText}：${base}`);
}

const cloudEvaluateButton = document.querySelector('[data-cloud-evaluate]');
const cloudBudgetButton = document.querySelector('[data-cloud-budget]');
const cloudPlanButton = document.querySelector('[data-cloud-plan]');

if (cloudEvaluateButton) {
  cloudEvaluateButton.addEventListener('click', evaluateLatency);
}

if (cloudBudgetButton) {
  cloudBudgetButton.addEventListener('click', estimateBudget);
}

if (cloudPlanButton) {
  cloudPlanButton.addEventListener('click', generatePlan);
}