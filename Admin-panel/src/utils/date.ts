export const toDMY = (input?: string | Date | null): string => {
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
