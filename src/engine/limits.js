// 大限、小限、流年、斗君

// 大限：起运岁数由五行局决定（水二局2岁起，木三局3岁，金四局4岁，土五局5岁，火六局6岁）
// 起大限位置：阳男阴女顺行，阴男阳女逆行；从命宫开始，每十年一宫

// 判定阴阳：甲丙戊庚壬为阳干；乙丁己辛癸为阴干
const YANG_GANS = new Set(["甲","丙","戊","庚","壬"]);

// mingZhiIndex: 命宫地支索引
// juNum: 五行局数
// yearGan: 生年天干
// gender: "男" | "女"
// 返回: 12 个大限 { startAge, endAge, zhiIndex }
export function calcDaxian(mingZhiIndex, juNum, yearGan, gender) {
  const isYangYear = YANG_GANS.has(yearGan);
  const isMale = gender === "男";
  const forward = (isYangYear && isMale) || (!isYangYear && !isMale); // 阳男阴女顺行，阴男阳女逆行
  const startAge = juNum; // 2/3/4/5/6
  const out = [];
  for (let i = 0; i < 12; i++) {
    const zhiIdx = forward
      ? (mingZhiIndex + i) % 12
      : (mingZhiIndex - i + 12 * 12) % 12;
    const s = startAge + i * 10;
    out.push({ startAge: s, endAge: s + 9, zhiIndex: zhiIdx });
  }
  return out;
}

// 小限：按年支所属三合局起宫，每年一宫
// 寅午戌年男起辰宫，女起戌宫（一说）；传统做法：
//   寅午戌：起辰
//   申子辰：起戌
//   巳酉丑：起未
//   亥卯未：起丑
// 男顺行、女逆行
const XIAOXIAN_START = {
  "寅":4,"午":4,"戌":4,
  "申":10,"子":10,"辰":10,
  "巳":7,"酉":7,"丑":7,
  "亥":1,"卯":1,"未":1,
};
export function calcXiaoxian(age, yearZhi, gender) {
  const start = XIAOXIAN_START[yearZhi];
  if (start === undefined) return null;
  const forward = gender === "男";
  const offset = age - 1;
  const zhiIdx = forward ? (start + offset) % 12 : (start - offset + 12 * 100) % 12;
  return zhiIdx;
}

// 流年：地支即为该年地支所在宫
// 斗君：每年正月所在宫。起法为"流年地支起生月，顺数至生时"得斗君
// 简化：流年宫 = 流年地支
export function currentLiunian(solarYear) {
  // 以 1900 为甲子为参考：(year - 4) % 12 = 地支索引
  return ((solarYear - 4) % 12 + 12) % 12;
}

// 流年天干
export function liunianGan(solarYear) {
  const gans = ["甲","乙","丙","丁","戊","己","庚","辛","壬","癸"];
  return gans[((solarYear - 4) % 10 + 10) % 10];
}
