// 斗数四柱、五行局、命主身主等
import { HEAVENLY_STEMS, EARTHLY_BRANCHES, yearGanZhi } from "./lunar.js";

// 五虎遁：年干→正月（寅月）之天干
const YIN_MONTH_GAN = {
  "甲": "丙", "己": "丙",
  "乙": "戊", "庚": "戊",
  "丙": "庚", "辛": "庚",
  "丁": "壬", "壬": "壬",
  "戊": "甲", "癸": "甲",
};

// 月支：正月=寅，二月=卯，...，十二月=丑
const MONTH_ZHI = ["寅","卯","辰","巳","午","未","申","酉","戌","亥","子","丑"];

// 五鼠遁：日干→子时之天干
const RI_HOUR_GAN = {
  "甲": "甲", "己": "甲",
  "乙": "丙", "庚": "丙",
  "丙": "戊", "辛": "戊",
  "丁": "庚", "壬": "庚",
  "戊": "壬", "癸": "壬",
};

// 时支 0=子 ... 11=亥
function stemIdx(g) { return HEAVENLY_STEMS.indexOf(g); }

// 月柱
export function monthGanZhi(yearGan, lunarMonth) {
  const base = YIN_MONTH_GAN[yearGan];
  const gIdx = (stemIdx(base) + (lunarMonth - 1)) % 10;
  return { gan: HEAVENLY_STEMS[gIdx], zhi: MONTH_ZHI[lunarMonth - 1] };
}

// 日柱：以公历日为基准，取其距甲子日的偏移。
// 基准：1900-01-01 为 甲戌日（已验证）。
// 甲子=0, 甲戌对应干0(甲)、支10(戌)，距甲子共 10 日。
export function dayGanZhi(date) {
  // date: JS Date (UTC)；我们用 UTC 天计数避开 DST
  const base = Date.UTC(1900, 0, 1);
  const days = Math.floor((date.getTime() - base) / 86400000);
  const offset = (days + 10) % 60; // +10 是因 1900-01-01 是第 10 个甲子周期位置（甲戌）
  const gan = HEAVENLY_STEMS[offset % 10];
  const zhi = EARTHLY_BRANCHES[offset % 12];
  return { gan, zhi, index: offset };
}

// 时柱
export function hourGanZhi(dayGan, hourZhiIdx) {
  const base = RI_HOUR_GAN[dayGan];
  const g = (stemIdx(base) + hourZhiIdx) % 10;
  return { gan: HEAVENLY_STEMS[g], zhi: EARTHLY_BRANCHES[hourZhiIdx] };
}

// 纳音五行局：由"命宫天干地支"查纳音表得出
// 斗数以命宫之干支查其纳音，纳音"水"→水二局，"木"→木三局，"金"→金四局，"土"→土五局，"火"→火六局
const NAYIN = {
  "甲子":"海中金","乙丑":"海中金","丙寅":"炉中火","丁卯":"炉中火",
  "戊辰":"大林木","己巳":"大林木","庚午":"路旁土","辛未":"路旁土",
  "壬申":"剑锋金","癸酉":"剑锋金","甲戌":"山头火","乙亥":"山头火",
  "丙子":"涧下水","丁丑":"涧下水","戊寅":"城头土","己卯":"城头土",
  "庚辰":"白蜡金","辛巳":"白蜡金","壬午":"杨柳木","癸未":"杨柳木",
  "甲申":"泉中水","乙酉":"泉中水","丙戌":"屋上土","丁亥":"屋上土",
  "戊子":"霹雳火","己丑":"霹雳火","庚寅":"松柏木","辛卯":"松柏木",
  "壬辰":"长流水","癸巳":"长流水","甲午":"沙中金","乙未":"沙中金",
  "丙申":"山下火","丁酉":"山下火","戊戌":"平地木","己亥":"平地木",
  "庚子":"壁上土","辛丑":"壁上土","壬寅":"金箔金","癸卯":"金箔金",
  "甲辰":"覆灯火","乙巳":"覆灯火","丙午":"天河水","丁未":"天河水",
  "戊申":"大驿土","己酉":"大驿土","庚戌":"钗钏金","辛亥":"钗钏金",
  "壬子":"桑柘木","癸丑":"桑柘木","甲寅":"大溪水","乙卯":"大溪水",
  "丙辰":"沙中土","丁巳":"沙中土","戊午":"天上火","己未":"天上火",
  "庚申":"石榴木","辛酉":"石榴木","壬戌":"大海水","癸亥":"大海水",
};

// 把纳音转为斗数五行局
export function wuxingJuByGanZhi(gan, zhi) {
  const key = gan + zhi;
  const nayin = NAYIN[key];
  if (!nayin) return null;
  if (nayin.endsWith("水")) return { name: "水二局", num: 2, nayin };
  if (nayin.endsWith("木")) return { name: "木三局", num: 3, nayin };
  if (nayin.endsWith("金")) return { name: "金四局", num: 4, nayin };
  if (nayin.endsWith("土")) return { name: "土五局", num: 5, nayin };
  if (nayin.endsWith("火")) return { name: "火六局", num: 6, nayin };
  return null;
}

// 命主：按生年地支
// 子→贪狼，丑亥→巨门，寅戌→禄存，卯酉→文曲，辰申→廉贞，巳未→武曲，午→破军
const MINGZHU_BY_YEARZHI = {
  "子":"贪狼",
  "丑":"巨门","亥":"巨门",
  "寅":"禄存","戌":"禄存",
  "卯":"文曲","酉":"文曲",
  "辰":"廉贞","申":"廉贞",
  "巳":"武曲","未":"武曲",
  "午":"破军",
};
// 身主：按生年地支
// 子午→火星，丑未→天相，寅申→天梁，卯酉→天同，辰戌→文昌，巳亥→天机
const SHENZHU_BY_YEARZHI = {
  "子":"火星","午":"火星",
  "丑":"天相","未":"天相",
  "寅":"天梁","申":"天梁",
  "卯":"天同","酉":"天同",
  "辰":"文昌","戌":"文昌",
  "巳":"天机","亥":"天机",
};

export function mingzhu(yearZhi) { return MINGZHU_BY_YEARZHI[yearZhi]; }
export function shenzhu(yearZhi) { return SHENZHU_BY_YEARZHI[yearZhi]; }

export { yearGanZhi };
