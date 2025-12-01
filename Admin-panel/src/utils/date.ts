export function formatISOToDMY(iso: string): string {
  // expects YYYY-MM-DD, returns DD-MM-YYYY; if not matching, returns input
  if (!iso) return '';
  const s = String(iso).substring(0, 10);
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return iso;
  const [, y, mo, d] = m;
  return `${d}-${mo}-${y}`;
}

export function formatToDMY(dateStr: string): string {
  // Attempts Date parse; falls back to ISO formatter
  if (!dateStr) return '';
  const s = String(dateStr).substring(0, 10);
  const iso = s.match(/^\d{4}-\d{2}-\d{2}$/) ? s : '';
  if (iso) return formatISOToDMY(iso);
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = String(d.getFullYear());
  return `${dd}-${mm}-${yyyy}`;
}export const toDMY = (input?: string | Date | null): string => {
  if (!input) return '';
  const d = typeof input === 'string' ? new Date(input) : input;
  if (isNaN(d.getTime())) return '';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

export const parseDMYToISO = (dmy?: string): string | undefined => {
  if (!dmy) return undefined;
  const parts = dmy.split('/');
  if (parts.length !== 3) return undefined;
  const [dd, mm, yyyy] = parts.map((p) => p.trim());
  const d = Number(dd), m = Number(mm), y = Number(yyyy);
  if (!d || !m || !y) return undefined;
  const date = new Date(y, m - 1, d);
  if (isNaN(date.getTime())) return undefined;
  return date.toISOString().slice(0, 10);
};
