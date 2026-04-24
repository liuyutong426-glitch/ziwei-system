// 排盘总调度：输入生辰 → 输出完整 ChartData
import {
  solarToLunar, HEAVENLY_STEMS, EARTHLY_BRANCHES,
  yearGanZhi as _yearGZ, hourToZhiIndex, HOUR_ZHI_NAMES,
} from "./lunar.js";
import {
  monthGanZhi, dayGanZhi, hourGanZhi, wuxingJuByGanZhi,
  mingzhu, shenzhu,
} from "./bazi.js";
import {
  calcMingGong, calcShenGong, buildPalaces, buildPalaceGans,
} from "./palaces.js";
import {
  placeZiwei, placeMainStars,
  placeZuofu2 as placeZuofu, placeYoubi,
  placeWenchang, placeWenqu,
  placeKuiYue, placeLucun, placeTianma,
  placeYangTuo, placeHuoLing, placeKongJie,
  starBrightness, BRIGHTNESS_CN,
} from "./stars.js";
import { getSihua } from "./sihua.js";
import { calcDaxian, calcXiaoxian, currentLiunian, liunianGan } from "./limits.js";

/**
 * @param {Object} input
 *  - solarYear, solarMonth, solarDay (公历)
 *  - hour (0-23)
 *  - gender: "男" | "女"
 *  - isLunarInput?: 若为true则 solarYear/Month/Day 当作农历（简化，不严格处理闰月）
 */
export function buildChart(input) {
  const { solarYear, solarMonth, solarDay, hour, gender } = input;

  // 1. 农历
  const lunar = solarToLunar(solarYear, solarMonth, solarDay);

  // 2. 年柱：以农历正月初一为界（斗数通用）
  const yearGZ = _yearGZ(lunar.year);

  // 3. 时辰索引
  const hourIdx = hourToZhiIndex(hour);
  const hourName = HOUR_ZHI_NAMES[hourIdx];

  // 4. 月柱
  const monthGZ = monthGanZhi(yearGZ.gan, lunar.month);
  // 5. 日柱
  const dayDate = new Date(Date.UTC(solarYear, solarMonth - 1, solarDay));
  const dayGZ = dayGanZhi(dayDate);
  // 6. 时柱
  const hourGZ = hourGanZhi(dayGZ.gan, hourIdx);

  // 7. 命宫 & 身宫
  const mingIdx = calcMingGong(lunar.month, hourIdx);
  const shenIdx = calcShenGong(lunar.month, hourIdx);

  // 8. 宫干：先确定 12 宫框架，再写入宫干
  const palaces = buildPalaces(mingIdx);
  const palaceGans = buildPalaceGans(yearGZ.gan);
  palaces.forEach(p => { p.palaceGan = palaceGans[p.zhiIndex]; });

  // 9. 五行局：由命宫干支纳音决定
  const mingGan = palaceGans[mingIdx];
  const mingZhi = EARTHLY_BRANCHES[mingIdx];
  const ju = wuxingJuByGanZhi(mingGan, mingZhi);
  if (!ju) throw new Error(`无法确定五行局：${mingGan}${mingZhi}`);

  // 10. 安紫微与十四主星
  const ziweiIdx = placeZiwei(ju.num, lunar.day);
  const mainStars = placeMainStars(ziweiIdx);

  // 11. 辅星
  const auxPositions = {
    "左辅": placeZuofu(lunar.month),
    "右弼": placeYoubi(lunar.month),
    "文昌": placeWenchang(hourIdx),
    "文曲": placeWenqu(hourIdx),
    "禄存": placeLucun(yearGZ.gan),
    "天马": placeTianma(yearGZ.zhi),
  };
  const kuiYue = placeKuiYue(yearGZ.gan);
  auxPositions["天魁"] = kuiYue["魁"];
  auxPositions["天钺"] = kuiYue["钺"];

  // 12. 煞星
  const yt = placeYangTuo(yearGZ.gan);
  const hl = placeHuoLing(yearGZ.zhi, hourIdx);
  const kj = placeKongJie(hourIdx);
  const evilPositions = {
    "擎羊": yt["擎羊"], "陀罗": yt["陀罗"],
    "火星": hl["火星"], "铃星": hl["铃星"],
    "地空": kj["地空"], "地劫": kj["地劫"],
  };

  // 13. 四化
  const sihua = getSihua(yearGZ.gan);
  const sihuaMap = { 禄: sihua.禄, 权: sihua.权, 科: sihua.科, 忌: sihua.忌 };

  // 14. 把星曜填入对应宫
  function putStarIntoPalace(starName, zhiIdx, kind) {
    const palace = palaces.find(p => p.zhiIndex === zhiIdx);
    if (!palace) return;
    const bright = starBrightness(starName, zhiIdx);
    const entry = {
      name: starName,
      kind, // "主星" / "辅星" / "煞星"
      brightness: bright,
      brightnessCN: bright ? BRIGHTNESS_CN[bright] : null,
      sihua: [],
    };
    // 检查是否被化
    for (const [k, s] of Object.entries(sihuaMap)) {
      if (s === starName) entry.sihua.push(k);
    }
    if (kind === "主星") palace.stars.push(entry);
    else if (kind === "辅星") palace.auxStars.push(entry);
    else palace.evilStars.push(entry);
  }
  for (const [name, idx] of Object.entries(mainStars)) putStarIntoPalace(name, idx, "主星");
  for (const [name, idx] of Object.entries(auxPositions)) putStarIntoPalace(name, idx, "辅星");
  for (const [name, idx] of Object.entries(evilPositions)) putStarIntoPalace(name, idx, "煞星");

  // 15. 身宫所在宫位名
  const shenPalaceName = palaces.find(p => p.zhiIndex === shenIdx)?.name;

  // 16. 大限
  const daxian = calcDaxian(mingIdx, ju.num, yearGZ.gan, gender);

  // 17. 流年
  const todayYear = new Date().getFullYear();
  const liunianIdx = currentLiunian(todayYear);
  const age = todayYear - solarYear + 1; // 虚岁近似
  const xiaoxianIdx = calcXiaoxian(age, yearGZ.zhi, gender);

  return {
    input: { solarYear, solarMonth, solarDay, hour, gender },
    lunar,
    bazi: {
      year: yearGZ, month: monthGZ, day: { gan: dayGZ.gan, zhi: dayGZ.zhi }, hour: hourGZ,
    },
    hourName,
    mingGong: { zhiIndex: mingIdx, zhi: EARTHLY_BRANCHES[mingIdx], gan: palaceGans[mingIdx] },
    shenGong: { zhiIndex: shenIdx, zhi: EARTHLY_BRANCHES[shenIdx], palaceName: shenPalaceName },
    wuxingJu: ju,
    mingzhu: mingzhu(yearGZ.zhi),
    shenzhu: shenzhu(yearGZ.zhi),
    ziwei: { zhiIndex: ziweiIdx, zhi: EARTHLY_BRANCHES[ziweiIdx] },
    palaces,
    sihua: sihuaMap,
    daxian,
    currentYear: todayYear,
    currentAge: age,
    liunian: { year: todayYear, zhiIndex: liunianIdx, gan: liunianGan(todayYear) },
    xiaoxian: { age, zhiIndex: xiaoxianIdx },
  };
}
