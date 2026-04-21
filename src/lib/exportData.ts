// Utility helpers to export arbitrary row data as CSV or JSON files
// Triggers a browser download.

function triggerDownload(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function toCsvValue(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = typeof v === "object" ? JSON.stringify(v) : String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function exportAsJson(data: unknown, baseName: string) {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  triggerDownload(JSON.stringify(data, null, 2), `${baseName}-${stamp}.json`, "application/json");
}

export function exportAsCsv<T extends object>(rows: readonly T[], baseName: string) {
  if (!rows.length) return;
  const headers = Array.from(
    rows.reduce<Set<string>>((set, row) => {
      Object.keys(row as Record<string, unknown>).forEach((k) => set.add(k));
      return set;
    }, new Set())
  );
  const lines = [
    headers.join(","),
    ...rows.map((r) =>
      headers.map((h) => toCsvValue((r as Record<string, unknown>)[h])).join(",")
    ),
  ];
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  triggerDownload(lines.join("\n"), `${baseName}-${stamp}.csv`, "text/csv;charset=utf-8");
}
