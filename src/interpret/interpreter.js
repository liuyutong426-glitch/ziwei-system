// 解读引擎
import { KB_STARS } from "../kb/stars.js";
import { KB_PALACES } from "../kb/palaces.js";
import { KB_SIHUA } from "../kb/sihua.js";
import { KB_COMBOS } from "../kb/combinations.js";
import { KB_LIMITS } from "../kb/limits.js";
import { detectPatterns } from "./pattern-detect.js";

function findPalace(chart, name) { return chart.palaces.find(p => p.name === name); }

function fmtStarNames(stars, withBright = false) {
  return stars.map(s => {
    const b = withBright && s.brightnessCN ? s.brightnessCN : "";
    const sh = s.sihua && s.sihua.length ? `化${s.sihua.join("")}` : "";
    return s.name + b + sh;
  });
}

// 命宫总论
function interpretMingGong(chart) {
  const ming = findPalace(chart, "命宫");
  const mainStars = ming.stars;
  const parts = [];
  parts.push(`命宫坐落${chart.mingGong.gan}${chart.mingGong.zhi}，身宫寄于${chart.shenGong.palaceName}。五行局为${chart.wuxingJu.name}，纳音${chart.wuxingJu.nayin}。命主${chart.mingzhu}，身主${chart.shenzhu}。`);
  if (mainStars.length === 0) {
    parts.push("命宫为空宫，无主星坐守，性情较易受对宫(迁移宫)与三方星曜影响，一生变化较多，宜借对宫主星与辅佐吉星合参。");
  } else {
    for (const s of mainStars) {
      const kbStar = KB_STARS[s.name];
      if (!kbStar) continue;
      const bright = s.brightnessCN ? `于${ming.zhi}宫${s.brightnessCN}` : "";
      parts.push(`【${s.name}${bright}】${kbStar["星性解释"] || ""}`);
      if (kbStar["性情才华"]) {
        parts.push(`性情才华：${kbStar["性情才华"]}`);
      }
    }
  }
  const aux = ming.auxStars.map(s => s.name);
  const evil = ming.evilStars.map(s => s.name);
  if (aux.length) parts.push(`命宫有${aux.join("、")}等辅佐星同临，能得助力、气象较佳。`);
  if (evil.length) parts.push(`同时有${evil.join("、")}等煞曜入宫，须防波折，宜修心养性以化之。`);
  // 身宫
  if (chart.shenGong.palaceName !== "命宫") {
    parts.push(`身宫落于${chart.shenGong.palaceName}，中晚年更重此宫之事，为人生后天之应验重点。`);
  } else {
    parts.push("命身同宫，为人主观坚毅，一生命运皆重在自我奋发。");
  }
  return parts.join("\n\n");
}

// 格局
function interpretPatterns(chart) {
  const patterns = detectPatterns(chart);
  if (!patterns.length) {
    return "本命盘未检测出经典显著格局，宜由十二宫逐宫细推。";
  }
  return patterns.map(p => `【${p.name}】（${p.level}）${p.desc}`).join("\n\n");
}

// 单宫解读
function interpretOnePalace(chart, palaceName) {
  const p = findPalace(chart, palaceName);
  if (!p) return "";
  const kb = KB_PALACES[palaceName];
  const parts = [];
  if (kb && kb.meaning) {
    parts.push(`【${palaceName}宫意】${kb.meaning}`);
  }
  parts.push(`本宫坐${p.palaceGan}${p.zhi}。`);
  if (p.stars.length === 0) {
    const opposite = chart.palaces.find(op => op.zhiIndex === (p.zhiIndex + 6) % 12);
    const oppMain = opposite ? fmtStarNames(opposite.stars, true).join("、") : "";
    parts.push(`本宫无主星，借对宫${opposite?.name || ""}（${oppMain || "空宫"}）之星曜合参。`);
  } else {
    for (const s of p.stars) {
      const kbStar = KB_STARS[s.name];
      const bright = s.brightnessCN ? s.brightnessCN : "";
      if (kbStar) {
        parts.push(`主星【${s.name}${bright}${s.sihua.length ? "化" + s.sihua.join("") : ""}】：${kbStar["星性解释"] || kbStar.intro || ""}`);
      }
    }
    // 双星组合
    if (p.stars.length >= 2) {
      const names = p.stars.map(s => s.name);
      // 尝试各种排列组合查表
      for (let i = 0; i < names.length; i++) {
        for (let j = 0; j < names.length; j++) {
          if (i === j) continue;
          const key = `${names[i]}+${names[j]}`;
          if (KB_COMBOS[key]) {
            parts.push(`【组合】${key}：${KB_COMBOS[key]}`);
          }
        }
      }
    }
  }
  const aux = p.auxStars.map(s => s.name);
  const evil = p.evilStars.map(s => s.name);
  if (aux.length) parts.push(`辅佐：${aux.join("、")}同宫，增其吉力。`);
  if (evil.length) parts.push(`煞忌：${evil.join("、")}临宫，须防此宫相关事端。`);
  // 四化
  const allStars = [...p.stars, ...p.auxStars, ...p.evilStars];
  const sihuaInPalace = allStars.filter(s => s.sihua && s.sihua.length);
  if (sihuaInPalace.length) {
    for (const s of sihuaInPalace) {
      for (const sh of s.sihua) {
        const shDesc = KB_SIHUA["入宫"]["化" + sh]?.[palaceName];
        if (shDesc) parts.push(`【生年化${sh}入${palaceName}】${s.name}化${sh}：${shDesc}。`);
      }
    }
  }
  return parts.join("\n");
}

// 十二宫逐宫详解
function interpretAllPalaces(chart) {
  const order = ["命宫","兄弟宫","夫妻宫","子女宫","财帛宫","疾厄宫","迁移宫","交友宫","官禄宫","田宅宫","福德宫","父母宫"];
  const sections = [];
  for (const name of order) {
    const text = interpretOnePalace(chart, name);
    sections.push({ title: name, content: text });
  }
  return sections;
}

// 四化飞星解读
function interpretSihua(chart) {
  const parts = [];
  parts.push(`生年四化：【化禄】${chart.sihua.禄}  【化权】${chart.sihua.权}  【化科】${chart.sihua.科}  【化忌】${chart.sihua.忌}。`);
  // 定位每个化星所在宫
  for (const [k, starName] of Object.entries(chart.sihua)) {
    let where = null;
    for (const p of chart.palaces) {
      const all = [...p.stars, ...p.auxStars, ...p.evilStars];
      if (all.some(s => s.name === starName)) { where = p.name; break; }
    }
    if (where) {
      const desc = KB_SIHUA["入宫"]["化" + k]?.[where];
      parts.push(`【化${k}・${starName}入${where}】${desc || ""}`);
    }
  }
  return parts.join("\n\n");
}

// 大限流年
function interpretDaxianLiunian(chart) {
  const current = chart.daxian.find(d => d.startAge <= chart.currentAge && d.endAge >= chart.currentAge);
  const parts = [];
  if (current) {
    const pal = chart.palaces.find(p => p.zhiIndex === current.zhiIndex);
    parts.push(`当前大限：${current.startAge}岁～${current.endAge}岁，行至【${pal?.name || ""}】（${pal?.palaceGan}${pal?.zhi}）。`);
    const mainList = pal?.stars.map(s => s.name + (s.brightnessCN || "")).join("、") || "空宫";
    parts.push(`此限主星：${mainList}。此十年以该宫事务为重点，宜顺势而为、扬长避短。`);
    if (pal && pal.stars.length) {
      const s = pal.stars[0];
      const kb = KB_STARS[s.name];
      if (kb && kb["组合喜忌"]) parts.push(`限内要诀：${kb["组合喜忌"].slice(0, 260)}`);
    }
  }
  // 流年
  const lnPal = chart.palaces.find(p => p.zhiIndex === chart.liunian.zhiIndex);
  if (lnPal) {
    parts.push(`${chart.currentYear}流年（${chart.liunian.gan}${["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"][chart.liunian.zhiIndex]}）行至【${lnPal.name}】，本年重点关注此宫相关人事。`);
  }
  return parts.join("\n\n");
}

// 主入口
export function interpretChart(chart) {
  return {
    mingGongOverview: interpretMingGong(chart),
    patterns: interpretPatterns(chart),
    palaces: interpretAllPalaces(chart),
    sihua: interpretSihua(chart),
    limits: interpretDaxianLiunian(chart),
  };
}

// 追问（按宫位关键字）
export function answerQuestion(chart, topic) {
  const palaceMap = {
    "事业": "官禄宫", "工作": "官禄宫", "职业": "官禄宫", "升迁": "官禄宫",
    "财运": "财帛宫", "财富": "财帛宫", "钱": "财帛宫", "求财": "财帛宫",
    "姻缘": "夫妻宫", "婚姻": "夫妻宫", "配偶": "夫妻宫", "感情": "夫妻宫", "爱情": "夫妻宫",
    "健康": "疾厄宫", "身体": "疾厄宫", "疾病": "疾厄宫",
    "子女": "子女宫", "小孩": "子女宫", "孩子": "子女宫",
    "父母": "父母宫", "长辈": "父母宫",
    "兄弟": "兄弟宫", "姐妹": "兄弟宫",
    "朋友": "交友宫", "人脉": "交友宫", "下属": "交友宫",
    "搬家": "田宅宫", "置产": "田宅宫", "房子": "田宅宫", "家宅": "田宅宫",
    "福报": "福德宫", "福气": "福德宫", "精神": "福德宫",
    "出行": "迁移宫", "出国": "迁移宫", "远行": "迁移宫", "外地": "迁移宫",
  };
  const topicKey = String(topic || "").trim();
  // 完全等于常见宫位名
  let targetName = null;
  if (topicKey.endsWith("宫") || palaceMap[topicKey]) {
    targetName = topicKey.endsWith("宫") ? topicKey : palaceMap[topicKey];
  } else {
    for (const [kw, pname] of Object.entries(palaceMap)) {
      if (topicKey.includes(kw)) { targetName = pname; break; }
    }
  }
  if (!targetName) {
    return {
      title: `追问：${topicKey}`,
      content: "未识别到对应宫位。可尝试询问：事业、财运、姻缘、健康、子女、父母、兄弟、朋友、田宅、福德、迁移 等关键词。",
    };
  }
  const content = interpretOnePalace(chart, targetName);
  return { title: `追问：${topicKey} → ${targetName}详解`, content };
}
