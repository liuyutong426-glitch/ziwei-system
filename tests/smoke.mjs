// 冒烟测试：排盘能否跑通
import { buildChart } from "../src/engine/chart.js";

const cases = [
  { name: "测试A：1990-05-15 14时 男",
    input: { solarYear: 1990, solarMonth: 5, solarDay: 15, hour: 14, gender: "男" } },
  { name: "测试B：1985-08-08 08时 女",
    input: { solarYear: 1985, solarMonth: 8, solarDay: 8, hour: 8, gender: "女" } },
  { name: "测试C：1949-10-01 12时 男",
    input: { solarYear: 1949, solarMonth: 10, solarDay: 1, hour: 12, gender: "男" } },
];

for (const c of cases) {
  console.log("=".repeat(60));
  console.log(c.name);
  try {
    const chart = buildChart(c.input);
    console.log("农历:", chart.lunar);
    console.log("八字:",
      chart.bazi.year.gan + chart.bazi.year.zhi, " ",
      chart.bazi.month.gan + chart.bazi.month.zhi, " ",
      chart.bazi.day.gan + chart.bazi.day.zhi, " ",
      chart.bazi.hour.gan + chart.bazi.hour.zhi,
    );
    console.log("命宫:", chart.mingGong.gan + chart.mingGong.zhi, "  身宫:", chart.shenGong.palaceName, "(" + chart.shenGong.zhi + ")");
    console.log("五行局:", chart.wuxingJu.name, "  纳音:", chart.wuxingJu.nayin);
    console.log("紫微在:", chart.ziwei.zhi);
    console.log("四化:", chart.sihua);
    console.log("--- 十二宫 ---");
    for (const p of chart.palaces) {
      const main = p.stars.map(s => s.name + (s.brightnessCN || "") + (s.sihua.length ? "(化" + s.sihua.join("/") + ")" : "")).join(" ");
      const aux = p.auxStars.map(s => s.name + (s.sihua.length ? "(化" + s.sihua.join("/") + ")" : "")).join(" ");
      const evil = p.evilStars.map(s => s.name).join(" ");
      console.log(`${p.name.padEnd(4)} ${p.palaceGan}${p.zhi}  主[${main}]  辅[${aux}]  煞[${evil}]`);
    }
  } catch (err) {
    console.error("ERR:", err.message);
  }
}
