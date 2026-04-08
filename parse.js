/**
 * 鳥名: [ァ-ヶー]+（bird と同じレンジ、長音ー含む）
 */

const KATAKANA = /[ァ-ヶー]/;

export function normalizeDigits(text) {
  return String(text || "").replace(/[０-９]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) - 65248)
  );
}

/** 区切りを半角スペースに統一し、連続空白を1つに（全角スペース・改行・タブ等も対象） */
export function normalizeDelimiters(text) {
  return normalizeDigits(text)
    .replace(/[、,]/g, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

/**
 * @returns {{ items: { species: string, count: number }[], invalidTokens: string[] }}
 */
export function parseObservations(raw) {
  const s = normalizeDelimiters(raw);
  if (!s) return { items: [], invalidTokens: [] };

  const items = [];
  const invalidTokens = [];
  let i = 0;
  const n = s.length;

  function skipSpaces() {
    while (i < n && s[i] === " ") i += 1;
  }

  while (i < n) {
    skipSpaces();
    if (i >= n) break;

    const tokenStart = i;

    if (!KATAKANA.test(s[i])) {
      while (i < n && s[i] !== " ") i += 1;
      const tok = s.slice(tokenStart, i);
      if (tok) invalidTokens.push(tok);
      continue;
    }

    while (i < n && KATAKANA.test(s[i])) i += 1;
    const species = s.slice(tokenStart, i);
    skipSpaces();

    if (i < n && s[i] >= "0" && s[i] <= "9") {
      const d0 = i;
      while (i < n && s[i] >= "0" && s[i] <= "9") i += 1;
      const digitStr = s.slice(d0, i);
      if (digitStr.length > 3) {
        invalidTokens.push(s.slice(tokenStart, i));
        continue;
      }
      const count = Number(digitStr);
      if (!Number.isInteger(count) || count < 1) {
        invalidTokens.push(s.slice(tokenStart, i));
        continue;
      }
      items.push({ species, count });
      continue;
    }

    // 次がカタカナなら「数省略→1」とみなし、同じループで次の種名を読む（例: スズメ ハト）
    if (i < n && KATAKANA.test(s[i])) {
      items.push({ species, count: 1 });
      continue;
    }

    if (i < n && s[i] !== " ") {
      while (i < n && s[i] !== " ") i += 1;
      invalidTokens.push(s.slice(tokenStart, i));
      continue;
    }

    items.push({ species, count: 1 });
  }

  return { items, invalidTokens };
}
