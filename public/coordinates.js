function numberFromInput(selector) {
  const element = document.querySelector(selector);
  return element ? Number.parseFloat(element.value) || 0 : 0;
}

function setText(selector, text) {
  const element = document.querySelector(selector);

  if (element) {
    element.textContent = text;
  }
}

function convertToNether() {
  const x = numberFromInput('[data-ow-x]');
  const z = numberFromInput('[data-ow-z]');
  const netherX = (x / 8).toFixed(2);
  const netherZ = (z / 8).toFixed(2);
  setText('[data-coordinate-result]', `下界建议坐标：X ${netherX}，Z ${netherZ}`);
}

function convertToOverworld() {
  const x = numberFromInput('[data-ow-x]');
  const z = numberFromInput('[data-ow-z]');
  const overworldX = (x * 8).toFixed(2);
  const overworldZ = (z * 8).toFixed(2);
  setText('[data-coordinate-result]', `主世界对应坐标：X ${overworldX}，Z ${overworldZ}`);
}

function calculateDistance() {
  const ax = numberFromInput('[data-point-ax]');
  const az = numberFromInput('[data-point-az]');
  const bx = numberFromInput('[data-point-bx]');
  const bz = numberFromInput('[data-point-bz]');
  const distance = Math.hypot(bx - ax, bz - az).toFixed(2);
  setText('[data-distance-result]', `两点平面距离：${distance} 格`);
}

const convertNetherButton = document.querySelector('[data-convert-nether]');
const convertOverworldButton = document.querySelector('[data-convert-overworld]');
const calcDistanceButton = document.querySelector('[data-calc-distance]');

if (convertNetherButton) {
  convertNetherButton.addEventListener('click', convertToNether);
}

if (convertOverworldButton) {
  convertOverworldButton.addEventListener('click', convertToOverworld);
}

if (calcDistanceButton) {
  calcDistanceButton.addEventListener('click', calculateDistance);
}
