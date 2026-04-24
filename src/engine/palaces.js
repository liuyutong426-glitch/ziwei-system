// 定十二宫、命宫、身宫
// 地支十二位次：寅=0 卯=1 辰=2 ... 丑=11 （即从寅开始顺时针）
// 注意：斗数十二宫在盘上以地支定位，通常顺序是 寅卯辰巳午未申酉戌亥子丑（顺时针）

import { EARTHLY_BRANCHES } from "./lunar.js";

// 标准地支顺序（子=0…亥=11）
// 但斗数盘寅宫起位，以下使用 "地支索引"（0=子…11=亥）
const YIN_INDEX = 2; // 寅

// 命宫：寅宫起正月，顺数至生月；再从生月宫起子时，逆数至生时得命宫
// 另一说：寅起正月逆数至生月得命宫起点——这里使用最通用的方法：
// 公式：命宫地支索引 = (寅 + (月 - 1) - (生时索引)) mod 12
// 简化：从寅起顺数至生月，再从该宫起子时逆数至生时
//
// 逐步：
//   monthStart = (YIN_INDEX + lunarMonth - 1) mod 12   （寅起正月顺行到生月所在宫）
//   mingGong   = (monthStart - hourZhiIdx + 12) mod 12  （从生月宫起子时，逆数到生时）
export function calcMingGong(lunarMonth, hourZhiIdx) {
  const monthStart = (YIN_INDEX + (lunarMonth - 1)) % 12;
  const mingGong = (monthStart - hourZhiIdx + 12) % 12;
  return mingGong; // 返回地支索引 0-11（0=子）
}

// 身宫：从生月宫起子时，顺数到生时
export function calcShenGong(lunarMonth, hourZhiIdx) {
  const monthStart = (YIN_INDEX + (lunarMonth - 1)) % 12;
  return (monthStart + hourZhiIdx) % 12;
}

// 十二宫名（逆数排列）：命宫→兄弟→夫妻→子女→财帛→疾厄→迁移→交友→官禄→田宅→福德→父母
export const PALACE_NAMES = [
  "命宫","兄弟宫","夫妻宫","子女宫","财帛宫","疾厄宫",
  "迁移宫","交友宫","官禄宫","田宅宫","福德宫","父母宫",
];

// 根据命宫索引，生成 12 宫到地支索引的映射（命宫、兄弟、夫妻...按逆时针）
export function buildPalaces(mingZhiIndex) {
  const out = [];
  for (let i = 0; i < 12; i++) {
    // 兄弟宫在命宫逆行（地支减1）方向
    const zhiIdx = (mingZhiIndex - i + 12) % 12;
    out.push({
      name: PALACE_NAMES[i],
      zhiIndex: zhiIdx,
      zhi: EARTHLY_BRANCHES[zhiIdx],
      stars: [],    // 主星
      auxStars: [], // 辅星
      evilStars: [], // 煞星
      sihua: [],    // 四化标记
      palaceGan: "", // 宫干（待 stars.js 填充）
    });
  }
  return out;
}

// 宫干：以生年天干配合月份，按"五虎遁"定寅宫之天干，其他宫依天干顺序
// 五虎遁：甲己之年丙作首，乙庚之年戊为头，丙辛之年庚起首，丁壬之年壬当头，戊癸之年甲为首
const YIN_GAN_BY_YEAR_GAN = {
  "甲":"丙","己":"丙",
  "乙":"戊","庚":"戊",
  "丙":"庚","辛":"庚",
  "丁":"壬","壬":"壬",
  "戊":"甲","癸":"甲",
};

import { HEAVENLY_STEMS } from "./lunar.js";

// 返回 12 个地支索引对应的宫干
// 由寅宫起，从YIN_GAN_BY_YEAR_GAN获得起干，然后依序寅卯辰...丑 顺行 10 干循环
// 但天干只有 10，地支 12，子丑两宫无干（传统做法：子丑用寅卯对应干？实际斗数用"六十甲子"方式）
// 标准做法：寅宫起此年寅月之天干，顺行给 寅卯辰巳午未申酉戌亥 共 10 宫，子丑宫按顺序继续循环
export function buildPalaceGans(yearGan) {
  const startGan = YIN_GAN_BY_YEAR_GAN[yearGan];
  const startIdx = HEAVENLY_STEMS.indexOf(startGan);
  // 地支顺序：寅(2) 卯(3) 辰(4) 巳(5) 午(6) 未(7) 申(8) 酉(9) 戌(10) 亥(11) 子(0) 丑(1)
  const zhiOrder = [2,3,4,5,6,7,8,9,10,11,0,1];
  const gans = {}; // zhiIdx -> gan
  for (let i = 0; i < 12; i++) {
    gans[zhiOrder[i]] = HEAVENLY_STEMS[(startIdx + i) % 10];
  }
  return gans;
}
