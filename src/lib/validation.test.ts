import test from 'node:test';
import assert from 'node:assert/strict';
import { validatePhone, normalizePhone, validatePincode, formatTimeRange, validateEmail } from './validation';
import { getApiBaseUrl, resolveMediaUrl, DEFAULT_API_URL } from './api-config';
import { CATEGORIES, categoryIcon } from './categories';

test('validatePhone validates Indian phone numbers (null on success, error message on failure)', () => {
  assert.equal(validatePhone('9876543210'), null);
  assert.equal(validatePhone('+91 98765 43210'), null);
  assert.equal(validatePhone('09876543210'), null);
  assert.ok(validatePhone('12345') !== null);
  assert.ok(validatePhone('') !== null);
});

test('normalizePhone removes spaces and dashes', () => {
  assert.equal(normalizePhone('+91 98765-43210'), '+919876543210');
  assert.equal(normalizePhone('9876 543 210'), '9876543210');
});

test('validatePincode checks 6 digits (null on valid, error string on invalid)', () => {
  assert.equal(validatePincode('110019'), null);
  assert.equal(validatePincode('560001'), null);
  assert.ok(validatePincode('11001') !== null);
  assert.ok(validatePincode('ABCDEF') !== null);
});

test('validateEmail validates format and catches common typos', () => {
  assert.equal(validateEmail('student@college.edu'), null);
  assert.ok(validateEmail('student@gmial.com')?.includes('gmail.com'));
  assert.ok(validateEmail('invalid-email') !== null);
});

test('formatTimeRange formats time window', () => {
  assert.equal(formatTimeRange('10:00', '18:00'), '10:00 AM – 6:00 PM');
  assert.equal(formatTimeRange('09:30', '14:00'), '9:30 AM – 2:00 PM');
  assert.equal(formatTimeRange('', ''), '');
});

test('api-config defaults to live backend url', () => {
  const base = getApiBaseUrl();
  assert.equal(typeof base, 'string');
  assert.ok(base.includes('campuscrate-api-1jcb.onrender.com'));
});

test('resolveMediaUrl resolves relative storage paths to live backend', () => {
  const relative = '/storage/v1/object/photo.jpg';
  const resolved = resolveMediaUrl(relative);
  assert.ok(resolved.startsWith('http'));
  assert.ok(resolved.endsWith('/storage/v1/object/photo.jpg'));

  // Absolute URLs are preserved as is
  const abs = 'https://example.com/photo.jpg';
  assert.equal(resolveMediaUrl(abs), abs);
});

test('CATEGORIES list includes core student categories with valid icons', () => {
  const names = CATEGORIES.map(c => c.name);
  assert.ok(names.includes('Stationery'));
  assert.ok(names.includes('Books'));
  assert.ok(names.includes('Calculators'));
  assert.ok(names.includes('Electronics'));
  assert.ok(names.includes('Mobile & accessories'));

  // categoryIcon returns a Lucide component
  assert.ok(typeof categoryIcon('Books') === 'object' || typeof categoryIcon('Books') === 'function');
});
