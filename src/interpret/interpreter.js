// 解读引擎 v2：段落化叙事 + 男女差异化
import { KB_STARS } from "../kb/stars.js";
import { KB_PALACES } from "../kb/palaces.js";
import { KB_SIHUA } from "../kb/sihua.js";
import { KB_COMBOS } from "../kb/combinations.js";
import { KB_LIMITS } from "../kb/limits.js";
import { detectPatterns } from "./pattern-detect.js";

function findPalace(chart, name) { return chart.palaces.find(p => p.name === name); }

// 清洗知识库文本：去换行、去双空格、截断过长段落
function cleanText(s, maxLen = 180) {
  if (!s) return "";
  let out = String(s)
    .replace(/[\r\n]+/g, " ")
    .replace(/[\u3000\s]+/g, " ") // 全角 + 半角空白
    // 去掉中文标点/括号后紧跟的空格
    .replace(/([，。；：、！？）】」』》])\s+/g, "$1")
    // 去掉空格紧跟中文标点/括号
    .replace(/\s+([，。；：、！？）】」』》（【「『《])/g, "$1")
    // 中文字之间的空格去掉（多跑几次处理相邻多空格）
    .replace(/([\u4e00-\u9fa5])\s+([\u4e00-\u9fa5])/g, "$1$2")
    .replace(/([\u4e00-\u9fa5])\s+([\u4e00-\u9fa5])/g, "$1$2")
    .replace(/([\u4e00-\u9fa5])\s+([\u4e00-\u9fa5])/g, "$1$2")
    .replace(/\s+/g, " ")
    .trim();
  if (out.length > maxLen) {
    // 先尝试找第一个句号/分号作为自然断点
    const stops = ["。", "；", "!", "！", "?", "？"];
    let cut = -1;
    for (const st of stops) {
      const idx = out.indexOf(st);
      if (idx > 20 && idx < maxLen) {
        cut = idx + 1;
        break;
      }
    }
    if (cut > 0) out = out.slice(0, cut);
    else out = out.slice(0, maxLen) + "…";
  }
  // 末尾不留分号/逗号
  return out.replace(/[，；、]$/, "。");
}

function isMale(chart) { return chart.input?.gender === "男"; }
function genderLabel(chart) { return isMale(chart) ? "男命" : "女命"; }
function pronounYou(chart) { return isMale(chart) ? "先生" : "女士"; }

// 把零散句子用标点串成"自然段"。规则：
//   - 空串过滤
//   - 每句末尾若无标点自动补"。"
//   - 句末相邻的 "。。" / "，。" 合并
//   - 段与段之间只用一个空格（而不是换行），形成流畅整段
function joinParagraph(parts) {
  const cleaned = parts
    .filter(Boolean)
    .map((s) => String(s).trim())
    .filter((s) => s.length > 0)
    .map((s) => {
      // 去掉开头/末尾多余的标点
      const last = s[s.length - 1];
      if (!"。！？；".includes(last)) return s + "。";
      return s;
    });
  return cleaned
    .join("")
    .replace(/。+/g, "。")
    .replace(/；+/g, "；")
    .replace(/，+/g, "，")
    .replace(/[；]+[。]/g, "。")
    .replace(/[。]+[；]/g, "。")
    .replace(/，。/g, "，")
    .replace(/。，/g, "，")
    .replace(/\s+/g, " ")
    .trim();
}

// 男命/女命适用差异化文案库
// 参考《紫微斗数精成》对六亲、婚姻、事业维度的男女命传统判断
const GENDER_NARRATIVE = {
  命宫: {
    // 命宫主星遇到时男女性格侧重不同的补充描述
    紫微: {
      男: "男命坐紫微，宜担当方面大任，若能辅以吉星，多成领导、管理之材，忌过于刚愎；",
      女: "女命坐紫微，性情刚强、主见极重，一生多自立自强，多能独当一面，婚姻上宜觅心胸开阔之配偶方能偕老。",
    },
    太阳: {
      男: "男命坐太阳，正合日出之象，主积极进取、博爱向上，能发达有为；",
      女: "女命坐太阳，性情刚烈、不让须眉，多主辛劳自立，宜入庙则主夫旺子贵，陷地则易克父或克夫，需多修和柔。",
    },
    太阴: {
      男: "男命坐太阴，性情较柔、重情感与内心，入庙主得阴贵相助、宜文职与不动产；陷地则多情伤；",
      女: "女命坐太阴，正得女德之星，入庙主端庄秀丽、相夫教子；陷地则情感波折，与母缘或较浅。",
    },
    天同: {
      男: "男命坐天同，主为人随和、福气绵延，但易过于安逸，需自我鞭策；",
      女: "女命坐天同，主温柔贤淑、有福可享，多主夫妻和合；惟陷地易感情多波。",
    },
    武曲: {
      男: "男命坐武曲，主刚毅果断、适合开创事业与理财，为实战型财星；",
      女: "女命坐武曲，性格偏刚、事业心重，易有「寡宿」之嫌，婚姻上宜晚婚或配年长稳重之配偶，亦有自立门户能力。",
    },
    贪狼: {
      男: "男命坐贪狼，主多才多艺、桃花旺、应酬多，偏于风流好动；",
      女: "女命坐贪狼，美丽多情、人缘广，感情生活丰富；入庙则主才艺出众，陷地或会桃花星则易陷情感纠葛。",
    },
    巨门: {
      男: "男命坐巨门，口才佳、宜从事口才相关行业，惟性多疑，亲友间易因口舌生是非；",
      女: "女命坐巨门，口舌便给，持家能言善辩，但婚姻中易与配偶多争执，宜修口德。",
    },
    七杀: {
      男: "男命坐七杀，主将星之气，威严果断、适合拼搏型事业，中年后渐佳；",
      女: "女命坐七杀，性烈多动、不愿受拘束，婚姻宜晚，配偶须能包容其独立性格。",
    },
    破军: {
      男: "男命坐破军，主先破后立、人生变化多，常换跑道，唯需防冲动；",
      女: "女命坐破军，性情独立刚烈、作风泼辣，婚姻多变，宜晚婚或自立创业。",
    },
    廉贞: {
      男: "男命坐廉贞，理性冷静、适合公检法及管理工作，但煞会则易冲动；",
      女: "女命坐廉贞，气质独特、理性中带感性，婚姻宜择稳重之配偶。",
    },
    天府: {
      男: "男命坐天府，主稳重厚道、擅守成理财，宜从商或行政；",
      女: "女命坐天府，主端庄慈惠、持家有方，为相夫教子之良配。",
    },
    天相: {
      男: "男命坐天相，主端正忠厚、宜辅佐工作，行政幕僚之材；",
      女: "女命坐天相，主贤淑持家、相夫有道，感情忠贞。",
    },
    天梁: {
      男: "男命坐天梁，长者之风、宜医药司法与老年事业；",
      女: "女命坐天梁，主贤母良妻，但若与羊陀同，则易有寡居之忧，需注重自身健康与配偶选择。",
    },
    天机: {
      男: "男命坐天机，头脑灵活、适合策划参谋，多动少停；",
      女: "女命坐天机，聪慧多思、但心思敏感，婚姻上宜觅能交心之对象。",
    },
  },
  夫妻: {
    男: {
      吉: "男命夫妻宫吉曜同临，妻子多贤惠，能得内助，感情和美。",
      凶: "男命夫妻宫逢煞忌，婚姻多波折，宜晚婚或主动经营感情，避免因工作忽略家庭。",
    },
    女: {
      吉: "女命夫妻宫吉曜同临，夫星得位，丈夫能力出众或感情深厚，婚后可享夫荣。",
      凶: "女命夫妻宫逢煞忌，感情易有波折，宜晚婚，避免早年草率择偶，婚后更需相互包容。",
    },
  },
  官禄: {
    男: {
      吉: "男命官禄得力，事业心强、易得上司提携，中年后可望有成就。",
      凶: "男命官禄受冲，事业起伏多、宜守稳而非冒进，切忌频繁跳槽或投机。",
    },
    女: {
      吉: "女命官禄吉曜临，主能独当一面，职场上多能开创一番局面，不让须眉。",
      凶: "女命官禄见煞，职场压力较大，宜选人际关系简单、专业技术型工作，避免权斗环境。",
    },
  },
  财帛: {
    男: {
      吉: "男命财帛吉曜同临，财源通达，正偏财皆能顺遂；",
      凶: "男命财帛逢煞忌，理财易出错，宜稳守勿博，切忌大额借贷。",
    },
    女: {
      吉: "女命财帛吉曜同临，多能通过自身能力获得经济独立，主财运顺遂；",
      凶: "女命财帛见煞，理财保守为上，避免被情所累而破财，婚后宜明确财务边界。",
    },
  },
  子女: {
    男: { 吉: "子息多贤良，父子缘深。", 凶: "子息缘薄或多波折，宜修德以积福。" },
    女: {
      吉: "子女宫吉，母子情深、生育顺遂。",
      凶: "女命子女宫见煞忌，宜注意生育健康与母子关系调适，宜晚育、注重孕期保养。",
    },
  },
};

// 把男女命差异化内容融入命宫总论
function genderFlavorForMingGong(chart, mainStarName) {
  const g = isMale(chart) ? "男" : "女";
  const bank = GENDER_NARRATIVE.命宫[mainStarName];
  if (!bank) return "";
  return bank[g] || "";
}

// ===== 1. 命宫总论（整段叙事）=====
function interpretMingGong(chart) {
  const ming = findPalace(chart, "命宫");
  const mainStars = ming.stars;
  const parts = [];
  const gLabel = genderLabel(chart);

  parts.push(
    `此为${gLabel}之盘。命宫坐${chart.mingGong.gan}${chart.mingGong.zhi}，身宫寄于${chart.shenGong.palaceName}；` +
      `五行局为${chart.wuxingJu.name}，纳音${chart.wuxingJu.nayin}；命主${chart.mingzhu}，身主${chart.shenzhu}`
  );

  if (mainStars.length === 0) {
    parts.push(
      "命宫无主星坐守，为「空宫」之象，其性情与气象多受对宫迁移与三方会照之星影响，故一生变化较多，需合参对宫主星与辅佐吉星方能准断"
    );
  } else {
    // 把每颗主星的描述直接串成段落
    const starDescs = [];
    for (const s of mainStars) {
      const kbStar = KB_STARS[s.name];
      if (!kbStar) continue;
      const bright = s.brightnessCN ? `在${ming.zhi}宫${s.brightnessCN}` : "";
      const core = cleanText(kbStar["星性解释"], 120);
      const traits = cleanText(kbStar["性情才华"], 100);
      const genderFlavor = genderFlavorForMingGong(chart, s.name);
      const segs = [
        `${s.name}${bright}`,
        core && `：${core}`,
        traits && `。性情：${traits}`,
        genderFlavor && `。${genderFlavor}`,
      ];
      starDescs.push(segs.filter(Boolean).join("").replace(/。。/g, "。"));
    }
    if (starDescs.length) {
      parts.push(starDescs.join("；又"));
    }
  }

  // 辅煞融进去
  const aux = ming.auxStars.map((s) => s.name);
  const evil = ming.evilStars.map((s) => s.name);
  if (aux.length && evil.length) {
    parts.push(
      `命宫另有${aux.join("、")}等辅佐吉星同临，能增其吉气；然亦见${evil.join(
        "、"
      )}等煞曜，吉凶交集，须防吉处藏凶，修心方能化解`
    );
  } else if (aux.length) {
    parts.push(`命宫有${aux.join("、")}等辅佐同宫，能增益气势，一生多得贵人相助`);
  } else if (evil.length) {
    parts.push(`命宫有${evil.join("、")}等煞曜入宫，须防性急生灾与人事波折，宜修性养心以化之`);
  }

  // 身宫
  if (chart.shenGong.palaceName !== "命宫") {
    parts.push(
      `身宫落于${chart.shenGong.palaceName}，故中晚年后运势应验之处更应关注此宫，乃后天应世之要`
    );
  } else {
    parts.push("命身同宫，为人主观坚定、一生命运重在自我奋发，成败皆系于己");
  }

  return joinParagraph(parts);
}

// ===== 2. 格局（段落化）=====
function interpretPatterns(chart) {
  const patterns = detectPatterns(chart);
  if (!patterns.length) {
    return "本命盘未检测出显著经典格局，宜以十二宫逐宫推演、星曜组合细参，方能见其机要。";
  }
  const g = isMale(chart) ? "男" : "女";
  const parts = patterns.map((p) => {
    let text = `其一为【${p.name}】（${p.level}），${p.desc}`;
    // 某些格局男女表现差异
    if (/杀破狼/.test(p.name)) {
      text += g === "女"
        ? "。女命合杀破狼者，性格独立坚毅，事业心重，婚姻宜晚；"
        : "。男命合杀破狼者，人生多动荡闯荡，开创力强但宜沉稳避冲；";
    }
    if (/日月反背/.test(p.name) && g === "女") {
      text += "。女命日月反背，主感情与家庭多波折，宜修和柔；";
    }
    return text;
  });
  return joinParagraph([
    `此盘共应以下${patterns.length}种经典格局：`,
    ...parts,
  ]);
}

// ===== 3. 单宫整段 =====
function interpretOnePalace(chart, palaceName) {
  const p = findPalace(chart, palaceName);
  if (!p) return "";
  const kb = KB_PALACES[palaceName];
  const parts = [];
  const g = isMale(chart) ? "男" : "女";

  if (kb && kb.meaning) {
    parts.push(`${palaceName}乃「${cleanText(kb.meaning, 80)}」之宫`);
  }
  parts.push(`坐${p.palaceGan}${p.zhi}`);

  if (p.stars.length === 0) {
    const opposite = chart.palaces.find((op) => op.zhiIndex === (p.zhiIndex + 6) % 12);
    const oppMain = opposite
      ? opposite.stars.map((s) => s.name + (s.brightnessCN || "")).join("、")
      : "";
    parts.push(`本宫无主星坐守，借对宫${opposite?.name || ""}${
      oppMain ? `之${oppMain}` : "（亦空）"
    }合参，主此宫相关之事象较易变化、不易自主`);
  } else {
    const starSentences = [];
    for (const s of p.stars) {
      const kbStar = KB_STARS[s.name];
      const bright = s.brightnessCN ? s.brightnessCN : "";
      const sh = s.sihua.length ? `化${s.sihua.join("")}` : "";
      const core = cleanText(kbStar?.["星性解释"] || kbStar?.intro, 100);
      starSentences.push(`${s.name}${bright}${sh}${core ? "：" + core : ""}`);
    }
    parts.push(`主星见${starSentences.join("；又见")}`);

    // 组合
    if (p.stars.length >= 2) {
      const names = p.stars.map((s) => s.name);
      const combos = [];
      for (let i = 0; i < names.length; i++) {
        for (let j = 0; j < names.length; j++) {
          if (i === j) continue;
          const key = `${names[i]}+${names[j]}`;
          if (KB_COMBOS[key]) combos.push(cleanText(KB_COMBOS[key], 150));
        }
      }
      if (combos.length) parts.push(`两星相会：${combos[0]}`);
    }
  }

  const aux = p.auxStars.map((s) => s.name);
  const evil = p.evilStars.map((s) => s.name);
  if (aux.length) parts.push(`又有${aux.join("、")}同宫，能增吉力`);
  if (evil.length) parts.push(`煞曜${evil.join("、")}临之，须防此宫相关之波折`);

  // 生年四化
  const allStars = [...p.stars, ...p.auxStars, ...p.evilStars];
  const sihuaInPalace = allStars.filter((s) => s.sihua && s.sihua.length);
  if (sihuaInPalace.length) {
    const shSents = [];
    for (const s of sihuaInPalace) {
      for (const sh of s.sihua) {
        const shDesc = KB_SIHUA["入宫"]["化" + sh]?.[palaceName];
        if (shDesc) shSents.push(`生年${s.name}化${sh}入此，${cleanText(shDesc, 120)}`);
      }
    }
    if (shSents.length) parts.push(shSents.join("；又"));
  }

  // 男女差异化结句：夫妻/官禄/财帛/子女 四宫
  const tone =
    evil.length > aux.length ? "凶" : aux.length > 0 || sihuaInPalace.length > 0 ? "吉" : "吉";
  const palaceKey = palaceName.replace(/宫$/, "");
  const genderBank = GENDER_NARRATIVE[palaceKey]?.[g]?.[tone];
  if (genderBank) parts.push(genderBank);

  return joinParagraph(parts);
}

// ===== 4. 十二宫（每宫一段）=====
function interpretAllPalaces(chart) {
  const order = [
    "命宫","兄弟宫","夫妻宫","子女宫","财帛宫","疾厄宫",
    "迁移宫","交友宫","官禄宫","田宅宫","福德宫","父母宫",
  ];
  return order.map((name) => ({
    title: name,
    content: interpretOnePalace(chart, name),
  }));
}

// ===== 5. 四化飞星（整段）=====
function interpretSihua(chart) {
  const g = isMale(chart) ? "男" : "女";
  const parts = [
    `${g}命生年四化：化禄${chart.sihua.禄}、化权${chart.sihua.权}、化科${chart.sihua.科}、化忌${chart.sihua.忌}`,
  ];
  for (const [k, starName] of Object.entries(chart.sihua)) {
    let where = null;
    for (const p of chart.palaces) {
      const all = [...p.stars, ...p.auxStars, ...p.evilStars];
      if (all.some((s) => s.name === starName)) {
        where = p.name;
        break;
      }
    }
    if (where) {
      const desc = KB_SIHUA["入宫"]["化" + k]?.[where];
      parts.push(`${starName}化${k}落于${where}，${cleanText(desc, 100)}`);
    }
  }
  return joinParagraph(parts);
}

// ===== 6. 大限流年（整段）=====
function interpretDaxianLiunian(chart) {
  const g = isMale(chart) ? "男" : "女";
  const current = chart.daxian.find(
    (d) => d.startAge <= chart.currentAge && d.endAge >= chart.currentAge
  );
  const parts = [];
  if (current) {
    const pal = chart.palaces.find((p) => p.zhiIndex === current.zhiIndex);
    const mainList = pal?.stars.map((s) => s.name + (s.brightnessCN || "")).join("、") || "空宫";
    parts.push(
      `${g}命当前大限${current.startAge}至${current.endAge}岁，行至【${pal?.name || ""}】（${
        pal?.palaceGan || ""
      }${pal?.zhi || ""}）`
    );
    parts.push(`此限主星为${mainList}，以该宫之事务为此十年之重点，宜顺势而为、扬长避短`);
    if (pal && pal.stars.length) {
      const s = pal.stars[0];
      const kb = KB_STARS[s.name];
      if (kb && kb["组合喜忌"]) {
        parts.push(`限内要诀：${cleanText(kb["组合喜忌"], 180)}`);
      }
    }
  }
  const lnPal = chart.palaces.find((p) => p.zhiIndex === chart.liunian.zhiIndex);
  if (lnPal) {
    const zhi = ["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"][
      chart.liunian.zhiIndex
    ];
    parts.push(
      `${chart.currentYear}流年（${chart.liunian.gan}${zhi}）行至【${lnPal.name}】，本年应以此宫相关人事为重`
    );
  }
  return joinParagraph(parts);
}

export function interpretChart(chart) {
  return {
    mingGongOverview: interpretMingGong(chart),
    patterns: interpretPatterns(chart),
    palaces: interpretAllPalaces(chart),
    sihua: interpretSihua(chart),
    limits: interpretDaxianLiunian(chart),
  };
}

// ===== 追问 =====
export function answerQuestion(chart, topic) {
  const palaceMap = {
    事业: "官禄宫", 工作: "官禄宫", 职业: "官禄宫", 升迁: "官禄宫",
    财运: "财帛宫", 财富: "财帛宫", 钱: "财帛宫", 求财: "财帛宫",
    姻缘: "夫妻宫", 婚姻: "夫妻宫", 配偶: "夫妻宫", 感情: "夫妻宫", 爱情: "夫妻宫",
    健康: "疾厄宫", 身体: "疾厄宫", 疾病: "疾厄宫",
    子女: "子女宫", 小孩: "子女宫", 孩子: "子女宫",
    父母: "父母宫", 长辈: "父母宫",
    兄弟: "兄弟宫", 姐妹: "兄弟宫",
    朋友: "交友宫", 人脉: "交友宫", 下属: "交友宫",
    搬家: "田宅宫", 置产: "田宅宫", 房子: "田宅宫", 家宅: "田宅宫",
    福报: "福德宫", 福气: "福德宫", 精神: "福德宫",
    出行: "迁移宫", 出国: "迁移宫", 远行: "迁移宫", 外地: "迁移宫",
  };
  const topicKey = String(topic || "").trim();
  let targetName = null;
  if (topicKey.endsWith("宫") || palaceMap[topicKey]) {
    targetName = topicKey.endsWith("宫") ? topicKey : palaceMap[topicKey];
  } else {
    for (const [kw, pname] of Object.entries(palaceMap)) {
      if (topicKey.includes(kw)) {
        targetName = pname;
        break;
      }
    }
  }
  if (!targetName) {
    return {
      title: `追问：${topicKey}`,
      content:
        "未识别到对应宫位。可尝试询问：事业、财运、姻缘、健康、子女、父母、兄弟、朋友、田宅、福德、迁移 等关键词。",
    };
  }
  const content = interpretOnePalace(chart, targetName);
  return {
    title: `追问：${topicKey} → ${targetName}详解（${genderLabel(chart)}视角）`,
    content,
  };
}
