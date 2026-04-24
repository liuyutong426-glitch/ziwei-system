// SVG 十二宫方盘渲染器
// 布局：4×4，外圈 12 宫，中间 4 格合并为中宫。
// 地支在盘上的标准位置（固定）：
//   行0：巳(5) 午(6) 未(7) 申(8)
//   行1：辰(4) ----中宫----    酉(9)
//   行2：卯(3) ----中宫----    戌(10)
//   行3：寅(2) 丑(1) 子(0) 亥(11)

const ZHI_TO_GRID = {
  5:  { col: 0, row: 0 }, // 巳
  6:  { col: 1, row: 0 }, // 午
  7:  { col: 2, row: 0 }, // 未
  8:  { col: 3, row: 0 }, // 申
  4:  { col: 0, row: 1 }, // 辰
  9:  { col: 3, row: 1 }, // 酉
  3:  { col: 0, row: 2 }, // 卯
  10: { col: 3, row: 2 }, // 戌
  2:  { col: 0, row: 3 }, // 寅
  1:  { col: 1, row: 3 }, // 丑
  0:  { col: 2, row: 3 }, // 子
  11: { col: 3, row: 3 }, // 亥
};

const BOARD_SIZE = 1080;
const CELL = BOARD_SIZE / 4; // 270

// 颜色主题（与 CSS 变量配套）
const THEME = {
  border: "#C9A96E",
  borderSoft: "rgba(201,169,110,0.35)",
  bg: "#1A1410",
  bgCenter: "#0F0A06",
  mainStar: "#F5DFA8",
  auxStar: "#9FB7E0",
  evilStar: "#D88A8A",
  sihuaLu: "#4A9B5E",
  sihuaQuan: "#4A7BC4",
  sihuaKe: "#D4B04A",
  sihuaJi: "#B84A4A",
  textDim: "#8A7F6B",
  palaceLabel: "#E8DCC4",
  ganzhi: "#C9A96E",
  highlight: "#F5DFA8",
  daxian: "#9ECFAF",
  liunian: "#E8B86A",
};

const SIHUA_COLOR = {
  "禄": THEME.sihuaLu,
  "权": THEME.sihuaQuan,
  "科": THEME.sihuaKe,
  "忌": THEME.sihuaJi,
};

function escapeXml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;",
  }[c]));
}

/**
 * 把一颗星的显示文本片段渲染为 <tspan>。
 * star: { name, brightnessCN, sihua: [] }
 */
function starTspan(star, color) {
  const sihuaMark = star.sihua && star.sihua.length
    ? star.sihua.map(k => `<tspan fill="${SIHUA_COLOR[k]}" font-weight="700">${k}</tspan>`).join("")
    : "";
  const bright = star.brightnessCN
    ? `<tspan fill="${THEME.textDim}" font-size="12">${star.brightnessCN}</tspan>`
    : "";
  return `<tspan fill="${color}">${escapeXml(star.name)}</tspan>${bright}${sihuaMark}`;
}

/**
 * 渲染一宫
 */
function renderPalace(palace, chart, isMing, isShen, isDaxian, isLiunian) {
  const { col, row } = ZHI_TO_GRID[palace.zhiIndex];
  const x = col * CELL;
  const y = row * CELL;
  const bgFill = isMing ? "rgba(201,169,110,0.08)" : "transparent";
  const borderColor = isMing ? THEME.highlight : THEME.borderSoft;

  // 大限（当前大限）
  const daxian = chart.daxian.find(d => d.zhiIndex === palace.zhiIndex);
  const daxianText = daxian ? `${daxian.startAge}-${daxian.endAge}` : "";

  // 标签集合（左下角）
  const labels = [];
  if (isShen) labels.push(`<tspan fill="${THEME.highlight}">身</tspan>`);
  if (isDaxian) labels.push(`<tspan fill="${THEME.daxian}">大</tspan>`);
  if (isLiunian) labels.push(`<tspan fill="${THEME.liunian}">流</tspan>`);
  if (chart.xiaoxian && chart.xiaoxian.zhiIndex === palace.zhiIndex)
    labels.push(`<tspan fill="#C9A96E">小</tspan>`);

  // 星曜排版：主星字号大、在上方；辅星中间；煞星下方
  const starLines = [];
  const mainLine = palace.stars.map(s => starTspan(s, THEME.mainStar)).join(" ");
  if (mainLine) starLines.push({ text: mainLine, size: 18, weight: 600 });
  const auxLine = palace.auxStars.map(s => starTspan(s, THEME.auxStar)).join(" ");
  if (auxLine) starLines.push({ text: auxLine, size: 13, weight: 400 });
  const evilLine = palace.evilStars.map(s => starTspan(s, THEME.evilStar)).join(" ");
  if (evilLine) starLines.push({ text: evilLine, size: 13, weight: 400 });

  let starSvg = "";
  let yCursor = y + 44;
  for (const line of starLines) {
    starSvg += `<text x="${x + 12}" y="${yCursor}" font-size="${line.size}" font-weight="${line.weight}" font-family="'STSong','Songti SC','Noto Serif CJK SC',serif">${line.text}</text>`;
    yCursor += line.size + 8;
  }

  return `
    <g class="palace" data-palace="${escapeXml(palace.name)}" data-zhi-index="${palace.zhiIndex}">
      <rect x="${x}" y="${y}" width="${CELL}" height="${CELL}" fill="${bgFill}" stroke="${borderColor}" stroke-width="${isMing ? 1.5 : 0.8}" />
      ${starSvg}
      <!-- 底部：大限/宫名/宫干地支/标签 -->
      <text x="${x + CELL - 12}" y="${y + CELL - 12}" text-anchor="end" font-size="12" fill="${THEME.textDim}">${escapeXml(daxianText)}</text>
      <text x="${x + 12}" y="${y + CELL - 12}" font-size="11" font-weight="700">${labels.join(" ")}</text>
      <text x="${x + CELL / 2}" y="${y + CELL - 28}" text-anchor="middle" font-size="14" fill="${THEME.palaceLabel}" font-weight="600" letter-spacing="2">${escapeXml(palace.name)}</text>
      <text x="${x + CELL / 2}" y="${y + CELL - 12}" text-anchor="middle" font-size="12" fill="${THEME.ganzhi}">${escapeXml(palace.palaceGan)}${escapeXml(palace.zhi)}</text>
    </g>
  `;
}

function renderCenter(chart) {
  const x = CELL, y = CELL, w = CELL * 2, h = CELL * 2;
  const b = chart.bazi;
  const lines = [
    { t: "紫微斗数 · 命盘", cls: "title" },
    { t: `公历：${chart.input.solarYear}-${String(chart.input.solarMonth).padStart(2,"0")}-${String(chart.input.solarDay).padStart(2,"0")} ${String(chart.input.hour).padStart(2,"0")}时（${chart.hourName}）` },
    { t: `农历：${chart.lunar.year}年${chart.lunar.isLeapMonth ? "闰" : ""}${chart.lunar.month}月${chart.lunar.day}日  性别：${chart.input.gender}` },
    { t: `四柱：${b.year.gan}${b.year.zhi}  ${b.month.gan}${b.month.zhi}  ${b.day.gan}${b.day.zhi}  ${b.hour.gan}${b.hour.zhi}` },
    { t: `五行局：${chart.wuxingJu.name}（${chart.wuxingJu.nayin}）` },
    { t: `命主：${chart.mingzhu}    身主：${chart.shenzhu}` },
    { t: `命宫：${chart.mingGong.gan}${chart.mingGong.zhi}    身宫：${chart.shenGong.palaceName}` },
    { t: `生年四化：禄${chart.sihua.禄} · 权${chart.sihua.权} · 科${chart.sihua.科} · 忌${chart.sihua.忌}` },
    { t: `当前大限：${chart.daxian.find(d => d.startAge <= chart.currentAge && d.endAge >= chart.currentAge) ? `${chart.daxian.find(d => d.startAge <= chart.currentAge && d.endAge >= chart.currentAge).startAge}-${chart.daxian.find(d => d.startAge <= chart.currentAge && d.endAge >= chart.currentAge).endAge}岁` : "—"}    ${chart.currentYear}流年：${chart.liunian.gan}${["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"][chart.liunian.zhiIndex]}` },
  ];

  let svg = `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${THEME.bgCenter}" stroke="${THEME.border}" stroke-width="1.2"/>`;
  // 装饰线
  svg += `<line x1="${x + 20}" y1="${y + 54}" x2="${x + w - 20}" y2="${y + 54}" stroke="${THEME.borderSoft}" stroke-width="0.6"/>`;
  let ly = y + 38;
  for (const line of lines) {
    const isTitle = line.cls === "title";
    svg += `<text x="${x + w / 2}" y="${ly}" text-anchor="middle" font-size="${isTitle ? 22 : 14}" font-weight="${isTitle ? 700 : 400}" fill="${isTitle ? THEME.highlight : THEME.palaceLabel}" font-family="'STSong','Songti SC',serif" letter-spacing="${isTitle ? 6 : 1}">${escapeXml(line.t)}</text>`;
    ly += isTitle ? 36 : 28;
  }
  return svg;
}

/**
 * 主渲染函数
 * @param {Object} chart ChartData
 * @returns {string} SVG 字符串
 */
export function renderBoard(chart) {
  const currentDaxian = chart.daxian.find(d => d.startAge <= chart.currentAge && d.endAge >= chart.currentAge);
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${BOARD_SIZE} ${BOARD_SIZE}" class="ziwei-board" style="background:${THEME.bg}">`;

  // 外框装饰
  svg += `<rect x="2" y="2" width="${BOARD_SIZE - 4}" height="${BOARD_SIZE - 4}" fill="none" stroke="${THEME.border}" stroke-width="2"/>`;
  svg += `<rect x="10" y="10" width="${BOARD_SIZE - 20}" height="${BOARD_SIZE - 20}" fill="none" stroke="${THEME.borderSoft}" stroke-width="0.5"/>`;

  // 12 宫
  for (const p of chart.palaces) {
    const isMing = p.name === "命宫";
    const isShen = p.zhiIndex === chart.shenGong.zhiIndex;
    const isDaxian = currentDaxian && currentDaxian.zhiIndex === p.zhiIndex;
    const isLiunian = p.zhiIndex === chart.liunian.zhiIndex;
    svg += renderPalace(p, chart, isMing, isShen, isDaxian, isLiunian);
  }

  // 中宫
  svg += renderCenter(chart);

  svg += `</svg>`;
  return svg;
}
