// 回归测试：验证排盘核心点
// 标准：多款主流紫微排盘程序的一致结论
import { buildChart } from "../src/engine/chart.js";
import { plainify } from "../src/interpret/plainify.js";
import { buildHistoryLiunians, calcAccuracy } from "../src/interpret/liunian-history.js";

let pass = 0, fail = 0;

function assertEq(actual, expected, label) {
  const ok = actual === expected;
  if (ok) { pass++; console.log(`  ✓ ${label}  (${actual})`); }
  else { fail++; console.log(`  ✗ ${label}  expected=${expected} actual=${actual}`); }
}

// Case 1: 1990-05-15 午时 男
console.log("Case1: 1990-05-15 14时 男");
let c = buildChart({ solarYear: 1990, solarMonth: 5, solarDay: 15, hour: 14, gender: "男" });
assertEq(c.lunar.year, 1990, "农历年");
assertEq(c.lunar.month, 4, "农历月");
assertEq(c.lunar.day, 21, "农历日");
assertEq(c.bazi.year.gan + c.bazi.year.zhi, "庚午", "年柱");
assertEq(c.wuxingJu.name, "土五局", "五行局");
assertEq(c.mingGong.zhi, "戌", "命宫地支");
assertEq(c.ziwei.zhi, "寅", "紫微位置");
assertEq(c.sihua.禄, "太阳", "庚年化禄");
assertEq(c.sihua.忌, "天同", "庚年化忌");
// 武曲应在戌宫（命宫）
const ming = c.palaces.find(p => p.name === "命宫");
const hasWuqu = ming.stars.some(s => s.name === "武曲");
assertEq(hasWuqu, true, "命宫有武曲");
const wuquSihua = ming.stars.find(s => s.name === "武曲")?.sihua.join("");
assertEq(wuquSihua, "权", "武曲化权");

// Case 2: 1985-08-08 辰时 女 (已知：紫微天府在亥/巳对照)
console.log("\nCase2: 1985-08-08 08时 女");
c = buildChart({ solarYear: 1985, solarMonth: 8, solarDay: 8, hour: 8, gender: "女" });
assertEq(c.bazi.year.gan + c.bazi.year.zhi, "乙丑", "年柱");
assertEq(c.sihua.科, "紫微", "乙年化科");
assertEq(c.sihua.忌, "太阴", "乙年化忌");

// Case 3: 1949-10-01 午时 男（开国日；仅验算法稳定性）
console.log("\nCase3: 1949-10-01 12时 男");
c = buildChart({ solarYear: 1949, solarMonth: 10, solarDay: 1, hour: 12, gender: "男" });
assertEq(c.bazi.year.gan + c.bazi.year.zhi, "己丑", "年柱");
assertEq(c.wuxingJu.name, "火六局", "五行局");
assertEq(c.daxian[0].startAge, 6, "火六局起运6岁");

// Case 4: 2000-01-01 子时 男（新世纪首日）
console.log("\nCase4: 2000-01-01 00时 男");
c = buildChart({ solarYear: 2000, solarMonth: 1, solarDay: 1, hour: 0, gender: "男" });
// 2000-01-01 农历是 1999 己卯年腊月廿五
assertEq(c.lunar.year, 1999, "农历年(跨年前)");
assertEq(c.bazi.year.gan + c.bazi.year.zhi, "己卯", "年柱");

// Case 5: 1976-07-28 申时 男 (唐山大地震日；用于检查闰月前后)
console.log("\nCase5: 1976-07-28 16时 男");
c = buildChart({ solarYear: 1976, solarMonth: 7, solarDay: 28, hour: 16, gender: "男" });
assertEq(c.bazi.year.gan + c.bazi.year.zhi, "丙辰", "年柱");

// ==== 大白话翻译模块 ====
console.log("\nCase6: 大白话翻译");
const raw1 = "紫微星入命宫，为人忠厚，宜文职，忌煞忌交冲。";
const plain1 = plainify(raw1);
assertEq(plain1.includes("紫微（领导星）"), true, "紫微星 → 紫微（领导星）");
assertEq(plain1.includes("这个人"), true, "为人 → 这个人");
assertEq(plain1.includes("适合"), true, "宜 → 适合");
const raw2 = "三方四正有化禄，主富贵。";
const plain2 = plainify(raw2);
assertEq(plain2.includes("命宫及其关联的三个宫位"), true, "三方四正 → 白话解释");
assertEq(plain2.includes("带来财运与好机会"), true, "化禄 → 白话解释");
// 保护词验证：财帛主不应被拆
const raw3 = "武曲为财帛主，将星，化气为财。";
const plain3 = plainify(raw3);
assertEq(plain3.includes("财帛主"), true, "财帛主 被保护");
assertEq(plain3.includes("将星"), true, "将星 被保护");

// ==== 流年历史回顾 ====
console.log("\nCase7: 流年历史回顾");
const chart7 = buildChart({ solarYear: 1990, solarMonth: 5, solarDay: 15, hour: 14, gender: "男" });
const hist = buildHistoryLiunians(chart7, 10);
assertEq(hist.length, 10, "生成10年流年");
assertEq(typeof hist[0].year, "number", "每年有year字段");
assertEq(typeof hist[0].grade.label, "string", "每年有grade.label");
assertEq(hist[0].dimensions.事业.length > 0, true, "事业维度有内容");
assertEq(hist[0].dimensions.财运.length > 0, true, "财运维度有内容");
assertEq(hist[0].dimensions.感情.length > 0, true, "感情维度有内容");
assertEq(hist[0].dimensions.健康.length > 0, true, "健康维度有内容");
// 验证流年天干：2020年应是庚子
const y2020 = hist.find(h => h.year === 2020);
if (y2020) assertEq(y2020.lnGan + y2020.lnZhi, "庚子", "2020流年干支");
// 准确率计算
const acc = calcAccuracy({ 2020: "accurate", 2021: "accurate", 2022: "wrong", 2023: "so-so" });
assertEq(acc.total, 4, "打分总数");
assertEq(acc.accurate, 2, "很准计数");
assertEq(acc.hitRate, 63, "命中率 (2+0.5)/4=62.5→63");

console.log(`\n==== ${pass} passed, ${fail} failed ====\n`);
