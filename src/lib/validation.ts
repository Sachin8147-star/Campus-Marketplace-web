/** 10-15 digits, optional leading "+"; spaces, dashes and brackets are ignored. Returns an error or null. */
export function validatePhone(raw: string): string | null {
  const compact = raw.replace(/[\s\-().]/g, '');
  const digits = compact.startsWith('+') ? compact.slice(1) : compact;
  if (!/^\d+$/.test(digits)) return 'Phone number can only contain digits (and a leading +).';
  if (digits.length < 10) return 'Phone number is too short. It needs at least 10 digits.';
  if (digits.length > 15) return 'Phone number is too long. It can have at most 15 digits.';
  return null;
}

export const normalizePhone = (raw: string): string => raw.replace(/[\s\-().]/g, '');

const EMAIL = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;
const TYPOS: Record<string, string> = {
  'gmial.com': 'gmail.com', 'gamil.com': 'gmail.com', 'gmail.co': 'gmail.com', 'gmai.com': 'gmail.com', 'gnail.com': 'gmail.com',
  'yahooo.com': 'yahoo.com', 'yaho.com': 'yahoo.com', 'hotmial.com': 'hotmail.com', 'outlok.com': 'outlook.com',
};

export function validateEmail(raw: string): string | null {
  if (!EMAIL.test(raw)) return 'Enter a valid email like name@college.edu.';
  const domain = raw.split('@')[1].toLowerCase();
  if (TYPOS[domain]) return `Did you mean ${raw.split('@')[0]}@${TYPOS[domain]}?`;
  return null;
}

export const validatePincode = (raw: string): string | null => (/^\d{6}$/.test(raw) ? null : 'Pincode must be 6 digits.');

/** "17:30" -> "5:30 PM" */
export function formatTime(value?: string): string {
  if (!value || !/^\d{2}:\d{2}$/.test(value)) return '';
  const [h, m] = value.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}

export function formatTimeRange(from?: string, to?: string): string {
  const a = formatTime(from);
  const b = formatTime(to);
  return a && b ? `${a} – ${b}` : a || b;
}
