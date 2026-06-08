export function parseDate(value) {
  if (value instanceof Date) return value;
  if (typeof value === 'number' || typeof value === 'string') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
}

export function formatDate(value, options = {}) {
  const date = parseDate(value);
  if (!date) return '';
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', ...options });
}

export function formatDateLong(value) {
  const date = parseDate(value);
  if (!date) return '';
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateMonthYear(value) {
  const date = parseDate(value);
  if (!date) return '';
  return date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}

export function formatDateWithWeekday(value) {
  const date = parseDate(value);
  if (!date) return '';
  return date.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
}
