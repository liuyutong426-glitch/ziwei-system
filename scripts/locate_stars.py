#!/usr/bin/env python3
"""定位每颗主星的段落起止，顺序：以 ▲星性解释 为分界。"""
import json
import os
import re

DATA = os.path.join(os.path.dirname(__file__), "..", "data", "raw_text.json")
MAIN_STARS = [
    "紫微", "天机", "太阳", "武曲", "天同", "廉贞",
    "天府", "太阴", "贪狼", "巨门", "天相", "天梁",
    "七杀", "破军",
]


def main():
    with open(DATA, encoding="utf-8") as f:
        doc = json.load(f)
    pages = doc["pages"]

    # 拼接全文，记录页索引
    full_text = ""
    page_starts = []  # page_starts[i] = 字符位置
    for p in pages:
        page_starts.append(len(full_text))
        full_text += p["text"] + "\n"

    # 定位所有 "▲星性解释：" 的位置
    markers = [(m.start(), m.end()) for m in re.finditer(r"▲星性解释[：:]", full_text)]
    print(f"总共 {len(markers)} 处 ▲星性解释")

    # 对每个 ▲星性解释，往前向上查找最近的主星名作为标题
    for idx, (s, e) in enumerate(markers):
        # 向前取 200 字符
        prev = full_text[max(0, s - 200):s]
        # 找到最后一次出现的主星
        title = None
        for star in MAIN_STARS:
            pos = prev.rfind(star)
            if pos >= 0:
                if title is None or pos > title[1]:
                    title = (star, pos)
        # 页码
        page_no = 1
        for pi, ps in enumerate(page_starts):
            if ps <= s:
                page_no = pi + 1
            else:
                break
        end = markers[idx + 1][0] if idx + 1 < len(markers) else len(full_text)
        length = end - s
        print(f"[{idx+1:02d}] page={page_no} star={title[0] if title else '?'} len={length}")

    # 输出紫微样本前 1500 字
    s, e = markers[0]
    end = markers[1][0] if len(markers) > 1 else len(full_text)
    sample = full_text[s:min(end, s + 1500)]
    print("\n=== 紫微样本 ===")
    print(sample)


if __name__ == "__main__":
    main()
