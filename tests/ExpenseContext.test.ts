import { describe, expect, it, vi } from 'vitest';

vi.mock('expo-sqlite', () => ({
  openDatabaseAsync: vi.fn(),
}));

import {
  dayKey,
  formatCurrency,
  formatCurrencyFromPaise,
  formatDate,
  monthKey,
  monthLabel,
  parseDayKey,
  sumExpensePaise,
} from '@/context/ExpenseContext';

describe('ExpenseContext utility functions', () => {
  describe('dayKey', () => {
    it('formats a Date as YYYY-MM-DD', () => {
      expect(dayKey(new Date(2026, 8, 14))).toBe('2026-09-14');
    });

    it('pads single-digit months and days', () => {
      expect(dayKey(new Date(2026, 0, 5))).toBe('2026-01-05');
    });
  });

  describe('parseDayKey', () => {
    it('parses a valid YYYY-MM-DD value', () => {
      const date = parseDayKey('2026-09-14');

      expect(dayKey(date)).toBe('2026-09-14');
    });

    it('rejects invalid calendar dates', () => {
      expect(() => parseDayKey('2026-02-30')).toThrow(
        'Invalid expense date',
      );
    });

    it('rejects incorrectly formatted dates', () => {
      expect(() => parseDayKey('14-09-2026')).toThrow(
        'Invalid expense date',
      );
    });
  });

  describe('formatCurrencyFromPaise', () => {
    it('converts paise to Indian currency format', () => {
      expect(formatCurrencyFromPaise(12550)).toBe('\u20B9125.50');
    });

    it('formats whole rupee amounts with two decimals', () => {
      expect(formatCurrencyFromPaise(50000)).toBe('\u20B9500.00');
    });
  });

  describe('formatCurrency', () => {
    it('converts rupees to formatted currency', () => {
      expect(formatCurrency(125.5)).toBe('\u20B9125.50');
    });

    it('rounds fractional paise correctly', () => {
      expect(formatCurrency(99.999)).toBe('\u20B9100.00');
    });
  });

  describe('sumExpensePaise', () => {
    it('returns zero for an empty expense list', () => {
      expect(sumExpensePaise([])).toBe(0);
    });

    it('sums expense amounts in paise', () => {
      const expenses = [
        {
          id: '1',
          amountPaise: 12550,
          category: 'Food' as const,
          note: 'Lunch',
          date: '2026-09-14',
          createdAt: '2026-09-14T10:00:00.000Z',
          updatedAt: '2026-09-14T10:00:00.000Z',
        },
        {
          id: '2',
          amountPaise: 25000,
          category: 'Travel' as const,
          note: 'Taxi',
          date: '2026-09-14',
          createdAt: '2026-09-14T11:00:00.000Z',
          updatedAt: '2026-09-14T11:00:00.000Z',
        },
      ];

      expect(sumExpensePaise(expenses)).toBe(37550);
    });
  });

  describe('formatDate', () => {
    it('formats an expense date for display', () => {
      expect(formatDate('2026-09-14')).toBe('14 Sept');
    });
  });

  describe('monthKey', () => {
    it('extracts the YYYY-MM portion of an expense date', () => {
      expect(monthKey('2026-09-14')).toBe('2026-09');
    });
  });

  describe('monthLabel', () => {
    it('converts a month key into a readable month label', () => {
      expect(monthLabel('2026-09')).toBe('September 2026');
    });
  });
});

