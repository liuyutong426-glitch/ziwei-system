// 应用入口
import { buildChart } from "./engine/chart.js";
import { renderBoard } from "./render/board.js";
import { interpretChart, answerQuestion } from "./interpret/interpreter.js";
import {
  plainify,
  plainifyReport,
  plainifyAnswer,
} from "./interpret/plainify.js";
import {
  buildHistoryLiunians,
  calcAccuracy,
} from "./interpret/liunian-history.js";

const $ = (sel) => document.querySelector(sel);

let currentChart = null;
let currentReport = null;
let currentHistory = null;
let plainMode = false; // 大白话总开关

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

// ========== 打分持久化（localStorage） ==========
const STORAGE_PREFIX = "ziwei_ratings_";

function ratingKey(chart) {
  const { solarYear, solarMonth, solarDay, hour, gender } = chart.input;
  return `${STORAGE_PREFIX}${solarYear}_${solarMonth}_${solarDay}_${hour}_${gender}`;
}
function loadRatings(chart) {
  try {
    const raw = localStorage.getItem(ratingKey(chart));
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}
function saveRatings(chart, ratings) {
  try {
    localStorage.setItem(ratingKey(chart), JSON.stringify(ratings));
  } catch { /* 忽略配额错误 */ }
}

// ========== 解读报告渲染（支持大白话） ==========
function maybePlain(s) {
  return plainMode ? plainify(s || "") : (s || "");
}
function maybePlainReport(r) {
  return plainMode ? plainifyReport(r) : r;
}

function renderReport(chart, report) {
  const r = maybePlainReport(report);
  const sections = [
    { id: "overview", title: "命宫总论", content: r.mingGongOverview, open: true },
    { id: "patterns", title: "格局判断", content: r.patterns, open: true },
    { id: "palaces", title: "十二宫逐宫详解", html: renderPalaceList(r.palaces), open: true },
    { id: "sihua", title: "四化飞星", content: r.sihua, open: false },
    { id: "limits", title: "大限流年", content: r.limits, open: true },
    { id: "history", title: "🕰 流年回顾 · 近10年准确度验证", html: renderHistorySection(), open: true },
    { id: "ask", title: "追问 · 深挖某宫", html: renderAsk(), open: true },
  ];
  const html = sections.map((s) => {
    const body = s.html || `<p>${escapeHtml(s.content || "")}</p>`;
    return `
      <div class="section ${s.open ? "" : "collapsed"}" data-id="${s.id}">
        <div class="section-head">
          <h3>${escapeHtml(s.title)}</h3>
          <span class="caret">▾</span>
        </div>
        <div class="section-body">${body}</div>
      </div>
    `;
  }).join("");
  $("#report").innerHTML = html;

  $("#report").querySelectorAll(".section-head").forEach((head) => {
    head.addEventListener("click", () => {
      head.parentElement.classList.toggle("collapsed");
    });
  });

  bindAsk();
  bindHistory();
}

function renderPalaceList(palaces) {
  return `<div class="palace-list">${
    palaces.map((p, idx) => `
      <details class="palace-item" ${idx < 1 ? "open" : ""}>
        <summary>${escapeHtml(p.title)}</summary>
        <div class="body">${escapeHtml(p.content)}</div>
      </details>
    `).join("")
  }</div>`;
}

// ========== 流年历史回顾 UI ==========
function renderHistorySection() {
  return `
    <div class="history-wrap">
      <div class="history-toolbar">
        <label>回看年数</label>
        <select id="history-years">
          <option value="5">过去 5 年</option>
          <option value="8">过去 8 年</option>
          <option value="10" selected>过去 10 年</option>
          <option value="15">过去 15 年</option>
        </select>
        <button class="btn-ghost" id="history-refresh">重新生成</button>
        <span class="history-hint">💡 请对照你的真实经历，给每一年打分，看看这套系统对你准不准</span>
      </div>
      <div id="history-list" class="history-list"></div>
      <div id="history-report" class="history-report"></div>
      <div class="history-io">
        <button class="btn-ghost" id="history-export">📤 导出打分（JSON）</button>
        <button class="btn-ghost" id="history-import">📥 导入打分</button>
        <button class="btn-ghost danger" id="history-clear">🗑 清空本命盘打分</button>
        <input type="file" id="history-file" accept="application/json" style="display:none" />
      </div>
    </div>
  `;
}

function renderHistoryList() {
  if (!currentHistory) return "";
  const ratings = loadRatings(currentChart);
  return currentHistory.map((y) => {
    const rating = ratings[y.year] || "";
    const grade = maybePlain(y.grade.label);
    const overall = maybePlain(y.overall);
    const dims = y.dimensions;
    return `
      <div class="year-card tone-${y.grade.tone}" data-year="${y.year}">
        <div class="year-head">
          <div class="year-main">
            <span class="year-num">${y.year}</span>
            <span class="year-age">${y.age}岁</span>
            <span class="year-gz">${y.lnGan}${y.lnZhi}</span>
            <span class="year-palace">流年命宫：${escapeHtml(y.palaceName)}</span>
          </div>
          <div class="year-grade">${y.grade.emoji} <strong>${escapeHtml(grade)}</strong></div>
        </div>
        <div class="year-overall">${escapeHtml(overall)}</div>
        <div class="year-dims">
          <div class="dim"><b>事业</b> ${escapeHtml(maybePlain(dims.事业))}</div>
          <div class="dim"><b>财运</b> ${escapeHtml(maybePlain(dims.财运))}</div>
          <div class="dim"><b>感情</b> ${escapeHtml(maybePlain(dims.感情))}</div>
          <div class="dim"><b>健康</b> ${escapeHtml(maybePlain(dims.健康))}</div>
        </div>
        <div class="year-rating">
          <span class="rating-label">对照你的真实经历：</span>
          <button class="rate-btn ${rating === 'accurate' ? 'active green' : ''}" data-rate="accurate" data-year="${y.year}">✅ 很准</button>
          <button class="rate-btn ${rating === 'so-so' ? 'active yellow' : ''}" data-rate="so-so" data-year="${y.year}">🤔 一般</button>
          <button class="rate-btn ${rating === 'wrong' ? 'active red' : ''}" data-rate="wrong" data-year="${y.year}">❌ 不准</button>
          ${rating ? `<button class="rate-btn clear" data-rate="" data-year="${y.year}">清除</button>` : ""}
        </div>
      </div>
    `;
  }).join("");
}

function renderHistoryReport() {
  if (!currentChart) return "";
  const ratings = loadRatings(currentChart);
  const stats = calcAccuracy(ratings);
  if (!stats) {
    return `<div class="accuracy-empty">请先对上方若干年份打分，下面会自动生成准确率报告。</div>`;
  }
  return `
    <div class="accuracy-card">
      <div class="accuracy-title">🎯 准确率报告</div>
      <div class="accuracy-stats">
        <div><span class="big green">${stats.accurate}</span><small>很准</small></div>
        <div><span class="big yellow">${stats.soSo}</span><small>一般</small></div>
        <div><span class="big red">${stats.wrong}</span><small>不准</small></div>
        <div><span class="big gold">${stats.hitRate}%</span><small>综合命中率</small></div>
      </div>
      <div class="accuracy-verdict">${stats.verdict}</div>
      <div class="accuracy-hint">已评 ${stats.total} 年，继续打分能让结论更可靠。</div>
    </div>
  `;
}

function refreshHistory() {
  if (!currentChart) return;
  const years = Number($("#history-years").value) || 10;
  currentHistory = buildHistoryLiunians(currentChart, years);
  $("#history-list").innerHTML = renderHistoryList();
  $("#history-report").innerHTML = renderHistoryReport();
  bindRatingButtons();
}

function bindHistory() {
  const sel = $("#history-years");
  const btn = $("#history-refresh");
  if (sel) sel.addEventListener("change", refreshHistory);
  if (btn) btn.addEventListener("click", refreshHistory);

  // IO
  $("#history-export")?.addEventListener("click", exportRatings);
  $("#history-import")?.addEventListener("click", () => $("#history-file").click());
  $("#history-file")?.addEventListener("change", importRatings);
  $("#history-clear")?.addEventListener("click", clearRatings);

  refreshHistory();
}

function bindRatingButtons() {
  $("#history-list").querySelectorAll(".rate-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const year = Number(btn.dataset.year);
      const rate = btn.dataset.rate;
      const ratings = loadRatings(currentChart);
      if (rate) ratings[year] = rate;
      else delete ratings[year];
      saveRatings(currentChart, ratings);
      $("#history-list").innerHTML = renderHistoryList();
      $("#history-report").innerHTML = renderHistoryReport();
      bindRatingButtons();
    });
  });
}

function exportRatings() {
  if (!currentChart) return;
  const ratings = loadRatings(currentChart);
  const meta = {
    chart: currentChart.input,
    ratings,
    exportedAt: new Date().toISOString(),
  };
  const blob = new Blob([JSON.stringify(meta, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const { solarYear, solarMonth, solarDay } = currentChart.input;
  a.href = url;
  a.download = `ziwei_ratings_${solarYear}${String(solarMonth).padStart(2, "0")}${String(solarDay).padStart(2, "0")}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function importRatings(e) {
  const file = e.target.files?.[0];
  if (!file || !currentChart) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (!data.ratings) throw new Error("文件格式无效");
      const existing = loadRatings(currentChart);
      const merged = { ...existing, ...data.ratings };
      saveRatings(currentChart, merged);
      alert(`✅ 已导入 ${Object.keys(data.ratings).length} 条打分记录`);
      refreshHistory();
    } catch (err) {
      alert(`❌ 导入失败：${err.message}`);
    }
  };
  reader.readAsText(file);
  e.target.value = "";
}

function clearRatings() {
  if (!currentChart) return;
  if (!confirm("确认清空该命盘的所有流年打分吗？")) return;
  localStorage.removeItem(ratingKey(currentChart));
  refreshHistory();
}

// ========== 追问 ==========
function renderAsk() {
  const quick = ["事业","财运","姻缘","健康","子女","父母","兄弟","朋友","田宅","福德","迁移"];
  const btns = quick.map(q => `<button class="btn-ghost ask-q" data-q="${q}">${q}</button>`).join("");
  return `
    <div class="ask">
      <div class="ask-title">可点击快捷主题，或自由输入关键词</div>
      <div class="ask-quick">${btns}</div>
      <div class="ask-input">
        <input type="text" id="ask-input" placeholder="例如：姻缘/健康/田宅 或 任何宫位关键词" />
        <button class="btn" id="ask-btn">追问</button>
      </div>
      <div class="ask-results" id="ask-results"></div>
    </div>
  `;
}

function bindAsk() {
  $("#report").querySelectorAll(".ask-q").forEach((b) => {
    b.addEventListener("click", () => doAsk(b.dataset.q));
  });
  const btn = $("#ask-btn");
  const inp = $("#ask-input");
  if (btn) btn.addEventListener("click", () => {
    const v = inp.value.trim();
    if (v) doAsk(v);
  });
  if (inp) inp.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const v = inp.value.trim();
      if (v) doAsk(v);
    }
  });
}

function doAsk(topic) {
  if (!currentChart) return;
  let ans = answerQuestion(currentChart, topic);
  if (plainMode) ans = plainifyAnswer(ans);
  const html = `
    <div class="ask-card">
      <h4>${escapeHtml(ans.title)}</h4>
      <div class="body">${escapeHtml(ans.content)}</div>
    </div>
  `;
  $("#ask-results").insertAdjacentHTML("afterbegin", html);
}

// ========== 主提交 ==========
function onSubmit(e) {
  e.preventDefault();
  const dateVal = $("#date").value;
  if (!dateVal) return;
  const [y, m, d] = dateVal.split("-").map(Number);
  const hour = Number($("#hour").value);
  const gender = $("#gender").value;

  try {
    const chart = buildChart({
      solarYear: y, solarMonth: m, solarDay: d, hour, gender,
    });
    currentChart = chart;
    currentReport = interpretChart(chart);
    $("#board-wrap").innerHTML = renderBoard(chart);
    renderReport(chart, currentReport);
  } catch (err) {
    console.error(err);
    $("#report").innerHTML = `<div class="section"><div class="section-body"><p style="color:#D88A8A">排盘出错：${escapeHtml(err.message)}</p></div></div>`;
  }
}

// ========== 大白话开关 ==========
function bindPlainToggle() {
  const toggle = $("#plain-toggle");
  if (!toggle) return;
  toggle.addEventListener("change", () => {
    plainMode = toggle.checked;
    document.body.classList.toggle("plain-mode", plainMode);
    if (currentChart && currentReport) {
      renderReport(currentChart, currentReport);
    }
  });
}

$("#form").addEventListener("submit", onSubmit);

document.addEventListener("DOMContentLoaded", () => {
  bindPlainToggle();
  $("#form").dispatchEvent(new Event("submit"));
});
