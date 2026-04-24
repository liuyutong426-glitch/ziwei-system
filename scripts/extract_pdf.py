#!/usr/bin/env python3
"""抽取《紫微斗数精成》全文，保存为 raw_text.json（按页）。"""
import fitz  # PyMuPDF
import json
import os
import sys

PDF_PATH = "/Users/jessyliu/Library/Containers/com.tencent.xinWeChat/Data/Documents/xwechat_files/lyt_lyx_87c2/temp/drag/紫微斗数精成 上下全册(1).pdf"
OUT_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "raw_text.json")


def main():
    if not os.path.exists(PDF_PATH):
        print(f"[ERR] PDF not found: {PDF_PATH}", file=sys.stderr)
        sys.exit(1)
    doc = fitz.open(PDF_PATH)
    pages = []
    for i, page in enumerate(doc):
        text = page.get_text()
        pages.append({"page": i + 1, "text": text})
    doc.close()
    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
    with open(OUT_PATH, "w", encoding="utf-8") as f:
        json.dump({"total": len(pages), "pages": pages}, f, ensure_ascii=False)
    print(f"[OK] Extracted {len(pages)} pages -> {OUT_PATH}")


if __name__ == "__main__":
    main()
