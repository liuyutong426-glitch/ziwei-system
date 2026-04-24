// 格局识别
// 输入 ChartData，返回命中的格局列表

function starsInPalace(palace) {
  return [
    ...palace.stars.map(s => s.name),
    ...palace.auxStars.map(s => s.name),
    ...palace.evilStars.map(s => s.name),
  ];
}

function palaceHas(palace, starNames) {
  const all = starsInPalace(palace);
  return starNames.every(n => all.includes(n));
}

function mingPalace(chart) { return chart.palaces.find(p => p.name === "命宫"); }
function getPalaceByZhi(chart, zhiIdx) { return chart.palaces.find(p => p.zhiIndex === zhiIdx); }
// 三方四正：命宫+财帛+官禄+迁移
function trinity(chart) {
  const ming = mingPalace(chart);
  const caibo = chart.palaces.find(p => p.name === "财帛宫");
  const guanlu = chart.palaces.find(p => p.name === "官禄宫");
  const qianyi = chart.palaces.find(p => p.name === "迁移宫");
  return [ming, caibo, guanlu, qianyi];
}

function allStarsInTrinity(chart) {
  const palaces = trinity(chart);
  const s = new Set();
  for (const p of palaces) for (const n of starsInPalace(p)) s.add(n);
  return s;
}

export function detectPatterns(chart) {
  const hits = [];
  const ming = mingPalace(chart);
  const tri = allStarsInTrinity(chart);
  const mingStarNames = ming.stars.map(s => s.name);

  // 紫府朝垣：命宫有紫微+天府，或三方见紫微、天府朝命
  if (palaceHas(ming, ["紫微", "天府"])) {
    hits.push({ name: "紫府朝垣", level: "上格", desc: "紫微天府同入命宫，帝星与财库齐辉，主人终身福厚，富贵双全，气度雍容。" });
  } else if (tri.has("紫微") && tri.has("天府") && !mingStarNames.includes("紫微") && !mingStarNames.includes("天府")) {
    hits.push({ name: "紫府朝垣", level: "上格", desc: "三方四正见紫微与天府朝拱命宫，主一生福禄深厚，得贵人之助，事业易成。" });
  }

  // 府相朝垣：三方见天府、天相
  if (tri.has("天府") && tri.has("天相")) {
    hits.push({ name: "府相朝垣", level: "上格", desc: "天府天相会照命宫，财印齐辉，主一生衣禄丰足、处事稳重、能得权位。" });
  }

  // 君臣庆会：紫微坐命，左右或昌曲或魁钺来会
  if (mingStarNames.includes("紫微")) {
    const auxFulfilled = ["左辅", "右弼", "文昌", "文曲", "天魁", "天钺"].filter(n => tri.has(n));
    if (auxFulfilled.length >= 2) {
      hits.push({ name: "君臣庆会", level: "上格", desc: `紫微坐命，得${auxFulfilled.join("、")}等辅佐星朝拱，如君臣庆会，一生贵气显达，事业有大成就。` });
    }
  }

  // 机月同梁：命宫或三方四正见 天机、太阴、天同、天梁 四星其中三颗或以上
  const jylt = ["天机", "太阴", "天同", "天梁"].filter(n => tri.has(n));
  if (jylt.length >= 3) {
    hits.push({ name: "机月同梁", level: "吏人格", desc: `三方四正见${jylt.join("、")}，为"机月同梁作吏人"之格，宜公教、文职、企划、流动性工作，宜稳定中求发展。` });
  }

  // 杀破狼：命宫或三方见 七杀、破军、贪狼 三星
  const spt = ["七杀", "破军", "贪狼"].filter(n => tri.has(n));
  if (spt.length >= 2) {
    hits.push({ name: "杀破狼", level: "创格", desc: `见${spt.join("、")}会照，主人生多变动与开创，宜自立门户、武职、行销、创业，吉则暴发，凶则起落。` });
  }

  // 火贪格：贪狼+火星同宫
  for (const p of chart.palaces) {
    const names = starsInPalace(p);
    if (names.includes("贪狼") && names.includes("火星")) {
      hits.push({ name: "火贪格", level: "暴发格", desc: `${p.name}贪狼与火星同宫，主突发横财或暴富，然来得快亦去得快，宜见好就收。` });
    }
    if (names.includes("贪狼") && names.includes("铃星")) {
      hits.push({ name: "铃贪格", level: "暴发格", desc: `${p.name}贪狼与铃星同宫，与火贪相类，主偏财横发但须防暴败。` });
    }
  }

  // 日月并明：太阳居午/巳/辰 + 太阴居子/丑/亥 同入盘
  const tySun = chart.palaces.find(p => p.stars.some(s => s.name === "太阳"));
  const tyMoon = chart.palaces.find(p => p.stars.some(s => s.name === "太阴"));
  if (tySun && tyMoon) {
    const sunBright = tySun.stars.find(s => s.name === "太阳").brightness;
    const moonBright = tyMoon.stars.find(s => s.name === "太阴").brightness;
    if (["M", "W"].includes(sunBright) && ["M", "W"].includes(moonBright)) {
      hits.push({ name: "日月并明", level: "上格", desc: "太阳太阴皆在庙旺之地，主一生光明磊落、名利双收、心胸宽阔。" });
    } else if (["X", "B"].includes(sunBright) && ["X", "B"].includes(moonBright)) {
      hits.push({ name: "日月反背", level: "劳格", desc: "太阳太阴俱落陷，主少年辛劳、明暗反复，宜修身立德以化解。" });
    }
  }

  // 禄马交驰：禄存+天马同宫或会照
  for (const p of chart.palaces) {
    const names = starsInPalace(p);
    if (names.includes("禄存") && names.includes("天马")) {
      hits.push({ name: "禄马交驰", level: "财格", desc: `${p.name}禄存与天马同宫，主动中生财、远行得利，宜外出发展或从事流通贸易。` });
      break;
    }
  }

  // 孤君：紫微坐命无百官（左右昌曲魁钺皆不在三方）
  if (mingStarNames.includes("紫微")) {
    const baiguan = ["左辅", "右弼", "文昌", "文曲", "天魁", "天钺"].filter(n => tri.has(n));
    if (baiguan.length === 0) {
      hits.push({ name: "孤君寡人", level: "警戒", desc: "紫微坐命而无辅佐星朝拱，谓之孤君，主孤傲难合，志大才疏，宜修心养性，亲贵人。" });
    }
  }

  return hits;
}
