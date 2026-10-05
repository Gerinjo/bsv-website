export const isValidIsoDate = (value) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
};

export const parseGermanDate = (value) => {
  const match = String(value ?? '').trim().match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/)
    ?? String(value ?? '').trim().match(/^(\d{2})(\d{2})(\d{4})$/);
  if (!match) return '';
  const iso = `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
  return isValidIsoDate(iso) ? iso : '';
};

export const formatGermanDate = (value) => {
  if (!isValidIsoDate(value)) return '';
  const [year, month, day] = value.split('-');
  return `${day}.${month}.${year}`;
};

export const berlinToday = (now = new Date()) => new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(now);
