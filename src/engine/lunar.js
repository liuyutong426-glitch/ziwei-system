// 阳历↔农历转换，覆盖 1900-2100。
// 算法与数据来源：传统农历转换标准（与 HKO / 香港天文台 / 寿星天文历 输出一致）。

// 每年一个压缩值：
//  bit 23..12: 12(+1) 个月大小月位图（1=大30, 0=小29）
//  bit 11..8 : 闰月月份（0=无闰）；若有闰月则读位图的第 13 位（bit 12）判断闰月大小
//  实际业界通用格式：0xABCD 形式 16-bit，高 4 bit 记闰月；本文采用"大月+20|闰月"16bit + 24bit 详情。
// 为稳妥起见直接使用广泛流传的 LUNAR_INFO 表（1900-2100）。

const LUNAR_INFO = [
  0x04bd8,0x04ae0,0x0a570,0x054d5,0x0d260,0x0d950,0x16554,0x056a0,0x09ad0,0x055d2,
  0x04ae0,0x0a5b6,0x0a4d0,0x0d250,0x1d255,0x0b540,0x0d6a0,0x0ada2,0x095b0,0x14977,
  0x04970,0x0a4b0,0x0b4b5,0x06a50,0x06d40,0x1ab54,0x02b60,0x09570,0x052f2,0x04970,
  0x06566,0x0d4a0,0x0ea50,0x06e95,0x05ad0,0x02b60,0x186e3,0x092e0,0x1c8d7,0x0c950,
  0x0d4a0,0x1d8a6,0x0b550,0x056a0,0x1a5b4,0x025d0,0x092d0,0x0d2b2,0x0a950,0x0b557,
  0x06ca0,0x0b550,0x15355,0x04da0,0x0a5b0,0x14573,0x052b0,0x0a9a8,0x0e950,0x06aa0,
  0x0aea6,0x0ab50,0x04b60,0x0aae4,0x0a570,0x05260,0x0f263,0x0d950,0x05b57,0x056a0,
  0x096d0,0x04dd5,0x04ad0,0x0a4d0,0x0d4d4,0x0d250,0x0d558,0x0b540,0x0b6a0,0x195a6,
  0x095b0,0x049b0,0x0a974,0x0a4b0,0x0b27a,0x06a50,0x06d40,0x0af46,0x0ab60,0x09570,
  0x04af5,0x04970,0x064b0,0x074a3,0x0ea50,0x06b58,0x055c0,0x0ab60,0x096d5,0x092e0,
  0x0c960,0x0d954,0x0d4a0,0x0da50,0x07552,0x056a0,0x0abb7,0x025d0,0x092d0,0x0cab5,
  0x0a950,0x0b4a0,0x0baa4,0x0ad50,0x055d9,0x04ba0,0x0a5b0,0x15176,0x052b0,0x0a930,
  0x07954,0x06aa0,0x0ad50,0x05b52,0x04b60,0x0a6e6,0x0a4e0,0x0d260,0x0ea65,0x0d530,
  0x05aa0,0x076a3,0x096d0,0x04afb,0x04ad0,0x0a4d0,0x1d0b6,0x0d250,0x0d520,0x0dd45,
  0x0b5a0,0x056d0,0x055b2,0x049b0,0x0a577,0x0a4b0,0x0aa50,0x1b255,0x06d20,0x0ada0,
  0x14b63,0x09370,0x049f8,0x04970,0x064b0,0x168a6,0x0ea50,0x06b20,0x1a6c4,0x0aae0,
  0x0a2e0,0x0d2e3,0x0c960,0x0d557,0x0d4a0,0x0da50,0x05d55,0x056a0,0x0a6d0,0x055d4,
  0x052d0,0x0a9b8,0x0a950,0x0b4a0,0x0b6a6,0x0ad50,0x055a0,0x0aba4,0x0a5b0,0x052b0,
  0x0b273,0x06930,0x07337,0x06aa0,0x0ad50,0x14b55,0x04b60,0x0a570,0x054e4,0x0d160,
  0x0e968,0x0d520,0x0daa0,0x16aa6,0x056d0,0x04ae0,0x0a9d4,0x0a2d0,0x0d150,0x0f252,
  0x0d520
];

// 农历年总天数
function lunarYearDays(y) {
  let sum = 348; // 29*12
  let info = LUNAR_INFO[y - 1900];
  for (let i = 0x8000; i > 0x8; i >>= 1) {
    sum += (info & i) ? 1 : 0;
  }
  return sum + leapDays(y);
}
// 闰月天数
function leapDays(y) {
  if (leapMonth(y)) {
    return (LUNAR_INFO[y - 1900] & 0x10000) ? 30 : 29;
  }
  return 0;
}
// 闰哪个月
function leapMonth(y) {
  return LUNAR_INFO[y - 1900] & 0xf;
}
// 农历 y 年的 m 月天数
function monthDays(y, m) {
  return (LUNAR_INFO[y - 1900] & (0x10000 >> m)) ? 30 : 29;
}

// 1900-01-31 为农历 1900 年正月初一
const LUNAR_EPOCH = Date.UTC(1900, 0, 31);

export function solarToLunar(year, month, day) {
  if (year < 1900 || year > 2100) throw new Error("支持年份 1900-2100");
  // 距 1900-01-31 的天数
  const ms = Date.UTC(year, month - 1, day) - LUNAR_EPOCH;
  let offset = Math.floor(ms / 86400000);

  let y = 1900, m = 1, temp = 0;
  for (; y < 2101 && offset > 0; y++) {
    temp = lunarYearDays(y);
    offset -= temp;
  }
  if (offset < 0) { offset += temp; y--; }

  // 是否闰年
  const leap = leapMonth(y);
  let isLeap = false;
  for (m = 1; m < 13 && offset > 0; m++) {
    if (leap > 0 && m === leap + 1 && !isLeap) {
      --m; isLeap = true; temp = leapDays(y);
    } else {
      temp = monthDays(y, m);
    }
    if (isLeap && m === (leap + 1)) isLeap = false;
    offset -= temp;
  }
  if (offset === 0 && leap > 0 && m === leap + 1) {
    if (isLeap) {
      isLeap = false;
    } else {
      isLeap = true; --m;
    }
  }
  if (offset < 0) { offset += temp; --m; }
  const d = offset + 1;
  return { year: y, month: m, day: d, isLeapMonth: isLeap };
}

// 天干地支
export const HEAVENLY_STEMS = ["甲","乙","丙","丁","戊","己","庚","辛","壬","癸"];
export const EARTHLY_BRANCHES = ["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"];

// 农历年柱：以立春为界在传统中更严谨，这里采用"农历正月初一"为年界（多数斗数流派通用）。
export function yearGanZhi(lunarYear) {
  const g = (lunarYear - 4) % 10;
  const z = (lunarYear - 4) % 12;
  return { gan: HEAVENLY_STEMS[(g + 10) % 10], zhi: EARTHLY_BRANCHES[(z + 12) % 12] };
}

// 时辰：子=0(23-1), 丑=1(1-3), ..., 亥=11(21-23)
export function hourToZhiIndex(hour) {
  // 23-1 子；1-3 丑 ...
  if (hour === 23 || hour < 1) return 0;
  return Math.floor((hour + 1) / 2);
}

// 十二时辰名到索引
export const HOUR_ZHI_NAMES = [
  "子（23-1）","丑（1-3）","寅（3-5）","卯（5-7）","辰（7-9）","巳（9-11）",
  "午（11-13）","未（13-15）","申（15-17）","酉（17-19）","戌（19-21）","亥（21-23）",
];
