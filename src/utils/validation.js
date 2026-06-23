export function required(value, label) {
  if (String(value ?? '').trim() === '') return `${label} is required`;
  return '';
}

export function validateMobile(value) {
  if (!/^\d{10}$/.test(String(value || '').trim())) return 'Mobile must be 10 digits';
  return '';
}

export function validatePositive(value, label) {
  if (Number(value) <= 0 || Number.isNaN(Number(value))) return `${label} must be greater than 0`;
  return '';
}

export function validateNonNegative(value, label) {
  if (Number(value) < 0 || Number.isNaN(Number(value))) return `${label} cannot be negative`;
  return '';
}

export function validateNotFutureDate(value, label = 'Date') {
  if (required(value, label)) return required(value, label);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const selected = new Date(`${value}T00:00:00`);
  if (selected > today) return `${label} cannot be future date`;
  return '';
}

export function firstError(errors) {
  return Object.values(errors).find(Boolean) || '';
}
