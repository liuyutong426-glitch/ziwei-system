#!/usr/bin/env python3
"""构建紫微斗数知识库：从 raw_text.json 解析并输出 6 份 JS 模块。

- kb/stars.js        十四主星 + 辅星煞星的性情/容貌/组合喜忌
- kb/palaces.js      十二宫基本意义
- kb/patterns.js     经典格局
- kb/sihua.js        四化飞星
- kb/limits.js       大限/小限/流年
- kb/combinations.js 星曜组合特殊解读
"""
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "data", "raw_text.json")
KB_DIR = os.path.join(ROOT, "src", "kb")
os.makedirs(KB_DIR, exist_ok=True)

MAIN_STARS = [
    "紫微", "天机", "太阳", "武曲", "天同", "廉贞",
    "天府", "太阴", "贪狼", "巨门", "天相", "天梁",
    "七杀", "破军",
]

AUX_STARS = ["左辅", "右弼", "文昌", "文曲", "天魁", "天钺", "禄存", "天马"]
EVIL_STARS = ["擎羊", "陀罗", "火星", "铃星", "地空", "地劫"]

PALACES = ["命宫", "兄弟宫", "夫妻宫", "子女宫", "财帛宫", "疾厄宫",
           "迁移宫", "交友宫", "官禄宫", "田宅宫", "福德宫", "父母宫"]


def clean(s: str) -> str:
    s = re.sub(r"\n\s*\d+\s*\n", "\n", s)  # 去页码
    s = re.sub(r"\n{2,}", "\n", s)
    s = re.sub(r"[ \t]+\n", "\n", s)
    return s.strip()


def load_full():
    with open(DATA, encoding="utf-8") as f:
        doc = json.load(f)
    full = ""
    for p in doc["pages"]:
        full += p["text"] + "\n"
    return full


def split_section(text: str, markers: list):
    """按一组 ▲marker 把文本切成若干段。返回 {marker_name: content}"""
    out = {}
    positions = []
    for m in markers:
        pat = re.compile(rf"▲\s*{re.escape(m)}\s*[：:]")
        mm = pat.search(text)
        if mm:
            positions.append((mm.start(), mm.end(), m))
    positions.sort()
    for i, (s, e, name) in enumerate(positions):
        end = positions[i + 1][0] if i + 1 < len(positions) else len(text)
        out[name] = clean(text[e:end])
    return out


def _trim(text: str, max_chars: int) -> str:
    """截到 max_chars 以内；优先截到句号处。"""
    text = clean(text)
    if len(text) <= max_chars:
        return text
    cut = text[:max_chars]
    # 尽量以中文句号/叹号收尾
    for end in ["。", "！", "；"]:
        p = cut.rfind(end)
        if p > max_chars * 0.6:
            return cut[:p + 1]
    return cut + "…"


def build_stars(full: str):
    """解析十四主星。每星保留: 星性解释/容貌/性情才华/组合喜忌 四段（精简）。"""
    marks = list(re.finditer(r"▲星性解释[：:]", full))
    assert len(marks) == 14, f"期望14处▲星性解释，实际 {len(marks)}"
    stars = {}
    for idx, m in enumerate(marks):
        s = m.start()
        e = marks[idx + 1].start() if idx + 1 < len(marks) else len(full)
        block = full[s:e]
        name = MAIN_STARS[idx]
        sections = split_section(
            block,
            ["星性解释", "容貌", "性情才华", "组合喜忌"],
        )
        stars[name] = {
            "name": name,
            "type": "主星",
            "星性解释": _trim(sections.get("星性解释", ""), 600),
            "容貌": _trim(sections.get("容貌", ""), 260),
            "性情才华": _trim(sections.get("性情才华", ""), 900),
            "组合喜忌": _trim(sections.get("组合喜忌", ""), 700),
        }
    return stars


def build_aux_stars(full: str):
    """解析辅星与煞星。这些在 PDF 中多为小节形式，作简化处理：
    取每颗辅星/煞星首段关键介绍。
    """
    out = {}
    # 寻找每颗辅星的"第X节 XX"或"XX星"标题
    for star in AUX_STARS + EVIL_STARS:
        # 两种匹配：作为小节标题；作为独立句开头
        pat = re.compile(rf"(?:第.{{1,3}}节\s*{star}|\n{star}星?\s*\n)")
        m = pat.search(full)
        if not m:
            # 退化为首次出现后 400 字
            pos = full.find(star)
            if pos < 0:
                continue
            excerpt = full[pos:pos + 600]
        else:
            start = m.end()
            excerpt = full[start:start + 800]
        excerpt = clean(excerpt)
        # 截断到第一个"第X节"
        cut = re.search(r"第.{1,3}节", excerpt)
        if cut:
            excerpt = excerpt[:cut.start()].strip()
        out[star] = {
            "name": star,
            "type": "辅星" if star in AUX_STARS else "煞星",
            "intro": _trim(excerpt, 350),
        }
    return out


def build_palaces(full: str):
    """十二宫基本意义。注意PDF用 事业宫=官禄宫, 奴仆宫=交友宫。"""
    aliases = {
        "官禄宫": ["事业宫", "官禄宫"],
        "交友宫": ["奴仆宫", "交友宫", "朋友宫"],
    }
    out = {}
    start_idx = full.find("十二宫的基本意义")
    if start_idx < 0:
        start_idx = 0
    region = full[start_idx:start_idx + 30000]

    for pal in PALACES:
        search_names = aliases.get(pal, [pal])
        pos = -1
        for nm in search_names:
            p = region.find(nm)
            if p >= 0:
                pos = p
                break
        if pos < 0:
            continue
        excerpt = region[pos:pos + 900]
        excerpt = clean(excerpt)
        # 截到下一个宫
        nxts = []
        for other in PALACES:
            if other == pal:
                continue
            other_names = aliases.get(other, [other])
            for onm in other_names:
                p = excerpt.find(onm, 30)
                if p > 0:
                    nxts.append(p)
        if nxts:
            excerpt = excerpt[:min(nxts)].strip()
        excerpt = _trim(excerpt, 600)
        out[pal] = {"name": pal, "meaning": excerpt}
    return out


def build_patterns(full: str):
    """经典格局。以常见格局名为 key。"""
    names = [
        "紫府朝垣", "府相朝垣", "君臣庆会", "机月同梁", "杀破狼",
        "日月并明", "日月反背", "明珠出海", "三奇加会", "辅拱文星",
        "禄马交驰", "金舆扶驾", "石中隐玉", "火贪", "铃贪",
        "马头带箭", "巨日同宫", "贪武同行", "坐贵向贵",
    ]
    out = {}
    for n in names:
        pos = full.find(n)
        if pos < 0:
            continue
        excerpt = _trim(full[pos:pos + 700], 400)
        out[n] = {"name": n, "desc": excerpt}
    return out


def build_sihua(full: str):
    """四化飞星：生年干对应化禄/权/科/忌，以及化入各宫含义。
    这里以规则表为主（规则是确定的），文字解读从 PDF 搜关键段。
    """
    # 标准生年四化表（传统"钦天四化"版本，广泛采用）
    table = {
        "甲": {"禄": "廉贞", "权": "破军", "科": "武曲", "忌": "太阳"},
        "乙": {"禄": "天机", "权": "天梁", "科": "紫微", "忌": "太阴"},
        "丙": {"禄": "天同", "权": "天机", "科": "文昌", "忌": "廉贞"},
        "丁": {"禄": "太阴", "权": "天同", "科": "天机", "忌": "巨门"},
        "戊": {"禄": "贪狼", "权": "太阴", "科": "右弼", "忌": "天机"},
        "己": {"禄": "武曲", "权": "贪狼", "科": "天梁", "忌": "文曲"},
        "庚": {"禄": "太阳", "权": "武曲", "科": "太阴", "忌": "天同"},
        "辛": {"禄": "巨门", "权": "太阳", "科": "文曲", "忌": "文昌"},
        "壬": {"禄": "天梁", "权": "紫微", "科": "左辅", "忌": "武曲"},
        "癸": {"禄": "破军", "权": "巨门", "科": "太阴", "忌": "贪狼"},
    }
    # 四化基本含义（PDF 第 21 页起；取附近文字）
    base_desc = {}
    for k in ["化禄", "化权", "化科", "化忌"]:
        pos = full.find(k)
        if pos >= 0:
            base_desc[k] = _trim(full[pos:pos + 500], 300)
    # 四化入十二宫（PDF 下篇）：简化为模板
    入宫 = {
        "化禄": {
            "命宫": "主福泽、财源广进、生活顺遂、一生多利益、人缘佳",
            "兄弟宫": "兄弟和睦、多助力、朋友多能得财",
            "夫妻宫": "婚姻美满、配偶能干且带来财禄",
            "子女宫": "子女聪慧有福、多得子女荣耀",
            "财帛宫": "财源旺盛、横财可得、理财能力强",
            "疾厄宫": "身体康健、少病痛",
            "迁移宫": "出外有贵人、远行得利",
            "交友宫": "朋友多助、部属得力",
            "官禄宫": "事业顺遂、财官双美",
            "田宅宫": "家宅兴旺、置产有成",
            "福德宫": "福寿双全、精神愉悦、享受物质",
            "父母宫": "父母健朗、与长辈缘厚",
        },
        "化权": {
            "命宫": "有权威、主观强、能独当一面、做事果决",
            "兄弟宫": "兄弟掌权、往来交友层次高",
            "夫妻宫": "配偶能干掌权、婚姻刚强",
            "子女宫": "子女个性强、主见多",
            "财帛宫": "掌财权、求财积极、财来得快",
            "疾厄宫": "体魄强健但易有压力",
            "迁移宫": "外出掌权、远行能拓局",
            "交友宫": "朋友中有权贵、部属刚强",
            "官禄宫": "事业有权、职位晋升、掌实权",
            "田宅宫": "家业扩张、置大产",
            "福德宫": "个性主观、有主见",
            "父母宫": "父母严厉威权、长辈刚强",
        },
        "化科": {
            "命宫": "主声名、文雅、贵人扶助、考试得中",
            "兄弟宫": "兄弟有名声、多文人之交",
            "夫妻宫": "配偶有声望、婚姻受人称羡",
            "子女宫": "子女聪明好学、有才名",
            "财帛宫": "财名在外、名利双收",
            "疾厄宫": "小病易愈、有良医",
            "迁移宫": "出外有名声、得贵人",
            "交友宫": "朋友多文人雅士",
            "官禄宫": "事业有名誉、宜文教、升迁",
            "田宅宫": "家宅体面",
            "福德宫": "气质清雅、精神生活丰足",
            "父母宫": "父母有文名、家风儒雅",
        },
        "化忌": {
            "命宫": "多波折、操心劳神、易招是非",
            "兄弟宫": "兄弟不和、朋友相欠",
            "夫妻宫": "婚姻多波折、配偶身心劳累",
            "子女宫": "子女操心、生养不易",
            "财帛宫": "财来财去、破财不断",
            "疾厄宫": "易有慢性病或暗疾",
            "迁移宫": "出外不顺、远行多阻",
            "交友宫": "朋友相害、部属掣肘",
            "官禄宫": "事业起伏、职场压力大",
            "田宅宫": "家宅不宁、置产难成",
            "福德宫": "精神多苦、劳心劳力",
            "父母宫": "与父母缘薄、长辈易有病痛",
        },
    }
    return {"birthTable": table, "baseDesc": base_desc, "入宫": 入宫}


def build_limits(full: str):
    """大限/小限/流年基本说明。"""
    out = {}
    for k in ["大限", "小限", "流年", "斗君"]:
        pos = full.find(k)
        if pos >= 0:
            out[k] = _trim(full[pos:pos + 500], 320)
    return out


def build_combinations():
    """常见双星组合精要（PDF 中贯穿各星专篇，这里给出常用组合的提炼）。"""
    return {
        "紫微+天府": "紫府同宫，帝星得库，主贵气与稳重兼备，一生多成就，宜守成不宜躁进。",
        "紫微+天相": "君臣庆会之基，主领导力与辅助兼备，宜从政从公。",
        "紫微+七杀": "化杀为权，主开创能力极强、掌兵权之象，但个性刚烈。",
        "紫微+破军": "权力之象但多变动，一生起伏大，宜军警武职或改革之业。",
        "紫微+贪狼": "易流于酒色财气，桃花重，须配辅吉星方成贵。",
        "武曲+贪狼": "贪武同行之格，中年发达，不利少年，宜经商。",
        "武曲+七杀": "将星之配，主勇猛果决，宜武职或开创事业，易有伤灾。",
        "武曲+破军": "劳碌奔波、刚强决断，财来财去。",
        "武曲+天相": "财印相辅，理财有道，宜金融。",
        "武曲+天府": "双财星同宫，财库丰盈，一生衣食无缺。",
        "廉贞+贪狼": "桃花重重，酒色财气，易沉溺娱乐场所。",
        "廉贞+七杀": "积富之人或开创之士，亦主血光，宜武职、工程。",
        "廉贞+破军": "横发横破，宜军警、改革之业。",
        "廉贞+天府": "贵人扶持、财官双美，宜公职。",
        "廉贞+天相": "温和而有原则，宜公职、法务。",
        "天机+太阴": "机月同梁格的基本组合，宜文教、企划、流动性事业。",
        "天机+巨门": "口才与智谋并用，宜律师、传媒、外交。",
        "天机+天梁": "慈善智慧并济，宜医疗、宗教、公益。",
        "太阳+太阴": "日月并明或日月反背，决于落宫，主正偏财兼得或明暗两极。",
        "太阳+巨门": "言辞锋利、辩才无碍，但易招是非，宜外交、传媒。",
        "太阳+天梁": "光明磊落、贵人运强，宜公职、教育。",
        "太阴+天同": "福气之象、内敛温和，宜文教、服务业。",
        "太阴+天机": "心思细密、善谋略。",
        "贪狼+火星": "火贪格，主暴发，但易暴起暴落。",
        "贪狼+铃星": "铃贪格，与火贪类似，主偏财横发。",
        "七杀+破军": "杀破狼之核心，主人生大起大落、变动频繁。",
        "天府+天相": "府相朝垣之基，主稳重、福厚、贵气。",
        "天同+天梁": "机月同梁格之一，主清闲、福寿。",
    }


def to_js_module(name: str, obj) -> str:
    json_text = json.dumps(obj, ensure_ascii=False, indent=2)
    return f"// Auto-generated from 《紫微斗数精成》. Do not edit by hand.\n" \
           f"export const {name} = {json_text};\n"


def main():
    full = load_full()
    print("[1/6] parse stars...")
    stars = build_stars(full)
    aux = build_aux_stars(full)
    all_stars = {**stars, **aux}
    with open(os.path.join(KB_DIR, "stars.js"), "w", encoding="utf-8") as f:
        f.write(to_js_module("KB_STARS", all_stars))
    print(f"  stars: {len(stars)} main + {len(aux)} aux/evil")

    print("[2/6] parse palaces...")
    palaces = build_palaces(full)
    with open(os.path.join(KB_DIR, "palaces.js"), "w", encoding="utf-8") as f:
        f.write(to_js_module("KB_PALACES", palaces))
    print(f"  palaces: {len(palaces)}")

    print("[3/6] parse patterns...")
    patterns = build_patterns(full)
    with open(os.path.join(KB_DIR, "patterns.js"), "w", encoding="utf-8") as f:
        f.write(to_js_module("KB_PATTERNS", patterns))
    print(f"  patterns: {len(patterns)}")

    print("[4/6] parse sihua...")
    sihua = build_sihua(full)
    with open(os.path.join(KB_DIR, "sihua.js"), "w", encoding="utf-8") as f:
        f.write(to_js_module("KB_SIHUA", sihua))
    print(f"  sihua: {len(sihua['birthTable'])} 干 × 4 化")

    print("[5/6] parse limits...")
    limits = build_limits(full)
    with open(os.path.join(KB_DIR, "limits.js"), "w", encoding="utf-8") as f:
        f.write(to_js_module("KB_LIMITS", limits))
    print(f"  limits: {list(limits.keys())}")

    print("[6/6] build combinations...")
    combos = build_combinations()
    with open(os.path.join(KB_DIR, "combinations.js"), "w", encoding="utf-8") as f:
        f.write(to_js_module("KB_COMBOS", combos))
    print(f"  combinations: {len(combos)}")

    print("\n[DONE] KB written to", KB_DIR)


if __name__ == "__main__":
    main()
