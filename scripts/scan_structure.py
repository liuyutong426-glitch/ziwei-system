#!/usr/bin/env python3
"""扫描 raw_text.json，定位十四主星及关键章节起止页。"""
import json
import os
import re

DATA = os.path.join(os.path.dirname(__file__), "..", "data", "raw_text.json")

MAIN_STARS = [
    "紫微", "天机", "太阳", "武曲", "天同", "廉贞",
    "天府", "太阴", "贪狼", "巨门", "天相", "天梁",
    "七杀", "破军",
]
AUX_STARS = ["左辅", "右弼", "文昌", "文曲", "天魁", "天钺", "禄存", "天马"]
EVIL_STARS = ["擎羊", "陀罗", "火星", "铃星", "地空", "地劫"]
PALACES = ["命宫", "兄弟宫", "夫妻宫", "子女宫", "财帛宫", "疾厄宫",
           "迁移宫", "交友宫", "官禄宫", "田宅宫", "福德宫", "父母宫"]


def main():
    with open(DATA, encoding="utf-8") as f:
        doc = json.load(f)
    pages = doc["pages"]

    # 找出每颗主星最早出现的"专篇"标题页（形如 "紫微星" / "第X节 紫微" 等）
    print("=== 主星章节定位 ===")
    for star in MAIN_STARS:
        found = []
        for p in pages:
            t = p["text"]
            # 匹配作为独立标题/小节标题的形式
            if re.search(rf"(第.{{1,3}}节\s*{star}星?)|(^{star}星\s*$)", t, re.M):
                found.append(p["page"])
                if len(found) >= 3:
                    break
        print(f"{star}: {found}")

    print("\n=== 关键章节关键字首现页 ===")
    kws = ["十二宫的基本意义", "格局概论", "紫府朝垣", "机月同梁", "杀破狼",
           "府相朝垣", "君臣庆会", "化禄", "化权", "化科", "化忌",
           "大限", "小限", "流年", "十二基本命盘", "安星", "安紫微",
           "四化飞星"]
    for k in kws:
        for p in pages:
            if k in p["text"]:
                # 输出首次出现页
                print(f"{k}: page {p['page']}")
                break

    print("\n=== ▲ 段落标记统计（▲容貌/性情 等） ===")
    marker_count = {}
    for p in pages:
        for m in re.findall(r"▲[^\n▲]{2,10}[：:]", p["text"]):
            key = m.strip()
            marker_count[key] = marker_count.get(key, 0) + 1
    # 出现 >= 5 次的 marker
    sorted_m = sorted(marker_count.items(), key=lambda x: -x[1])[:30]
    for k, v in sorted_m:
        print(f"{k:<20s}  {v}")


if __name__ == "__main__":
    main()
