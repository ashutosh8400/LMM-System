export function todayKey() {
  return toDateKey(new Date());
}

export function monthKey(date = new Date()) {
  return toDateKey(date).slice(0, 7);
}

export function nowIso() {
  return new Date().toISOString();
}

export function formatMoney(value) {
  return `Rs ${Number(value || 0).toLocaleString('en-IN', {
    maximumFractionDigits: 2,
  })}`;
}

export function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function reportRange(period) {
  const now = new Date();
  if (period === 'month') {
    return {
      from: `${monthKey(now)}-01`,
      to: todayKey(),
      label: 'This Month',
    };
  }

  return {
    from: todayKey(),
    to: todayKey(),
    label: 'Today',
  };
}
