// 流年历史回顾模块（v2：让每年真的不一样）
// 核心思路：
//   1. 每年的流年命宫不同 → 本命盘该宫的主星 + 煞辅不同
//   2. 每年的流年天干不同 → 流年四化（化禄/权/科/忌的星）不同
//   3. 四化飞入本命盘的不同宫位 → 对四维度（事业/财运/感情/健康）的实际影响不同
//   4. 流年地支五行气 + 宫位含义 → 生成差异化开头叙述
// 这样即使地支相同（每 12 年重复），四化完全不同，解读也完全不同。

import { currentLiunian, liunianGan, calcXiaoxian } from "../engine/limits.js";
import { getSihua } from "../engine/sihua.js";
import { EARTHLY_BRANCHES } from "../engine/lunar.js";

// ================= 常量 =================
const DIMENSIONS = ["事业", "财运", "感情", "健康"];

// 宫位 → 主要影响的维度（权重矩阵）
// 四化星飞入某宫时，就按这个矩阵把效应加到对应维度上
const PALACE_TO_DIM_WEIGHT = {
  命宫:   { 事业: 0.6, 财运: 0.4, 感情: 0.4, 健康: 0.6 }, // 全面影响
  兄弟:   { 事业: 0.3, 财运: 0.2, 感情: 0.6, 健康: 0.1 }, // 合作、手足、邻里
  夫妻:   { 事业: 0.2, 财运: 0.1, 感情: 1.0, 健康: 0.2 },
  子女:   { 事业: 0.2, 财运: 0.3, 感情: 0.5, 健康: 0.3 }, // 子女、晚辈、桃花次位
  财帛:   { 事业: 0.4, 财运: 1.0, 感情: 0.1, 健康: 0.2 },
  疾厄:   { 事业: 0.1, 财运: 0.1, 感情: 0.1, 健康: 1.0 },
  迁移:   { 事业: 0.6, 财运: 0.5, 感情: 0.3, 健康: 0.3 }, // 出行、外缘
  交友:   { 事业: 0.5, 财运: 0.3, 感情: 0.5, 健康: 0.1 },
  官禄:   { 事业: 1.0, 财运: 0.5, 感情: 0.1, 健康: 0.2 },
  田宅:   { 事业: 0.3, 财运: 0.7, 感情: 0.3, 健康: 0.3 }, // 家宅、不动产
  福德:   { 事业: 0.3, 财运: 0.3, 感情: 0.4, 健康: 0.7 }, // 精神、享受
  父母:   { 事业: 0.3, 财运: 0.2, 感情: 0.4, 健康: 0.4 },
};

// 四化落宫 → 差异化话术模板（由"化X 星 入 宫"生成具体的叙事）
// 返回 { dim: 增益句 }，正向(禄权科)为利好，负向(忌)为不利
function narrativeOfSihuaInPalace(siKind, star, palaceName) {
  const P = palaceName;
  const S = star;
  // 通用描述模板，根据宫位特色写
  const templates = {
    禄: {
      命宫: `${S}化禄入命，整体格局被打开，做事有顺心的感觉，机会主动上门。`,
      兄弟: `${S}化禄入兄弟，同事手足间多助力，合伙或团队能带来收益。`,
      夫妻: `${S}化禄入夫妻，感情升温，单身有桃花，已婚则关系更亲密。`,
      子女: `${S}化禄入子女，与孩子/晚辈关系佳，桃花与合作机会也多。`,
      财帛: `${S}化禄入财帛，现金流明显改善，收入增加或有意外进账。`,
      疾厄: `${S}化禄入疾厄，身体恢复力好，气色精力佳。`,
      迁移: `${S}化禄入迁移，出行、出差或外地发展带来好机会。`,
      交友: `${S}化禄入交友，贵人缘旺，朋友为你带来资源。`,
      官禄: `${S}化禄入官禄，工作顺畅，有升迁、嘉奖或新项目加持。`,
      田宅: `${S}化禄入田宅，家运兴旺，购置不动产或家中添财。`,
      福德: `${S}化禄入福德，心情愉悦，享受型消费多，品味生活。`,
      父母: `${S}化禄入父母，与长辈/上司关系和谐，能获得庇佑。`,
    },
    权: {
      命宫: `${S}化权入命，主见强、做事有魄力，适合主导重要事项。`,
      兄弟: `${S}化权入兄弟，在团队/合作中占据主导位置。`,
      夫妻: `${S}化权入夫妻，你在感情中更主动强势，掌握节奏。`,
      子女: `${S}化权入子女，对晚辈管教较严，或在创作/合作中有话语权。`,
      财帛: `${S}化权入财帛，通过掌控能力赚钱，适合主导财务项目。`,
      疾厄: `${S}化权入疾厄，精力旺盛，但要当心用力过猛。`,
      迁移: `${S}化权入迁移，外出时有话语权，出差/公务能做主。`,
      交友: `${S}化权入交友，在朋友圈里有号召力。`,
      官禄: `${S}化权入官禄，职权扩张，适合冲业绩、带团队、接大项目。`,
      田宅: `${S}化权入田宅，家中你做主，或有大宗购置行为。`,
      福德: `${S}化权入福德，对生活品质有明确追求。`,
      父母: `${S}化权入父母，与长辈关系中你更主动，或自己接棒家族责任。`,
    },
    科: {
      命宫: `${S}化科入命，名声与评价上升，有贵人相助。`,
      兄弟: `${S}化科入兄弟，与兄弟朋友/团队之间有好口碑。`,
      夫妻: `${S}化科入夫妻，感情中讲究情调，易遇品味相投对象。`,
      子女: `${S}化科入子女，子女/晚辈表现亮眼，或创作有成果。`,
      财帛: `${S}化科入财帛，有声誉性收入（奖金、稿酬、代言等）。`,
      疾厄: `${S}化科入疾厄，整体平稳，适合调理。`,
      迁移: `${S}化科入迁移，外出有名声加持，适合讲学、参会、曝光。`,
      交友: `${S}化科入交友，结交有名望朋友。`,
      官禄: `${S}化科入官禄，工作中获奖、晋升名次、发表成果。`,
      田宅: `${S}化科入田宅，家中环境品味提升，或有体面购置。`,
      福德: `${S}化科入福德，精神追求高雅，适合学习与进修。`,
      父母: `${S}化科入父母，与长辈关系体面，家族名誉上升。`,
    },
    忌: {
      命宫: `${S}化忌入命，整体压力较大，诸事需谨慎，易有纠结与阻碍。`,
      兄弟: `${S}化忌入兄弟，与兄弟/合伙人/同事易有摩擦或债务牵扯。`,
      夫妻: `${S}化忌入夫妻，感情冲突、分合、冷战，需加强沟通。`,
      子女: `${S}化忌入子女，子女/晚辈让你操心，桃花也容易生乱。`,
      财帛: `${S}化忌入财帛，破财、投资失利、现金流紧张。`,
      疾厄: `${S}化忌入疾厄，健康亮红灯，旧疾复发或需检查。`,
      迁移: `${S}化忌入迁移，外出多波折，出差/出国易有变数。`,
      交友: `${S}化忌入交友，朋友圈有是非，防小人背叛。`,
      官禄: `${S}化忌入官禄，工作阻碍多，有冲突、变动、换岗或降职压力。`,
      田宅: `${S}化忌入田宅，家宅不宁，装修/置业/搬家生变。`,
      福德: `${S}化忌入福德，内耗严重，失眠、焦虑、情绪低落。`,
      父母: `${S}化忌入父母，长辈健康或关系有担忧。`,
    },
  };
  return templates[siKind]?.[P] || `${S}化${siKind}入${P}。`;
}

// 地支 → 五行/季节气 → 差异化开头
const ZHI_VIBE = {
  子: { wuxing: "水", season: "隆冬", desc: "藏势待发、适合谋划" },
  丑: { wuxing: "土", season: "岁末", desc: "收尾与沉淀、易觉压抑" },
  寅: { wuxing: "木", season: "早春", desc: "破土初生、主动出击" },
  卯: { wuxing: "木", season: "仲春", desc: "生发扩张、桃花频出" },
  辰: { wuxing: "土", season: "暮春", desc: "积蓄变动、贵人出现" },
  巳: { wuxing: "火", season: "初夏", desc: "活跃明朗、名声渐起" },
  午: { wuxing: "火", season: "盛夏", desc: "锋芒毕露、成败两极" },
  未: { wuxing: "土", season: "晚夏", desc: "缓和收敛、人情味重" },
  申: { wuxing: "金", season: "初秋", desc: "锐意进取、动荡求变" },
  酉: { wuxing: "金", season: "仲秋", desc: "决断清算、成败见分晓" },
  戌: { wuxing: "土", season: "晚秋", desc: "守成整理、旧事翻盘" },
  亥: { wuxing: "水", season: "初冬", desc: "蛰伏思考、内省转折" },
};

// 14 主星 × 4 维度基础倾向（作为"底色"，不会喧宾夺主）
const STAR_DIMENSION_HINTS = {
  紫微: { 事业: "适合独当一面、承担核心责任。", 财运: "财运平稳但难暴富。", 感情: "姿态较高，伴侣多有资源。", 健康: "留意脾胃，劳心易伤。" },
  天机: { 事业: "适合策划、参谋、调度工作。", 财运: "靠点子与资讯赚钱。", 感情: "思虑多，易钻牛角尖。", 健康: "神经紧张，易失眠。" },
  太阳: { 事业: "适合对外、公开、奉献型工作。", 财运: "进出都大，重名过利。", 感情: "热情但易忽略细节。", 健康: "当心心血管与眼睛。" },
  武曲: { 事业: "果决刚毅，适合财金/技术实业。", 财运: "务实积累，但辛苦。", 感情: "直来直去，易硬碰硬。", 健康: "注意呼吸系统、金属伤。" },
  天同: { 事业: "清闲温和，进取心需催。", 财运: "不愁吃穿难大富。", 感情: "重情缘，桃花多。", 健康: "易胖，注意脾胃。" },
  廉贞: { 事业: "适合公关、营销、技术带电类。", 财运: "起伏大，因人破财。", 感情: "感情复杂易有纠葛。", 健康: "留意血光与妇科/男科。" },
  天府: { 事业: "稳定保守，管理/财务/行政。", 财运: "财库丰盈，善积累。", 感情: "稳重重家庭，偏被动。", 健康: "注意消化系统与糖分。" },
  太阴: { 事业: "幕后柔性，文化/设计/内勤。", 财运: "善理财，靠积累与不动产。", 感情: "细腻敏感，重情义。", 健康: "注意情绪与内分泌。" },
  贪狼: { 事业: "多才应酬强，销售/娱乐/公关。", 财运: "偏财旺但易破耗。", 感情: "桃花极旺，需定力。", 健康: "生殖与代谢系统。" },
  巨门: { 事业: "靠口吃饭：销售/律师/主播/老师。", 财运: "财从口出，也易招是非。", 感情: "易有口角，沟通最重要。", 健康: "口腔、肠胃、甲状腺。" },
  天相: { 事业: "幕僚/服务业，讲究仪态与规矩。", 财运: "财运稳定，量入为出。", 感情: "温和重承诺，缺激情。", 健康: "皮肤与淋巴系统。" },
  天梁: { 事业: "医药/法律/教育/宗教等庇佑属性。", 财运: "淡泊财利，贵人救急。", 感情: "常扮演照顾者。", 健康: "自调力强但操心多。" },
  七杀: { 事业: "闯劲足，创业/销售/实业/竞争。", 财运: "动荡求财，起落大。", 感情: "性格刚烈需磨合。", 健康: "意外伤与免疫系统。" },
  破军: { 事业: "擅开拓变革，转型/创新岗位。", 财运: "先破后立，花销大。", 感情: "变动多，合离一念间。", 健康: "旧疾复发与泌尿系统。" },
};

// 总评分档（v2：拉开分布，让 10 年能呈现高低起伏）
function grade(score) {
  if (score >= 3) return { label: "大吉", emoji: "🌟", tone: "green" };
  if (score >= 1.5) return { label: "吉顺", emoji: "🟢", tone: "green" };
  if (score >= 0) return { label: "平顺偏吉", emoji: "🟡", tone: "yellow" };
  if (score >= -1.2) return { label: "平中带险", emoji: "🟠", tone: "orange" };
  if (score >= -2.5) return { label: "多变动", emoji: "🔴", tone: "red" };
  return { label: "需谨慎", emoji: "⚠️", tone: "red" };
}

// ================= 核心计算 =================

/**
 * 计算某一年的流年命盘信息
 */
export function calcLiunianYear(chart, targetYear) {
  const lnZhiIdx = currentLiunian(targetYear);
  const lnGan = liunianGan(targetYear);
  const lnZhi = EARTHLY_BRANCHES[lnZhiIdx];

  const lnPalace = chart.palaces.find((p) => p.zhiIndex === lnZhiIdx);
  const lnSihua = getSihua(lnGan);
  const age = targetYear - chart.input.solarYear + 1;
  const xiaoxianZhi = calcXiaoxian(age, chart.bazi.year.zhi, chart.input.gender);
  const daxian = chart.daxian.find((d) => age >= d.startAge && age <= d.endAge);
  const daxianPalace = daxian ? chart.palaces.find((p) => p.zhiIndex === daxian.zhiIndex) : null;

  // 找出流年四化的星落在哪个宫
  const sihuaPositions = {};
  for (const key of ["禄", "权", "科", "忌"]) {
    const starName = lnSihua[key];
    for (const p of chart.palaces) {
      const all = [...p.stars, ...p.auxStars, ...p.evilStars];
      if (all.some((s) => s.name === starName)) {
        sihuaPositions[key] = { star: starName, palace: p.name, zhi: p.zhi };
        break;
      }
    }
  }

  return {
    year: targetYear,
    age,
    lnGan,
    lnZhi,
    lnZhiIndex: lnZhiIdx,
    lnPalace,
    lnSihua,
    sihuaPositions,
    daxian,
    daxianPalace,
    xiaoxianZhi,
  };
}

/**
 * 基于流年信息生成四维度解读（v2：真正差异化）
 */
export function interpretLiunianYear(lnInfo) {
  const lnPalace = lnInfo.lnPalace;
  if (!lnPalace) return null;

  const mainStars = lnPalace.stars.filter((s) => s.kind === "主星");
  const evilStars = lnPalace.evilStars;
  const auxStars = lnPalace.auxStars;

  let score = 0;
  // 每个维度收集多条叙事
  const buckets = { 事业: [], 财运: [], 感情: [], 健康: [] };

  // ---- 1. 流年气 + 流年命宫底色（只做开头简述，不再喧宾夺主）----
  const vibe = ZHI_VIBE[lnInfo.lnZhi] || { wuxing: "", season: "", desc: "" };
  // lnPalace.name 在某些数据里已经带了"宫"字，要去掉避免"财帛宫宫"
  const palaceLabel = lnPalace.name.replace(/宫$/, "");

  // ---- 2. 主星倾向（作为底色附加到相应维度） ----
  if (mainStars.length === 0) {
    for (const d of DIMENSIONS) {
      buckets[d].push(`流年命宫（借${palaceLabel}位）无主星，${d}需靠身边人与环境推动。`);
    }
    score -= 0.3;
  } else {
    for (const s of mainStars) {
      const hints = STAR_DIMENSION_HINTS[s.name];
      if (!hints) continue;
      for (const d of DIMENSIONS) {
        buckets[d].push(`【底色·${s.name}】${hints[d]}`);
      }
      if (s.brightness === "miao") score += 1.2;
      else if (s.brightness === "wang") score += 0.8;
      else if (s.brightness === "di") score += 0.4;
      else if (s.brightness === "xian") score -= 0.8;
    }
  }

  // ---- 3. 流年命宫煞辅（每 12 年会重复，所以只给中等分量） ----
  const bigEvils = ["擎羊", "陀罗", "火星", "铃星", "地空", "地劫"];
  const evilsInPalace = evilStars.filter((s) => bigEvils.includes(s.name));
  if (evilsInPalace.length > 0) {
    score -= evilsInPalace.length * 0.6;
    const evilNames = evilsInPalace.map((s) => s.name).join("、");
    // 煞星按属性分配到对应维度
    if (evilsInPalace.some((s) => ["擎羊", "陀罗"].includes(s.name))) {
      buckets.健康.push(`⚠️ 流年命宫坐${evilNames}，易有意外伤或旧疾翻起。`);
      buckets.事业.push(`⚠️ 煞星冲命，工作上阻力变多，易起争执。`);
    }
    if (evilsInPalace.some((s) => ["火星", "铃星"].includes(s.name))) {
      buckets.感情.push(`⚠️ ${evilNames}临命，情绪易急躁，感情/人际冲突多。`);
    }
    if (evilsInPalace.some((s) => ["地空", "地劫"].includes(s.name))) {
      buckets.财运.push(`⚠️ ${evilNames}入命，财来财去，投资守成为上。`);
    }
  }

  const bigAux = ["左辅", "右弼", "文昌", "文曲", "天魁", "天钺", "禄存", "天马"];
  const auxInPalace = auxStars.filter((s) => bigAux.includes(s.name));
  if (auxInPalace.length > 0) {
    score += auxInPalace.length * 0.45;
    const auxNames = auxInPalace.map((s) => s.name).join("、");
    if (auxInPalace.some((s) => ["左辅", "右弼"].includes(s.name))) {
      buckets.事业.push(`✨ ${auxNames}辅佐，贵人相助，合作顺利。`);
    }
    if (auxInPalace.some((s) => ["文昌", "文曲"].includes(s.name))) {
      buckets.事业.push(`✨ ${auxNames}入命，文书、考试、签约、著述类事项利。`);
    }
    if (auxInPalace.some((s) => ["天魁", "天钺"].includes(s.name))) {
      buckets.事业.push(`✨ ${auxNames}入命，遇到重要贵人，关键时刻有人拉一把。`);
    }
    if (auxInPalace.some((s) => ["禄存", "天马"].includes(s.name))) {
      buckets.财运.push(`✨ ${auxInPalace.find((s) => ["禄存", "天马"].includes(s.name)).name}入命，财路流通，禄马交驰格局利求财。`);
    }
  }

  // ---- 4. 流年四化（每年不同！这是真正的差异化核心） ----
  // 核心逻辑：四化星 飞入 某宫 → 按"宫位→维度"权重矩阵，把效应加到对应维度
  const sihuaNarr = [];
  const sihuaLines = { 事业: [], 财运: [], 感情: [], 健康: [] };

  for (const key of ["禄", "权", "科", "忌"]) {
    const sp = lnInfo.sihuaPositions[key];
    if (!sp) continue;

    // 基础分（v2：拉大禄忌分差，让好年和坏年能分开）
    const baseScore = { 禄: 1.8, 权: 1.0, 科: 0.7, 忌: -2.2 }[key];

    // 按宫位权重分配
    const weights = PALACE_TO_DIM_WEIGHT[sp.palace] || { 事业: 0.25, 财运: 0.25, 感情: 0.25, 健康: 0.25 };
    // 关键宫额外放大效应
    // 化忌落关键宫 = 重大不利事件（命/官禄/疾厄/财帛/夫妻）→ 放大 2.0
    // 化禄权科落关键宫 = 重大利好 → 放大 1.4
    const keyPalaces = ["命宫", "官禄", "疾厄", "财帛", "夫妻"];
    let amplify = 1.0;
    if (keyPalaces.includes(sp.palace)) {
      amplify = key === "忌" ? 2.0 : 1.4;
    }

    let totalWeight = 0;
    for (const d of DIMENSIONS) totalWeight += weights[d];
    for (const d of DIMENSIONS) {
      score += (baseScore * weights[d] * amplify) / (totalWeight || 1);
    }

    // 找出主要影响维度：权重最高的前 2 个 + 权重 >= 0.5 的所有维度（并集）
    const ranked = DIMENSIONS.map((d) => ({ d, w: weights[d] })).sort((a, b) => b.w - a.w);
    const top2 = ranked.filter((r) => r.w > 0).slice(0, 2).map((r) => r.d);
    const highW = ranked.filter((r) => r.w >= 0.5).map((r) => r.d);
    const primary = Array.from(new Set([...top2, ...highW]));
    const secondary = ranked.filter((r) => r.w > 0 && !primary.includes(r.d)).map((r) => r.d);

    const narr = narrativeOfSihuaInPalace(key, sp.star, sp.palace);
    for (const d of primary) {
      sihuaLines[d].push(narr);
    }
    // 给次要维度一个简短的连锁影响叙事
    const shortTone = { 禄: "间接带来利好", 权: "间接影响节奏", 科: "略带名声加分", 忌: "间接受到牵扯" };
    for (const d of secondary) {
      sihuaLines[d].push(`${sp.star}化${key}入${sp.palace}，对${d}${shortTone[key]}。`);
    }

    sihuaNarr.push(`化${key}：${sp.star} → ${sp.palace}`);
  }

  // ---- 4.5 维度兜底：若某维度完全没挂到"直接"四化叙事，从所有四化里选最相关的给一条直接描述 ----
  // 避免感情/健康全是"间接"的单薄感
  for (const d of DIMENSIONS) {
    const hasDirect = sihuaLines[d].some((line) => !line.includes("间接") && !line.includes("略带"));
    if (!hasDirect) {
      // 找权重在该维度最大的那个四化
      let best = null;
      let bestW = 0;
      for (const key of ["忌", "禄", "权", "科"]) { // 忌优先，避免被吉项盖过
        const sp = lnInfo.sihuaPositions[key];
        if (!sp) continue;
        const w = (PALACE_TO_DIM_WEIGHT[sp.palace] || {})[d] || 0;
        if (w > bestW) {
          bestW = w;
          best = { key, sp };
        }
      }
      if (best) {
        const narr = narrativeOfSihuaInPalace(best.key, best.sp.star, best.sp.palace);
        // 在"间接"叙事前面插入这条直接叙事
        sihuaLines[d].unshift(narr);
      }
    }
  }

  // 把四化叙事（差异化核心）放到每维度的最前；并让"直接叙事"优先于"间接/简述"
  for (const d of DIMENSIONS) {
    if (sihuaLines[d].length) {
      // 直接叙事优先（不包含"间接"/"略带"关键词）
      const direct = sihuaLines[d].filter((s) => !s.includes("间接") && !s.includes("略带"));
      const indirect = sihuaLines[d].filter((s) => s.includes("间接") || s.includes("略带"));
      buckets[d] = [...direct, ...indirect, ...buckets[d]];
    }
  }

  // ---- 5. 收敛叙事 ----
  const summary = {};
  for (const d of DIMENSIONS) {
    // 优先取四化线（差异化）+ 1 条底色/煞辅
    const lines = buckets[d].slice(0, 3);
    summary[d] = lines.join(" ");
  }

  // ---- 6. 总评 ----
  const g = grade(score);

  // 差异化 overall：包含流年气、干支、命宫位、主星、四化核心效应
  const overallBits = [];
  overallBits.push(
    `流年【${lnInfo.lnGan}${lnInfo.lnZhi}·${vibe.season}】落于本命${palaceLabel}宫（${vibe.wuxing}气，${vibe.desc}）`
  );
  if (mainStars.length) {
    overallBits.push(`命宫主星${mainStars.map((s) => s.name).join("+")}`);
  } else {
    overallBits.push(`命宫无主星，借邻宫力`);
  }
  // 强调"这一年专属"的四化
  if (sihuaNarr.length) {
    const keyLine = sihuaNarr.filter((s) => s.startsWith("化禄") || s.startsWith("化忌")).join("；") || sihuaNarr.slice(0, 2).join("；");
    overallBits.push(keyLine);
  }
  overallBits.push(`综评 ${g.emoji} **${g.label}**（${score >= 0 ? "+" : ""}${Math.round(score * 10) / 10}）`);

  return {
    year: lnInfo.year,
    age: lnInfo.age,
    lnZhi: lnInfo.lnZhi,
    lnGan: lnInfo.lnGan,
    palaceName: lnPalace.name,
    mainStarNames: mainStars.map((s) => s.name),
    grade: g,
    score: Math.round(score * 10) / 10,
    overall: overallBits.join("；"),
    dimensions: summary,
    sihuaNarr,
    daxianRange: lnInfo.daxian
      ? `${lnInfo.daxian.startAge}-${lnInfo.daxian.endAge}岁（${lnInfo.daxianPalace?.name || ""}）`
      : "",
  };
}

/**
 * 批量生成过去 N 年的流年解读
 */
export function buildHistoryLiunians(chart, years = 10, endYear) {
  const to = endYear || new Date().getFullYear();
  const from = to - years + 1;
  const list = [];
  for (let y = to; y >= from; y--) {
    const info = calcLiunianYear(chart, y);
    const narr = interpretLiunianYear(info);
    if (narr) list.push(narr);
  }
  return list;
}

/**
 * 根据打分记录计算准确率
 */
export function calcAccuracy(ratings) {
  const entries = Object.entries(ratings);
  if (entries.length === 0) return null;
  let acc = 0,
    soso = 0,
    wrong = 0;
  for (const [, v] of entries) {
    if (v === "accurate") acc++;
    else if (v === "so-so") soso++;
    else if (v === "wrong") wrong++;
  }
  const total = acc + soso + wrong;
  const hitRate = Math.round(((acc + soso * 0.5) / total) * 100);
  return {
    total,
    accurate: acc,
    soSo: soso,
    wrong,
    hitRate,
    verdict:
      hitRate >= 70
        ? "🎯 对你而言契合度很高"
        : hitRate >= 50
          ? "✨ 对你有一定参考价值"
          : "🤔 与你的实际经历差异较大，仅作娱乐参考",
  };
}
