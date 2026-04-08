import { parseObservations } from "./parse.js";
import { loadState, saveState, newId, createEmptyState } from "./storage.js";

const IMPORT_ROW_LIMIT = 500;
const CSV_HEADER = ["observed_at", "species", "count", "note"];

const ui = {
  tabs: Array.from(document.querySelectorAll(".tab")),
  panels: {
    post: document.getElementById("post-panel"),
    summary: document.getElementById("summary-panel"),
    ops: document.getElementById("ops-panel")
  },
  postForm: document.getElementById("post-form"),
  postFormTitle: document.getElementById("post-form-title"),
  observationInput: document.getElementById("observation-input"),
  note: document.getElementById("note"),
  parsedChip: document.getElementById("parsed-summary-chip"),
  parseError: document.getElementById("parse-error"),
  submitBtn: document.getElementById("submit-btn"),
  cancelEditBtn: document.getElementById("cancel-edit-btn"),
  summaryList: document.getElementById("summary-list"),
  exportCsvBtn: document.getElementById("export-csv-btn"),
  importCsvBtn: document.getElementById("import-csv-btn"),
  csvFileInput: document.getElementById("csv-file-input"),
  clearAllBtn: document.getElementById("clear-all-btn"),
  toast: document.getElementById("toast")
};

let state = loadState();
let editingEntryId = null;
let toastTimer = null;

function normalizeDigits(text) {
  return String(text || "").replace(/[０-９]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) - 65248)
  );
}

function toLocalDateKey(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatLocalDateLabel(key) {
  const [y, m, day] = key.split("-").map(Number);
  if (!y) return key;
  return `${y}年${m}月${day}日`;
}

function formatTime(iso) {
  try {
    return new Date(iso).toLocaleString("ja-JP", { hour12: false });
  } catch {
    return iso;
  }
}

/** datetime-local 用（端末ローカル日時） */
function toDatetimeLocalValue(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${day}T${h}:${min}`;
}

function showToast(message, type = "success") {
  ui.toast.textContent = message;
  ui.toast.classList.remove("hidden", "success", "error");
  ui.toast.classList.add(type);
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    ui.toast.classList.add("hidden");
    ui.toast.classList.remove("success", "error");
  }, 2800);
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function updateParsePreview() {
  const raw = ui.observationInput.value;
  const { items, invalidTokens } = parseObservations(raw);
  ui.parseError.classList.add("hidden");
  ui.parseError.textContent = "";

  if (!raw.trim()) {
    ui.parsedChip.textContent = "未解析";
    ui.parsedChip.classList.remove("error-chip");
    ui.submitBtn.disabled = true;
    return;
  }

  if (invalidTokens.length > 0) {
    ui.parsedChip.textContent = "エラーあり";
    ui.parsedChip.classList.add("error-chip");
    ui.parseError.classList.remove("hidden");
    ui.parseError.textContent = `解釈できない部分: ${invalidTokens.join("、")}`;
    ui.submitBtn.disabled = true;
    return;
  }

  if (items.length === 0) {
    ui.parsedChip.textContent = "種がありません";
    ui.parsedChip.classList.add("error-chip");
    ui.submitBtn.disabled = true;
    return;
  }

  ui.parsedChip.classList.remove("error-chip");
  ui.parsedChip.textContent = items.map((x) => `${x.species}${x.count}`).join("、");
  ui.submitBtn.disabled = false;
}

function setTab(name) {
  ui.tabs.forEach((btn) => {
    const on = btn.dataset.tab === name;
    btn.classList.toggle("active", on);
    btn.setAttribute("aria-selected", on ? "true" : "false");
  });
  Object.entries(ui.panels).forEach(([key, el]) => {
    el.classList.toggle("active", key === name);
  });
}

function resetPostForm() {
  editingEntryId = null;
  ui.postFormTitle.textContent = "新しい記録";
  ui.postForm.reset();
  ui.cancelEditBtn.classList.add("hidden");
  updateParsePreview();
}

function startEdit(entry) {
  editingEntryId = entry.id;
  ui.postFormTitle.textContent = "記録を編集";
  ui.observationInput.value = entry.observationRaw;
  ui.note.value = entry.note || "";
  ui.cancelEditBtn.classList.remove("hidden");
  setTab("post");
  updateParsePreview();
}

function observationsForEntry(entryId) {
  return state.observations.filter((o) => o.entryId === entryId);
}

function deleteEntry(entryId) {
  state.entries = state.entries.filter((e) => e.id !== entryId);
  state.observations = state.observations.filter((o) => o.entryId !== entryId);
  saveState(state);
}

function renderSummary() {
  const byDay = new Map();

  for (const entry of state.entries) {
    const key = toLocalDateKey(entry.postedAt);
    if (!key) continue;
    if (!byDay.has(key)) byDay.set(key, { entries: [], agg: new Map() });
    const bucket = byDay.get(key);
    bucket.entries.push(entry);
    for (const obs of observationsForEntry(entry.id)) {
      const c = Number(obs.count ?? 1);
      const prev = bucket.agg.get(obs.species) || 0;
      bucket.agg.set(obs.species, prev + c);
    }
  }

  const days = Array.from(byDay.keys()).sort((a, b) => (a < b ? 1 : a > b ? -1 : 0));

  if (days.length === 0) {
    ui.summaryList.innerHTML = `<p class="muted">まだ記録がありません。</p>`;
    return;
  }

  const parts = [];
  for (const day of days) {
    const { entries, agg } = byDay.get(day);
    entries.sort((a, b) => (a.postedAt < b.postedAt ? 1 : -1));
    const aggLines = Array.from(agg.entries())
      .sort(([sa], [sb]) => sa.localeCompare(sb, "ja"))
      .map(([sp, n]) => `${escapeHtml(sp)} ${n}`)
      .join(" / ");

    const entryBlocks = entries
      .map((entry) => {
        const obs = observationsForEntry(entry.id);
        const obsLine = obs.map((o) => `${escapeHtml(o.species)}×${Number(o.count ?? 1)}`).join("、");
        const dtVal = escapeHtml(toDatetimeLocalValue(entry.postedAt));
        return `
        <div class="entry-row" data-entry-id="${escapeHtml(entry.id)}">
          <div class="entry-meta">${escapeHtml(formatTime(entry.postedAt))}</div>
          <div class="entry-datetime-edit">
            <label class="datetime-label" for="dt-${escapeHtml(entry.id)}">日時を変更</label>
            <input
              type="datetime-local"
              id="dt-${escapeHtml(entry.id)}"
              class="entry-datetime-input"
              value="${dtVal}"
              autocomplete="off"
            />
            <button type="button" class="save-datetime-btn" data-id="${escapeHtml(entry.id)}">日時を保存</button>
          </div>
          <div class="entry-obs">${obsLine || escapeHtml(entry.observationRaw)}</div>
          ${
            entry.note
              ? `<div class="entry-note">${escapeHtml(entry.note)}</div>`
              : ""
          }
          <div class="entry-actions">
            <button type="button" class="edit-entry-btn" data-id="${escapeHtml(entry.id)}">編集</button>
            <button type="button" class="delete-entry-btn" data-id="${escapeHtml(entry.id)}">削除</button>
          </div>
        </div>`;
      })
      .join("");

    parts.push(`
      <div class="day-block">
        <h3>${escapeHtml(formatLocalDateLabel(day))}</h3>
        <div class="species-agg"><strong>日合計</strong>（種別）: ${aggLines || "—"}</div>
        ${entryBlocks}
      </div>
    `);
  }

  ui.summaryList.innerHTML = parts.join("");

  ui.summaryList.querySelectorAll(".edit-entry-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-id");
      const entry = state.entries.find((e) => e.id === id);
      if (entry) startEdit(entry);
    });
  });

  ui.summaryList.querySelectorAll(".delete-entry-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-id");
      if (confirm("この記録を削除しますか？")) {
        deleteEntry(id);
        if (editingEntryId === id) resetPostForm();
        renderSummary();
        showToast("削除しました。");
      }
    });
  });

  ui.summaryList.querySelectorAll(".save-datetime-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-id");
      const row = btn.closest(".entry-row");
      const input = row?.querySelector(".entry-datetime-input");
      if (!id || !input) return;
      const v = input.value.trim();
      if (!v) {
        showToast("日時を入力してください。", "error");
        return;
      }
      const next = new Date(v);
      if (Number.isNaN(next.getTime())) {
        showToast("日時の形式が不正です。", "error");
        return;
      }
      const entry = state.entries.find((e) => e.id === id);
      if (!entry) return;
      entry.postedAt = next.toISOString();
      entry.updatedAt = new Date().toISOString();
      saveState(state);
      renderSummary();
      showToast("日時を更新しました。");
    });
  });
}

function escapeCsv(value) {
  const text = String(value ?? "");
  if (!/[",\n]/.test(text)) return text;
  return `"${text.replaceAll('"', '""')}"`;
}

function buildCsvRows() {
  const entryById = new Map(state.entries.map((e) => [e.id, e]));
  const rows = [CSV_HEADER];
  for (const obs of state.observations) {
    const post = entryById.get(obs.entryId);
    if (!post) continue;
    rows.push([
      post.postedAt,
      obs.species,
      String(Number(obs.count ?? 1)),
      post.note || ""
    ]);
  }
  return rows;
}

function downloadCsv() {
  const lines = buildCsvRows().map((row) => row.map(escapeCsv).join(","));
  const bom = "\ufeff";
  const blob = new Blob([bom, lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `bird-personal-${toLocalDateKey(new Date().toISOString())}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast("CSVを出力しました。");
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuote = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const next = text[i + 1];
    if (ch === '"' && inQuote && next === '"') {
      cell += '"';
      i += 1;
      continue;
    }
    if (ch === '"') {
      inQuote = !inQuote;
      continue;
    }
    if (ch === "," && !inQuote) {
      row.push(cell);
      cell = "";
      continue;
    }
    if ((ch === "\n" || ch === "\r") && !inQuote) {
      if (ch === "\r" && next === "\n") i += 1;
      row.push(cell);
      if (row.some((v) => v !== "")) rows.push(row);
      row = [];
      cell = "";
      continue;
    }
    cell += ch;
  }
  if (cell || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

function normalizeHeader(value) {
  return String(value || "").trim().toLowerCase();
}

function parseCsvImportRows(text) {
  const rows = parseCsv(text);
  if (rows.length === 0) throw new Error("CSVが空です。");
  if (rows.length - 1 > IMPORT_ROW_LIMIT) {
    throw new Error(`CSVはデータ行が${IMPORT_ROW_LIMIT}行までです。`);
  }
  const header = rows[0].map(normalizeHeader);
  if (header.join(",") !== CSV_HEADER.join(",")) {
    throw new Error("CSVヘッダが不正です。observed_at,species,count,note の順で指定してください。");
  }
  const parsed = [];
  const errors = [];
  rows.slice(1).forEach((cols, idx) => {
    const lineNo = idx + 2;
    const observedAt = (cols[0] || "").trim();
    const species = (cols[1] || "").trim();
    const countText = normalizeDigits(cols[2] || "").trim();
    const note = (cols[3] || "").trim();
    const count = Number(countText);
    if (!observedAt || Number.isNaN(new Date(observedAt).getTime())) {
      errors.push(`${lineNo}行目: observed_at が不正`);
      return;
    }
    if (!species || !/^[ァ-ヶー]+$/.test(species)) {
      errors.push(`${lineNo}行目: species が不正（カタカナのみ）`);
      return;
    }
    if (!Number.isInteger(count) || count < 1 || count > 999) {
      errors.push(`${lineNo}行目: count が不正（1〜999の整数）`);
      return;
    }
    parsed.push({
      observed_at: new Date(observedAt).toISOString(),
      species,
      count,
      note
    });
  });
  return { parsed, errors };
}

function applyCsvImport(parsed) {
  const now = new Date().toISOString();
  for (const row of parsed) {
    const entryId = newId();
    const raw =
      row.count === 1 ? row.species : `${row.species}${row.count}`;
    state.entries.push({
      id: entryId,
      postedAt: row.observed_at,
      updatedAt: now,
      note: row.note,
      observationRaw: raw
    });
    state.observations.push({
      id: newId(),
      entryId,
      species: row.species,
      count: row.count
    });
  }
  saveState(state);
}

ui.postForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const raw = ui.observationInput.value;
  const { items, invalidTokens } = parseObservations(raw);
  if (invalidTokens.length > 0 || items.length === 0) {
    showToast("観察入力を修正してください。", "error");
    return;
  }
  const now = new Date().toISOString();
  const note = ui.note.value.trim();

  if (editingEntryId) {
    const entry = state.entries.find((x) => x.id === editingEntryId);
    if (!entry) {
      resetPostForm();
      return;
    }
    entry.observationRaw = raw;
    entry.note = note;
    entry.updatedAt = now;
    state.observations = state.observations.filter((o) => o.entryId !== entry.id);
    for (const it of items) {
      state.observations.push({
        id: newId(),
        entryId: entry.id,
        species: it.species,
        count: it.count
      });
    }
    saveState(state);
    showToast("更新しました。");
    resetPostForm();
  } else {
    const entryId = newId();
    state.entries.push({
      id: entryId,
      postedAt: now,
      updatedAt: now,
      note,
      observationRaw: raw
    });
    for (const it of items) {
      state.observations.push({
        id: newId(),
        entryId,
        species: it.species,
        count: it.count
      });
    }
    saveState(state);
    showToast("保存しました。");
    ui.postForm.reset();
    updateParsePreview();
  }
  renderSummary();
});

ui.observationInput.addEventListener("input", updateParsePreview);
ui.cancelEditBtn.addEventListener("click", () => {
  resetPostForm();
});

ui.tabs.forEach((btn) => {
  btn.addEventListener("click", () => setTab(btn.dataset.tab));
});

ui.exportCsvBtn.addEventListener("click", () => {
  try {
    downloadCsv();
  } catch (err) {
    showToast(err.message || "CSV出力に失敗しました。", "error");
  }
});

ui.importCsvBtn.addEventListener("click", () => {
  ui.csvFileInput.click();
});

ui.csvFileInput.addEventListener("change", async () => {
  const file = ui.csvFileInput.files?.[0];
  ui.csvFileInput.value = "";
  if (!file) return;
  try {
    const text = await file.text();
    const { parsed, errors } = parseCsvImportRows(text);
    if (errors.length > 0) {
      showToast(`CSVエラー: ${errors.slice(0, 3).join(" / ")}`, "error");
      return;
    }
    applyCsvImport(parsed);
    renderSummary();
    showToast(`CSV取込: ${parsed.length}件追加しました。`);
  } catch (err) {
    showToast(err.message || "CSV取込に失敗しました。", "error");
  }
});

ui.clearAllBtn.addEventListener("click", () => {
  if (
    confirm(
      "すべての記録を削除します。よろしいですか？（元に戻せません。CSVバックアップを推奨します）"
    )
  ) {
    state = createEmptyState();
    saveState(state);
    resetPostForm();
    renderSummary();
    showToast("すべて削除しました。");
  }
});

setTab("post");
updateParsePreview();
renderSummary();
