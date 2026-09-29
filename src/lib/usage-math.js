const VN_OFFSET_MS = 7 * 60 * 60 * 1000;

export function vnParts(now = new Date()) {
  const shifted = new Date(now.getTime() + VN_OFFSET_MS);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth(),
    day: shifted.getUTCDate(),
  };
}

export function vnMonthStart(now = new Date()) {
  const { year, month } = vnParts(now);
  return new Date(Date.UTC(year, month, 1) - VN_OFFSET_MS);
}

export function vnDayStart(now = new Date()) {
  const { year, month, day } = vnParts(now);
  return new Date(Date.UTC(year, month, day) - VN_OFFSET_MS);
}

export function recentVnDays(dayCount, now = new Date()) {
  const today = vnDayStart(now);
  const days = [];
  for (let i = dayCount - 1; i >= 0; i -= 1) {
    const { year, month, day } = vnParts(new Date(today.getTime() - i * 86400000));
    days.push(`${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`);
  }
  return days;
}

export function mergeDailyUsage(dayKeys, messageRows = [], voiceRows = []) {
  const messages = new Map(messageRows.map((row) => [row.day, Number(row.count) || 0]));
  const voice = new Map();
  for (const row of voiceRows) {
    const current = voice.get(row.day) || { stt: 0, tts: 0 };
    const count = Number(row.count) || 0;
    if (row.type === "stt") current.stt += count;
    if (row.type === "tts") current.tts += count;
    voice.set(row.day, current);
  }
  return dayKeys.map((day) => ({
    day,
    messages: messages.get(day) || 0,
    stt: voice.get(day)?.stt || 0,
    tts: voice.get(day)?.tts || 0,
  }));
}

export function sumTokenUsage(entries = []) {
  let prompt = 0;
  let completion = 0;
  let total = 0;
  for (const entry of entries) {
    let usage = entry;
    if (typeof entry === "string") {
      try { usage = JSON.parse(entry); } catch { continue; }
    } else if (entry && typeof entry.usageJson === "string") {
      try { usage = JSON.parse(entry.usageJson); } catch { continue; }
    }
    if (!usage || typeof usage !== "object") continue;
    const entryPrompt = Number(usage.prompt_tokens || usage.promptTokenCount || 0) || 0;
    const entryCompletion = Number(usage.completion_tokens || usage.candidatesTokenCount || 0) || 0;
    const entryTotal = Number(usage.total_tokens || usage.totalTokenCount || 0) || 0;
    prompt += entryPrompt;
    completion += entryCompletion;
    total += entryTotal || entryPrompt + entryCompletion;
  }
  return { prompt, completion, total };
}

export function resolveUnlimitedPrice() {
  const raw = process.env.PLAN_UNLIMITED_VND;
  if (raw === undefined || String(raw).trim() === "") return 250000;
  const price = Number(raw);
  if (!Number.isInteger(price)) return null;
  return price;
}

export function isSellableVnd(price) {
  return Number.isInteger(price) && price >= 1000 && price <= 500000000;
}

export function formatVnd(amount) {
  return `${new Intl.NumberFormat("vi-VN").format(amount)} ₫`;
}

export function formatWhen(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

export function companyField(value, label) {
  const text = String(value || "").trim();
  return text || `［Điền ${label}］`;
}
